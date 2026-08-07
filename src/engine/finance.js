/**
 * src/engine/finance.js
 * Funciones puras de cálculo financiero para el sistema catador de seguros.
 */

// ─── Helpers ────────────────────────────────────────────────────────────────

const VARIABILITY_FACTOR = 0.70; // factor conservador para ingresos variables

/**
 * Convierte un importe a su equivalente mensual según la frecuencia indicada.
 * @param {number} amount - Importe original.
 * @param {'monthly'|'quarterly'|'annual'} frequency - Frecuencia del importe.
 * @returns {number} Importe mensual equivalente.
 */
export function toMonthly(amount, frequency) {
  switch (frequency) {
    case 'annual':
      return amount / 12;
    case 'quarterly':
      return amount / 3;
    case 'monthly':
    default:
      return amount;
  }
}

// ─── Ingresos ───────────────────────────────────────────────────────────────

/**
 * Calcula el ingreso mensual consolidado.
 *
 * Cada ingreso tiene la forma:
 *   { amount, frequency, type: 'fixed' | 'variable' | 'extraordinary' }
 *
 * - fixed: se suman tal cual (convertidos a mensual).
 * - variable: se aplica el factor de variabilidad (70 % por defecto).
 * - extraordinary: se separan y NO se suman al ingreso recurrente.
 *
 * @param {Array} incomes - Lista de objetos de ingreso.
 * @param {number} [variabilityFactor=0.70] - Factor a aplicar sobre ingresos variables.
 * @returns {{ fixedMonthly: number, variableMonthly: number, totalRecurring: number, extraordinaryTotal: number }}
 */
export function calculateIncome(incomes, variabilityFactor = VARIABILITY_FACTOR) {
  let fixedMonthly = 0;
  let variableMonthly = 0;
  let extraordinaryTotal = 0;

  for (const income of incomes) {
    const monthly = toMonthly(income.amount, income.frequency);

    switch (income.type) {
      case 'fixed':
        fixedMonthly += monthly;
        break;
      case 'variable':
        variableMonthly += monthly * variabilityFactor;
        break;
      case 'extraordinary':
        extraordinaryTotal += income.amount; // se reporta como suma total, no mensual
        break;
      default:
        fixedMonthly += monthly;
    }
  }

  const totalRecurring = fixedMonthly + variableMonthly;

  return {
    fixedMonthly,
    variableMonthly,
    totalRecurring,
    extraordinaryTotal,
  };
}

// ─── Gastos ─────────────────────────────────────────────────────────────────

/**
 * Clasifica y suma gastos esenciales vs discrecionales.
 *
 * Cada gasto tiene la forma:
 *   { amount, frequency, category: 'essential' | 'discretionary' }
 *
 * @param {Array} expenses - Lista de objetos de gasto.
 * @returns {{ essentialMonthly: number, discretionaryMonthly: number, totalMonthly: number }}
 */
export function calculateExpenses(expenses) {
  let essentialMonthly = 0;
  let discretionaryMonthly = 0;

  for (const expense of expenses) {
    const monthly = toMonthly(expense.amount, expense.frequency);

    if (expense.category === 'discretionary') {
      discretionaryMonthly += monthly;
    } else {
      // Por defecto se considera esencial
      essentialMonthly += monthly;
    }
  }

  const totalMonthly = essentialMonthly + discretionaryMonthly;

  return {
    essentialMonthly,
    discretionaryMonthly,
    totalMonthly,
  };
}

// ─── Deudas ─────────────────────────────────────────────────────────────────

/**
 * Calcula el saldo total de deuda y el pago mensual requerido.
 *
 * Cada deuda tiene la forma:
 *   { balance, monthlyPayment }
 *
 * @param {Array} debts - Lista de objetos de deuda.
 * @returns {{ totalBalance: number, totalMonthlyPayment: number }}
 */
export function calculateDebts(debts) {
  let totalBalance = 0;
  let totalMonthlyPayment = 0;

  for (const debt of debts) {
    totalBalance += debt.balance;
    totalMonthlyPayment += debt.monthlyPayment;
  }

  return {
    totalBalance,
    totalMonthlyPayment,
  };
}

// ─── Retiro ─────────────────────────────────────────────────────────────────

