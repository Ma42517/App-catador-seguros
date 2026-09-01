const KEY = 'df360:firstLoginIntro:v1';
const LEGACY_POINTS_KEY = 'df360:advisorPoints:v1';

function readAll() {
  try {
    const raw = localStorage.getItem(KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function writeAll(value) {
  try {
    localStorage.setItem(KEY, JSON.stringify(value));
  } catch {
    // Si no hay persistencia, la introducción puede repetirse en otra sesión.
  }
}

/**
 * La finalización del onboarding es una bandera de experiencia, no un punto.
 * Para usuarios anteriores se migra una sola vez desde el contador legado:
 * cualquier valor positivo significaba que ya habían terminado la introducción.
 */
export function hasCompletedFirstLoginIntro(username) {
  if (!username) return false;
  const current = readAll();
  if (typeof current[username] === 'boolean') return current[username];

  try {
    const legacyRaw = localStorage.getItem(LEGACY_POINTS_KEY);
    const legacy = legacyRaw ? JSON.parse(legacyRaw) : null;
    if (Number(legacy?.[username]) > 0) {
      writeAll({ ...current, [username]: true });
      return true;
    }
  } catch {
    // Sin migración legible, se muestra la introducción una vez más.
  }

  return false;
}

export function markFirstLoginIntroCompleted(username) {
  if (!username) return;
  writeAll({ ...readAll(), [username]: true });
}

export function resetFirstLoginIntro(username) {
  if (!username) return;
  const current = readAll();
  delete current[username];
  writeAll(current);
}
