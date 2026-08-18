/**
 * src/data/safeZone.js
 *
 * Los 3 nombres que la persona escribe en el Paso 3 de `FirstLoginIntro.jsx`
 * ("Tu Zona Segura"): la gente con la que se tomaría un café mañana mismo sin
 * pensarlo. Se guarda para que, el día que el algoritmo de tareas diarias
 * necesite un primer contacto sugerido, no tenga que volver a preguntarlo —
 * la persona ya lo dijo una vez, al ganar su primer punto.
 *
 * Mismo patrón de persistencia que `goals.js`/`advisorPoints.js`: una sola
 * clave de localStorage con un objeto `{ [username]: nombres }`.
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

/** Nombres guardados de una persona, o un arreglo vacío si nunca los llenó. */
export function readSafeZone(username) {
  if (!username) return [];
  const value = readAll()[username];
  return Array.isArray(value) ? value : [];
}

export function writeSafeZone(username, names) {
  if (!username) return;
  try {
    localStorage.setItem(KEY, JSON.stringify({ ...readAll(), [username]: names }));
  } catch {
    // Sin persistencia, la Zona Segura vive sólo en esta sesión.
  }
}
