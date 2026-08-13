/**
 * src/engine/recommendations.js — Motor de recomendaciones basado en reglas
 *
 * Cada recomendación sigue la estructura obligatoria:
 *   PROBLEMA -> IMPACTO -> NÚMERO -> ACCIÓN
 *
 * No hay texto genérico: toda afirmación va anclada a una cifra de la matriz.
 */
import { fmtMXN, fmtPct, safeDiv } from './utils.js';

const SEVERITY_WEIGHT = { critical: 0, high: 1, medium: 2, low: 3 };

/**
 * @param {object} m - Matriz devuelta por buildMatrix.
 * @returns {Array} Recomendaciones ordenadas por severidad.
 */
export function buildRecommendations(m) {
  const out = [];
  const push = (r) => out.push(r);

  // ── Flujo de caja ─────────────────────────────────────────────────────────
  if (m.NET_CASHFLOW < 0) {
    const deficit = Math.abs(m.NET_CASHFLOW);
    push({
      id: 'cashflow_deficit',
      severity: 'critical',
      area: 'Flujo de caja',
      problem: `Tienes un déficit mensual de ${fmtMXN(deficit)}.`,
      impact: 'Cada mes que pasa incrementas deuda o consumes reservas. Es la fuga que debe cerrarse antes de cualquier otra estrategia.',
      number: fmtMXN(deficit),
      action: m.expenses.compressibleMonthly >= deficit
        ? `Puedes cerrarlo recortando gasto discrecional y de lujo, que hoy suman ${fmtMXN(m.expenses.compressibleMonthly)} al mes.`
        : `Recortar todo el gasto no esencial (${fmtMXN(m.expenses.compressibleMonthly)}) no alcanza. Necesitas incrementar ingreso en al menos ${fmtMXN(deficit - m.expenses.compressibleMonthly)} al mes.`,
    });
  } else if (m.INCOME_SUSTAINABLE > 0 && m.savingsRate < 0.1) {
    /*
      La condición del ingreso no es adorno: sin ingreso capturado la tasa de
      ahorro sale 0 y esta recomendación aparecía en un diagnóstico vacío,
      reprochando una tasa de ahorro baja a alguien que todavía no había escrito
      cuánto gana.
    */
    push({
      id: 'low_savings_rate',
      severity: 'high',
      area: 'Flujo de caja',
      problem: `Tu tasa de ahorro es de ${fmtPct(m.savingsRate)}, por debajo del 10% mínimo recomendado.`,
      impact: 'Sin margen de ahorro, cualquier imprevisto se convierte en deuda nueva.',
      number: fmtMXN(m.NET_CASHFLOW),
      action: `Llevar tu ahorro al 10% requiere liberar ${fmtMXN(Math.max(0, m.INCOME_SUSTAINABLE * 0.1 - m.NET_CASHFLOW))} mensuales adicionales.`,
    });
  }


  // ── Deuda ─────────────────────────────────────────────────────────────────
  if (m.debts.debtToIncomeRatio > 0.3) {
    const severity = m.debts.debtToIncomeRatio > 0.5 ? 'critical' : 'high';
    push({
      id: 'debt_burden',
      severity,
      area: 'Deuda',
      problem: `La deuda consume ${fmtPct(m.debts.debtToIncomeRatio)} de tu ingreso sostenible.`,
      impact: `De los ${fmtMXN(m.debts.monthlyService)} que pagas al mes, ${fmtMXN(m.debts.monthlyInterest)} son sólo intereses: dinero que no reduce tu saldo.`,
      number: fmtMXN(m.debts.monthlyService),
      action: `Liquidar toda tu deuda liberaría ${fmtMXN(m.debts.monthlyService)} mensuales de flujo permanente.`,
    });
  }

  if (m.debts.mostExpensive && m.debts.mostExpensive.annualRate > 0.25) {
    const d = m.debts.mostExpensive;
    push({
      id: 'expensive_debt',
      severity: 'high',
      area: 'Deuda',
      problem: `"${d.name}" tiene una tasa de ${fmtPct(d.annualRate)} anual.`,
      impact: `Te cuesta ${fmtMXN(d.monthlyInterest)} al mes sólo en intereses.`,
      number: fmtPct(d.annualRate),
      action: `Atácala primero (método avalancha). Liquidarla libera ${fmtMXN(d.payment)} mensuales.`,
    });
  }

  if (m.debts.hasUnpayableDebt) {
    push({
      id: 'unpayable',
      severity: 'critical',
      area: 'Deuda',
      problem: 'Tienes al menos una deuda cuyo pago no cubre ni sus intereses.',
      impact: 'El saldo crece cada mes aunque pagues puntualmente. Es una trampa matemática.',
      number: fmtMXN(m.debts.monthlyInterest),
      action: 'Incrementa el pago por encima del interés mensual o reestructura la deuda de inmediato.',
    });
  }

  if (m.debts.cardUtilization !== null && m.debts.cardUtilization > 0.3) {
    push({
      id: 'card_utilization',
      severity: m.debts.cardUtilization > 0.7 ? 'high' : 'medium',
      area: 'Deuda',
      problem: `Tu utilización de tarjetas es de ${fmtPct(m.debts.cardUtilization)}.`,
      impact: 'Por encima del 30% se deteriora tu perfil crediticio y encarece cualquier financiamiento futuro.',
      number: fmtPct(m.debts.cardUtilization),
      action: 'Reduce el saldo revolvente por debajo del 30% de tu línea disponible.',
    });
  }


  // ── Fondo de emergencia ───────────────────────────────────────────────────
  /*
    Sin gasto esencial registrado no hay nada que cubrir, y la cobertura en meses
    sale 0 por la división entre cero. Sin esta guarda, un diagnóstico vacío
    abría con "tu fondo de emergencia cubre 0.0 meses" en severidad crítica.
  */
  if (m.expenses.essentialMonthly > 0 && m.assets.emergencyMonths < 6) {
    const targetMonths = 6;
    const needed = Math.max(0, m.expenses.essentialMonthly * targetMonths - m.assets.emergencyFund);
    push({
      id: 'emergency_fund',
      severity: m.assets.emergencyMonths < 3 ? 'critical' : 'medium',
      area: 'Liquidez',
      problem: `Tu fondo de emergencia cubre ${m.assets.emergencyMonths.toFixed(1)} meses de gasto esencial.`,
      impact: `Ante una pérdida de ingreso, tu patrimonio aguanta ${m.assets.emergencyMonths.toFixed(1)} meses antes de recurrir a deuda.`,
      number: fmtMXN(needed),
      action: m.NET_CASHFLOW > 0
        ? `Necesitas ${fmtMXN(needed)} más para llegar a 6 meses. Con tu flujo actual de ${fmtMXN(m.NET_CASHFLOW)} lo logras en ${Math.ceil(safeDiv(needed, m.NET_CASHFLOW))} meses.`
        : `Necesitas ${fmtMXN(needed)} más, pero primero debes cerrar tu déficit de flujo.`,
    });
  }

  // ── Metas ─────────────────────────────────────────────────────────────────
  for (const g of m.goals.infeasibleGoals.slice(0, 3)) {
    const shortfall = g.monthlyRequired - g.allocated;
    push({
      id: `goal_${g.id}`,
      severity: 'medium',
      area: 'Metas',
      problem: `"${g.name}" requiere ${fmtMXN(g.monthlyRequired)} al mes y tu excedente no lo cubre.`,
      impact: `Con el ritmo actual sólo financias ${g.feasibilityScore}% de esta meta. Costo proyectado a ${g.years} años: ${fmtMXN(g.futureCost)}.`,
      number: fmtMXN(shortfall),
      action: `Te faltan ${fmtMXN(shortfall)} mensuales. Alternativas: aplazar la meta, reducir su costo o incrementar ingreso.`,
    });
  }

  if (m.goals.totalMonthlyRequired > 0 && m.goals.overallFeasibility < 1) {
    push({
      id: 'goals_aggregate',
      severity: m.goals.overallFeasibility < 0.5 ? 'high' : 'medium',
      area: 'Metas',
      problem: `Tus metas requieren ${fmtMXN(m.goals.totalMonthlyRequired)} mensuales en conjunto.`,
      impact: `Tu excedente cubre ${fmtPct(m.goals.overallFeasibility)} del total. Viabilidad global: ${m.goals.feasibilityScore}/100.`,
      number: fmtMXN(m.goals.unfundedMonthly),
      action: `Incrementar tu ingreso en ${fmtMXN(m.goals.unfundedMonthly)} al mes vuelve viable el conjunto completo.`,
    });
  }


  // ── Retiro ────────────────────────────────────────────────────────────────
  if (m.retirement.gap > 0) {
    const r = m.retirement;
    push({
      id: 'retirement_gap',
      severity: r.progress < 0.3 ? 'critical' : r.progress < 0.6 ? 'high' : 'medium',
      area: 'Retiro',
      problem: `Tienes una brecha de retiro de ${fmtMXN(r.gap)} en pesos de hoy.`,
      impact: `Vas a los ${r.retirementAge} años con ${fmtMXN(r.projectedCapital)} de los ${fmtMXN(r.requiredCapital)} necesarios: ${r.progressPct}% de avance. Con esa trayectoria tu pensión sería de ${fmtMXN(r.sustainableIncomeAtRetirement)} al mes en vez de los ${fmtMXN(r.desiredMonthlyIncome)} que deseas.`,
      number: fmtMXN(r.additionalMonthlyNeeded),
      action: `Aportar ${fmtMXN(r.additionalMonthlyNeeded)} mensuales adicionales durante ${r.yearsToRetirement} años cierra la brecha. Un PPR permite deducir estas aportaciones.`,
    });
  }

  // ── Ingreso ───────────────────────────────────────────────────────────────
  if (m.INCOME_GAP > 0) {
    push({
      id: 'income_gap',
      severity: 'high',
      area: 'Ingreso',
      /*
        Las dos cifras van en bruto, como la brecha. Con el neto, la resta que el
        lector hace de cabeza no daba el número que la propia frase anuncia dos
        líneas abajo.
      */
      problem: `Para sostener tu vida objetivo necesitas ${fmtMXN(m.REQUIRED_INCOME)} mensuales y hoy generas ${fmtMXN(m.SUSTAINABLE_GROSS)}.`,
      impact: `La brecha de ingreso es de ${fmtMXN(m.INCOME_GAP)} al mes, equivalente a ${fmtMXN(m.INCOME_GAP * 12)} al año.`,
      number: fmtMXN(m.INCOME_GAP),
      action: `Incrementar tu ingreso sostenible en ${fmtPct(safeDiv(m.INCOME_GAP, m.SUSTAINABLE_GROSS))} hace viable tu plan completo.`,
    });
  }

  if (m.income.concentrationRisk !== 'low') {
    push({
      id: 'income_concentration',
      severity: m.income.concentrationRisk === 'high' ? 'high' : 'medium',
      area: 'Ingreso',
      problem: `${fmtPct(m.income.concentrationRatio)} de tu ingreso depende de una sola fuente.`,
      impact: 'Perder esa fuente colapsaría tu flujo de forma inmediata.',
      number: fmtPct(m.income.concentrationRatio),
      action: `Desarrolla una segunda fuente. Tu ingreso pasivo actual es de ${fmtMXN(m.income.passiveMonthly)} mensuales.`,
    });
  }


  // ── Patrimonio ────────────────────────────────────────────────────────────
  if (m.netWorth.isNegative) {
    push({
      id: 'negative_net_worth',
      severity: 'critical',
      area: 'Patrimonio',
      problem: `Tu patrimonio neto es negativo: ${fmtMXN(m.netWorth.netWorth)}.`,
      impact: `Debes ${fmtMXN(m.netWorth.totalLiabilities)} contra ${fmtMXN(m.netWorth.totalAssets)} en activos.`,
      number: fmtMXN(Math.abs(m.netWorth.netWorth)),
      action: 'La prioridad absoluta es amortizar deuda, no invertir.',
    });
  } else if (m.netWorth.leverageRatio > 0.6) {
    push({
      id: 'high_leverage',
      severity: 'medium',
      area: 'Patrimonio',
      problem: `${fmtPct(m.netWorth.leverageRatio)} de tus activos está financiado con deuda.`,
      impact: 'Un apalancamiento alto amplifica cualquier caída en el valor de tus activos.',
      number: fmtPct(m.netWorth.leverageRatio),
      action: 'Reduce el apalancamiento por debajo del 60% antes de adquirir nuevos activos.',
    });
  }

  // ── Concentración de gasto ────────────────────────────────────────────────
  const topCat = m.expenses.topCategories[0];
  if (topCat && topCat.share > 0.35) {
    push({
      id: 'expense_concentration',
      severity: 'low',
      area: 'Gasto',
      problem: `"${topCat.label}" concentra ${fmtPct(topCat.share)} de tu gasto total.`,
      impact: `Son ${fmtMXN(topCat.amount)} mensuales en una sola categoría.`,
      number: fmtMXN(topCat.amount),
      action: 'Revisa si hay margen de optimización en esta categoría antes de recortar en otras.',
    });
  }

  return out.sort((a, b) =>
    (SEVERITY_WEIGHT[a.severity] ?? 9) - (SEVERITY_WEIGHT[b.severity] ?? 9));
}
