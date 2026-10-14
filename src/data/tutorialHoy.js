/**
 * src/data/tutorialHoy.js
 *
 * Memoria local de "¿esta persona ya vio el tutorial de la pestaña Hoy?".
 *
 * Mismo patrón que `firstLoginIntro.js`: un objeto `{ [username]: boolean }` bajo
 * una sola clave, para que el flag sea POR USUARIO (dos asesores en el mismo
 * navegador no comparten el "visto"). Es la fuente rápida; el perfil en Supabase
 * (`tutorial_hoy_seen`) es la fuente que viaja entre dispositivos — se consultan
 * ambas y basta con que una diga "ya lo vio" para no repetirlo.
 */
const KEY = 'expandia_tutorial_hoy_seen';

function readAll() {
  try {
    const raw = localStorage.getItem(KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function writeAll(value) {
  try {
    localStorage.setItem(KEY, JSON.stringify(value));
  } catch {
    // Sin almacenamiento (modo privado): el tour puede repetirse, nada se rompe.
  }
}

/** ¿Ya vio el tutorial de Hoy esta persona, según la memoria local? */
export function hasSeenTutorialHoy(username) {
  if (!username) return false;
  return Boolean(readAll()[username]);
}

/** Marca el tutorial de Hoy como visto para esta persona. */
export function markTutorialHoySeen(username) {
  if (!username) return;
  writeAll({ ...readAll(), [username]: true });
}

/** Olvida el "visto" para esta persona, para poder volver a verlo desde cero. */
export function resetTutorialHoy(username) {
  if (!username) return;
  const all = readAll();
  delete all[username];
  writeAll(all);
}
