/**
 * src/data/vipPasses.js
 *
 * "Pases VIP 360": los pases de cortesía del Diagnóstico que el asesor regala
 * para desbloquear la herramienta.
 *
 * ## Por qué no reutiliza `ReferralContext`
 * Ese contexto ya existe y también guarda referidos, pero resuelve otro
 * candado: el del PROSPECTO dentro del propio diagnóstico
 * (`ReferralGate.jsx`, envuelto en `OptimizationPanel.jsx`). Éste es el candado
 * del ASESOR. Los dos piden lo mismo: un contacto.
 *
 * Compartir almacén habría atado los dos: desbloquear uno desbloquearía el
 * otro, porque `isUnlocked` es una sola bandera. Son dos intercambios
 * distintos, con distinto umbral y distinta persona dando los contactos, así
 * que viven separados. Mismo patrón de persistencia por usuario que
 * `leads.js`/`orphanProspects.js`.
 */
const KEY = 'df360:vipPasses:v1';

/**
 * Cuántas invitaciones se pueden agregar como máximo, y cuántas hacen falta.
 *
 * El mínimo es UNO, no tres. Exigir tres nombres alargaba el paso y castigaba a
 * quien de verdad no tiene tres personas a quien invitar: la salida era inventar
 * contactos o abandonar. Tres sigue siendo el techo de lo que la sesión incluye;
 * uno es suficiente para completar el intercambio.
 */
export const MAX_PASSES = 3;
export const MIN_PASSES = 1;

function newId() {
  return globalThis.crypto?.randomUUID?.()
    ?? `pass-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function readAll() {
  try {
    const raw = localStorage.getItem(KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function writeAll(data) {
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
  } catch {
    // Sin persistencia el desbloqueo dura la sesión: degradación aceptable.
  }
}

function readUser(username) {
  const bucket = readAll()[username];
  return {
    passes: Array.isArray(bucket?.passes) ? bucket.passes : [],
    unlocked: Boolean(bucket?.unlocked),
  };
}

/** Pases generados por el asesor, los más recientes primero. */
export function readVipPasses(username) {
  if (!username) return [];
  return readUser(username).passes.slice().sort((a, b) => b.createdAt - a.createdAt);
}

/** ¿La herramienta ya está desbloqueada para este asesor? */
export function isVipUnlocked(username) {
  if (!username) return false;
  return readUser(username).unlocked;
}

/**
 * Guarda un lote de pases y desbloquea la herramienta.
 *
 * `origin` distingue de dónde salieron —del menú (`'menu'`) o del cierre de una
 * Cita Inicial (`'cita_inicial'`)— porque son dos conversaciones distintas: en
 * el primero los contactos los pone el asesor de su propia red, en el segundo
 * los da el cliente que acaba de ver la presentación. Al revisar la lista, esa
 * diferencia cambia por completo cómo se escribe el primer mensaje.
 */
export function saveVipPasses(username, entries, { origin = 'menu', fromClient = '' } = {}) {
  if (!username) return [];

  const clean = (entries ?? [])
    .map((entry) => ({
      name: String(entry?.name ?? '').trim(),
      phone: String(entry?.phone ?? '').trim(),
    }))
    .filter((entry) => entry.name && entry.phone)
    .map((entry) => ({
      id: newId(),
      ...entry,
      origin,
      fromClient,
      createdAt: Date.now(),
    }));

  if (!clean.length) return [];

  const all = readAll();
  const bucket = readUser(username);
  writeAll({
    ...all,
    [username]: { passes: [...bucket.passes, ...clean], unlocked: true },
  });
  return clean;
}

/**
 * Desbloquea sin generar pases.
 *
 * Existe porque un candado sin salida no es un intercambio, es un muro: un
 * asesor que hoy no tiene a quién invitar —o cuyo cliente se negó a dar
 * referidos— no puede quedarse sin poder trabajar. El desbloqueo queda
 * registrado igual, así que la app no vuelve a preguntar.
 */
/*
  Ya no existe un `emptyPasses()` que devuelva tres filas en blanco: los
  formularios arrancan con el arreglo vacío y las invitaciones se agregan de
  una en una ("divulgación progresiva", ver `VIPPassFields.jsx`). Tres campos
  dobles vacíos de entrada se leen como un trámite obligatorio; una invitación
  que se agrega a voluntad se lee como lo que es.

  Estas funciones viven aquí y no junto al componente que las dibuja porque
  `oxlint` marca como advertencia exportar funciones desde un archivo que
  también exporta un componente (`react/only-export-components`, rompe el Fast
  Refresh). Además es su sitio natural: la forma de un pase es un asunto de los
  datos, no de la interfaz.
*/

/** ¿Un pase tiene nombre y un teléfono verosímil? */
export function isPassComplete(pass) {
  return String(pass?.name ?? '').trim().length > 1
    && String(pass?.phone ?? '').replace(/\D/g, '').length >= 10;
}

/**
 * Los pases del lote que están listos para guardarse.
 *
 * Existe para no tirar contactos reales. Antes sólo se guardaba si los tres
 * estaban completos, así que un cliente que daba un solo nombre veía cómo ese
 * contacto se perdía al cerrar la cita. Un referido de verdad vale aunque
 * venga solo.
 */
export function completePasses(passes) {
  return (Array.isArray(passes) ? passes : []).filter(isPassComplete);
}

/**
 * ¿Hay lo suficiente para completar el intercambio?
 *
 * Es la única definición de "ya se puede continuar" en toda la app: la usan el
 * generador del menú y el cierre de la Cita Inicial, y con dos copias bastaba
 * que una aceptara un teléfono de 9 dígitos para que un pase quedara
 * inservible según por dónde se hubiera capturado.
 *
 * Basta una invitación válida. Las incompletas no bloquean: simplemente no
 * cuentan, y `completePasses` es lo único que se guarda.
 */
export function hasEnoughPasses(passes) {
  return completePasses(passes).length >= MIN_PASSES;
}

export function unlockVipWithoutPasses(username) {
  if (!username) return;
  const all = readAll();
  const bucket = readUser(username);
  writeAll({ ...all, [username]: { ...bucket, unlocked: true } });
}
