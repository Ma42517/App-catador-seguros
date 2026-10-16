/**
 * src/lib/publicBaseUrl.js
 *
 * Dominio base con el que se arman los enlaces que se COMPARTEN (QR y links de
 * tarjetas del asesor y de regalo).
 *
 * El problema que resuelve: antes los enlaces usaban `window.location.origin`,
 * es decir, el dominio DESDE EL QUE se abrió la app. Si el asesor entraba por un
 * despliegue de PREVIEW de Vercel (`...-git-main-....vercel.app`), el QR y el
 * enlace salían con ESE dominio —que Vercel protege con "inicia sesión en
 * Vercel" y no se puede abrir públicamente—, así que el tercero que escaneaba el
 * QR no veía la tarjeta, sino el muro de Vercel.
 *
 * La solución: si está definida `VITE_PUBLIC_BASE_URL` (el dominio de PRODUCCIÓN,
 * p. ej. `https://app-catador-seguros.vercel.app`), los enlaces se arman SIEMPRE
 * con ella, sin importar desde dónde se abrió la app. Si no está definida, se cae
 * a `window.location.origin` como antes (comportamiento seguro para desarrollo
 * local). Se recorta cualquier `/` final para no duplicarlo al concatenar.
 */
export function publicBaseUrl() {
  const configured = import.meta.env.VITE_PUBLIC_BASE_URL;
  if (configured && typeof configured === 'string') {
    return configured.replace(/\/+$/, '');
  }
  if (typeof window !== 'undefined') return window.location.origin;
  return '';
}
