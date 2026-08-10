/**
 * Vibración de respuesta al tacto.
 *
 * Se llama siempre desde el manejador de un toque o clic, nunca al cargar la
 * pantalla: Chrome en Android descarta `navigator.vibrate` mientras la persona
 * no haya interactuado con la página —es una protección contra sitios que
 * vibran el teléfono sin permiso—, así que una vibración de bienvenida
 * simplemente no se siente. Dentro de un `onClick` el gesto ya ocurrió y la
 * llamada sí surte efecto.
 *
 * En iOS no hay nada que hacer: WebKit no implementa la API de vibración, así
 * que `navigator.vibrate` no existe y la función no hace nada. Comprobarlo
 * antes evita un error en cada toque.
 */

/** Golpe corto de confirmación, para botones y enlaces. */
export const TAP_MS = 12;

/** Patrón de cierre, para acciones que completan algo (pulso-pausa-pulso). */
export const SUCCESS_PATTERN = [30, 40, 60];

export function tapFeedback(pattern = TAP_MS) {
  if (typeof navigator !== 'undefined' && navigator.vibrate) {
    navigator.vibrate(pattern);
  }
}
