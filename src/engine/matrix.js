/**
 * src/engine/matrix.js — Módulos 10 y 11: Scenario Engine + Financial Diagnosis
 *
 * MATRIZ FINANCIERA CENTRAL. Única fuente de verdad del sistema.
 * Toda cifra que se muestre en la UI debe derivarse de aquí.
 *
 * Ecuaciones núcleo:
 *   EXPENSES_TOTAL  = esencial + importante + discrecional + lujo
 *   INCOME_SUSTAINABLE = sostenible_bruto - impuestos        (queda NETO)
 *   NET_CASHFLOW    = income_sustainable - expenses_total - debt_service
 *   REQUIRED_INCOME = expenses_total + debt_service + savings + goals + impuestos
 *   INCOME_GAP      = required_income - sostenible_bruto
 *
 * OJO con la última ecuación, que es donde vivía un error de doble contabilidad:
 * `REQUIRED_INCOME` incluye los impuestos, así que está expresado en BRUTO —es
 * cuánto hay que *ganar*—, mientras `INCOME_SUSTAINABLE` ya viene NETO. Restarle
 * el neto al bruto contaba los impuestos dos veces e inventaba una brecha que no
 * existía: con ingreso 100, impuestos 20 y gastos 80, la brecha real es 0 y el
 * motor reportaba 20. Por eso la brecha se mide contra el sostenible BRUTO.
 *
 * Garantías de no doble contabilidad:
 *   - Los impuestos se restan SÓLO si el ingreso se capturó en bruto.
 *   - La aportación al retiro se DERIVA de los activos de retiro, nunca se suma aparte.
 *   - El ingreso extraordinario jamás entra al ingreso sostenible.
 *   - Liquidar una deuda libera su pago del flujo en el mismo instante.
 *   - La brecha compara bruto contra bruto, nunca bruto contra neto.
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

  /**
   * Ingreso sostenible ANTES de impuestos.
   *
   * Se conserva aparte porque es la única cifra comparable con `REQUIRED_INCOME`,
   * que también está en bruto. Sin él, la brecha restaba un neto de un bruto.
   */
  const SUSTAINABLE_GROSS = income.sustainableMonthly;

  /** Ingreso realmente disponible para comprometer, ya neto de impuestos. */
  const INCOME_SUSTAINABLE = Math.max(0, SUSTAINABLE_GROSS - taxDrag);

  // ── 3. GASTOS ─────────────────────────────────────────────────────────────
  const scaledExpenses = applyExpenseReduction(state.expenses || [], scenario.expenseReductionPct);
  const expenses = calculateExpenses(scaledExpenses, INCOME_SUSTAINABLE);
  const EXPENSES_TOTAL = expenses.totalMonthly;

  // ── 4. DEUDA ──────────────────────────────────────────────────────────────
  // Las deudas eliminadas en el escenario liberan su pago de inmediato.
  const eliminated = new Set(scenario.eliminatedDebtIds || []);
  const activeDebts = (state.debts || []).filter((d) => !eliminated.has(d.id));

  const debts = calculateDebts(activeDebts, INCOME_SUSTAINABLE);
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

  /*
    Bruto contra bruto. `REQUIRED_INCOME` lleva los impuestos dentro porque
    responde a "cuánto necesito ganar", así que se compara contra el sostenible
    antes de impuestos. Medirlo contra el neto restaba la carga fiscal dos veces.
  */
  const INCOME_GAP = REQUIRED_INCOME - SUSTAINABLE_GROSS;

  /** Excedente o déficit final, ya considerando ahorro y metas. */
  const FINAL_SURPLUS = NET_CASHFLOW - TOTAL_SAVINGS_COMMITMENT - GOALS_COST;


  // ── 11. SIMULACIÓN DE LIQUIDACIÓN ACELERADA ───────────────────────────────
  /*
    El excedente real del hogar se reinvierte en atacar la deuda. Es el flujo
    libre y nada más: antes se acotaba además contra un "excedente preliminar"
    que era el flujo sin descontar la deuda, siempre mayor, así que el mínimo
    nunca lo elegía. Ese cálculo sobraba.
  */
  const accelerator = Math.max(0, NET_CASHFLOW);
  const payoffPlans = {
    avalanche: simulatePayoff(debts.items, 'avalanche', accelerator),
    snowball: simulatePayoff(debts.items, 'snowball', accelerator),
    accelerator,
  };

  // ── 12. SEMÁFORO FINANCIERO ───────────────────────────────────────────────
  const savingsRate = safeDiv(NET_CASHFLOW, INCOME_SUSTAINABLE);

  /*
    Un indicador sólo se pinta cuando hay con qué juzgarlo.

    Antes todos los divisores vacíos caían en cero y cero disparaba el rojo, así
    que un diagnóstico recién abierto acusaba cuatro problemas graves sobre
    información que nadie había capturado: fondo de emergencia insuficiente sin
    gastos registrados, metas inviables **sin metas**, retiro comprometido sin
    haber dicho qué pensión se quiere. Un semáforo que se enciende antes de tener
    datos enseña a ignorar el semáforo.

    `neutral` es "todavía no se puede evaluar" y queda fuera del puntaje. No es lo
    mismo que verde: verde afirma que algo está bien.
  */
  const hasFlowData = SUSTAINABLE_GROSS > 0 || EXPENSES_TOTAL > 0 || DEBT_SERVICE > 0;
  const hasDebt = debts.totalBalance > 0 || DEBT_SERVICE > 0;

  const lights = {
    cashflow: !hasFlowData ? 'neutral'
      : NET_CASHFLOW <= 0 ? 'red'
        : savingsRate < 0.1 ? 'yellow' : 'green',

    /*
      Dos falsos positivos en direcciones opuestas vivían en esta línea.

      Con deuda y sin ingreso, la razón deuda/ingreso salía 0 por la división
      segura y pintaba VERDE: alguien pagando deuda sin ingreso registrado veía
      "riesgo de deuda: saludable".

      Y sin deuda ni ingreso también pintaba verde, con lo que un diagnóstico
      completamente vacío promediaba 100 de 100. Un certificado de buena salud
      sobre una hoja en blanco es peor que el rojo que había antes.

      "No tengo deuda" sólo es una virtud comprobable si hay un ingreso con el que
      compararla; sin nada capturado, no hay nada que afirmar.
    */
    debt: !hasDebt
      ? (SUSTAINABLE_GROSS > 0 ? 'green' : 'neutral')
      : INCOME_SUSTAINABLE <= 0 ? 'red'
        : debts.debtToIncomeRatio > 0.5 ? 'red'
          : debts.debtToIncomeRatio >= 0.3 ? 'yellow' : 'green',

    // Sin gasto esencial capturado no hay nada que cubrir: la cobertura en meses
    // no significa nada todavía.
    emergency: expenses.essentialMonthly <= 0 ? 'neutral'
      : assets.emergencyMonths < 3 ? 'red'
        : assets.emergencyMonths <= 6 ? 'yellow' : 'green',

    goals: goals.totalMonthlyRequired <= 0 ? 'neutral'
      : goals.overallFeasibility >= 0.999 ? 'green'
        : goals.overallFeasibility >= 0.6 ? 'yellow' : 'red',

    // Sin pensión deseada no hay meta contra la que medir el avance.
    retirement: retirement.requiredCapital <= 0 ? 'neutral'
      : retirement.progress >= 0.9 ? 'green'
        : retirement.progress >= 0.5 ? 'yellow' : 'red',
  };

  /*
    El puntaje promedia sólo lo evaluable. Si se contaran los neutros como cero,
    capturar la mitad del diagnóstico daría un puntaje bajísimo por lo que falta
    escribir, no por la situación financiera.

    `null` cuando no hay nada evaluable: es la señal de "aún no hay diagnóstico",
    y quien la reciba debe invitar a capturar en lugar de dibujar un número.
  */
  const scored = Object.values(lights).filter((v) => v !== 'neutral');
  const lightScore = scored
    .reduce((s, v) => s + (v === 'green' ? 2 : v === 'yellow' ? 1 : 0), 0);
  const healthScore = scored.length === 0
    ? null
    : Math.round(safeDiv(lightScore, scored.length * 2) * 100);

  // ── 13. COBERTURA DE RIESGO ───────────────────────────────────────────────
  /**
   * Señal derivada, no un dato capturado: si el hogar no destina nada a
   * seguros, una eventualidad médica se paga con patrimonio o con deuda.
   * Se deriva de la categoría de gasto para no duplicar información.
   * No participa en `lights` ni en `healthScore`.
   */
  const insuranceMonthly = num(expenses.byCategory?.insurance);
  const healthMonthly = num(expenses.byCategory?.health);
  const hasMedicalCoverage = !!profile.hasMedicalInsurance;
  const hasLifeCoverage = !!profile.hasLifeInsurance;

  const protection = {
    insuranceMonthly,
    healthMonthly,
    hasMedicalCoverage,
    hasLifeCoverage,
    medicalRisk: !hasMedicalCoverage,
    lifeRisk: !hasLifeCoverage && num(profile.dependents) > 0,
    /** Meses de gasto esencial que cubriría la liquidez ante un evento médico. */
    liquidityRunwayMonths: assets.emergencyMonths,
    /** Patrimonio expuesto si el evento se paga de bolsillo. */
    exposedNetWorth: netWorth.netWorth,
  };


  return {
    mode,
    scenario,

    // ── Matriz central (todos los valores son MENSUALES en MXN) ─────────────
    INCOME_SUSTAINABLE,
    /** El mismo ingreso antes de impuestos: con esto se compara la brecha. */
    SUSTAINABLE_GROSS,
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
    protection,
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
