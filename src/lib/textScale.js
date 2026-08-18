/**
 * src/lib/textScale.js
 *
 * Preferencia global de tamaño de texto, para quien no lee bien la
 * tipografía por omisión — el caso que la motivó son adultos mayores, pero
 * sirve a cualquiera.
 *
 * La app usa dos tipos de tamaño de texto y sólo uno de los dos escala con
 * esto:
 *
 *  - Las clases estándar de Tailwind (`text-sm`, `text-xs`, `text-lg`...) se
 *    definen en `rem`, así que heredan el tamaño de fuente del elemento
 *    raíz. Cambiar el `font-size` de `<html>` las escala a TODAS sin tocar
 *    ni un componente — son la mayoría del texto de la app.
 *  - Los tamaños arbitrarios en píxeles fijos (`text-[11px]`, `text-[10px]`)
 *    NO escalan: `px` es una unidad absoluta y no hereda nada del elemento
 *    raíz. Esta preferencia no los alcanza; conviven con el resto del texto
 *    en su tamaño de siempre hasta que se conviertan uno por uno a `rem`.
 *
 * Se guarda en `localStorage` y no en `sessionStorage` (a diferencia de la
 * preferencia de qué versión de captura se usa, por ejemplo): es una
 * necesidad de accesibilidad, no una elección de qué probar hoy, y tiene que
 * seguir aplicada la próxima vez que se abra la app, en cualquier pestaña.
 */
import { readPreference, writePreference } from './uiPreference';

const STORAGE_KEY = 'df360:textScale:v1';

/**
 * Los tres niveles ofrecidos, con el porcentaje que se aplica al `font-size`
 * raíz. 100% es el tamaño de diseño original; los otros dos escalan en
 * bloques de 15 puntos porcentuales — bastante para notarse en el primer
 * vistazo, sin doblar el tamaño y romper el acomodo de las pantallas más
 * densas (tablas, formularios de varias columnas).
 */
export const TEXT_SCALES = [
  { value: 'normal', label: 'A', percent: 100 },
  { value: 'large', label: 'A', percent: 115 },
  { value: 'xlarge', label: 'A', percent: 130 },
];

const VALUES = TEXT_SCALES.map((s) => s.value);

export function readTextScale() {
  return readPreference(STORAGE_KEY, VALUES, 'normal');
}

export function writeTextScale(value) {
  writePreference(STORAGE_KEY, value);
}

/**
 * Aplica el porcentaje al documento. Se llama al elegir una opción nueva y
 * también una vez al arrancar la app (ver `main.jsx`), antes del primer
 * render: aplicarlo después dejaría ver un parpadeo del tamaño de diseño
 * saltando al tamaño elegido.
 */
export function applyTextScale(value) {
  const scale = TEXT_SCALES.find((s) => s.value === value) ?? TEXT_SCALES[0];
  document.documentElement.style.fontSize = `${scale.percent}%`;
}
