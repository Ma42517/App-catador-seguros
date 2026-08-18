/**
 * src/lib/homeIntroMemory.js
 *
 * Memoria de sesión de la animación de bienvenida de "Hoy": el mensaje
 * escribiéndose letra por letra la primera vez que se entra en esta
 * pestaña. Vive en su propio módulo, y no dentro de `AISequence.jsx`, porque
 * dos piezas necesitan leer y decidir sobre el mismo estado:
 *
 *  - `AISequence.jsx` para saber si debe animar el mensaje o mostrarlo
 *    completo desde el primer render.
 *  - `AdminLayout.jsx`, que corre su propia instancia de `useTypewriter`
 *    sobre el mismo texto para decidir cuándo revelar la barra de
 *    navegación inferior (`revealed={!isHomeTextTyping}`).
 *
 * Si sólo `AISequence` conociera la memoria, la intro aparecería de golpe
 * en el centro de la pantalla mientras la barra de abajo seguiría esperando
 * a que una animación —que en realidad nunca ocurrió— termine de "escribir".
 * Las dos instancias tienen que leer la misma memoria para no desincronizarse.
 *
 * `sessionStorage` y no `localStorage`: se quiere volver a ver la próxima
 * vez que se abra la app de cero, no perderla para siempre en este
 * dispositivo.
 */
const INTRO_SEEN_KEY = 'df360:homeIntroSeen';

export function hasSeenIntro() {
  try {
    return sessionStorage.getItem(INTRO_SEEN_KEY) === 'true';
  } catch {
    // Modo privado o almacenamiento bloqueado: se repite la animación, sin romper nada.
    return false;
  }
}

export function markIntroSeen() {
  try {
    sessionStorage.setItem(INTRO_SEEN_KEY, 'true');
  } catch {
    /* Igual que arriba: sin almacenamiento, no hay nada que persistir. */
  }
}
