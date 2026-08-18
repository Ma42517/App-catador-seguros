/**
 * src/data/contributionRates.js
 * Tasas de aportación a la Afore, para estimar el desglose desde el sueldo.
 *
 * SON UNA ESTIMACIÓN, NO EL CÁLCULO DE NÓMINA. Se ofrecen porque casi nadie sabe de memoria
 * cuánto le aporta su patrón a la Afore: el dato existe en el estado de cuenta, pero pedirlo
 * detiene la captura. Con una estimación puesta, la conversación pasa de "búscalo" a
 * "corrígelo si lo tienes a la mano".
 *
 * Por qué son estimaciones y no la cifra exacta:
 *
 *  - Se aplican sobre el SUELDO BRUTO que se captura aquí, no sobre el Salario Base de
 *    Cotización, que es la base real y que incluye prestaciones y está topado en 25 UMAs.
 *    Para un sueldo alto, el SBC topado deja la aportación real por debajo de esta cuenta.
 *
 *  - La aportación patronal de cesantía y vejez NO es una constante: la reforma de 2020 la
 *    sube por escalones cada año hasta 2030, y además depende del nivel salarial. El 7.5 %
 *    es un punto intermedio razonable para el tramo actual, no un número de la ley que se
 *    pueda citar tal cual.
 *
 * De ahí que los dos campos que rellena queden editables y con un aviso en pantalla.
 */

/** Aportación del patrón, como fracción del sueldo bruto mensual. */
export const AFORE_EMPLOYER_RATE = 0.075;

/** Aportación del trabajador. Es la que sí está fija en la ley: 1.125 % del SBC. */
export const AFORE_WORKER_RATE = 0.01125;

/** Aviso que acompaña al desglose estimado. */
export const AFORE_ESTIMATE_NOTE = 'Cálculo aproximado según la ley vigente. Puedes editar '
  + 'este valor si conoces la cifra exacta de tu recibo de nómina.';

/** Redondea a peso: un desglose de nómina con centavos sugiere una precisión que no hay. */
const toPeso = (v) => Math.round(Math.max(0, v));

/** Aportaciones estimadas a partir del sueldo bruto mensual. */
export function aforeContributions(grossSalary) {
  return {
    employerContribution: toPeso(grossSalary * AFORE_EMPLOYER_RATE),
    workerContribution: toPeso(grossSalary * AFORE_WORKER_RATE),
  };
}

/** Quién paga la prima de un PPR o seguro. */
export const PREMIUM_PAYERS = [
  { value: 'self', label: 'Yo lo pago (gasto personal)' },
  { value: 'employer', label: 'Lo paga mi empresa (prestación)' },
];
