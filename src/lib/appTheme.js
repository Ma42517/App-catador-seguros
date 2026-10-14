/**
 * src/lib/appTheme.js
 *
 * Tema visual elegido por la persona en la bienvenida: negro, blanco o crema.
 *
 * Los colores salen del manual de identidad de EXPANDIA (rebranding de Prospecta):
 *   Negro Carbón #111111 · Blanco #FFFFFF · Crema/Beige #F5EFE6 · Navy #0B1A30 ·
 *   Acento Cyan #38BDF8. Cada tema es una de las versiones oficiales del logo.
 *
 * FASE 1 — por ahora el tema sólo lo consumen la bienvenida y el login, que son
 * las únicas pantallas construidas para los tres fondos. El resto de la app sigue
 * siendo oscura hasta que, en una fase posterior, se propaguen estos tokens a los
 * demás módulos. La preferencia se guarda desde ya para no volver a preguntar.
 *
 * El valor por omisión es 'dark' (negro): es el tema que la app tiene construido
 * de punta a punta, así que arrancar ahí evita el salto de entrar en crema y caer
 * en un interior negro. La persona lo cambia en la bienvenida si quiere.
 */
import { readPreference, writePreference } from './uiPreference';

const STORAGE_KEY = 'expandia:appTheme:v1';

/* Colores de marca, en un solo lugar. */
export const BRAND = {
  carbon: '#111111',
  white: '#FFFFFF',
  cream: '#F5EFE6',
  navy: '#0B1A30',
  ink: '#0F172A',
  cyan: '#38BDF8',
  blue: '#2563EB',
};

/*
  Color de los botones por tema. El cyan brillante sólo luce sobre el negro; sobre
  blanco o crema se ve chillante y no combina. Por eso cada tema usa un botón que
  armoniza con su fondo, con su propio color de texto encima:
    - negro  → cyan brillante, texto navy (destaca sobre el fondo oscuro)
    - blanco → navy profundo, texto blanco (sobrio, elegante sobre blanco)
    - crema  → navy de marca, texto crema (combina con el beige)
*/
const THEME_BUTTON = {
  dark: { accent: '#38BDF8', onAccent: '#0B1A30' },
  light: { accent: '#0B1A30', onAccent: '#FFFFFF' },
  // Crema: verde bosque ejecutivo (paleta del rediseño del tema beige), con texto
  // marfil encima. Reemplaza el navy para dar la calidez del tema crema.
  cream: { accent: '#1B4332', onAccent: '#FFFDF9' },
};

/**
 * Los tres temas ofrecidos. `swatch` es el color del círculo selector. `accent`
 * es la chispa/acento de ese tema (botones, detalles). Los campos de clase
 * (`bg`/`panel`/`text`/...) los aplican la bienvenida y el login; donde el color
 * exacto del manual no tiene clase de Tailwind, va como estilo en línea
 * (`*Style`), para no inventar un tono aproximado.
 */
export const APP_THEMES = [
  {
    value: 'dark',
    label: 'Negro',
    swatch: BRAND.carbon,
    accent: THEME_BUTTON.dark.accent,
    onAccent: THEME_BUTTON.dark.onAccent,
    ring: 'ring-white/40',
    bg: 'text-[#F5EFE6]',
    bgStyle: { backgroundColor: BRAND.carbon },
    panel: 'border-white/10',
    panelStyle: { backgroundColor: '#1a1a1a' },
    text: 'text-[#F5EFE6]',
    muted: 'text-stone-400',
    faint: 'text-stone-500',
    inputBg: 'border-white/15 text-[#F5EFE6] placeholder:text-stone-500',
    inputStyle: { backgroundColor: '#1a1a1a' },
  },
  {
    value: 'light',
    label: 'Blanco',
    swatch: BRAND.white,
    accent: THEME_BUTTON.light.accent,
    onAccent: THEME_BUTTON.light.onAccent,
    ring: 'ring-zinc-900/40',
    bg: 'text-[#0F172A]',
    bgStyle: { backgroundColor: BRAND.white },
    panel: 'border-zinc-200 shadow-xl shadow-zinc-200/60',
    panelStyle: { backgroundColor: BRAND.white },
    text: 'text-[#0F172A]',
    muted: 'text-zinc-500',
    faint: 'text-zinc-400',
    inputBg: 'border-zinc-300 text-[#0F172A] placeholder:text-zinc-400',
    inputStyle: { backgroundColor: '#f8fafc' },
  },
  {
    value: 'cream',
    label: 'Crema',
    swatch: BRAND.cream,
    accent: THEME_BUTTON.cream.accent,
    onAccent: THEME_BUTTON.cream.onAccent,
    ring: 'ring-[#0B1A30]/35',
    bg: 'text-[#0B1A30]',
    bgStyle: { backgroundColor: BRAND.cream },
    panel: 'border-stone-300/70',
    panelStyle: { backgroundColor: '#fbf8f1' },
    text: 'text-[#0B1A30]',
    muted: 'text-stone-500',
    faint: 'text-stone-400',
    inputBg: 'border-stone-300 text-[#0B1A30] placeholder:text-stone-400',
    inputStyle: { backgroundColor: '#fbf8f1' },
  },
];

const VALUES = APP_THEMES.map((t) => t.value);

/** El tema por omisión: negro, el único construido para toda la app. */
export const DEFAULT_THEME = 'dark';

export function readAppTheme() {
  return readPreference(STORAGE_KEY, VALUES, DEFAULT_THEME);
}

export function writeAppTheme(value) {
  writePreference(STORAGE_KEY, value);
}

/** Devuelve el objeto de tema completo (con sus clases) a partir del valor. */
export function themeFor(value) {
  return APP_THEMES.find((t) => t.value === value) ?? APP_THEMES[0];
}

/**
 * Aplica el tema a TODA la app, escribiendo la clase correcta en el `<html>`.
 *
 * La app interior está construida con el sistema `dark:` de Tailwind (pares
 * `bg-white dark:bg-zinc-900`), gobernado por la clase del `<html>`. Antes esa clase
 * era `dark` fija; ahora la decide el tema elegido:
 *   - negro  → `dark`  (mitad oscura de cada par)
 *   - blanco → sin clase (mitad clara, que ya existía y nunca se veía)
 *   - crema  → `theme-cream` (mitad clara + un tinte beige propio, ver index.css)
 *
 * Se llama al arrancar (main.jsx) antes del primer render, y cada vez que se cambia
 * el tema, para que todo repinte sin recargar.
 */
export function applyAppTheme(value) {
  const t = themeFor(value);
  const html = document.documentElement;
  // Oscuro usa la clase `dark` de Tailwind; blanco y crema NO (son "modo claro").
  html.classList.toggle('dark', t.value === 'dark');
  // Crema añade su propia clase para el tinte beige por encima del modo claro.
  html.classList.toggle('theme-cream', t.value === 'cream');
}
