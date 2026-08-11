/**
 * Bloques de tiempo del asesor y la sesión de temporizador en curso.
 *
 * El temporizador NO guarda "segundos restantes" que se van descontando:
 * guarda el instante en que termina (`endsAt`) y el restante se calcula contra
 * el reloj del sistema. Es lo que permite dos cosas que con un contador
 * decreciente no funcionan:
 *
 *  - Cambiar de pestaña dentro de la app. La sección se desmonta al navegar, y
 *    un intervalo que descuenta uno por segundo moriría con ella.
 *  - Dejar la app en segundo plano. Los navegadores estrangulan los
 *    temporizadores de las pestañas ocultas, así que un bloque de 45 minutos
 *    terminaría varios minutos tarde.
 */
const SESSION_KEY = 'df360:timeBlockSession:v1';
const HISTORY_KEY = 'df360:timeBlockHistory:v1';

/** Tope de duración. Más allá de tres horas ya no es un bloque de enfoque. */
export const MAX_MINUTES = 180;

/**
 * Objetivo de referencia del día: dos horas de enfoque real.
 *
 * Vive aquí y no en la pantalla porque es una regla del producto, no una decisión
 * de maquetación: da a la barra algo contra qué llenarse y define qué significa un
 * buen día. Si alguna vez se personaliza por asesor, este es el valor que se
 * sustituye.
 */
export const DAILY_TARGET_MINUTES = 120;

function readMap(key) {
  try {
    const raw = localStorage.getItem(key);
    const parsed = raw ? JSON.parse(raw) : null;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function writeMap(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Sin persistencia, los bloques propios duran esta sesión.
  }
}

/*
  Aquí vivían los bloques fijos de la app y el alta de bloques propios: una lista
  guardada por usuario, con id, icono y la marca de "este lo trae la app".

  Se fueron con la pantalla que los mostraba. El enfoque ya no se elige de una
  rejilla, se escribe: la tarea y los minutos se preguntan una vez y viajan en la
  sesión. Guardar además un catálogo de bloques significaba mantener sincronizadas
  dos ideas de "en qué estoy trabajando", y la que la persona acaba de teclear
  siempre le gana a la que guardó hace un mes.
*/

// ── Sesión en curso ───────────────────────────────────────────────────────

/**
 * Una sesión terminada hace mucho ya no interesa: al volver dos días después,
 * anunciar "¡tiempo terminado!" sería desconcertante. Pasado este margen se
 * descarta en silencio.
 */
const STALE_AFTER_MS = 30 * 60 * 1000;

export function readSession(username) {
  if (!username) return null;
  const session = readMap(SESSION_KEY)[username];
  if (!session || typeof session !== 'object' || !session.label) return null;

  // Sesión que terminó mientras la app estaba cerrada.
  if (session.status === 'running' && session.endsAt) {
    if (Date.now() > session.endsAt + STALE_AFTER_MS) return null;
  }
  return session;
}

export function writeSession(username, session) {
  if (!username) return;
  const all = readMap(SESSION_KEY);
  if (session) all[username] = session;
  else delete all[username];
  writeMap(SESSION_KEY, all);
}

/** Segundos que faltan, calculados contra el reloj. Nunca negativo. */
export function remainingSeconds(session) {
  if (!session) return 0;
  if (session.status === 'running' && session.endsAt) {
    return Math.max(0, Math.round((session.endsAt - Date.now()) / 1000));
  }
  return Math.max(0, Math.round(session.remainingSec ?? 0));
}

/** `MM:SS`, con los minutos sin recortar por si un bloque pasa de 99. */
export function formatClock(totalSeconds) {
  const safe = Math.max(0, Math.round(totalSeconds));
  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

/** El mismo texto que se lee en voz alta y en el aviso al terminar. */
export function finishedMessage(label) {
  return `¡Tiempo terminado! Gran trabajo enfocado en ${label}.`;
}


// ── Historial de bloques completados ──────────────────────────────────────

/**
 * Clave del día en horario local.
 *
 * Se compone a mano en vez de con `toISOString()`: ese método convierte a UTC y
 * en México adelantaría el día a partir de las 18:00, de modo que los bloques
 * de la tarde contarían para mañana.
 */
export function todayKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** El historial se poda a un mes: más atrás no se muestra y ocuparía cuota. */
const HISTORY_DAYS = 30;

function pruneHistory(byDay) {
  const limit = todayKey(new Date(Date.now() - HISTORY_DAYS * 86400000));
  return Object.fromEntries(
    Object.entries(byDay).filter(([day]) => day >= limit),
  );
}

export function readHistory(username) {
  if (!username) return {};
  const entry = readMap(HISTORY_KEY)[username];
  return entry && typeof entry === 'object' ? entry : {};
}

function writeHistory(username, byDay) {
  if (!username) return;
  writeMap(HISTORY_KEY, { ...readMap(HISTORY_KEY), [username]: pruneHistory(byDay) });
}

/** Bloques y minutos acumulados en un día. */
export function statsFor(history, day = todayKey()) {
  const entries = history[day];
  if (!Array.isArray(entries)) return { blocks: 0, minutes: 0 };
  return {
    blocks: entries.length,
    minutes: entries.reduce((total, item) => total + (Number(item.minutes) || 0), 0),
  };
}

/**
 * Registra un bloque terminado y devuelve el historial actualizado.
 *
 * Se guarda cada bloque por separado, no un contador: con la lista se puede
 * saber a qué hora se concentró el asesor y qué tarea repitió, que es lo que
 * hará falta para sugerirle su mejor horario. Un contador cerraría esa puerta.
 */
export function recordCompletion(username, { label, minutes }) {
  const history = readHistory(username);
  const day = todayKey();
  const entries = Array.isArray(history[day]) ? history[day] : [];

  const next = {
    ...history,
    [day]: [...entries, { at: Date.now(), label, minutes: Math.round(Number(minutes) || 0) }],
  };
  writeHistory(username, next);
  return next;
}

/** Días consecutivos con al menos un bloque, contando hacia atrás desde hoy. */
export function streakDays(history) {
  let streak = 0;
  for (let offset = 0; offset < HISTORY_DAYS; offset += 1) {
    const day = todayKey(new Date(Date.now() - offset * 86400000));
    const entries = history[day];
    if (Array.isArray(entries) && entries.length > 0) streak += 1;
    // Que hoy aún no tenga bloques no rompe la racha: el día no ha terminado.
    else if (offset > 0) break;
  }
  return streak;
}

/*
  Aquí vivía la traducción de minutos de enfoque a pesos, que sólo se usaba en el
  modal de festejo: "45 minutos ≈ $1,500 de tu tiempo". Se fue con el modal.

  Era un valor ilustrativo y estaba marcado como tal, pero además no encaja en el
  cierre nuevo: la pantalla de bloque completado es negra y tiene tres líneas, y un
  peso inventado al lado de un logro real lo abarata. Si se quiere recuperar, el
  supuesto era $2,000 por hora.
*/

/** Minutos en horas y minutos, que es como se cuenta una jornada. */
export function formatDuration(minutes) {
  const safe = Math.max(0, Math.round(minutes));
  if (safe < 60) return `${safe} min`;
  const hours = Math.floor(safe / 60);
  const rest = safe % 60;
  return rest === 0 ? `${hours} h` : `${hours} h ${rest} min`;
}
