/**
 * src/engine/goals.js — Módulo 8: Goals & Aspirations Engine
 *
 * Cada meta se valúa a futuro (inflación) y se descuenta el crecimiento del
 * ahorro ya acumulado, para obtener la aportación mensual realmente necesaria.
 */
import {
  num, safeDiv, clamp, realRate, toMonthlyRate,
  futureValue, pmtForFutureValue,
} from './utils.js';

export const GOAL_PRIORITIES = [
  { value: 'high', label: 'Alta', weight: 3 },
  { value: 'medium', label: 'Media', weight: 2 },
  { value: 'low', label: 'Baja', weight: 1 },
];

export const GOAL_PRESETS = [
  { value: 'car', label: 'Comprar auto' },
  { value: 'home', label: 'Comprar casa' },
  { value: 'education', label: 'Educación' },
  { value: 'travel', label: 'Viaje' },
  { value: 'investment', label: 'Inversión' },
  { value: 'business', label: 'Crear un negocio' },
  { value: 'retirement', label: 'Fondo de retiro' },
  { value: 'other', label: 'Otra meta' },
];

/**
 * Analiza una meta individual.
 * @param {object} goal
 * @param {number} goal.cost - Costo en pesos de hoy.
 * @param {number} goal.currentSavings - Ahorro ya asignado a esta meta.
 * @param {number} goal.years - Años hasta la meta.
 * @param {number} goal.inflation - Inflación esperada del bien.
 * @param {number} goal.expectedReturn - Rendimiento esperado del ahorro.
 * @param {number} postponeYears - Aplazamiento del escenario activo.
 */
export function analyzeGoal(goal, postponeYears = 0) {
  const costToday = Math.max(0, num(goal.cost));
  const saved = Math.max(0, num(goal.currentSavings));
  const years = Math.max(0, num(goal.years) + num(postponeYears));
  const inflation = num(goal.inflation);
  const expectedReturn = num(goal.expectedReturn);


  // El costo crece con la inflación del bien.
  const futureCost = futureValue(costToday, inflation, years);

  // El ahorro ya acumulado crece con el rendimiento esperado.
  const projectedSavings = futureValue(saved, expectedReturn, years);

  // Brecha real a financiar con aportaciones nuevas.
  const gap = Math.max(0, futureCost - projectedSavings);

  const months = Math.round(years * 12);
  const monthlyRate = toMonthlyRate(expectedReturn);
  const monthlyRequired = months > 0
    ? pmtForFutureValue(gap, monthlyRate, months)
    // Meta inmediata: la brecha se necesita completa hoy.
    : gap;

  const fundedRatio = clamp(safeDiv(projectedSavings, futureCost), 0, 1);

  return {
    id: goal.id,
    name: goal.name,
    preset: goal.preset,
    priority: goal.priority || 'medium',
    costToday,
    futureCost,
    saved,
    projectedSavings,
    gap,
    years,
    months,
    monthlyRequired,
    fundedRatio,
    inflation,
    expectedReturn,
    realRate: realRate(expectedReturn, inflation),
    isFunded: gap <= 0,
  };
}


/**
 * Agregados de metas y puntaje de viabilidad.
 * @param {Array} goals
 * @param {number} availableSurplus - Excedente mensual antes de metas.
 * @param {number} postponeYears
 */
export function calculateGoals(goals = [], availableSurplus = 0, postponeYears = 0) {
  const items = goals
    .map((g) => analyzeGoal(g, postponeYears))
    // Las metas de mayor prioridad consumen el excedente primero.
    .sort((a, b) => {
      const w = (p) => GOAL_PRIORITIES.find((x) => x.value === p)?.weight ?? 2;
      return w(b.priority) - w(a.priority);
    });

  const totalMonthlyRequired = items.reduce((s, g) => s + g.monthlyRequired, 0);
  const totalFutureCost = items.reduce((s, g) => s + g.futureCost, 0);
  const totalGap = items.reduce((s, g) => s + g.gap, 0);

  // Asignación en cascada del excedente por prioridad.
  let remaining = Math.max(0, num(availableSurplus));
  const scored = items.map((g) => {
    const allocated = Math.min(remaining, g.monthlyRequired);
    remaining -= allocated;
    const coverage = clamp(safeDiv(allocated, g.monthlyRequired), 0, 1);
    return {
      ...g,
      allocated,
      coverage,
      feasibilityScore: Math.round(coverage * 100),
      isFeasible: coverage >= 0.999 || g.isFunded,
    };
  });

  const overallFeasibility = clamp(safeDiv(availableSurplus, totalMonthlyRequired), 0, 1);

  return {
    items: scored,
    totalMonthlyRequired,
    totalFutureCost,
    totalGap,
    unfundedMonthly: Math.max(0, totalMonthlyRequired - Math.max(0, num(availableSurplus))),
    overallFeasibility,
    feasibilityScore: Math.round(overallFeasibility * 100),
    infeasibleGoals: scored.filter((g) => !g.isFeasible),
  };
}
