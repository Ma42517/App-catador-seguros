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
  /*
    Ya no existe un bono por "solicitar referidos": era una pregunta de
    memoria, después de la cita, sin ninguna forma de comprobar que en
    verdad se pidieron durante la conversación — un dato que se presta a
    inventarse sólo para sumar puntos.
  */
};
