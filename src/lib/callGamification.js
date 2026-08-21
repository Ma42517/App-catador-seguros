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
   * "Agendar Cita" tras una llamada siempre crea una Cita Inicial —el
   * primer encuentro con el prospecto, no una cita de cierre—, y su valor
   * es fijo: 3 puntos. Una cita de cierre vale más (5 puntos), pero ese
   * resultado pertenece a un flujo posterior (el feedback de la propia
   * Cita Inicial, todavía no construido), no al de esta llamada.
   */
  CITA_AGENDADA: 3,
};
