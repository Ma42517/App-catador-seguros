/**
 * src/data/safeZone.js
 *
 * Los primeros apoyos que la persona captura en `FirstLoginIntro.jsx` (Paso
 * 3): a quién le avisaría que está arrancando esta nueva etapa. Cada
 * entrada es `{ nombre, telefono }` —el teléfono es opcional, "saltar paso"
 * puede dejar el arreglo vacío del todo— y se guarda para que, el día que
 * el algoritmo de tareas diarias necesite un primer contacto sugerido, no
 * tenga que volver a preguntarlo: la persona ya lo dijo una vez, al ganar
 * su primer punto.
 *
 * Mismo patrón de persistencia que `goals.js`/`advisorPoints.js`: una sola
 * clave de localStorage con un objeto `{ [username]: entradas }`.
 */
const KEY = 'df360:safeZone:v1';

function readAll() {
  try {
    const raw = localStorage.getItem(KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

/** Entradas guardadas de una persona, o un arreglo vacío si nunca las llenó (o saltó el paso). */
export function readSafeZone(username) {
  if (!username) return [];
  const value = readAll()[username];
  return Array.isArray(value) ? value : [];
}

/** @param {{ nombre: string, telefono: string }[]} entries */
export function writeSafeZone(username, entries) {
  if (!username) return;
  try {
    localStorage.setItem(KEY, JSON.stringify({ ...readAll(), [username]: entries }));
  } catch {
    // Sin persistencia, la Zona Segura vive sólo en esta sesión.
  }
}
