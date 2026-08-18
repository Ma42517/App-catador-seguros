/**
 * src/data/defaults.js
 * Estado inicial y fábricas de filas. Sin datos ficticios: el estado inicial
 * está vacío a propósito. Los datos de ejemplo viven en demoData.js.
 */
import { uid } from '../engine/finance.js';
import {
  rateForAssetType, inflationForGoalPreset, rateOrBlank,
  returnForSavingsVehicle, DEFAULT_SAVINGS_VEHICLE,
  DEFAULT_PPR_PROFILE, DEFAULT_PPR_CURRENCY, GENERAL_INFLATION,
} from './historicalRates.js';

/** Supuestos macro editables. Ningún parámetro fiscal está hardcodeado. */
export const DEFAULT_ASSUMPTIONS = {
  /*
    La misma inflación general que usan las metas, leída de la misma constante.

    Estaba en 4 % escrito aquí a mano mientras las metas suponían 4.5 %, y eran la misma
    magnitud —cuánto se encarece la vida— con dos valores distintos. En una hoja impresa
    eso se ve: la meta "Fondo de retiro" del módulo de Metas proyectaba con 4.5 % y el
    módulo de Retiro con 4 %, así que el mismo objetivo salía con dos cifras y ninguna
    explicación.

    Leerla de `GENERAL_INFLATION` en lugar de copiar el número es lo que impide que se
    vuelvan a separar la próxima vez que alguien ajuste una de las dos.
  */
  inflation: GENERAL_INFLATION,
  preRetirementReturn: 0.09,
  postRetirementReturn: 0.06,
  lifeExpectancy: 85,
};

/*
  Las tasas con las que abren los formularios ya no viven aquí: dependen del tipo de
  activo o de meta que se elija, así que están en `historicalRates.js` con su tabla y su
  procedencia. Una sola cifra para todo dejaba una cuenta bancaria proyectando al 8 %
  anual, que es un rendimiento que ese instrumento no da.
*/

export function createEmptyState() {
  return {
    version: 1,
    profile: {
      name: '',
      age: 35,
      /*
        Sin valor por omisión, y es deliberado: da de sí la estimación de los años de vida,
        así que suponer un sexo sería suponer también cuánto va a durar el plan de alguien
        a quien no se le ha preguntado. Vacío, el campo de años conserva su valor por
        omisión y el pie de ayuda invita a elegir.
      */
      sex: '',
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
    // La tasa acompaña al tipo. 'bank' abre en 1.5 %, no en el 8 % de una inversión.
    annualReturn: rateOrBlank(rateForAssetType('bank')),
    /*
      Sólo se usan cuando el tipo es 'ppr', pero se declaran siempre: un campo que
      aparece a mitad de la captura obliga a comprobar si existe en cada sitio que lo
      lea, y basta olvidarlo una vez para que la tasa sugerida salga en blanco.
    */
    portfolioProfile: DEFAULT_PPR_PROFILE,
    pprCurrency: DEFAULT_PPR_CURRENCY,

    /*
      Desglose de la Afore. Sólo se usa cuando el tipo es 'afore'.

      `monthlyContribution` sigue siendo lo que lee el motor; estos tres campos son de dónde
      sale ese número cuando se captura una Afore. Se guardan aparte y no se reemplazan
      entre sí porque el asesor necesita poder mostrar el desglose: la aportación patronal
      es el argumento de venta de un PPR —"tu patrón aporta esto, tú puedes aportar más"—.
    */
    grossSalary: 0,
    employerContribution: 0,
    workerContribution: 0,

    /*
      Prima de un PPR o de un seguro con ahorro. Sólo se usan en esos dos tipos.

      Un PPR y un seguro no se parecen a una cuenta bancaria en una cosa que importa para el
      flujo: se pagan del bolsillo, después de impuestos, y con una periodicidad que rara vez
      es mensual. `premiumPaidBy` distingue lo que sale del bolsillo de lo que paga la
      empresa como prestación, porque sólo lo primero compite con el gasto del mes.
    */
    premiumAmount: 0,
    premiumFrequency: 'monthly',
    premiumPaidBy: 'self',
    includeInFixedExpenses: false,

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
    /*
      'other' no tiene inflación de referencia —puede ser una boda, una cirugía o un
      terreno—, así que abre en cero, que el formulario dibuja como campo vacío.
    */
    inflation: rateOrBlank(inflationForGoalPreset('other')),
    /** Dónde se aparta el dinero. Es lo que determina el rendimiento. */
    savingsVehicle: DEFAULT_SAVINGS_VEHICLE,
    expectedReturn: rateOrBlank(returnForSavingsVehicle(DEFAULT_SAVINGS_VEHICLE)),
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
