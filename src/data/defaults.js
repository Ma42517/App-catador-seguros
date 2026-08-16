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

/*
  Tasas con las que abren los formularios de metas y activos.

  No son un adorno: son lo que evita que la captura se detenga. Preguntarle a un
  prospecto qué inflación espera para la universidad de sus hijos lo deja pensando en
  una variable que no tiene forma de estimar, y esa pausa se come la conversación. Con
  un promedio histórico en el campo, la pregunta pasa de "deduce una tasa" a "cámbiala
  si no te cuadra", que sí se puede contestar.

  Están aquí y no escritas en cada formulario para que las dos pantallas no puedan
  discrepar: dos metas capturadas con inflaciones distintas por omisión darían costos
  futuros que no se pueden comparar entre sí.
*/
export const SMART_RATES = {
  /** Inflación de largo plazo. Va por encima del 4% del retiro a propósito:
      educación y salud —el destino más común de una meta— se inflan más rápido
      que el índice general. */
  inflation: 0.045,
  /** Rendimiento nominal de un portafolio diversificado a largo plazo. */
  expectedReturn: 0.08,
};

/** Aviso que acompaña a los campos de tasas. Uno solo, para que no se desincronicen. */
export const SMART_RATES_NOTE = 'Usamos tasas promedio históricas para proteger tu '
  + 'cálculo. Puedes modificarlas si lo deseas.';

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
    annualReturn: SMART_RATES.expectedReturn,
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
    inflation: SMART_RATES.inflation,
    expectedReturn: SMART_RATES.expectedReturn,
    priority: 'medium',
    ...overrides,
  };
}



/**
 * ¿Hay algo capturado que se pueda perder?
 *
 * Decide si el botón de limpiar aparece. En una app recién abierta, un botón que
 * borra la nada es ruido: ocupa sitio en una cabecera estrecha y ofrece deshacer
 * algo que no se ha hecho.
 *
 * No se compara contra `createEmptyState()` con un `JSON.stringify`: el estado
 * vacío no lo está del todo —trae edad 35, moneda MXN, los supuestos macro— así
 * que una comparación estructural respondería "sí hay datos" en una app intacta.
 * Se pregunta por lo que sólo puede haber escrito una persona.
 */
export function hasCapturedData(data) {
  if (!data) return false;

  const collections = ['incomes', 'expenses', 'debts', 'assets', 'goals'];
  if (collections.some((key) => (data[key] || []).length > 0)) return true;

  const profile = data.profile || {};
  if ((profile.name || '').trim() !== '') return true;
  if ((profile.city || '').trim() !== '') return true;

  if (data.declaredMonthlySavings > 0) return true;
  if ((data.retirement || {}).desiredMonthlyIncome > 0) return true;

  const taxes = data.taxes || {};
  return [
    taxes.withheld, taxes.additionalPaid, taxes.provisionalPayments, taxes.refunds,
  ].some((value) => value > 0);
}
