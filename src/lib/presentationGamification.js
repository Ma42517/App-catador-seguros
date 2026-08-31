/**
 * src/lib/presentationGamification.js
 *
 * Tabulador de puntos del cierre de una Cita Inicial
 * (`PresentationEndModal.jsx`). Mismo criterio que `callGamification.js`:
 * el número vive aparte del componente que lo aplica.
 */
export const PRESENTATION_END_GAMIFICATION = {
  /** Las 3 resoluciones ("Avanzamos", "Seguimiento", "No califica") valen lo mismo: el premio es haber cerrado el expediente con honestidad, no el resultado en sí. */
  RESOLUTION_BASE: 3,
  /**
   * Bono por los 3 Pases VIP de cortesía que el cliente entrega al cerrar la
   * cita (`PresentationEndModal.jsx`, vía `VIPPassFields.jsx`).
   *
   * Aquí hubo antes un bono por "solicitar referidos" y se quitó con una
   * razón: era una pregunta de memoria, un sí/no después de la cita, sin
   * ninguna forma de comprobar que en verdad se pidieron — un dato que se
   * presta a inventarse sólo para sumar puntos.
   *
   * Esa objeción ya no aplica. Ahora no se pregunta si los pidió: se capturan
   * los tres nombres con su WhatsApp, quedan guardados como pases
   * (`data/vipPasses.js`) y desde ahí se les puede escribir. El bono premia un
   * dato que existe y se puede usar, no un recuerdo. Vale más que la
   * resolución en sí porque conseguir tres referidos frente al cliente es la
   * parte difícil de la cita.
   */
  REFERRAL_BONUS: 5,
};
