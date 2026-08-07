/**
 * src/engine/matrix.js — Módulos 10 y 11: Scenario Engine + Financial Diagnosis
 *
 * MATRIZ FINANCIERA CENTRAL. Única fuente de verdad del sistema.
 * Toda cifra que se muestre en la UI debe derivarse de aquí.
 *
 * Ecuaciones núcleo:
 *   EXPENSES_TOTAL  = esencial + importante + discrecional + lujo
 *   NET_CASHFLOW    = income_sustainable - impuestos - expenses_total - debt_service
 *   REQUIRED_INCOME = expenses_total + debt_service + savings + goals + impuestos
 *   INCOME_GAP      = required_income - income_sustainable
 *
 * Garantías de no doble contabilidad:
 *   - Los impuestos se restan SÓLO si el ingreso se capturó en bruto.
 *   - La aportación al retiro se DERIVA de los activos de retiro, nunca se suma aparte.
 *   - El ingreso extraordinario jamás entra al ingreso sostenible.
 *   - Liquidar una deuda libera su pago del flujo en el mismo instante.
 */
import { num, safeDiv, clamp } from './utils.js';
import { calculateIncome } from './income.js';
import { calculateTaxes } from './taxes.js';
import { calculateExpenses } from './expenses.js';
import { calculateDebts, simulatePayoff } from './debt.js';
import { calculateAssets, calculateNetWorth, isRetirementType } from './assets.js';
import { calculateGoals } from './goals.js';
import { calculateRetirement } from './retirement.js';

/** Escenario neutro: sin ningún ajuste. */
export const NEUTRAL_SCENARIO = {
  incomeIncreasePct: 0,
  expenseReductionPct: 0,
  eliminatedDebtIds: [],
  goalPostponeYears: 0,
  inflationDelta: 0,
  returnDelta: 0,
};

export const SCENARIO_MODES = [
  { value: 'current', label: 'Realidad Actual' },
  { value: 'aspirational', label: 'Vida Aspiracional' },
  { value: 'optimized', label: 'Plan Optimizado' },
];


/**
 * Aplica un recorte de gasto sin tocar nunca lo esencial.
 * El recorte se absorbe en orden: lujo -> discrecional -> importante.
 * Devuelve una copia escalada de la lista de gastos.
 */
function applyExpenseReduction(expenses, reductionPct) {
  const pct = clamp(reductionPct, 0, 1);
  if (pct <= 0) return expenses;

  const monthlyOf = (e) => {
    const a = num(e.amount);
    if (e.frequency === 'annual') return a / 12;
    if (e.frequency === 'quarterly') return a / 3;
    if (e.frequency === 'one-time') return 0;
    return a;
  };

  const total = expenses.reduce((s, e) => s + monthlyOf(e), 0);
  let target = total * pct;
  if (target <= 0) return expenses;

  // Factor de recorte por bucket, calculado en cascada.
  const factors = {};
  for (const bucket of ['luxury', 'discretionary', 'important']) {
    if (target <= 0) { factors[bucket] = 1; continue; }
    const bucketTotal = expenses
      .filter((e) => e.priority === bucket)
      .reduce((s, e) => s + monthlyOf(e), 0);
    if (bucketTotal <= 0) { factors[bucket] = 1; continue; }
    const take = Math.min(target, bucketTotal);
    factors[bucket] = 1 - safeDiv(take, bucketTotal);
    target -= take;
  }

  return expenses.map((e) => {
    const f = factors[e.priority];
    return f === undefined || f === 1 ? e : { ...e, amount: num(e.amount) * f };
  });
}

/** Escala los ingresos por un incremento porcentual. */
function applyIncomeIncrease(incomes, increasePct) {
  const pct = num(increasePct);
  if (pct === 0) return incomes;
  return incomes.map((i) => ({ ...i, amount: num(i.amount) * (1 + pct) }));
}


/**
 * Construye la matriz financiera completa.
 *
 * @param {object} state - Estado centralizado de la aplicación.
 * @param {object} options
 * @param {'current'|'aspirational'|'optimized'} options.mode
 * @param {object} options.scenario - Ajustes del Scenario Engine.
 */
