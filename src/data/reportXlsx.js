/**
 * src/data/reportXlsx.js
 * Exportación a Excel real (.xlsx), en hojas separadas.
 *
 * Sustituye al CSV. La diferencia no es cosmética: un CSV abierto en Excel en español
 * reparte los campos por comas donde el sistema espera punto y coma, así que el archivo se
 * veía como una sola columna con todo dentro. Había que empujarle un BOM sólo para que los
 * acentos no salieran roos. Un .xlsx no negocia nada de eso.
 *
 * Los montos van como NÚMEROS, no como texto formateado, con el formato de moneda aplicado
 * en la celda. Es lo que permite sumar una columna o hacer una tabla dinámica: un "$12,500"
 * de texto no se suma, y era lo que salía del CSV.
 *
 * SheetJS se instala desde su propio dominio y no desde npm: la versión del registro
 * arrastra dos vulnerabilidades altas —contaminación de prototipo y ReDoS— sin arreglo
 * publicado ahí. La de cdn.sheetjs.com viene parchada y deja la auditoría en cero.
 *
 * Se carga con `import()` dinámico, igual que el PDF: es la librería más pesada del proyecto
 * y sólo hace falta cuando alguien pulsa descargar.
 */

/** Formato de moneda de Excel para pesos. */
const MXN = '"$"#,##0.00';
const PCT = '0.0%';

const stamp = () => new Date().toISOString().slice(0, 10);

/**
 * Convierte filas de objetos en hoja, con las columnas en el orden dado.
 *
 * Se define el orden a mano en lugar de dejar que la librería lo deduzca de las claves: el
 * orden de un objeto en JavaScript depende de cómo se construyó, y una hoja donde las
 * columnas cambian de sitio entre exportaciones no se puede comparar con la anterior.
 */
function sheetFrom(XLSX, columns, rows) {
  const header = columns.map((c) => c.label);
  const body = rows.map((row) => columns.map((c) => c.value(row)));
  const sheet = XLSX.utils.aoa_to_sheet([header, ...body]);

  // Ancho de columna: sin esto, Excel abre con "####" en cualquier monto de seis cifras.
  sheet['!cols'] = columns.map((c) => ({ wch: c.width ?? 16 }));

  // Formato numérico por columna, aplicado celda por celda.
  columns.forEach((c, i) => {
    if (!c.format) return;
    for (let r = 1; r <= rows.length; r += 1) {
      const ref = XLSX.utils.encode_cell({ c: i, r });
      if (sheet[ref] && typeof sheet[ref].v === 'number') sheet[ref].z = c.format;
    }
  });

  return sheet;
}

/**
 * Arma el libro y lo devuelve, sin escribirlo a disco.
 *
 * Misma costura que el PDF, y por lo mismo: así una prueba puede abrir las hojas y comprobar
 * que los montos viajan como números y no como texto, que es lo que se vino a arreglar.
 */
