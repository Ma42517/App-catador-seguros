/**
 * src/data/swipeTutorial.js
 *
 * Bandera de si la persona ya vio el "Nudge" (el asomo de 20px hacia la
 * izquierda que enseña que las tarjetas de la agenda se pueden deslizar,
 * ver `SwipeableCard.jsx`). Vive en su propio módulo, con el mismo patrón
 * try/catch que el resto de `data/*.js`, para no repetir el acceso crudo a
 * `localStorage` dentro del componente.
 *
 * No se guarda por usuario a propósito: es una pista de la interfaz, no un
 * dato de negocio — basta con mostrarla una sola vez por navegador/
 * dispositivo, y separarla por persona complicaría el helper sin ganar
 * nada real.
 */
const KEY = 'df360:hasSeenSwipeTutorial:v1';

export function hasSeenSwipeTutorial() {
  try {
    return localStorage.getItem(KEY) === '1';
  } catch {
    // Sin localStorage se asume que no lo ha visto: el nudge se repetiría
    // en cada visita, que es un costo menor que nunca mostrarlo.
    return false;
  }
}

export function markSwipeTutorialSeen() {
  try {
    localStorage.setItem(KEY, '1');
  } catch {
    // Sin persistencia el nudge se repetirá la próxima vez: no rompe nada.
  }
}

/*
  Candado en memoria (no en `localStorage`, no persiste entre recargas):
  quien pinta "Hoy" o "Agenda" monta muchas `SwipeableCard` a la vez —una
  por cada notificación/actividad—, y cada una corre su propio `useEffect`
  al montarse. Sin este candado, todas verían `hasSeenSwipeTutorial()` en
  `false` en el mismo instante y las verían asomarse *a la vez*, un Nudge
  por tarjeta en toda la pantalla —el "efecto circo" que se pidió evitar
  desde el principio—. Con el candado, sólo la primera tarjeta que llega a
  preguntar (la primera de la lista, porque React corre los efectos en el
  orden en que los componentes aparecen en el árbol) se queda con el
  turno; las demás, montadas en el mismo ciclo, ya lo encuentran tomado y
  no animan nada.
*/
let claimedThisPageLoad = false;

/**
 * Intenta reservar el turno del Nudge para quien llama primero.
 * @returns {boolean} `true` sólo para la primera `SwipeableCard` que lo
 *   pide en esta carga de página, y sólo si nadie lo ha visto antes.
 */
export function claimSwipeTutorial() {
  if (hasSeenSwipeTutorial() || claimedThisPageLoad) return false;
  claimedThisPageLoad = true;
  return true;
}
