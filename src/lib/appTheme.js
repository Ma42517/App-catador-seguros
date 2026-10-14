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
    accent: BRAND.cyan,
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
    accent: BRAND.cyan,
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
    accent: BRAND.blue,
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
