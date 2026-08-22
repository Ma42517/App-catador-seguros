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
  /** Extra por haber pedido referidos en la misma cita, sin importar cuál de las 3 resoluciones se eligió. */
  REFERRAL_BONUS: 2,
};
