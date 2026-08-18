/**
 * src/data/reportPdf.js
 * Reporte del diagnóstico en PDF, pensado para que el prospecto lo lea en su teléfono.
 *
 * SE CONSTRUYE CON TEXTO, NO SE FOTOGRAFÍA LA PANTALLA.
 *
 * La ruta obvia era `html2canvas` sobre el tablero, y se descartó por tres razones que se
 * notan justo al abrir el archivo en un celular:
 *
 *  1. El tablero es oscuro. Una captura da un PDF con páginas negras: ilegible bajo el sol,
 *     y una hoja imposible de imprimir sin vaciar un cartucho.
 *  2. Una captura es una imagen. El texto no se puede seleccionar, ni copiar, ni buscar, y
 *     al hacer zoom se pixela, que es exactamente lo que hace alguien leyendo en un teléfono.
 *  3. Pesa. Un tablero capturado a resolución legible son varios megas por página; esto son
 *     decenas de kilobytes.
 *
 * Aquí el fondo es blanco, el texto es texto y las tablas se cortan solas entre páginas.
 *
 * Las librerías se cargan con `import()` dinámico: sumadas pesan más que la app entera, y
 * cargarlas al abrir el diagnóstico habría hecho más lento el arranque de todos para una
 * función que se usa una vez al final.
 */
import { fmtMXN, fmtPct } from '../engine/finance.js';

/** Tinta de la marca, en RGB para jsPDF. */
const INK = {
  brand: [79, 70, 229],
  dark: [24, 24, 27],
  soft: [113, 113, 122],
  line: [228, 228, 231],
  bad: [190, 24, 93],
  good: [4, 120, 87],
};

const MARGIN = 14;

const stamp = () => new Date().toISOString().slice(0, 10);

/** Etiqueta de meses a texto legible. Duplica poco y evita importar el módulo de deudas. */
function monthsLabel(months) {
  if (months === null || months === undefined) return 'Nunca se liquida';
  if (months === 0) return 'Liquidada';
  if (months < 12) return `${months} meses`;
  const y = Math.floor(months / 12);
  const m = months % 12;
  return m === 0 ? `${y} año${y > 1 ? 's' : ''}` : `${y}a ${m}m`;
}

/**
 * Construye el documento y lo devuelve, SIN descargarlo.
 *
 * Se separa de la descarga para poder comprobarlo: `save()` sólo existe en el navegador, así
 * que una función que construyera y guardara de un tirón no se podría verificar sin abrir uno.
 * Con la costura, una prueba puede pedir el documento y contar sus páginas.
 *
 * @param data      Estado crudo del diagnóstico.
 * @param diagnosis Salida de `runDiagnosis`.
 */
