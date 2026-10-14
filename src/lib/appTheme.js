/**
 * src/lib/appTheme.js
 *
 * Tema visual elegido por la persona en la bienvenida: oscuro, claro o crema.
 *
 * FASE 1 — por ahora el tema sólo lo consumen la bienvenida y el login, que son
 * las únicas pantallas construidas para los tres fondos. El resto de la app sigue
 * siendo oscura hasta que, en una fase posterior, se propaguen los tokens de color
 * claro/crema a los demás módulos. La preferencia se guarda desde ya para que ese
 * día no haya que volver a preguntar.
 *
 * El valor por omisión es 'dark': es el tema que la app tiene construido de punta a
 * punta, así que arrancar ahí evita el salto de entrar en crema y caer en un
 * diagnóstico negro. La persona lo cambia en la bienvenida si quiere.
 */
import { readPreference, writePreference } from './uiPreference';

const STORAGE_KEY = 'expandia:appTheme:v1';

/**
 * Los tres temas ofrecidos, con el color del círculo que los representa en la
 * bienvenida y las clases de superficie/los colores que usan la bienvenida y el
 * login. Un solo lugar: el círculo que se toca y el fondo que se pinta salen de
 * la misma fuente, así no pueden decir cosas distintas.
 *
 * `swatch` es el color del círculo selector. `bg`/`panel`/`text`/`muted`/`border`
 * son las clases que aplican la bienvenida y el login según el tema elegido.
 */
export const APP_THEMES = [
  {
    value: 'dark',
    label: 'Oscuro',
    swatch: '#0a0a0a',
    ring: 'ring-white/30',
    bg: 'bg-black text-zinc-100',
    panel: 'bg-zinc-900/80 border-zinc-800',
    text: 'text-zinc-50',
    muted: 'text-zinc-400',
    faint: 'text-zinc-600',
    inputBg: 'bg-zinc-950/60 border-zinc-700 text-zinc-100 placeholder:text-zinc-600',
  },
  {
    value: 'light',
    label: 'Claro',
    swatch: '#f5f5f4',
    ring: 'ring-zinc-900/40',
    bg: 'bg-white text-zinc-900',
    panel: 'bg-white border-zinc-200 shadow-xl shadow-zinc-200/60',
    text: 'text-zinc-900',
    muted: 'text-zinc-500',
    faint: 'text-zinc-400',
    inputBg: 'bg-zinc-50 border-zinc-300 text-zinc-900 placeholder:text-zinc-400',
  },
  {
    value: 'cream',
    label: 'Crema',
    swatch: '#e8e0d0',
    ring: 'ring-amber-900/30',
    bg: 'text-stone-800',
    bgStyle: { backgroundColor: '#efe9dd' },
    panel: 'border-stone-300/70',
    panelStyle: { backgroundColor: '#f6f1e7' },
    text: 'text-stone-900',
    muted: 'text-stone-500',
    faint: 'text-stone-400',
    inputBg: 'border-stone-300 text-stone-900 placeholder:text-stone-400',
    inputStyle: { backgroundColor: '#fbf8f1' },
  },
];

const VALUES = APP_THEMES.map((t) => t.value);

/** El tema por omisión: oscuro, el único construido para toda la app. */
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