export async function buildReportBook(data, diagnosis) {
  const XLSX = await import('xlsx');
  const m = diagnosis.matrix;

  const book = XLSX.utils.book_new();
  const add = (name, sheet) => XLSX.utils.book_append_sheet(book, sheet, name);

  // ── Resumen ───────────────────────────────────────────────────────────────
  const resumen = [
    ['Ingreso sostenible', m.INCOME_SUSTAINABLE],
    ['Gastos totales', m.EXPENSES_TOTAL],
    ['Servicio de deuda', m.DEBT_SERVICE],
    ['Compromiso de ahorro', m.SAVINGS_COMMITMENT],
    ['Costo de metas', m.GOALS_COST],
    ['Flujo de caja libre', m.NET_CASHFLOW],
    ['Ingreso requerido', m.REQUIRED_INCOME],
    ['Brecha de ingreso', m.INCOME_GAP],
    ['Patrimonio neto', m.NET_WORTH],
    ['Activos totales', m.netWorth.totalAssets],
    ['Pasivos totales', m.netWorth.totalLiabilities],
    ['Brecha de retiro', m.retirement.gap],
  ].map(([concepto, monto]) => ({ concepto, monto: Math.round(monto) }));

  add('Resumen', sheetFrom(XLSX, [
    { label: 'Concepto', value: (r) => r.concepto, width: 30 },
    { label: 'Monto (MXN)', value: (r) => r.monto, format: MXN, width: 18 },
  ], resumen));

  // ── Ingresos ──────────────────────────────────────────────────────────────
  add('Ingresos', sheetFrom(XLSX, [
    { label: 'Concepto', value: (r) => r.name || '', width: 26 },
    { label: 'Grupo', value: (r) => r.group || '', width: 16 },
    { label: 'Estabilidad', value: (r) => r.stability || '', width: 14 },
    { label: 'Mensual equivalente', value: (r) => Math.round(r.monthly), format: MXN, width: 20 },
    { label: 'Sostenible usable', value: (r) => Math.round(r.usable), format: MXN, width: 20 },
  ], m.income.breakdown));

  // ── Gastos ────────────────────────────────────────────────────────────────
  add('Gastos', sheetFrom(XLSX, [
    { label: 'Prioridad', value: (r) => r.label, width: 18 },
    { label: 'Mensual', value: (r) => Math.round(r.amount), format: MXN, width: 16 },
  ], [
    { label: 'Esencial', amount: m.expenses.essentialMonthly },
    { label: 'Importante', amount: m.expenses.importantMonthly },
    { label: 'Discrecional', amount: m.expenses.discretionaryMonthly },
    { label: 'Lujo', amount: m.expenses.luxuryMonthly },
  ]));

  // ── Deudas (pasivos) ──────────────────────────────────────────────────────
  add('Pasivos', sheetFrom(XLSX, [
    { label: 'Concepto', value: (r) => r.name || r.typeLabel, width: 26 },
    { label: 'Tipo', value: (r) => r.typeLabel, width: 20 },
    { label: 'Saldo', value: (r) => Math.round(r.balance), format: MXN, width: 16 },
    { label: 'Tasa anual', value: (r) => r.annualRate, format: PCT, width: 12 },
    { label: 'Pago mensual', value: (r) => Math.round(r.payment), format: MXN, width: 16 },
    { label: 'Interés mensual', value: (r) => Math.round(r.monthlyInterest), format: MXN, width: 16 },
    { label: 'Meses para liquidar', value: (r) => (r.payoffMonths === null ? 'Nunca' : r.payoffMonths), width: 18 },
  ], m.debts.items));

  // ── Activos ───────────────────────────────────────────────────────────────
  add('Activos', sheetFrom(XLSX, [
    { label: 'Concepto', value: (r) => r.name || r.typeLabel, width: 26 },
    { label: 'Tipo', value: (r) => r.typeLabel, width: 24 },
    { label: 'Saldo', value: (r) => Math.round(r.balance), format: MXN, width: 16 },
    { label: 'Aportación mensual', value: (r) => Math.round(r.contribution), format: MXN, width: 20 },
    { label: 'Rendimiento anual', value: (r) => r.annualReturn, format: PCT, width: 18 },
    { label: 'Líquido', value: (r) => (r.liquid ? 'Sí' : 'No'), width: 10 },
    { label: 'Valor proyectado', value: (r) => Math.round(r.projectedValue), format: MXN, width: 18 },
  ], m.assets.items));

  // ── Metas ─────────────────────────────────────────────────────────────────
  add('Metas', sheetFrom(XLSX, [
    { label: 'Meta', value: (r) => r.name || 'Meta', width: 28 },
    { label: 'Costo hoy', value: (r) => Math.round(r.costToday), format: MXN, width: 16 },
    { label: 'Costo futuro', value: (r) => Math.round(r.futureCost), format: MXN, width: 16 },
    { label: 'Años', value: (r) => r.years, width: 8 },
    { label: 'Aportación requerida', value: (r) => Math.round(r.monthlyRequired), format: MXN, width: 20 },
    { label: 'Viabilidad', value: (r) => r.feasibilityScore / 100, format: PCT, width: 12 },
  ], m.goals.items));

  // ── Retiro ────────────────────────────────────────────────────────────────
  add('Retiro', sheetFrom(XLSX, [
    { label: 'Concepto', value: (r) => r.concepto, width: 30 },
    { label: 'Monto (MXN)', value: (r) => r.monto, format: MXN, width: 18 },
  ], [
    { concepto: 'Capital necesario', monto: Math.round(m.retirement.requiredCapital) },
    { concepto: 'Capital proyectado', monto: Math.round(m.retirement.projectedCapital) },
    { concepto: 'Brecha de retiro', monto: Math.round(m.retirement.gap) },
    { concepto: 'Aportación mensual faltante', monto: Math.round(m.retirement.additionalMonthlyNeeded) },
    { concepto: 'Ahorro acumulado hoy', monto: Math.round(m.retirement.currentSavings) },
  ]));

  // ── Plan de acción ────────────────────────────────────────────────────────
  add('Plan de acción', sheetFrom(XLSX, [
    { label: 'Severidad', value: (r) => r.severity, width: 12 },
    { label: 'Área', value: (r) => r.area, width: 20 },
    { label: 'Problema', value: (r) => r.problem, width: 44 },
    { label: 'Acción recomendada', value: (r) => r.action, width: 56 },
  ], diagnosis.recommendations));

  return { XLSX, book };
}

/** Arma el libro y lo descarga. */
export async function exportXLSX(data, diagnosis) {
  const { XLSX, book } = await buildReportBook(data, diagnosis);
  XLSX.writeFile(book, `diagnostico-360-${stamp()}.xlsx`);
}
