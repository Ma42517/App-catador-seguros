/**
 * src/lib/callGamification.js
 *
 * Tabulador de puntos del feedback de llamadas (`CallFeedbackModal.jsx`).
 * Vive en su propio módulo, sin JSX, por la misma razón que
 * `advisorOnboarding.js`: el número se puede ajustar sin tocar el
 * componente que lo aplica, y cualquier otra pantalla que en el futuro
 * necesite mostrar "cuánto vale cada resultado" lo lee de aquí, no de un
 * literal repetido dentro del modal.
 */
export const CALL_GAMIFICATION = {
  /**
   * "No contestó", "Reagendar" y "No está interesado" valen lo mismo: son
   * el premio al esfuerzo de haber marcado y reportado con honestidad el
   * resultado, no al resultado en sí — btw limpiar la base de un prospecto
   * frío vale tanto como intentarlo de nuevo más tarde.
   */
  LLAMADA_ESFUERZO: 0.5,

  /**
   * Agendar una cita a partir de esta llamada. El pedido original deja
   * abierta la posibilidad de que una cita de cierre valga más (5 en vez
   * de 3) — eso depende de un flujo posterior que hoy no existe (este
   * modal no distingue tipos de cita), así que por ahora es un valor
   * único y fijo.
   */
  CITA_AGENDADA: 3,
};
