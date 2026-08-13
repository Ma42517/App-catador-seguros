/**
 * src/engine/taxes.js — Módulo 3: Tax Engine
 *
 * REGLAS CRÍTICAS (motor de consistencia):
 *  - Si el ingreso capturado es NETO  -> los impuestos NO se vuelven a restar.
 *  - Si el ingreso capturado es BRUTO -> los impuestos se restan una sola vez.
 *  - Las devoluciones de impuestos son entradas extraordinarias ANUALES,
 *    nunca ingreso sostenible mensual.
 *
 * No hay legislación fiscal hardcodeada: todos los parámetros son editables.
 */
import { num, toMonthly, safeDiv } from './utils.js';

/**
 * @param {object} taxes
 * @param {number} taxes.withheld          - Impuesto retenido por el patrón.
 * @param {number} taxes.additionalPaid    - Impuestos adicionales pagados.
 * @param {number} taxes.provisionalPayments - Pagos provisionales.
 * @param {number} taxes.refunds           - Devoluciones recibidas (anual).
 * @param {string} taxes.frequency         - Frecuencia de los montos anteriores.
 * @param {string} incomeType              - 'net' | 'gross'
 * @param {number} grossIncomeMonthly      - Ingreso bruto mensual recurrente.
 */
export function calculateTaxes(taxes = {}, incomeType = 'net', grossIncomeMonthly = 0) {
  /*
    Mensual, igual que el estado inicial y que lo que muestra el selector.

    El respaldo era 'annual' y eso abría una discrepancia silenciosa de doce
    veces: un estado guardado sin `frequency` hacía que el selector mostrara
    "Mensual" —es la primera opción— mientras el motor dividía los montos entre
    doce. Los impuestos quedaban en una doceava parte sin que nada lo advirtiera.
  */
  const freq = taxes.frequency || 'monthly';

  const withheldMonthly = toMonthly(taxes.withheld, freq);
  const additionalMonthly = toMonthly(taxes.additionalPaid, freq);
  const provisionalMonthly = toMonthly(taxes.provisionalPayments, freq);

  // Carga fiscal total declarada, normalizada a mensual.
  const totalTaxMonthly = withheldMonthly + additionalMonthly + provisionalMonthly;

  // Devoluciones: SIEMPRE tratadas como entrada extraordinaria anual.
  const refundsAnnual = num(taxes.refunds);

  const isGross = incomeType === 'gross';

  // Sólo se deduce del flujo cuando el ingreso se capturó en bruto.
  const taxDeductionMonthly = isGross ? totalTaxMonthly : 0;


  // Tasa efectiva estimada sobre el ingreso bruto.
  const effectiveRate = safeDiv(totalTaxMonthly, grossIncomeMonthly);

  // Saldo fiscal: positivo = a cargo, negativo = a favor.
  const balanceAnnual = totalTaxMonthly * 12 - refundsAnnual;

  return {
    incomeType,
    isGross,

    withheldMonthly,
    additionalMonthly,
    provisionalMonthly,
    totalTaxMonthly,
    totalTaxAnnual: totalTaxMonthly * 12,

    /**
     * Monto que el motor central debe restar del ingreso.
     * Es 0 cuando el ingreso ya venía neto: así se evita la doble deducción.
     */
    taxDeductionMonthly,

    refundsAnnual,
    balanceAnnual,
    effectiveRate,
  };
}
