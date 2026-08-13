/**
 * src/engine/consistency.js — Motor de consistencia
 *
 * Audita la matriz buscando contradicciones estructurales. No calcula
 * finanzas nuevas: verifica que lo ya calculado sea internamente coherente.
 */
import { fmtMXN, fmtPct } from './utils.js';

const TOLERANCE = 1; // 1 peso de tolerancia por redondeo

/**
 * @param {object} m - Matriz devuelta por buildMatrix.
 * @param {object} state - Estado original.
 * @returns {Array} Lista de hallazgos { id, severity, title, detail }.
 */
export function runConsistencyChecks(m, state = {}) {
  const findings = [];

  const add = (id, severity, title, detail) =>
    findings.push({ id, severity, title, detail });

  // 1. Doble deducción fiscal.
  if (m.taxes.isGross && m.taxDrag === 0 && m.taxes.totalTaxMonthly > 0) {
    add('tax_not_applied', 'error',
      'Impuestos declarados pero no aplicados',
      'El ingreso está marcado como bruto pero la carga fiscal no se descontó del flujo.');
  }
  if (!m.taxes.isGross && m.taxDrag > 0) {
    add('tax_double', 'error',
      'Riesgo de doble deducción fiscal',
      'El ingreso es neto: los impuestos no deben restarse otra vez.');
  }
  if (!m.taxes.isGross && m.taxes.totalTaxMonthly > 0) {
    add('tax_informative', 'info',
      'Impuestos registrados de forma informativa',
      `Tu ingreso se capturó NETO, así que los ${fmtMXN(m.taxes.totalTaxMonthly)} mensuales de impuestos se usan sólo para estimar tu tasa efectiva (${fmtPct(m.taxes.effectiveRate)}), no se descuentan de nuevo.`);
  }


  // 2. Ahorro declarado vs ahorro que el flujo permite.
  if (m.assets.hasSavingsInconsistency) {
    const declared = m.assets.declaredMonthlySavings;
    const computed = m.assets.computedMonthlySavings;
    add('savings_mismatch', 'warning',
      'Inconsistencia financiera detectada',
      `Declaras ahorrar ${fmtMXN(declared)} al mes, pero tu flujo de caja sólo permite ${fmtMXN(computed)}. Diferencia de ${fmtMXN(Math.abs(m.assets.savingsGap))}. Revisa si hay gastos no registrados o si el ahorro proviene de ingresos extraordinarios.`);
  }

  // 3. Ingreso extraordinario mal usado como base de decisiones.
  if (m.income.extraordinaryMonthly > 0) {
    add('extraordinary_excluded', 'info',
      'Ingreso extraordinario excluido del flujo sostenible',
      `${fmtMXN(m.income.extraordinaryMonthly)} mensuales están marcados como extraordinarios y no se consideran ingreso sostenible. Es lo correcto: no comprometas gasto fijo contra ingreso que puede no repetirse.`);
  }

  // 4. Flujos que no son ingreso real.
  const loanRepayments = (state.incomes || [])
    .filter((i) => i.type === 'loan_repayment');
  if (loanRepayments.length > 0) {
    add('loan_repayment_flow', 'info',
      'Pagos de préstamos tratados como flujo',
      'Los pagos de préstamos que recibes son recuperación de capital, no ingreso generado. Se reflejan en el flujo pero no incrementan tu patrimonio.');
  }

  // 5. Deuda que nunca se liquida.
  if (m.debts.hasUnpayableDebt) {
    add('unpayable_debt', 'error',
      'Deuda que nunca se liquidará',
      'Al menos una deuda tiene un pago que no alcanza a cubrir sus propios intereses. El saldo crecerá indefinidamente.');
  }


  // 6. Verificación aritmética de la matriz central.
  const expectedRequired = m.EXPENSES_TOTAL + m.DEBT_SERVICE
    + m.SAVINGS_COMMITMENT + m.GOALS_COST + m.taxDrag;
  if (Math.abs(expectedRequired - m.REQUIRED_INCOME) > TOLERANCE) {
    add('matrix_drift', 'error',
      'Descuadre en la matriz central',
      'El ingreso requerido no coincide con la suma de sus componentes.');
  }

  // taxDrag ya viene descontado dentro de INCOME_SUSTAINABLE: no se resta otra vez.
  const expectedCashflow = m.INCOME_SUSTAINABLE - m.EXPENSES_TOTAL - m.DEBT_SERVICE;
  if (Math.abs(expectedCashflow - m.NET_CASHFLOW) > TOLERANCE) {
    add('cashflow_drift', 'error',
      'Descuadre en el flujo de caja',
      'El flujo neto no coincide con ingreso menos gastos menos deuda.');
  }

  /*
    La brecha se mide en bruto contra bruto.

    Esta comprobación existe porque aquí hubo un error real: `REQUIRED_INCOME`
    lleva los impuestos dentro, y se restaba contra el ingreso ya neto de
    impuestos. La carga fiscal se contaba dos veces y aparecía una brecha
    inexistente. Las dos verificaciones de arriba no lo detectaban porque
    replicaban la misma fórmula equivocada; ésta cierra ese hueco.
  */
  const expectedGap = m.REQUIRED_INCOME - m.SUSTAINABLE_GROSS;
  if (Math.abs(expectedGap - m.INCOME_GAP) > TOLERANCE) {
    add('gap_drift', 'error',
      'Descuadre en la brecha de ingreso',
      'La brecha no coincide con el ingreso requerido menos el ingreso sostenible antes de impuestos.');
  }

  // 7. Aportaciones de ahorro que exceden el flujo disponible.
  if (m.SAVINGS_COMMITMENT > m.NET_CASHFLOW && m.SAVINGS_COMMITMENT > 0) {
    add('savings_exceeds_flow', 'warning',
      'El ahorro comprometido excede tu flujo',
      `Aportas ${fmtMXN(m.SAVINGS_COMMITMENT)} al mes pero tu flujo libre es de ${fmtMXN(m.NET_CASHFLOW)}. Estás financiando el ahorro con deuda o con reservas.`);
  }

  // 8. Concentración de ingreso.
  if (m.income.concentrationRisk === 'high') {
    add('income_concentration', 'warning',
      'Riesgo alto de concentración de ingreso',
      `${fmtPct(m.income.concentrationRatio)} de tu ingreso sostenible depende de una sola fuente${m.income.topSourceName ? ` (${m.income.topSourceName})` : ''}.`);
  }

  return findings;
}
