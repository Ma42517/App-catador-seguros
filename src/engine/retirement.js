/**
 * src/engine/retirement.js — Módulo 9: Retirement Engine
 *
 * Todo el cálculo se hace en TÉRMINOS REALES (pesos de hoy) usando
 * tasa real = (1 + nominal) / (1 + inflación) - 1
 * De este modo la "pensión deseada" se expresa en poder de compra actual
 * y no requiere inflar y desinflar el resultado final.
 */
import {
  num, safeDiv, clamp, realRate, toMonthlyRate,
  futureValue, fvAnnuity, pvAnnuity, pmtForFutureValue,
} from './utils.js';

/**
 * @param {object} params
 * @param {number} params.currentAge
 * @param {number} params.retirementAge
 * @param {number} params.lifeExpectancy
 * @param {number} params.currentSavings - Capital de retiro acumulado.
 * @param {number} params.monthlyContribution - Aportación mensual actual.
 * @param {number} params.desiredMonthlyIncome - En pesos de HOY.
 * @param {number} params.inflation
 * @param {number} params.preRetirementReturn
 * @param {number} params.postRetirementReturn
 */
export function calculateRetirement(params = {}) {
  const currentAge = num(params.currentAge, 30);
  const retirementAge = num(params.retirementAge, 65);
  const lifeExpectancy = num(params.lifeExpectancy, 85);
  const currentSavings = Math.max(0, num(params.currentSavings));
  const monthlyContribution = Math.max(0, num(params.monthlyContribution));
  const desiredMonthlyIncome = Math.max(0, num(params.desiredMonthlyIncome));
  const inflation = num(params.inflation, 0.04);
  const preReturn = num(params.preRetirementReturn, 0.09);
  const postReturn = num(params.postRetirementReturn, 0.06);

  const yearsToRetirement = Math.max(0, retirementAge - currentAge);
  const monthsToRetirement = Math.round(yearsToRetirement * 12);
  const yearsInRetirement = Math.max(1, lifeExpectancy - retirementAge);
  const monthsInRetirement = Math.round(yearsInRetirement * 12);

  // Tasas reales: acumulación y desacumulación.
  const preRealRate = realRate(preReturn, inflation);
  const postRealRate = realRate(postReturn, inflation);
  const preRealMonthly = toMonthlyRate(preRealRate);
  const postRealMonthly = toMonthlyRate(postRealRate);


  /**
   * Capital requerido al momento del retiro, en pesos de hoy.
   * Valor presente de una anualidad que paga la pensión deseada durante
   * todos los años de retiro, descontada a la tasa real post-retiro.
   */
  const requiredCapital = pvAnnuity(
    desiredMonthlyIncome,
    postRealMonthly,
    monthsInRetirement
  );

  // Proyección del capital actual + aportaciones, en términos reales.
  const projectedFromSavings = futureValue(currentSavings, preRealRate, yearsToRetirement);
  const projectedFromContributions = fvAnnuity(
    monthlyContribution,
    preRealMonthly,
    monthsToRetirement
  );
  const projectedCapital = projectedFromSavings + projectedFromContributions;

  const gap = Math.max(0, requiredCapital - projectedCapital);
  const surplus = Math.max(0, projectedCapital - requiredCapital);

  // Aportación mensual TOTAL necesaria para cerrar el objetivo completo.
  const capitalNeededFromContributions = Math.max(0, requiredCapital - projectedFromSavings);
  const requiredMonthlyContribution = pmtForFutureValue(
    capitalNeededFromContributions,
    preRealMonthly,
    monthsToRetirement
  );

  // Aportación ADICIONAL sobre lo que ya se aporta hoy.
  const additionalMonthlyNeeded = Math.max(0, requiredMonthlyContribution - monthlyContribution);

  /*
    Sin pensión deseada no hay capital requerido, y sin capital requerido el avance
    es total: no queda brecha por cerrar.

    Antes la división segura devolvía 0 y el resultado se contradecía consigo
    mismo: `gap: 0` e `isOnTrack: true` conviviendo con `progress: 0`, o sea la
    luz de retiro en rojo mientras el propio módulo afirmaba que no faltaba nada.
  */
  const progress = requiredCapital <= 0
    ? 1
    : clamp(safeDiv(projectedCapital, requiredCapital), 0, 1);

  // Pensión mensual sostenible con la trayectoria actual.
  const sustainableIncomeAtRetirement = monthsInRetirement > 0 && postRealMonthly !== 0
    ? safeDiv(projectedCapital * postRealMonthly, 1 - Math.pow(1 + postRealMonthly, -monthsInRetirement))
    : safeDiv(projectedCapital, monthsInRetirement);


  let readiness = 'critical';
  if (progress >= 0.9) readiness = 'strong';
  else if (progress >= 0.6) readiness = 'moderate';
  else if (progress >= 0.3) readiness = 'weak';

  return {
    currentAge, retirementAge, lifeExpectancy,
    yearsToRetirement, monthsToRetirement,
    yearsInRetirement, monthsInRetirement,

    inflation, preReturn, postReturn,
    preRealRate, postRealRate,

    desiredMonthlyIncome,
    requiredCapital,
    currentSavings,
    monthlyContribution,
    projectedFromSavings,
    projectedFromContributions,
    projectedCapital,

    gap,
    surplus,
    requiredMonthlyContribution,
    additionalMonthlyNeeded,
    sustainableIncomeAtRetirement,

    progress,
    progressPct: Math.round(progress * 100),
    readiness,
    isOnTrack: gap <= 0,
  };
}

/** Trayectoria del capital de retiro año por año, en términos reales. */
export function projectRetirementPath(result) {
  const points = [];
  const years = Math.max(0, Math.floor(num(result?.yearsToRetirement)));
  for (let y = 0; y <= years; y += 1) {
    const fromSavings = futureValue(result.currentSavings, result.preRealRate, y);
    const fromContrib = fvAnnuity(result.monthlyContribution, toMonthlyRate(result.preRealRate), y * 12);
    points.push({
      year: y,
      age: result.currentAge + y,
      value: fromSavings + fromContrib,
      target: result.requiredCapital,
    });
  }
  return points;
}
