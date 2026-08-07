/**
 * src/engine/utils.js
 * Primitivas numéricas y financieras. Funciones puras, a prueba de NaN/Infinity.
 */

/** Coerción segura a número finito. */
export function num(v, fallback = 0) {
  const n = typeof v === 'number' ? v : parseFloat(v);
  return Number.isFinite(n) ? n : fallback;
}

/** División segura: nunca devuelve NaN ni Infinity. */
export function safeDiv(a, b) {
  const d = num(b);
  if (d === 0) return 0;
  const r = num(a) / d;
  return Number.isFinite(r) ? r : 0;
}

export function clamp(v, min, max) {
  return Math.min(max, Math.max(min, num(v)));
}

export const FREQUENCY_OPTIONS = [
  { value: 'monthly', label: 'Mensual' },
  { value: 'quarterly', label: 'Trimestral' },
  { value: 'annual', label: 'Anual' },
  { value: 'one-time', label: 'Única vez' },
];

/**
 * Equivalente mensual recurrente.
 * Los montos 'one-time' NO son recurrentes: aportan 0 al flujo mensual.
 */
export function toMonthly(amount, frequency = 'monthly') {
  const a = num(amount);
  switch (frequency) {
    case 'annual': return a / 12;
    case 'quarterly': return a / 3;
    case 'one-time': return 0;
    case 'monthly':
    default: return a;
  }
}

/** Equivalente anual recurrente (excluye 'one-time'). */
export function toAnnual(amount, frequency = 'monthly') {
  return toMonthly(amount, frequency) * 12;
}


/** Monto de impacto único en el año (sólo aplica a 'one-time'). */
export function oneTimeAnnual(amount, frequency) {
  return frequency === 'one-time' ? num(amount) : 0;
}

// ─── Formato ────────────────────────────────────────────────────────────────

const mxn0 = new Intl.NumberFormat('es-MX', {
  style: 'currency', currency: 'MXN',
  minimumFractionDigits: 0, maximumFractionDigits: 0,
});

/** Formato moneda MXN sin decimales. */
export function fmtMXN(v) {
  return mxn0.format(num(v));
}

/** Formato porcentaje. `v` es decimal (0.35 => "35.0%"). */
export function fmtPct(v, digits = 1) {
  return `${(num(v) * 100).toFixed(digits)}%`;
}

/** Formato compacto para ejes de gráficas: 1.2M, 45k. */
export function fmtCompact(v) {
  const n = num(v);
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${Math.round(n / 1_000)}k`;
  return `${Math.round(n)}`;
}

// ─── Matemática financiera ──────────────────────────────────────────────────

/** Tasa real: (1 + nominal) / (1 + inflación) - 1 */
export function realRate(nominal, inflation) {
  const denom = 1 + num(inflation);
  if (denom === 0) return 0;
  const r = (1 + num(nominal)) / denom - 1;
  return Number.isFinite(r) ? r : 0;
}

/** Convierte tasa anual efectiva a tasa mensual equivalente. */
export function toMonthlyRate(annualRate) {
  const r = num(annualRate);
  if (r <= -1) return 0;
  const m = Math.pow(1 + r, 1 / 12) - 1;
  return Number.isFinite(m) ? m : 0;
}


/** Valor futuro de un monto presente. */
export function futureValue(present, rate, periods) {
  const r = num(rate);
  const n = Math.max(0, num(periods));
  if (r <= -1) return num(present);
  const fv = num(present) * Math.pow(1 + r, n);
  return Number.isFinite(fv) ? fv : 0;
}

/** Valor presente de un monto futuro. */
export function presentValue(future, rate, periods) {
  const r = num(rate);
  const n = Math.max(0, num(periods));
  if (r <= -1) return num(future);
  const pv = num(future) / Math.pow(1 + r, n);
  return Number.isFinite(pv) ? pv : 0;
}

/** Valor futuro de una anualidad (aportaciones periódicas al final del periodo). */
export function fvAnnuity(payment, rate, periods) {
  const pmt = num(payment);
  const r = num(rate);
  const n = Math.max(0, num(periods));
  if (n === 0) return 0;
  if (r === 0) return pmt * n;
  const fv = pmt * ((Math.pow(1 + r, n) - 1) / r);
  return Number.isFinite(fv) ? fv : 0;
}

/** Aportación periódica necesaria para alcanzar un valor futuro. */
export function pmtForFutureValue(target, rate, periods) {
  const fv = num(target);
  const r = num(rate);
  const n = Math.max(0, num(periods));
  if (n === 0) return 0;
  if (r === 0) return fv / n;
  const factor = Math.pow(1 + r, n) - 1;
  if (factor === 0) return 0;
  const pmt = (fv * r) / factor;
  return Number.isFinite(pmt) ? pmt : 0;
}


/**
 * Valor presente de una anualidad: capital necesario hoy para retirar `payment`
 * por `periods` periodos a una tasa `rate` por periodo.
 */
export function pvAnnuity(payment, rate, periods) {
  const pmt = num(payment);
  const r = num(rate);
  const n = Math.max(0, num(periods));
  if (n === 0) return 0;
  if (r === 0) return pmt * n;
  const pv = pmt * ((1 - Math.pow(1 + r, -n)) / r);
  return Number.isFinite(pv) ? pv : 0;
}

/**
 * Meses para liquidar un saldo con pago fijo y tasa mensual.
 * Devuelve Infinity lógico como `null` cuando el pago no cubre los intereses.
 */
export function payoffMonths(balance, monthlyRate, payment) {
  const b = num(balance);
  const r = num(monthlyRate);
  const p = num(payment);
  if (b <= 0) return 0;
  if (p <= 0) return null;
  if (r === 0) return Math.ceil(b / p);
  const monthlyInterest = b * r;
  if (p <= monthlyInterest) return null; // nunca se liquida
  const n = -Math.log(1 - (r * b) / p) / Math.log(1 + r);
  return Number.isFinite(n) ? Math.ceil(n) : null;
}

/** Interés total pagado a lo largo de la vida de la deuda. */
export function totalInterest(balance, monthlyRate, payment) {
  const months = payoffMonths(balance, monthlyRate, payment);
  if (months === null) return null;
  const paid = num(payment) * months;
  return Math.max(0, paid - num(balance));
}

/** Genera un id corto único. */
let seq = 0;
export function uid(prefix = 'id') {
  seq += 1;
  return `${prefix}_${Date.now().toString(36)}${seq.toString(36)}`;
}
