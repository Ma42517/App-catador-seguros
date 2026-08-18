/**
 * src/lib/alertExpiry.js
 *
 * Ventana de vida de un Aviso (`PriorityAlerts.jsx`) según su fecha
 * programada (`eventDate`, formato `"YYYY-MM-DD"`).
 *
 * Un aviso no desaparece a la medianoche de su propio día: si es del 7 de
 * agosto, sigue siendo relevante toda la mañana del 8 —por si la junta se
 * corrió tarde, o alguien lo revisa recién despierto—. El margen se cierra
 * a las 4:00 AM del día siguiente, no a las 00:00, ni sigue abierto para
 * siempre.
 *
 * Vive en su propio módulo sin JSX, igual que `homeMessage.js` y
 * `smartMessage.js`, para poder probar y ajustar el corte sin tocar el
 * componente que lo consume.
 */

/** A qué hora del día siguiente se cierra la ventana. */
const EXPIRY_HOUR = 4;

/**
 * ¿Sigue vigente un aviso con esta fecha programada?
 *
 * Sin `eventDate` no hay nada que expirar por este criterio — es un aviso
 * sin fecha de evento, y sigue visible hasta que el asesor lo contesta,
 * como ya hacía antes de esta regla.
 *
 * La fecha se descompone a mano (año/mes/día) y no se pasa el texto entero
 * a `new Date('2026-08-07')`: ese formato se interpreta como UTC, y en
 * México el aviso se habría dado por vencido varias horas antes de tiempo.
 * Es el mismo motivo, y el mismo arreglo, que ya usa `getEventStatus` en
 * `eventStatus.js`.
 *
 * @param {string} eventDate - Fecha del aviso, `"YYYY-MM-DD"`.
 * @param {Date} [now] - Reloj a usar; se inyecta para poder probarlo.
 */
export function isAlertActive(eventDate, now = new Date()) {
  if (!eventDate) return true;

  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(eventDate);
  if (!match) return true;

  const [, year, month, day] = match.map(Number);

  /*
    `day + 1` y no una suma de milisegundos: `Date` normaliza el desborde de
    mes o de año por su cuenta (el 31 de diciembre + 1 día es el 1 de enero
    siguiente), así que no hace falta calcular a mano cuántos días tiene
    cada mes.
  */
  const deadline = new Date(year, month - 1, day + 1, EXPIRY_HOUR, 0, 0, 0);

  return now.getTime() < deadline.getTime();
}
