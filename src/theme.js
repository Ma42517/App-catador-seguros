/**
 * Tema de la app. Se aplica alternando la clase `dark` en <html> (Tailwind está
 * configurado con darkMode: 'class') y se recuerda en localStorage.
 */
const KEY = 'df360:theme';

export const THEMES = { DARK: 'dark', LIGHT: 'light' };

/** Lee el tema guardado; por defecto oscuro, que es la identidad de la app. */
export function readTheme() {
  try {
    return localStorage.getItem(KEY) === THEMES.LIGHT ? THEMES.LIGHT : THEMES.DARK;
  } catch {
    return THEMES.DARK;
  }
}

/** Aplica el tema al documento y lo persiste. */
export function applyTheme(theme) {
  const isDark = theme !== THEMES.LIGHT;
  document.documentElement.classList.toggle('dark', isDark);
  document.documentElement.style.colorScheme = isDark ? 'dark' : 'light';
  try {
    localStorage.setItem(KEY, isDark ? THEMES.DARK : THEMES.LIGHT);
  } catch {
    // Sin persistencia el tema se reinicia al recargar: degradación aceptable.
  }
}
