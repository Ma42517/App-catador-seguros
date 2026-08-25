/**
 * src/lib/paymentSchedule.js
 *
 * Calendario de cobros recurrentes de una póliza
 * (`PaymentCollectedModal.jsx`/`PaymentCollectionCard.jsx`).
 *
 * La lógica vive aparte del componente por lo mismo que
 * `Prospecta/citaInicial.js`: aquí hay aritmética de fechas con casos
 * borde reales (un cobro el 31 de enero, ¿cuándo cae "el mes que viene"?),
 * y reunida en un módulo se puede leer y corregir de un vistazo en vez de
 * quedar enterrada en el JSX de un modal.
 */

/**
 * Cada cuánto se cobra una póliza. `months: null` es el pago único: no
 * genera un cobro siguiente, y por eso existe como opción explícita en vez
 * de obligar a elegir una frecuencia falsa para una póliza de prima única.
 */
export const PAYMENT_FREQUENCIES = [
  { value: 'mensual', label: 'Mensual', months: 1 },
  { value: 'trimestral', label: 'Trimestral', months: 3 },
  { value: 'semestral', label: 'Semestral', months: 6 },
  { value: 'anual', label: 'Anual', months: 12 },
  { value: 'unico', label: 'Pago único', months: null },
];

/** Frecuencia por omisión: la más común en pólizas de vida con prima fraccionada. */
export const DEFAULT_PAYMENT_FREQUENCY = 'mensual';

/** Etiqueta legible de una frecuencia; cadena vacía si no está en el catálogo. */
export function paymentFrequencyLabel(value) {
  return PAYMENT_FREQUENCIES.find((option) => option.value === value)?.label ?? '';
}

/** Cuántos meses separan dos cobros de esa frecuencia; `null` en pago único. */
export function monthsFor(frequency) {
  return PAYMENT_FREQUENCIES.find((option) => option.value === frequency)?.months ?? null;
}

/** Fecha de hoy en el mismo formato que guardan los inputs nativos y la agenda. */
export function todayKey() {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

/**
 * Suma meses a una fecha `"YYYY-MM-DD"` y devuelve el mismo formato.
 *
 * El día se recorta al último del mes de destino cuando no existe: un cobro
 * el 31 de enero, sumando un mes, cae el 28 de febrero y no el 3 de marzo
 * —que es lo que haría `setMonth` por su cuenta, desbordando al mes
 * siguiente y corriendo todos los cobros posteriores un par de días—.
 *
 * La fecha se descompone a mano y no con `new Date(texto)`: ese constructor
 * interpreta `"2026-08-25"` como UTC y en México devolvería el día
 * anterior, misma precaución ya documentada en `eventStatus.js`.
 *
 * @param {string} dateKey Fecha en `"YYYY-MM-DD"`.
 * @param {number} months Meses a sumar.
 * @returns {string} Fecha resultante en `"YYYY-MM-DD"`, o cadena vacía si la entrada no era válida.
 */
export function addMonths(dateKey, months) {
  const parts = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(dateKey ?? ''));
  if (!parts) return '';

  const year = Number(parts[1]);
  const monthIndex = Number(parts[2]) - 1;
  const day = Number(parts[3]);

  // Día 1 del mes de destino: así el desbordamiento nunca ocurre al
  // construir la fecha, sólo al elegir el día, que es donde se controla.
  const target = new Date(year, monthIndex + months, 1);
  const lastDayOfTarget = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
  const safeDay = Math.min(day, lastDayOfTarget);

  const pad = (n) => String(n).padStart(2, '0');
  return `${target.getFullYear()}-${pad(target.getMonth() + 1)}-${pad(safeDay)}`;
}

/**
 * Cuándo toca el cobro siguiente, o cadena vacía si esta póliza no tiene
 * uno (pago único) — quien llama distingue así entre "no hay que agendar
 * nada" y una fecha real, sin tener que conocer el catálogo.
 */
export function nextPaymentDate(collectedOn, frequency) {
  const months = monthsFor(frequency);
  if (!months) return '';
  return addMonths(collectedOn, months);
}

/** Una fecha `"YYYY-MM-DD"` en palabras: "25 de agosto de 2026". */
export function formatPaymentDate(dateKey) {
  const parts = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(dateKey ?? ''));
  if (!parts) return '';
  const local = new Date(Number(parts[1]), Number(parts[2]) - 1, Number(parts[3]));
  return local.toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' });
}
