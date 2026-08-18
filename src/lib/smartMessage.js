/**
 * src/lib/smartMessage.js
 *
 * Mensaje inteligente que reemplaza al saludo inicial de "Hoy" pasado un
 * rato, según la carga de trabajo del día y los puntos acumulados. Vive en
 * su propio módulo sin JSX, igual que `homeMessage.js`, para poder ajustar
 * el criterio sin tocar la coreografía de `AISequence.jsx`.
 *
 * `eventCount` es la cantidad de eventos de hoy que siguen pendientes
 * (`activeToday.length` en `EventContext`, la misma cuenta que ya usa el
 * aviso de la pestaña Agenda) — no el historial completo del día, porque una
 * agenda ya despachada no debe seguir leyéndose como "ocupada".
 *
 * El umbral de "puntos bajos" (10) es el mismo que ya separa el primer y
 * segundo tramo de color en `PointsPill.jsx`: no se inventó un corte nuevo
 * para este mensaje.
 */
const BUSY_EVENT_THRESHOLD = 3;
const LOW_POINTS_THRESHOLD = 10;

export function buildSmartMessage(eventCount, points) {
  if (eventCount >= BUSY_EVENT_THRESHOLD) {
    return 'Agenda con bastante movimiento hoy. Mucho éxito en tus citas.';
  }

  if (points < LOW_POINTS_THRESHOLD) {
    return 'Tienes espacio en tu agenda hoy. ¿Aprovechamos para agendar una cita inicial?';
  }

  return 'Buen ritmo. Tienes tiempo libre para pedir un par de referidos y llegar a tu meta.';
}
