/**
 * src/lib/proposalGamification.js
 *
 * Tabulador de puntos del router de ventas de la Cita de Propuesta
 * (`ProposalResolutionModal.jsx`). Mismo criterio que
 * `presentationGamification.js`/`callGamification.js`: el número vive
 * aparte del componente que lo aplica.
 */
export const PROPOSAL_GAMIFICATION = {
  /**
   * Las 3 resoluciones ("Emitir Póliza", "Pidió Ajustes", "No le
   * interesó") valen lo mismo: el premio es haber cerrado el expediente
   * con una decisión real, no el resultado en sí — mismo espíritu que
   * `PRESENTATION_END_GAMIFICATION.RESOLUTION_BASE`.
   */
  RESOLUTION_BASE: 3,
};