export async function buildReportDoc(data, diagnosis) {
  const [{ jsPDF }, { default: autoTable }] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable'),
  ]);

  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const contentWidth = pageWidth - MARGIN * 2;

  const m = diagnosis.matrix;
  const name = data.profile?.name?.trim() || 'Diagnóstico sin nombre';

  // ── Portada compacta ──────────────────────────────────────────────────────
  doc.setFillColor(...INK.brand);
  doc.rect(0, 0, pageWidth, 26, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.text('Diagnóstico Financiero 360', MARGIN, 12);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(`${name}  ·  ${new Date().toLocaleDateString('es-MX', {
    day: 'numeric', month: 'long', year: 'numeric',
  })}`, MARGIN, 19);

  let y = 36;

  /** Título de sección, con una línea debajo. */
  const section = (title) => {
    doc.setTextColor(...INK.dark);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text(title, MARGIN, y);
    doc.setDrawColor(...INK.line);
    doc.line(MARGIN, y + 1.5, MARGIN + contentWidth, y + 1.5);
    y += 7;
  };

  /** Tabla con el estilo del reporte. Devuelve la Y donde terminó. */
  const table = (head, body, opts = {}) => {
    autoTable(doc, {
      startY: y,
      head: [head],
      body,
      margin: { left: MARGIN, right: MARGIN },
      styles: { font: 'helvetica', fontSize: 8.5, cellPadding: 2, textColor: INK.dark },
      headStyles: { fillColor: INK.brand, textColor: 255, fontStyle: 'bold', fontSize: 8.5 },
      alternateRowStyles: { fillColor: [250, 250, 250] },
      ...opts,
    });
    y = doc.lastAutoTable.finalY + 9;
  };

  // ── Las cifras que deciden todo ───────────────────────────────────────────
  section('Resumen ejecutivo');
  table(['Concepto', 'Mensual'], [
    ['Ingreso sostenible', fmtMXN(m.INCOME_SUSTAINABLE)],
    ['Gastos totales', fmtMXN(m.EXPENSES_TOTAL)],
    ['Servicio de deuda', fmtMXN(m.DEBT_SERVICE)],
    ['Compromiso de ahorro', fmtMXN(m.SAVINGS_COMMITMENT)],
    ['Costo de metas', fmtMXN(m.GOALS_COST)],
    ['Flujo de caja libre', fmtMXN(m.NET_CASHFLOW)],
    ['Ingreso requerido', fmtMXN(m.REQUIRED_INCOME)],
    ['Brecha de ingreso', fmtMXN(m.INCOME_GAP)],
  ], { columnStyles: { 1: { halign: 'right', fontStyle: 'bold' } } });

  section('Indicadores');
  table(['Indicador', 'Valor'], [
    ['Salud financiera', m.healthScore === null ? 'Sin datos' : `${m.healthScore} / 100`],
    ['Patrimonio neto', fmtMXN(m.NET_WORTH)],
    ['Fondo de emergencia', `${m.assets.emergencyMonths.toFixed(1)} de 6 meses`],
    ['Tasa de ahorro', fmtPct(m.savingsRate)],
    ['Endeudamiento sobre ingreso', fmtPct(m.debts.debtToIncomeRatio)],
    ['Avance de retiro', `${m.retirement.progressPct}%`],
    ['Brecha de retiro', fmtMXN(m.retirement.gap)],
  ], { columnStyles: { 1: { halign: 'right', fontStyle: 'bold' } } });

  // ── Detalle, sólo lo que exista ───────────────────────────────────────────
  if (m.expenses.totalMonthly > 0) {
    section('Gastos por prioridad');
    table(['Prioridad', 'Mensual'], [
      ['Esencial', fmtMXN(m.expenses.essentialMonthly)],
      ['Importante', fmtMXN(m.expenses.importantMonthly)],
      ['Discrecional', fmtMXN(m.expenses.discretionaryMonthly)],
      ['Lujo', fmtMXN(m.expenses.luxuryMonthly)],
    ], { columnStyles: { 1: { halign: 'right' } } });
  }

  if (m.debts.items.length > 0) {
    section('Deudas');
    table(
      ['Concepto', 'Saldo', 'Tasa', 'Pago', 'Plazo'],
      m.debts.items.map((d) => [
        d.name || d.typeLabel, fmtMXN(d.balance), fmtPct(d.annualRate),
        fmtMXN(d.payment), monthsLabel(d.payoffMonths),
      ]),
      { columnStyles: { 1: { halign: 'right' }, 2: { halign: 'right' }, 3: { halign: 'right' } } },
    );
  }

  if (m.assets.items.length > 0) {
    section('Activos');
    table(
      ['Concepto', 'Saldo', 'Aportación', 'Rendimiento'],
      m.assets.items.map((a) => [
        a.name || a.typeLabel, fmtMXN(a.balance),
        fmtMXN(a.contribution), fmtPct(a.annualReturn),
      ]),
      { columnStyles: { 1: { halign: 'right' }, 2: { halign: 'right' }, 3: { halign: 'right' } } },
    );
  }

  if (m.goals.items.length > 0) {
    section('Metas');
    table(
      ['Meta', 'Costo hoy', 'Costo futuro', 'Aportación', 'Viabilidad'],
      m.goals.items.map((g) => [
        g.name || 'Meta', fmtMXN(g.costToday), fmtMXN(g.futureCost),
        fmtMXN(g.monthlyRequired), `${g.feasibilityScore}%`,
      ]),
      {
        columnStyles: {
          1: { halign: 'right' }, 2: { halign: 'right' },
          3: { halign: 'right' }, 4: { halign: 'right' },
        },
      },
    );
  }

  // ── Plan de acción ────────────────────────────────────────────────────────
  if (diagnosis.recommendations.length > 0) {
    section('Plan de acción priorizado');
    table(
      ['#', 'Área', 'Qué hacer'],
      diagnosis.recommendations.map((r, i) => [i + 1, r.area, r.action]),
      {
        columnStyles: {
          0: { cellWidth: 8, halign: 'center' },
          1: { cellWidth: 34 },
        },
      },
    );
  }

  // ── Pie legal en todas las páginas ────────────────────────────────────────
  const total = doc.internal.getNumberOfPages();
  for (let p = 1; p <= total; p += 1) {
    doc.setPage(p);
    const h = doc.internal.pageSize.getHeight();
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.8);
    doc.setTextColor(...INK.soft);
    doc.text(
      'Estimaciones basadas en los datos capturados. No constituye asesoría financiera, '
      + 'fiscal ni de inversión.',
      MARGIN, h - 8,
    );
    doc.text(`${p} / ${total}`, pageWidth - MARGIN, h - 8, { align: 'right' });
  }

  return doc;
}

/** Genera el reporte y lo descarga. */
export async function exportPDF(data, diagnosis) {
  const doc = await buildReportDoc(data, diagnosis);
  doc.save(`diagnostico-360-${stamp()}.pdf`);
}
