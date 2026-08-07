/**
 * src/data/defaults.js
 * Estado inicial y fábricas de filas. Sin datos ficticios: el estado inicial
 * está vacío a propósito. Los datos de ejemplo viven en demoData.js.
 */
import { uid } from '../engine/finance.js';

/** Supuestos macro editables. Ningún parámetro fiscal está hardcodeado. */
export const DEFAULT_ASSUMPTIONS = {
  inflation: 0.04,
  preRetirementReturn: 0.09,
  postRetirementReturn: 0.06,
  lifeExpectancy: 85,
};

export function createEmptyState() {
  return {
    version: 1,
    profile: {
      name: '',
      age: 35,
      maritalStatus: 'married',
      earners: 1,
      dependents: 0,
      children: 0,
      city: '',
      currency: 'MXN',
      inputFrequency: 'monthly',
      incomeType: 'net',
      retirementAge: 65,
      // Coberturas declaradas. El gasto en seguros no permite distinguir
      // un GMM de un seguro de auto, así que se preguntan de forma explícita.
      hasMedicalInsurance: false,
      hasLifeInsurance: false,
    },
    /** Factor de uso del ingreso variable. Configurable. */
    variabilityFactor: 0.7,
    incomes: [],
    taxes: {
      withheld: 0,
      additionalPaid: 0,
      provisionalPayments: 0,
      refunds: 0,
      frequency: 'monthly',
    },
    expenses: [],
    debts: [],
    assets: [],
    /** Ahorro que el usuario CREE que hace. Se contrasta con el flujo real. */
    declaredMonthlySavings: 0,
    retirement: {
      desiredMonthlyIncome: 0,
      ...DEFAULT_ASSUMPTIONS,
    },
    goals: [],
  };
}


// ─── Fábricas de filas ──────────────────────────────────────────────────────

export function createIncome(overrides = {}) {
  return {
    id: uid('inc'),
    name: '',
    group: 'labor',
    type: 'salary',
    amount: 0,
    frequency: 'monthly',
    stability: 'stable',
    ...overrides,
  };
}

export function createExpense(overrides = {}) {
  return {
    id: uid('exp'),
    name: '',
    category: 'misc',
    priority: 'essential',
    amount: 0,
    frequency: 'monthly',
    ...overrides,
  };
}

export function createDebt(overrides = {}) {
  return {
    id: uid('debt'),
    name: '',
    type: 'personal',
    balance: 0,
    interestRate: 0,
    minPayment: 0,
    actualPayment: 0,
    termMonths: 0,
    creditLimit: 0,
    linkedAsset: '',
    ...overrides,
  };
}

export function createAsset(overrides = {}) {
  return {
    id: uid('ast'),
    name: '',
    type: 'bank',
    balance: 0,
    monthlyContribution: 0,
    annualReturn: 0.05,
    horizonYears: 10,
    ...overrides,
  };
}

export function createGoal(overrides = {}) {
  return {
    id: uid('goal'),
    name: '',
    preset: 'other',
    cost: 0,
    currentSavings: 0,
    years: 5,
    inflation: DEFAULT_ASSUMPTIONS.inflation,
    expectedReturn: 0.08,
    priority: 'medium',
    ...overrides,
  };
}
