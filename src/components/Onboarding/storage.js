/**
 * Persistencia del onboarding, separada por usuario: el nivel de experiencia
 * pertenece a la persona, no al dispositivo, así que `marco` y `asesor`
 * conservan el suyo por separado.
 *
 * Usa localStorage (no sessionStorage) para que el asesor no repita el
 * onboarding cada vez que abre una pestaña nueva.
 */
const KEY = 'df360:onboarding:v1';

function readAll() {
  try {
    const raw = localStorage.getItem(KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    // localStorage deshabilitado o JSON corrupto: se trata como "sin datos".
    return {};
  }
}

/** Devuelve el nivel guardado del usuario, o '' si aún no completó el onboarding. */
export function readExperienceLevel(username) {
  if (!username) return '';
  const level = readAll()[username];
  return typeof level === 'string' ? level : '';
}

export function saveExperienceLevel(username, level) {
  if (!username || !level) return;
  try {
    localStorage.setItem(KEY, JSON.stringify({ ...readAll(), [username]: level }));
  } catch {
    // Si no se puede persistir, el onboarding se repetirá: degradación aceptable.
  }
}
