/**
 * src/engine/finance.js — Punto de entrada único del motor financiero.
 *
 * La UI SÓLO debe importar desde este archivo. Así se garantiza que no
 * existan cálculos duplicados ni rutas alternas hacia los módulos internos.
 */
export * from './utils.js';
export * from './income.js';
export * from './taxes.js';
export * from './expenses.js';
export * from './debt.js';
export * from './assets.js';
export * from './goals.js';
export * from './retirement.js';
export * from './matrix.js';
export * from './consistency.js';
export * from './recommendations.js';

import { buildMatrix, buildScenarios } from './matrix.js';
import { runConsistencyChecks } from './consistency.js';
import { buildRecommendations } from './recommendations.js';
import { projectWealth } from './assets.js';
import { projectRetirementPath } from './retirement.js';

/**
 * Ejecuta el diagnóstico completo del sistema.
 *
 * Es la única función que la UI necesita llamar: devuelve la matriz activa,
 * las tres vistas de escenario, los hallazgos de consistencia,
 * las recomendaciones y las series para graficar.
 *
 * @param {object} state - Estado centralizado.
 * @param {object} scenario - Palancas del Scenario Engine.
 * @param {'current'|'aspirational'|'optimized'} activeMode
 */
export function runDiagnosis(state, scenario, activeMode = 'current') {
  const scenarios = buildScenarios(state, scenario);
  const matrix = scenarios[activeMode] ?? scenarios.current;

  return {
    matrix,
    scenarios,
    activeMode,
    findings: runConsistencyChecks(matrix, state),
    recommendations: buildRecommendations(matrix),
    wealthPath: projectWealth(
      matrix.NET_WORTH,
      Math.max(0, matrix.NET_CASHFLOW),
      matrix.retirement.preRealRate,
      matrix.retirement.yearsToRetirement
    ),
    retirementPath: projectRetirementPath(matrix.retirement),
  };
}

export { buildMatrix };
