/**
 * src/data/advisorPoints.js
 *
 * Puntos de arranque del asesor. Hoy sólo existe una fuente: completar
 * `FirstLoginIntro.jsx` (la introducción de la primera vez, ver esa misma
 * carpeta) otorga el primer punto. Se guarda como número —y no como una
 * bandera `hasSeenIntro: boolean`— para que futuras tareas puedan seguir
 * sumando sin cambiar la forma del dato ni migrar nada de lo ya guardado.
 *
 * Mismo patrón de persistencia que `goals.js`/`entries.js`/`advisorProfile.js`:
 * una sola clave de localStorage con un objeto `{ [username]: puntos }`, en
 * vez de una entrada de storage por persona.
 */
const KEY = 'df360:advisorPoints:v1';

function readAll() {
  try {
    const raw = localStorage.getItem(KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

/** Puntos guardados de una persona. `0` si nunca ha sumado nada, o si no hay `username`. */
export function readPoints(username) {
  if (!username) return 0;
  const value = readAll()[username];
  return typeof value === 'number' && value >= 0 ? value : 0;
}

export function writePoints(username, points) {
  if (!username) return;
  try {
    localStorage.setItem(KEY, JSON.stringify({ ...readAll(), [username]: points }));
  } catch {
    // Sin persistencia, los puntos viven sólo en esta sesión.
  }
}
