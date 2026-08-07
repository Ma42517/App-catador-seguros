/**
 * src/data/exporters.js
 * Exportación del diagnóstico a JSON y CSV. Sin dependencias externas.
 */

function download(filename, content, mime) {
  const blob = new Blob([content], { type: `${mime};charset=utf-8;` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

const stamp = () => new Date().toISOString().slice(0, 10);

/** Exporta el estado completo, reimportable en la aplicación. */
export function exportJSON(data) {
  download(`diagnostico-360-${stamp()}.json`, JSON.stringify(data, null, 2), 'application/json');
}

/** Escapa un campo para CSV. */
function cell(v) {
  const s = v === null || v === undefined ? '' : String(v);
  return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function rowsToCsv(rows) {
  return rows.map((r) => r.map(cell).join(',')).join('\n');
}


/**
 * Exporta un CSV con la matriz central, los detalles y las recomendaciones.
 * @param {object} data - Estado crudo.
 * @param {object} diagnosis - Salida de runDiagnosis.
 */
export function exportCSV(data, diagnosis) {
  const m = diagnosis.matrix;
  const rows = [];

  rows.push(['DIAGNÓSTICO FINANCIERO 360']);
  rows.push(['Perfil', data.profile?.name || 'Sin nombre']);
  rows.push(['Escenario', m.mode]);
  rows.push(['Generado', new Date().toLocaleString('es-MX')]);
  rows.push([]);

  rows.push(['MATRIZ CENTRAL (mensual, MXN)']);
  rows.push(['Concepto', 'Monto']);
  rows.push(['Ingreso sostenible', Math.round(m.INCOME_SUSTAINABLE)]);
  rows.push(['Gastos totales', Math.round(m.EXPENSES_TOTAL)]);
  rows.push(['Servicio de deuda', Math.round(m.DEBT_SERVICE)]);
  rows.push(['Compromiso de ahorro', Math.round(m.SAVINGS_COMMITMENT)]);
  rows.push(['Costo de metas', Math.round(m.GOALS_COST)]);
  rows.push(['Flujo de caja neto', Math.round(m.NET_CASHFLOW)]);
  rows.push(['Ingreso requerido', Math.round(m.REQUIRED_INCOME)]);
  rows.push(['Brecha de ingreso', Math.round(m.INCOME_GAP)]);
  rows.push(['Patrimonio neto', Math.round(m.NET_WORTH)]);
  rows.push(['Meses de fondo de emergencia', m.assets.emergencyMonths.toFixed(1)]);
  rows.push(['Tasa de endeudamiento %', (m.debts.debtToIncomeRatio * 100).toFixed(1)]);
  rows.push(['Tasa de ahorro %', (m.savingsRate * 100).toFixed(1)]);
  rows.push(['Avance de retiro %', m.retirement.progressPct]);
  rows.push(['Brecha de retiro', Math.round(m.retirement.gap)]);
  rows.push([]);

  rows.push(['INGRESOS']);
  rows.push(['Nombre', 'Grupo', 'Estabilidad', 'Frecuencia', 'Monto', 'Mensual equivalente', 'Usable sostenible']);
  for (const i of m.income.breakdown) {
    rows.push([i.name, i.group, i.stability, '', '', Math.round(i.monthly), Math.round(i.usable)]);
  }
  rows.push([]);


  rows.push(['GASTOS POR CATEGORÍA (mensual)']);
  rows.push(['Categoría', 'Monto']);
  for (const c of m.expenses.topCategories) {
    rows.push([c.label, Math.round(c.amount)]);
  }
  rows.push([]);

  rows.push(['GASTOS POR PRIORIDAD (mensual)']);
  rows.push(['Esencial', Math.round(m.expenses.essentialMonthly)]);
  rows.push(['Importante', Math.round(m.expenses.importantMonthly)]);
  rows.push(['Discrecional', Math.round(m.expenses.discretionaryMonthly)]);
  rows.push(['Lujo', Math.round(m.expenses.luxuryMonthly)]);
  rows.push([]);

  rows.push(['DEUDAS']);
  rows.push(['Nombre', 'Tipo', 'Saldo', 'Tasa anual %', 'Pago mensual', 'Interés mensual', 'Meses para liquidar']);
  for (const d of m.debts.items) {
    rows.push([
      d.name, d.typeLabel, Math.round(d.balance), (d.annualRate * 100).toFixed(1),
      Math.round(d.payment), Math.round(d.monthlyInterest),
      d.payoffMonths === null ? 'Nunca' : d.payoffMonths,
    ]);
  }
  rows.push([]);

  rows.push(['ACTIVOS']);
  rows.push(['Nombre', 'Tipo', 'Saldo', 'Aportación mensual', 'Rendimiento %', 'Líquido']);
  for (const a of m.assets.items) {
    rows.push([
      a.name, a.typeLabel, Math.round(a.balance), Math.round(a.contribution),
      (a.annualReturn * 100).toFixed(1), a.liquid ? 'Sí' : 'No',
    ]);
  }
  rows.push([]);

  rows.push(['METAS']);
  rows.push(['Nombre', 'Costo hoy', 'Costo futuro', 'Años', 'Aportación requerida', 'Viabilidad %']);
  for (const g of m.goals.items) {
    rows.push([
      g.name, Math.round(g.costToday), Math.round(g.futureCost), g.years,
      Math.round(g.monthlyRequired), g.feasibilityScore,
    ]);
  }
  rows.push([]);

  rows.push(['RECOMENDACIONES']);
  rows.push(['Severidad', 'Área', 'Problema', 'Impacto', 'Cifra', 'Acción']);
  for (const r of diagnosis.recommendations) {
    rows.push([r.severity, r.area, r.problem, r.impact, r.number, r.action]);
  }

  // BOM para que Excel en español respete los acentos.
  download(`diagnostico-360-${stamp()}.csv`, `\ufeff${rowsToCsv(rows)}`, 'text/csv');
}
