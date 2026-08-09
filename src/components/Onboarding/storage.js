/**
 * Persistencia del perfil de onboarding, separada por usuario: el perfil
 * pertenece a la persona, no al dispositivo, así que `marco` y `asesor`
 * conservan el suyo por separado.
 *
 * Usa localStorage (no sessionStorage) para que el asesor no repita el
 * onboarding cada vez que abre una pestaña nueva.
 *
 * v2 guarda el perfil completo `{ experience, challenge, goal }`. Los perfiles
 * v1 (sólo el nivel de experiencia, como string) se ignoran a propósito: se
 * pide el onboarding una vez más para capturar desafío y visión.
 */
const KEY = 'df360:onboarding:v2';

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

/** Un perfil sólo cuenta como completo si tiene las tres respuestas. */
function isComplete(profile) {
  return Boolean(
    profile
    && typeof profile === 'object'
    && profile.experience
    && profile.challenge
    && profile.goal,
  );
}

/** Devuelve el perfil del usuario, o `null` si aún no completó el onboarding. */
export function readProfile(username) {
  if (!username) return null;
  const profile = readAll()[username];
  return isComplete(profile) ? profile : null;
}

export function saveProfile(username, profile) {
  if (!username || !isComplete(profile)) return;
  try {
    localStorage.setItem(KEY, JSON.stringify({ ...readAll(), [username]: profile }));
  } catch {
    // Si no se puede persistir, el onboarding se repetirá: degradación aceptable.
  }
}
