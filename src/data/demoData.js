/**
 * src/data/demoData.js
 * Ejemplo realista pero FICTICIO de una familia mexicana de clase media alta.
 *
 * REGLA DE MODELADO IMPORTANTE:
 * El pago de la hipoteca y del auto vive ÚNICAMENTE en `debts`, nunca en
 * `expenses`. Registrarlo en ambos lados sería doble contabilidad y es el
 * error más común al modelar un presupuesto familiar. En `expenses` sólo
 * aparecen los costos de sostener la vivienda (predial, mantenimiento).
 */
import { DEFAULT_ASSUMPTIONS } from './defaults.js';

export function createDemoState() {
  return {
    version: 1,
    profile: {
      name: 'Familia Hernández Ruiz',
      age: 41,
      maritalStatus: 'married',
      earners: 2,
      dependents: 2,
      children: 2,
      city: 'Ciudad de México',
      currency: 'MXN',
      inputFrequency: 'monthly',
      incomeType: 'net',
      retirementAge: 65,
    },
    variabilityFactor: 0.7,

    incomes: [
      { id: 'inc_1', name: 'Sueldo titular (gerencia)', group: 'labor', type: 'salary', amount: 55000, frequency: 'monthly', stability: 'stable' },
      { id: 'inc_2', name: 'Sueldo cónyuge (medio tiempo)', group: 'labor', type: 'spouse_salary', amount: 22000, frequency: 'monthly', stability: 'stable' },
      { id: 'inc_3', name: 'Comisiones por ventas', group: 'labor', type: 'commissions', amount: 9000, frequency: 'monthly', stability: 'variable' },
      { id: 'inc_4', name: 'Aguinaldo y PTU', group: 'labor', type: 'profit_sharing', amount: 45000, frequency: 'one-time', stability: 'extraordinary' },
      { id: 'inc_5', name: 'Renta de departamento heredado', group: 'passive', type: 'rent', amount: 7500, frequency: 'monthly', stability: 'stable' },
    ],

    // Ingreso capturado NETO: los impuestos son informativos y NO se
    // vuelven a descontar del flujo (ver taxes.js).
    taxes: {
      withheld: 14500,
      additionalPaid: 0,
      provisionalPayments: 0,
      refunds: 18000,
      frequency: 'monthly',
    },


    expenses: [
      // Vivienda: sólo el costo de sostenerla. El crédito está en `debts`.
      { id: 'exp_1', name: 'Predial y mantenimiento', category: 'housing', priority: 'essential', amount: 2500, frequency: 'monthly' },
      { id: 'exp_2', name: 'Colegiaturas (2 hijos)', category: 'education', priority: 'essential', amount: 12000, frequency: 'monthly' },
      { id: 'exp_3', name: 'Despensa y alimentación', category: 'food', priority: 'essential', amount: 11000, frequency: 'monthly' },
      { id: 'exp_4', name: 'Luz, agua, gas e internet', category: 'utilities', priority: 'essential', amount: 3200, frequency: 'monthly' },
      { id: 'exp_5', name: 'Gasolina y casetas', category: 'transportation', priority: 'essential', amount: 4500, frequency: 'monthly' },
      { id: 'exp_6', name: 'Seguro de auto', category: 'insurance', priority: 'essential', amount: 14000, frequency: 'annual' },
      { id: 'exp_7', name: 'Gastos médicos menores', category: 'health', priority: 'important', amount: 1500, frequency: 'monthly' },
      { id: 'exp_8', name: 'Apoyo a padres', category: 'family_support', priority: 'important', amount: 3000, frequency: 'monthly' },
      { id: 'exp_9', name: 'Cuidado personal', category: 'personal_care', priority: 'discretionary', amount: 1800, frequency: 'monthly' },
      { id: 'exp_10', name: 'Ropa y calzado', category: 'clothing', priority: 'discretionary', amount: 2000, frequency: 'monthly' },
      { id: 'exp_11', name: 'Restaurantes y streaming', category: 'entertainment', priority: 'discretionary', amount: 3000, frequency: 'monthly' },
      { id: 'exp_12', name: 'Imprevistos varios', category: 'misc', priority: 'discretionary', amount: 1500, frequency: 'monthly' },
      { id: 'exp_13', name: 'Viaje familiar anual', category: 'travel', priority: 'luxury', amount: 55000, frequency: 'annual' },
    ],

    debts: [
      { id: 'debt_1', name: 'Crédito hipotecario', type: 'mortgage', balance: 1750000, interestRate: 0.105, minPayment: 17500, actualPayment: 17500, termMonths: 232, creditLimit: 0, linkedAsset: 'Casa habitación' },
      { id: 'debt_2', name: 'Crédito automotriz', type: 'auto', balance: 285000, interestRate: 0.139, minPayment: 7200, actualPayment: 7200, termMonths: 46, creditLimit: 0, linkedAsset: 'Camioneta familiar' },
      { id: 'debt_3', name: 'Tarjeta departamental', type: 'credit_card', balance: 68000, interestRate: 0.48, minPayment: 3400, actualPayment: 5000, termMonths: 0, creditLimit: 90000, linkedAsset: '' },
      { id: 'debt_4', name: 'Tarjeta de crédito bancaria', type: 'credit_card', balance: 22000, interestRate: 0.42, minPayment: 1100, actualPayment: 2500, termMonths: 0, creditLimit: 50000, linkedAsset: '' },
    ],


    assets: [
      { id: 'ast_1', name: 'Fondo de emergencia', type: 'emergency_fund', balance: 85000, monthlyContribution: 1000, annualReturn: 0.10, horizonYears: 5 },
      { id: 'ast_2', name: 'Cuenta de nómina', type: 'bank', balance: 40000, monthlyContribution: 0, annualReturn: 0.01, horizonYears: 1 },
      { id: 'ast_3', name: 'CETES a 28 días', type: 'cetes', balance: 60000, monthlyContribution: 500, annualReturn: 0.095, horizonYears: 5 },
      // Los activos de retiro alimentan al módulo de retiro automáticamente.
      { id: 'ast_4', name: 'Afore + PPR', type: 'retirement', balance: 320000, monthlyContribution: 2000, annualReturn: 0.09, horizonYears: 24 },
      { id: 'ast_5', name: 'Casa habitación', type: 'real_estate', balance: 2900000, monthlyContribution: 0, annualReturn: 0.05, horizonYears: 24 },
      { id: 'ast_6', name: 'Camioneta familiar', type: 'other', balance: 320000, monthlyContribution: 0, annualReturn: -0.12, horizonYears: 5 },
    ],

    // La familia CREE que ahorra $12,000 al mes. El motor contrastará esa
    // creencia contra lo que el flujo realmente permite y detectará la brecha.
    declaredMonthlySavings: 12000,

    retirement: {
      desiredMonthlyIncome: 55000,
      ...DEFAULT_ASSUMPTIONS,
    },

    goals: [
      { id: 'goal_1', name: 'Universidad de los hijos', preset: 'education', cost: 1200000, currentSavings: 60000, years: 8, inflation: 0.07, expectedReturn: 0.09, priority: 'high' },
      { id: 'goal_2', name: 'Cambio de camioneta', preset: 'car', cost: 520000, currentSavings: 30000, years: 5, inflation: 0.05, expectedReturn: 0.08, priority: 'medium' },
      { id: 'goal_3', name: 'Viaje a Europa', preset: 'travel', cost: 280000, currentSavings: 15000, years: 3, inflation: 0.04, expectedReturn: 0.06, priority: 'low' },
    ],
  };
}
