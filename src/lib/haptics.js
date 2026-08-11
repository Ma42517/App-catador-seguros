/**
 * Vibración de respuesta al tacto.
 *
 * Se llama siempre desde el manejador de un toque o clic, o desde el latido de
 * un temporizador que la persona puso en marcha, nunca al cargar la pantalla:
 * Chrome en Android descarta `navigator.vibrate` mientras no haya habido
 * interacción con la página —es una protección contra sitios que vibran el
 * teléfono sin permiso—, así que una vibración de bienvenida simplemente no se
 * siente. Después de un gesto, la llamada sí surte efecto.
 *
 * En iOS no hay nada que hacer: WebKit no implementa la API de vibración, así
 * que `navigator.vibrate` no existe y la función no hace nada. Comprobarlo
 * antes evita un error en cada toque.
 */

/** Golpe corto de confirmación, para botones de navegación y enlaces. */
export const TAP_MS = 15;

/**
 * Golpe del ajuste acelerado del reloj de enfoque.
 *
 * Más marcado que el normal, y ahí está su función: cuando el botón pasa de sumar
 * treinta segundos a sumar un minuto, el dedo lo nota sin necesidad de leer la
 * etiqueta. Es la misma información por otro canal, útil justamente porque quien
 * acelera está tocando rápido y no mirando.
 */
export const FAST_TAP_MS = 28;

/** Patrón de cierre, para acciones que completan algo (pulso-pausa-pulso). */
export const SUCCESS_PATTERN = [30, 40, 60];

/**
 * Aviso al cruzar cada tramo de cinco minutos de un bloque de enfoque.
 *
 * Suave a propósito: informa sin cortar la concentración, que es justo lo que
 * el bloque intenta proteger.
 */
export const MILESTONE_PATTERN = [30, 50, 30];

/**
 * Cierre del bloque de enfoque.
 *
 * Largo y escalonado para que no se confunda con un aviso de tramo: se siente
 * incluso con el teléfono boca abajo sobre la mesa, que es donde acaba durante
 * una sesión de trabajo.
 */
export const SESSION_END_PATTERN = [100, 50, 100, 50, 200, 50, 300];

/** Cada cuántos segundos cae un aviso de tramo dentro de un bloque. */
export const MILESTONE_STEP_SEC = 300;

export function tapFeedback(pattern = TAP_MS) {
  if (typeof navigator !== 'undefined' && navigator.vibrate) {
    navigator.vibrate(pattern);
  }
}
