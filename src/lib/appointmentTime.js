/**
 * src/lib/appointmentTime.js
 *
 * Duración por defecto de una Cita Inicial cuando el evento no trae una hora
 * de fin propia — el formulario actual sólo captura fecha y hora de inicio
 * (`ActivityForm.jsx`), no una duración. Una hora es lo que en la práctica
 * dura un primer encuentro con un prospecto; el día que el formulario llegue
 * a capturar la duración real, esta constante deja de usarse sin tocar nada
 * de la lógica del Reloj de Arena que la consume.
 */
export const DEFAULT_MEETING_DURATION_MIN = 60;

/**
 * Marca de tiempo (ms) en la que termina la cita, o `null` si el evento no
 * trae una fecha/hora válida — mismo criterio que `getEventStatus`
 * (`eventStatus.js`): sin hora no hay nada que comparar, así que el Reloj de
 * Arena de `useHourglassTimer.js` nunca debe expirar para ese evento.
 *
 * La fecha se descompone a mano en vez de pasarle el texto a `new Date()`
 * directo, por la misma razón ya documentada en `eventStatus.js`:
 * `new Date('2026-08-10')` se interpreta como UTC y en México puede
 * adelantar el evento de día.
 *
 * @param {{date?: string, time?: string}} event
 * @param {number} [durationMin] Duración asumida de la cita, en minutos.
 * @returns {number|null}
 */
export function computeEndTime(event, durationMin = DEFAULT_MEETING_DURATION_MIN) {
  const timeMatch = /^(\d{1,2}):(\d{2})$/.exec(String(event?.time ?? '').trim());
  const dateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(event?.date ?? '').trim());
  if (!timeMatch || !dateMatch) return null;

  const hours = Number(timeMatch[1]);
  const minutes = Number(timeMatch[2]);
  if (hours > 23 || minutes > 59) return null;

  const target = new Date();
  target.setFullYear(Number(dateMatch[1]), Number(dateMatch[2]) - 1, Number(dateMatch[3]));
  target.setHours(hours, minutes, 0, 0);
  target.setMinutes(target.getMinutes() + durationMin);
  return target.getTime();
}