export function buildMatrix(state, options = {}) {
  const mode = options.mode || 'current';
  // Sólo el Plan Optimizado aplica las palancas del usuario.
  const scenario = mode === 'optimized'
    ? { ...NEUTRAL_SCENARIO, ...(options.scenario || {}) }
    : { ...NEUTRAL_SCENARIO };

  const profile = state.profile || {};
  const variabilityFactor = num(state.variabilityFactor, 0.7);

  // ── 1. INGRESO ────────────────────────────────────────────────────────────
  const scaledIncomes = applyIncomeIncrease(state.incomes || [], scenario.incomeIncreasePct);
  const income = calculateIncome(scaledIncomes, variabilityFactor);

  // ── 2. IMPUESTOS ──────────────────────────────────────────────────────────
  // taxDeductionMonthly ya es 0 cuando el ingreso se capturó neto.
  const taxes = calculateTaxes(state.taxes, profile.incomeType || 'net', income.grossMonthly);
  const taxDrag = taxes.taxDeductionMonthly;

  /** Ingreso realmente disponible para comprometer. */
  const INCOME_SUSTAINABLE = Math.max(0, income.sustainableMonthly - taxDrag);

  // ── 3. GASTOS ─────────────────────────────────────────────────────────────
  const scaledExpenses = applyExpenseReduction(state.expenses || [], scenario.expenseReductionPct);
  const expenses = calculateExpenses(scaledExpenses, INCOME_SUSTAINABLE);
  const EXPENSES_TOTAL = expenses.totalMonthly;

  // ── 4. DEUDA ──────────────────────────────────────────────────────────────
  // Las deudas eliminadas en el escenario liberan su pago de inmediato.
  const eliminated = new Set(scenario.eliminatedDebtIds || []);
  const activeDebts = (state.debts || []).filter((d) => !eliminated.has(d.id));

  // Excedente preliminar disponible para acelerar la liquidación.
  const preliminarySurplus = Math.max(0, INCOME_SUSTAINABLE - EXPENSES_TOTAL);
  const debts = calculateDebts(activeDebts, INCOME_SUSTAINABLE, 0);
  const DEBT_SERVICE = debts.monthlyService;

  /** Flujo liberado por las deudas que el escenario dio por liquidadas. */
  const freedByScenario = (state.debts || [])
    .filter((d) => eliminated.has(d.id))
    .reduce((s, d) => s + Math.max(num(d.minPayment), num(d.actualPayment)), 0);


  // ── 5. FLUJO DE CAJA NETO ─────────────────────────────────────────────────
  /** Lo que sobra después de vivir y pagar deuda. Base de todo lo demás. */
  const NET_CASHFLOW = INCOME_SUSTAINABLE - EXPENSES_TOTAL - DEBT_SERVICE;

  // ── 6. AHORRO E INVERSIÓN ─────────────────────────────────────────────────
  const assets = calculateAssets(state.assets || [], {
    declaredMonthlySavings: num(state.declaredMonthlySavings),
    computedMonthlySavings: NET_CASHFLOW,
    sustainableIncomeMonthly: INCOME_SUSTAINABLE,
    essentialExpensesMonthly: expenses.essentialMonthly,
  });

  /**
   * Compromiso de ahorro = aportaciones mensuales a activos.
   * Incluye la aportación al retiro, por eso el módulo de retiro la DERIVA
   * de aquí en lugar de recibirla por separado (evita doble conteo).
   */
  const SAVINGS_COMMITMENT = assets.monthlyContributions;

  // ── 7. PATRIMONIO NETO ────────────────────────────────────────────────────
  const netWorth = calculateNetWorth(assets, debts);

  // ── 8. RETIRO ─────────────────────────────────────────────────────────────
  const retirementInput = state.retirement || {};
  // Derivado de los activos etiquetados como retiro.
  const retirementAssets = (state.assets || []).filter((a) => isRetirementType(a.type));
  const derivedRetirementSavings = retirementAssets.reduce((s, a) => s + num(a.balance), 0);
  const derivedRetirementContribution = retirementAssets
    .reduce((s, a) => s + num(a.monthlyContribution), 0);

  const retirement = calculateRetirement({
    currentAge: profile.age,
    retirementAge: profile.retirementAge,
    lifeExpectancy: retirementInput.lifeExpectancy,
    currentSavings: derivedRetirementSavings,
    monthlyContribution: derivedRetirementContribution,
    desiredMonthlyIncome: retirementInput.desiredMonthlyIncome,
    inflation: num(retirementInput.inflation, 0.04) + num(scenario.inflationDelta),
    preRetirementReturn: num(retirementInput.preRetirementReturn, 0.09) + num(scenario.returnDelta),
    postRetirementReturn: num(retirementInput.postRetirementReturn, 0.06) + num(scenario.returnDelta),
  });


  // ── 9. METAS ──────────────────────────────────────────────────────────────
  // Los deltas del escenario ajustan los supuestos de cada meta.
  const adjustedGoals = (state.goals || []).map((g) => ({
    ...g,
    inflation: num(g.inflation) + num(scenario.inflationDelta),
    expectedReturn: num(g.expectedReturn) + num(scenario.returnDelta),
  }));

  const surplusForGoals = Math.max(0, NET_CASHFLOW - SAVINGS_COMMITMENT);
  const goals = calculateGoals(adjustedGoals, surplusForGoals, scenario.goalPostponeYears);
  const GOALS_COST = goals.totalMonthlyRequired;

  /**
   * La Vida Aspiracional añade lo que HARÍA FALTA aportar al retiro
   * para llegar a la meta, no sólo lo que hoy se aporta.
   */
  const aspirationalRetirementTopUp = mode === 'aspirational'
    ? retirement.additionalMonthlyNeeded
    : 0;
  const TOTAL_SAVINGS_COMMITMENT = SAVINGS_COMMITMENT + aspirationalRetirementTopUp;

  // ── 10. INGRESO REQUERIDO Y BRECHA ────────────────────────────────────────
  const REQUIRED_INCOME = EXPENSES_TOTAL
    + DEBT_SERVICE
    + TOTAL_SAVINGS_COMMITMENT
    + GOALS_COST
    + taxDrag;

  const INCOME_GAP = REQUIRED_INCOME - INCOME_SUSTAINABLE;

  /** Excedente o déficit final, ya considerando ahorro y metas. */
  const FINAL_SURPLUS = NET_CASHFLOW - TOTAL_SAVINGS_COMMITMENT - GOALS_COST;


  // ── 11. SIMULACIÓN DE LIQUIDACIÓN ACELERADA ───────────────────────────────
  // El excedente real del hogar se reinvierte en atacar la deuda.
  const accelerator = Math.max(0, Math.min(preliminarySurplus, NET_CASHFLOW));
  const payoffPlans = {
    avalanche: simulatePayoff(debts.items, 'avalanche', accelerator),
    snowball: simulatePayoff(debts.items, 'snowball', accelerator),
    accelerator,
  };

  // ── 12. SEMÁFORO FINANCIERO ───────────────────────────────────────────────
  const savingsRate = safeDiv(NET_CASHFLOW, INCOME_SUSTAINABLE);

  const lights = {
    cashflow: NET_CASHFLOW <= 0 ? 'red' : savingsRate < 0.1 ? 'yellow' : 'green',
    debt: debts.debtToIncomeRatio > 0.5 ? 'red'
      : debts.debtToIncomeRatio >= 0.3 ? 'yellow' : 'green',
    emergency: assets.emergencyMonths < 3 ? 'red'
      : assets.emergencyMonths <= 6 ? 'yellow' : 'green',
    goals: goals.overallFeasibility >= 0.999 ? 'green'
      : goals.overallFeasibility >= 0.6 ? 'yellow' : 'red',
    retirement: retirement.progress >= 0.9 ? 'green'
      : retirement.progress >= 0.5 ? 'yellow' : 'red',
  };

  const lightScore = Object.values(lights)
    .reduce((s, v) => s + (v === 'green' ? 2 : v === 'yellow' ? 1 : 0), 0);
  const healthScore = Math.round(safeDiv(lightScore, Object.keys(lights).length * 2) * 100);


  return {
    mode,
    scenario,

    // ── Matriz central (todos los valores son MENSUALES en MXN) ─────────────
    INCOME_SUSTAINABLE,
    EXPENSES_TOTAL,
    DEBT_SERVICE,
    SAVINGS_COMMITMENT: TOTAL_SAVINGS_COMMITMENT,
    GOALS_COST,
    NET_CASHFLOW,
    REQUIRED_INCOME,
    INCOME_GAP,
    NET_WORTH: netWorth.netWorth,
    FINAL_SURPLUS,

    // ── Derivados de uso frecuente ─────────────────────────────────────────
    taxDrag,
    savingsRate,
    freedByScenario,
    hasDeficit: NET_CASHFLOW < 0,
    hasIncomeGap: INCOME_GAP > 0,

    // ── Resultados por módulo ──────────────────────────────────────────────
    income,
    taxes,
    expenses,
    debts,
    assets,
    netWorth,
    goals,
    retirement,
    payoffPlans,

    // ── Diagnóstico ────────────────────────────────────────────────────────
    lights,
    healthScore,
  };
}


/**
 * Construye las tres vistas paralelas del Scenario Engine.
 * @param {object} state
 * @param {object} scenario - Palancas del usuario (sólo afectan 'optimized').
 */
export function buildScenarios(state, scenario) {
  return {
    current: buildMatrix(state, { mode: 'current' }),
    aspirational: buildMatrix(state, { mode: 'aspirational' }),
    optimized: buildMatrix(state, { mode: 'optimized', scenario }),
  };
}
