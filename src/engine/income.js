/**
 * src/engine/income.js — Módulo 2: Income Engine
 *
 * Clasifica y normaliza todos los flujos de entrada.
 *
 * REGLA CRÍTICA: el ingreso extraordinario NUNCA entra al ingreso sostenible.
 * REGLA CRÍTICA: los pagos de préstamos recibidos son flujo de caja, no ingreso.
 */
import { toMonthly, oneTimeAnnual, safeDiv, clamp } from './utils.js';

/** Grupos de ingreso. */
export const INCOME_GROUPS = [
  { value: 'labor', label: 'Ingreso Laboral' },
  { value: 'passive', label: 'Ingreso Pasivo' },
  { value: 'other', label: 'Otros Flujos' },
];

/** Subtipos por grupo, para clasificación granular. */
export const INCOME_TYPES = {
  labor: [
    { value: 'salary', label: 'Sueldo' },
    { value: 'spouse_salary', label: 'Sueldo del cónyuge' },
    { value: 'commissions', label: 'Comisiones' },
    { value: 'bonus', label: 'Bonos' },
    { value: 'profit_sharing', label: 'Reparto de utilidades (PTU)' },
    { value: 'business', label: 'Negocio propio' },
    { value: 'freelance', label: 'Honorarios / Freelance' },
    { value: 'extraordinary', label: 'Ingreso extraordinario' },
  ],
  passive: [
    { value: 'rent', label: 'Rentas' },
    { value: 'dividends', label: 'Dividendos' },
    { value: 'interest', label: 'Intereses' },
    { value: 'investment_returns', label: 'Rendimientos de inversión' },
  ],
  other: [
    { value: 'loan_repayment', label: 'Pagos de préstamos recibidos' },
    { value: 'asset_sale', label: 'Venta de activos' },
    { value: 'family_support', label: 'Apoyo familiar' },
    { value: 'other', label: 'Otro' },
  ],
};

/** Niveles de estabilidad y su factor de uso por defecto. */
export const STABILITY = [
  { value: 'stable', label: 'Estable', factor: 1 },
  { value: 'variable', label: 'Variable', factor: 0.7 },
  { value: 'extraordinary', label: 'Extraordinario', factor: 0 },
];


/**
 * Factor de usabilidad de un ingreso para el cálculo sostenible.
 * @param {object} income
 * @param {number} variabilityFactor - Factor configurable para ingresos variables.
 */
export function usableFactor(income, variabilityFactor = 0.7) {
  switch (income.stability) {
    case 'stable': return 1;
    case 'variable': return clamp(variabilityFactor, 0, 1);
    case 'extraordinary': return 0;
    default: return 1;
  }
}

/**
 * Calcula todos los agregados de ingreso.
 *
 * @param {Array} incomes
 * @param {number} variabilityFactor
 * @returns {object} Agregados de ingreso normalizados a mensual.
 */
export function calculateIncome(incomes = [], variabilityFactor = 0.7) {
  let grossMonthly = 0;         // todo lo recurrente, sin descuento por estabilidad
  let sustainableMonthly = 0;   // lo que realmente se puede comprometer
  let stableMonthly = 0;
  let variableMonthly = 0;      // nominal recurrente marcado como variable
  let variableUsable = 0;       // variable después del factor
  let extraordinaryMonthly = 0; // recurrente marcado extraordinario
  let extraordinaryAnnual = 0;  // montos 'one-time'
  let laborMonthly = 0;
  let passiveMonthly = 0;
  let otherFlowsMonthly = 0;    // flujos que no son ingreso (p.ej. pago de préstamo recibido)

  const breakdown = [];

  for (const inc of incomes) {
    const monthly = toMonthly(inc.amount, inc.frequency);
    const once = oneTimeAnnual(inc.amount, inc.frequency);
    const factor = usableFactor(inc, variabilityFactor);

    // Los montos de única vez son, por definición, extraordinarios anuales.
    extraordinaryAnnual += once;

    grossMonthly += monthly;


    // Clasificación por estabilidad
    if (inc.stability === 'stable') stableMonthly += monthly;
    else if (inc.stability === 'variable') {
      variableMonthly += monthly;
      variableUsable += monthly * factor;
    } else if (inc.stability === 'extraordinary') {
      extraordinaryMonthly += monthly;
    }

    // Clasificación por grupo
    if (inc.group === 'labor') laborMonthly += monthly;
    else if (inc.group === 'passive') passiveMonthly += monthly;
    else otherFlowsMonthly += monthly;

    const usable = monthly * factor;
    sustainableMonthly += usable;

    if (monthly > 0 || once > 0) {
      breakdown.push({
        id: inc.id,
        name: inc.name,
        group: inc.group,
        type: inc.type,
        stability: inc.stability,
        monthly,
        usable,
        oneTime: once,
      });
    }
  }

  // Riesgo de concentración: peso de la mayor fuente sobre el ingreso sostenible.
  const sorted = [...breakdown].sort((a, b) => b.usable - a.usable);
  const topSource = sorted[0] || null;
  const concentrationRatio = safeDiv(topSource?.usable, sustainableMonthly);

  let concentrationRisk = 'low';
  if (concentrationRatio > 0.8) concentrationRisk = 'high';
  else if (concentrationRatio > 0.6) concentrationRisk = 'medium';

  // Exposición a variabilidad: qué parte del ingreso bruto no es garantizado.
  const variableExposure = safeDiv(variableMonthly + extraordinaryMonthly, grossMonthly);


  return {
    // Totales mensuales
    grossMonthly,
    sustainableMonthly,
    stableMonthly,
    variableMonthly,
    variableUsable,
    extraordinaryMonthly,
    extraordinaryAnnual,

    // Por grupo
    laborMonthly,
    passiveMonthly,
    otherFlowsMonthly,

    // Anualizados
    grossAnnual: grossMonthly * 12,
    sustainableAnnual: sustainableMonthly * 12,

    // Riesgo
    concentrationRatio,
    concentrationRisk,
    topSourceName: topSource?.name ?? null,
    variableExposure,

    // Detalle
    breakdown,
  };
}
