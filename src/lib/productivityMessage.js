/**
 * src/lib/productivityMessage.js
 *
 * Mensaje del "termómetro de productividad" de la pantalla de inicio, según
 * los puntos acumulados en el día. Vive en su propio módulo sin JSX, igual
 * que `homeMessage.js`, para que la elección de texto se pueda ajustar sin
 * tocar el componente que la muestra (`AISequence.jsx`).
 */
export function buildProductivityMessage(puntos) {
  // Se protege contra negativos por si algún día llega un valor sin validar
  // desde arriba; hoy `puntosActuales` siempre nace en 0 o positivo.
  const safePoints = Math.max(0, puntos);

  if (safePoints === 0) {
    return 'El día está en blanco. ¿Comenzamos con un par de llamadas a prospectos?';
  }
  if (safePoints <= 15) {
    return 'Buen ritmo de trabajo. Una cita inicial te acercaría a tu meta.';
  }
  if (safePoints < 25) {
    return 'Estás muy cerca de tu objetivo diario. ¿Cerramos el día pidiendo referidos?';
  }
  return 'Objetivo diario alcanzado. Excelente gestión hoy.';
}