/**
 * Calcula la proyección de retiro.
 *
 * Usa la tasa real = ((1 + retorno) / (1 + inflación)) - 1
 * para estimar cuánto capital se necesita y cuánto se debe aportar mensualmente.
 *
 * @param {object} params
 * @param {number} params.currentAge - Edad actual.
 * @param {number} params.retirementAge - Edad deseada de retiro.
 * @param {number} params.desiredMonthlyIncome - Ingreso mensual deseado en el retiro.
 * @param {number} params.currentSavings - Ahorro actual destinado al retiro.
 * @param {number} params.expectedReturn - Rendimiento anual esperado (decimal, ej. 0.08).
 * @param {number} params.expectedInflation - Inflación anual esperada (decimal, ej. 0.04).
 * @returns {{ realRate: number, yearsToRetirement: number, requiredCapital: number, futureValueOfSavings: number, gap: number, monthlyContributionRequired: number }}
 */
export function calculateRetirement({
  currentAge,
  retirementAge,
  desiredMonthlyIncome,
  currentSavings,
  expectedReturn,
  expectedInflation,
}) {
  // Tasa real anual
  const realRate = ((1 + expectedReturn) / (1 + expectedInflation)) - 1;

  const yearsToRetirement = retirementAge - currentAge;
  const monthsToRetirement = yearsToRetirement * 12;

  // Tasa real mensual
  const monthlyRealRate = Math.pow(1 + realRate, 1 / 12) - 1;

  // Capital requerido al momento del retiro (perpetuidad: ingreso / tasa mensual)
  // Usamos la regla del 4 % adaptada: capital = ingreso_anual / tasa_real
  const desiredAnnualIncome = desiredMonthlyIncome * 12;
  const requiredCapital = realRate > 0 ? desiredAnnualIncome / realRate : desiredAnnualIncome * 25;

  // Valor futuro de los ahorros actuales
  const futureValueOfSavings = currentSavings * Math.pow(1 + realRate, yearsToRetirement);

  // Brecha
  const gap = Math.max(0, requiredCapital - futureValueOfSavings);

  // Aportación mensual requerida para cubrir la brecha (fórmula de anualidad)
  let monthlyContributionRequired = 0;
  if (gap > 0 && monthsToRetirement > 0) {
    if (monthlyRealRate === 0) {
      monthlyContributionRequired = gap / monthsToRetirement;
    } else {
      // FV of annuity: FV = PMT * [((1+r)^n - 1) / r]
      // PMT = FV * r / ((1+r)^n - 1)
      const factor = Math.pow(1 + monthlyRealRate, monthsToRetirement) - 1;
      monthlyContributionRequired = (gap * monthlyRealRate) / factor;
    }
  }

  return {
    realRate,
    yearsToRetirement,
    requiredCapital,
    futureValueOfSavings,
    gap,
    monthlyContributionRequired,
  };
}

// ─── Diagnóstico Consolidado ────────────────────────────────────────────────

/**
 * Ejecuta el diagnóstico financiero completo y retorna un resumen.
 *
 * @param {object} state - Estado completo del usuario.
 * @param {Array}  state.incomes - Lista de ingresos.
 * @param {Array}  state.expenses - Lista de gastos.
 * @param {Array}  state.debts - Lista de deudas.
 * @param {number} state.emergencyFund - Monto actual del fondo de emergencia.
 * @param {object} state.retirement - Parámetros de retiro.
 * @returns {{
 *   income: object,
 *   expenses: object,
 *   debts: object,
 *   cashFlow: { netMonthly: number, savingsRate: number },
 *   debtRatio: number,
 *   emergencyCoverageMonths: number,
 *   retirement: object
 * }}
 */
export function runDiagnosis(state) {
  const { incomes = [], expenses = [], debts = [], emergencyFund = 0, retirement = {} } = state;

  const income = calculateIncome(incomes);
  const expenseResult = calculateExpenses(expenses);
  const debtResult = calculateDebts(debts);
  const retirementResult = calculateRetirement(retirement);

  // Flujo de caja neto mensual
  const netMonthly = income.totalRecurring - expenseResult.totalMonthly - debtResult.totalMonthlyPayment;

  // Tasa de ahorro
  const savingsRate = income.totalRecurring > 0
    ? netMonthly / income.totalRecurring
    : 0;

  // Tasa de endeudamiento (pago de deuda / ingreso recurrente)
  const debtRatio = income.totalRecurring > 0
    ? debtResult.totalMonthlyPayment / income.totalRecurring
    : 0;

  // Cobertura del fondo de emergencia (meses de gastos esenciales)
  const emergencyCoverageMonths = expenseResult.essentialMonthly > 0
    ? emergencyFund / expenseResult.essentialMonthly
    : 0;

  return {
    income,
    expenses: expenseResult,
    debts: debtResult,
    cashFlow: {
      netMonthly,
      savingsRate,
    },
    debtRatio,
    emergencyCoverageMonths,
    retirement: retirementResult,
  };
}
