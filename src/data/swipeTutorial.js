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
