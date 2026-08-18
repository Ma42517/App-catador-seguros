import { useMemo, useState } from 'react';
import {
  SlidersHorizontal, RotateCcw, Columns3, Zap, FileText, Sheet,
} from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
import { useSession } from '../../context/SessionContext';
import { resolveAdvisorPhone, whatsAppLink } from '../../lib/advisorPhone';
import { exportPDF } from '../../data/reportPdf';
import { exportXLSX } from '../../data/reportXlsx';
import {
  Card, CardTitle, SectionTitle, Slider, Button, Badge, Checkbox, Tooltip,
} from '../ui';
import { StackedBar } from '../charts';
import Recommendations from './Recommendations';
import ReferralGate from './ReferralGate';
import {
  fmtMXN, fmtPct, safeDiv, buildMatrix, NEUTRAL_SCENARIO,
} from '../../engine/finance';

const pctFmt = (v) => `${v > 0 ? '+' : ''}${Math.round(v * 100)}%`;
const ptFmt = (v) => `${v > 0 ? '+' : ''}${(v * 100).toFixed(1)} pp`;

/** Palancas del Scenario Engine. Cada movimiento recalcula todo el modelo. */
function Levers() {
  const { scenario, setScenario, resetScenario, debts, matrix, data } = useFinance();

  /*
    Cuánto mueve cada palanca, EN PESOS Y POR SEPARADO.

    Se calcula corriendo el motor con esa palanca sola y comparando contra el mismo motor sin
    ninguna. No con una regla de tres sobre el total, y ahí está el punto: el recorte de
    gasto no es proporcional —el motor lo absorbe primero en lujo, luego en discrecional y
    nunca toca lo esencial—, así que un 20 % de reducción casi nunca son el 20 % de los
    gastos. Multiplicar habría mostrado una cifra redonda y falsa, que es peor que no mostrar
    nada en la pantalla donde el prospecto decide qué recortar.

    Aislar también es lo que hace que los números sumen: el aplazamiento de metas, la
    inflación y el rendimiento mueven todos el costo de las metas, así que leer el total
    atribuiría a cada palanca el efecto de las otras dos.

    Sólo se corre el motor para las palancas movidas. Quietas cuestan una sola pasada, y en
    movimiento una o dos: lo normal es tocar una palanca a la vez.
  */
  const impact = useMemo(() => {
    const only = (patch) => buildMatrix(data, {
      mode: 'optimized',
      scenario: { ...NEUTRAL_SCENARIO, ...patch },
    });

    /*
      La base se calcula con la MISMA forma de llamada, en modo 'optimized' y con el escenario
      neutro, en lugar de reutilizar el escenario "Realidad Actual" que ya trae el contexto.
      Los dos deberían coincidir, y comparar contra una llamada distinta dejaría cualquier
      diferencia futura entre modos disfrazada de efecto de la palanca.
    */
    const base = only({});

    const delta = (patch, key) => only(patch)[key] - base[key];

    return {
      income: scenario.incomeIncreasePct
        ? delta({ incomeIncreasePct: scenario.incomeIncreasePct }, 'INCOME_SUSTAINABLE') : 0,
      expense: scenario.expenseReductionPct
        ? delta({ expenseReductionPct: scenario.expenseReductionPct }, 'EXPENSES_TOTAL') : 0,
      goals: scenario.goalPostponeYears
        ? delta({ goalPostponeYears: scenario.goalPostponeYears }, 'GOALS_COST') : 0,
      inflation: scenario.inflationDelta
        ? delta({ inflationDelta: scenario.inflationDelta }, 'REQUIRED_INCOME') : 0,
      returns: scenario.returnDelta
        ? delta({ returnDelta: scenario.returnDelta }, 'REQUIRED_INCOME') : 0,
    };
  }, [data, scenario]);

  return (
    <Card>
      <CardTitle
        icon={SlidersHorizontal}
        help="Estas palancas sólo afectan el escenario Plan Optimizado. Tu información original nunca se modifica."
        action={
          <Button size="sm" variant="ghost" icon={RotateCcw} onClick={resetScenario}>
            Reiniciar
          </Button>
        }
      >
        Palancas de optimización
      </CardTitle>

      <div className="space-y-5">
        <Slider
          label="Incremento de ingreso"
          value={scenario.incomeIncreasePct}
          onChange={(v) => setScenario({ incomeIncreasePct: v })}
          min={0} max={1} step={0.01} format={pctFmt}
          help="Simula un aumento, un ascenso o una segunda fuente de ingreso."
          money={impact.income}
          moneyGood={impact.income >= 0}
          moneyNote="de ingreso sostenible al mes"
        />
        <Slider
          label="Reducción de gasto"
          value={scenario.expenseReductionPct}
          onChange={(v) => setScenario({ expenseReductionPct: v })}
          min={0} max={0.5} step={0.01} format={pctFmt}
          help="El recorte se absorbe primero en lujo, luego discrecional y por último importante. Nunca toca lo esencial."
          money={impact.expense}
          moneyGood={impact.expense <= 0}
          moneyNote="de gasto al mes"
        />
        <Slider
          label="Aplazamiento de metas"
          value={scenario.goalPostponeYears}
          onChange={(v) => setScenario({ goalPostponeYears: v })}
          min={0} max={10} step={1}
          format={(v) => (v === 0 ? 'Sin cambio' : `+${v} año${v > 1 ? 's' : ''}`)}
          help="Dar más tiempo a una meta reduce la aportación mensual, aunque el costo final crece por inflación."
          money={impact.goals}
          moneyGood={impact.goals <= 0}
          moneyNote="de aportación a metas al mes"
        />


        {/*
          Estas dos no mueven lo que se gana ni lo que se gasta: mueven lo que HACE FALTA
          ganar. Por eso su monto se mide sobre el ingreso requerido, que es donde aparece el
          efecto de una inflación distinta o de un rendimiento mejor.
        */}
        <Slider
          label="Ajuste de inflación"
          value={scenario.inflationDelta}
          onChange={(v) => setScenario({ inflationDelta: v })}
          min={-0.03} max={0.06} step={0.005} format={ptFmt}
          help="Prueba qué pasa con tus metas y tu retiro si la inflación es mayor o menor a la esperada."
          money={impact.inflation}
          moneyGood={impact.inflation <= 0}
          moneyNote="de ingreso requerido al mes"
        />
        <Slider
          label="Ajuste de rendimiento"
          value={scenario.returnDelta}
          onChange={(v) => setScenario({ returnDelta: v })}
          min={-0.05} max={0.05} step={0.005} format={ptFmt}
          help="Prueba la sensibilidad de tu plan a rendimientos mejores o peores."
          money={impact.returns}
          moneyGood={impact.returns <= 0}
          moneyNote="de ingreso requerido al mes"
        />
      </div>

      {debts.length > 0 && (
        <div className="mt-5 border-t border-zinc-700/50 pt-4">
          <p className="mb-2 flex items-center gap-1 text-xs font-medium text-zinc-400">
            Deudas liquidadas en el escenario
            <Tooltip text="Al liquidar una deuda su pago se libera de tu flujo de inmediato y su saldo desaparece de tus pasivos." />
          </p>
          <div className="space-y-2">
            {debts.map((d) => {
              const checked = (scenario.eliminatedDebtIds || []).includes(d.id);
              const payment = Math.max(d.minPayment || 0, d.actualPayment || 0);
              return (
                <Checkbox
                  key={d.id}
                  checked={checked}
                  onChange={(on) => setScenario({
                    eliminatedDebtIds: on
                      ? [...(scenario.eliminatedDebtIds || []), d.id]
                      : (scenario.eliminatedDebtIds || []).filter((x) => x !== d.id),
                  })}
                  label={`${d.name || 'Deuda'} — libera ${fmtMXN(payment)}/mes`}
                />
              );
            })}
          </div>
          {matrix.freedByScenario > 0 && (
            <p className="mt-2 rounded-lg bg-emerald-500/10 p-2.5 text-[11px] text-emerald-200">
              Liberas {fmtMXN(matrix.freedByScenario)} mensuales de flujo permanente.
            </p>
          )}
        </div>
      )}
    </Card>
  );
}


const ROWS = [
  { key: 'INCOME_SUSTAINABLE', label: 'Ingreso sostenible', better: 'high' },
  { key: 'EXPENSES_TOTAL', label: 'Gastos totales', better: 'low' },
  { key: 'DEBT_SERVICE', label: 'Servicio de deuda', better: 'low' },
  { key: 'SAVINGS_COMMITMENT', label: 'Compromiso de ahorro', better: 'high' },
  { key: 'GOALS_COST', label: 'Costo de metas', better: 'none' },
  { key: 'NET_CASHFLOW', label: 'Flujo de caja libre', better: 'high', strong: true },
  { key: 'REQUIRED_INCOME', label: 'Ingreso requerido', better: 'low' },
  { key: 'INCOME_GAP', label: 'Brecha de ingreso', better: 'low', strong: true },
  { key: 'NET_WORTH', label: 'Patrimonio neto', better: 'high' },
];

/** Comparación de las tres vistas paralelas del Scenario Engine. */
function ScenarioComparison() {
  const { scenarios, setMode } = useFinance();
  const cols = [
    { key: 'current', label: 'Realidad Actual' },
    { key: 'aspirational', label: 'Vida Aspiracional' },
    { key: 'optimized', label: 'Plan Optimizado' },
  ];

  return (
    <Card padded={false}>
      <div className="p-4 pb-3 sm:p-5 sm:pb-3">
        <CardTitle
          icon={Columns3}
          className="mb-0"
          help="Realidad Actual: tu situación tal cual. Vida Aspiracional: además de todo lo anterior, aportar lo que el retiro realmente exige. Plan Optimizado: con las palancas de arriba aplicadas."
        >
          Comparación de escenarios
        </CardTitle>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[520px] text-xs">
          <thead>
            <tr className="border-y border-zinc-700/50 bg-zinc-950/60">
              <th className="px-4 py-2 text-left font-medium text-zinc-400">Concepto</th>
              {cols.map((c) => (
                <th key={c.key} className="px-3 py-2 text-right font-semibold text-zinc-300">
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ROWS.map((row) => {
              const values = cols.map((c) => scenarios[c.key][row.key]);
              const base = values[0];
              return (
                <tr key={row.key} className="border-b border-zinc-700/50 last:border-0">
                  <td className={`px-4 py-2 text-zinc-400 ${row.strong ? 'font-semibold text-zinc-200' : ''}`}>
                    {row.label}
                  </td>
                  {values.map((v, i) => {
                    const delta = v - base;
                    const improved = row.better === 'high' ? delta > 0
                      : row.better === 'low' ? delta < 0 : false;
                    const worsened = row.better === 'high' ? delta < 0
                      : row.better === 'low' ? delta > 0 : false;
                    return (
                      <td key={cols[i].key} className="px-3 py-2 text-right tabular-nums">
                        <span className={row.strong ? 'font-semibold text-zinc-100' : 'text-zinc-300'}>
                          {fmtMXN(v)}
                        </span>
                        {i > 0 && Math.abs(delta) >= 1 && (
                          <span className={`ml-1.5 text-[10px] ${
                            improved ? 'text-emerald-400' : worsened ? 'text-rose-400' : 'text-zinc-500'
                          }`}>
                            {delta > 0 ? '+' : ''}{Math.round(delta / 1000)}k
                          </span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}


            <tr className="border-t border-zinc-700/50 bg-zinc-950/60">
              <td className="px-4 py-2 font-semibold text-zinc-300">Salud financiera</td>
              {cols.map((c) => {
                const s = scenarios[c.key];
                return (
                  <td key={c.key} className="px-3 py-2 text-right">
                    {/* El puntaje es null mientras no haya nada evaluable. */}
                    <Badge status={s.healthScore === null ? 'neutral'
                      : s.healthScore >= 70 ? 'green'
                        : s.healthScore >= 40 ? 'yellow' : 'red'}
                    >
                      {s.healthScore === null ? '—' : `${s.healthScore}/100`}
                    </Badge>
                  </td>
                );
              })}
            </tr>
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap gap-2 border-t border-zinc-700/50 p-4">
        {cols.map((c) => (
          <Button key={c.key} size="sm" variant="outline" onClick={() => setMode(c.key)}>
            Ver {c.label} en el dashboard
          </Button>
        ))}
      </div>
    </Card>
  );
}


/** Resultado del escenario optimizado frente a la realidad actual. */
function OptimizedOutcome() {
  const { scenarios } = useFinance();
  const base = scenarios.current;
  const opt = scenarios.optimized;

  const cashflowDelta = opt.NET_CASHFLOW - base.NET_CASHFLOW;
  const gapDelta = opt.INCOME_GAP - base.INCOME_GAP;

  return (
    <Card>
      <CardTitle icon={Zap}>Resultado del plan optimizado</CardTitle>

      <StackedBar
        segments={[
          { label: 'Gastos', value: opt.EXPENSES_TOTAL, color: 'rgb(234 88 12)' },
          { label: 'Deuda', value: opt.DEBT_SERVICE, color: 'rgb(220 38 38)' },
          { label: 'Ahorro', value: opt.SAVINGS_COMMITMENT, color: 'rgb(16 185 129)' },
          { label: 'Metas', value: opt.GOALS_COST, color: 'rgb(124 58 237)' },
        ]}
        reference={opt.INCOME_SUSTAINABLE}
        referenceLabel="Ingreso"
      />

      <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
        <div className="surface-sunken p-3">
          <p className="text-zinc-400">Cambio en flujo libre</p>
          <p className={`text-base font-bold tabular-nums ${cashflowDelta >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            {cashflowDelta >= 0 ? '+' : ''}{fmtMXN(cashflowDelta)}
          </p>
          <p className="text-[10px] text-zinc-500">al mes</p>
        </div>
        <div className="surface-sunken p-3">
          <p className="text-zinc-400">Cambio en brecha</p>
          <p className={`text-base font-bold tabular-nums ${gapDelta <= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            {gapDelta > 0 ? '+' : ''}{fmtMXN(gapDelta)}
          </p>
          <p className="text-[10px] text-zinc-500">al mes</p>
        </div>
      </div>

      <p className={`mt-3 rounded-lg p-3 text-[11px] leading-relaxed ${
        opt.INCOME_GAP <= 0 ? 'bg-emerald-500/10 text-emerald-200' : 'bg-amber-500/10 text-amber-200'
      }`}>
        {opt.INCOME_GAP <= 0
          ? `Con estas palancas tu plan se vuelve viable: tu ingreso cubre tu vida objetivo con ${fmtMXN(-opt.INCOME_GAP)} de excedente mensual.`
          : `Aun con estas palancas faltan ${fmtMXN(opt.INCOME_GAP)} mensuales. Necesitas ${fmtPct(safeDiv(opt.INCOME_GAP, opt.INCOME_SUSTAINABLE))} más de ingreso sostenible, o ajustar metas y gastos con mayor profundidad.`}
      </p>
    </Card>
  );
}


/**
 * Glifo de WhatsApp.
 *
 * Va como SVG en el archivo y no desde una librería de iconos: `lucide-react` —la que ya usa
 * la app— no incluye marcas comerciales, y traer `react-icons` entera para un solo glifo
 * añadiría un paquete al proyecto para dibujar 24 píxeles.
 */
function WhatsAppGlyph({ size = 20 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      className="shrink-0"
    >
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.347-.347.52-.52.174-.174.232-.298.347-.497.115-.198.057-.371-.015-.52-.074-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z" />
    </svg>
  );
}

/**
 * Llamado a la acción hacia el WhatsApp del asesor.
 *
 * Es la última pantalla del diagnóstico y la única que pide algo. Lo que decide si se toca no
 * es el botón sino la frase de arriba: nombra la brecha que el prospecto acaba de ver con su
 * propio número, así que la oferta llega justo cuando el problema está a la vista.
 */
function AdvisorCTA({ advisorPhone }) {
  const { matrix } = useFinance();
  const { identity } = useSession();

  const phone = resolveAdvisorPhone(advisorPhone, identity);
  const gap = matrix.retirement.gap;

  /*
    El texto cambia con el resultado del diagnóstico.

    A quien ya tiene el retiro cubierto no se le puede ofrecer cerrar una brecha que no
    tiene: la frase sonaría a plantilla y tiraría la credibilidad de las nueve pantallas
    anteriores. Sí le queda lo otro, que aplica a todos: la protección.
  */
  const pitch = gap > 0
    ? `Un asesor puede ayudarte a cerrar tu brecha de retiro de ${fmtMXN(gap)} y a `
      + 'estructurar la protección que hoy te falta.'
    : 'Un asesor puede ayudarte a optimizar tu estrategia financiera y a estructurar la '
      + 'protección que hoy te falta.';

  /*
    Al saludo se le añaden las dos cifras del diagnóstico.

    El mensaje lo manda el prospecto, así que estos números llegan al asesor antes de la
    primera llamada: sabe con qué caso está tratando sin tener que preguntar nada, y la
    conversación empieza donde el diagnóstico la dejó.
  */
  const message = '¡Hola! Acabo de terminar mi diagnóstico financiero 360 y me gustaría '
    + `agendar una revisión. Mi flujo libre es de ${fmtMXN(matrix.NET_CASHFLOW)} al mes`
    + `${gap > 0 ? ` y mi brecha de retiro es de ${fmtMXN(gap)}` : ''}.`;

  return (
    <div
      className="relative overflow-hidden rounded-2xl border border-[#25D366]/35
                 bg-gradient-to-br from-[#25D366]/15 via-emerald-500/[0.06] to-transparent
                 p-6 shadow-2xl shadow-emerald-950/40"
    >
      {/*
        Resplandor detrás del título. Va en un elemento aparte y no como sombra del
        contenedor porque tiene que quedar DENTRO del borde luminoso: una sombra exterior en
        una pantalla negra se pierde, y este bloque compite con nueve pantallas de datos.
      */}
      <div
        className="pointer-events-none absolute -top-24 left-1/2 h-48 w-80 -translate-x-1/2
                   rounded-full bg-[#25D366]/20 blur-3xl"
        aria-hidden="true"
      />

      <div className="relative text-center">
        <h3 className="text-base font-bold text-zinc-50">
          ¿Quieres ayuda para ejecutar este plan?
        </h3>

        <p className="mx-auto mt-2 max-w-md text-xs leading-relaxed text-zinc-300">
          {pitch}
        </p>

        <div className="mt-5 flex justify-center">
          <a
            href={whatsAppLink(phone, message)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex w-full items-center justify-center gap-2.5 rounded-xl
                       bg-[#25D366] px-6 py-4 text-sm font-bold text-white shadow-lg
                       shadow-[#25D366]/30 transition-all duration-150 hover:bg-[#1DA851]
                       hover:shadow-xl hover:shadow-[#25D366]/40 active:scale-[0.98]
                       focus-visible:outline-none focus-visible:ring-2
                       focus-visible:ring-[#25D366] focus-visible:ring-offset-2
                       focus-visible:ring-offset-zinc-950 sm:w-auto sm:px-8"
          >
            <WhatsAppGlyph size={20} />
            Hablar con mi Asesor por WhatsApp
          </a>
        </div>

        {/*
          Aviso sólo para el asesor en sesión, no para el prospecto.

          Sin número, el botón abre WhatsApp y pide elegir contacto: sigue sirviendo, pero el
          prospecto ya no llega solo. Quien puede arreglarlo es quien tiene la sesión abierta,
          y es el único que ve este renglón.
        */}
        {!phone && identity && (
          <p className="mt-3 text-[10px] leading-relaxed text-amber-300/80">
            Aún no has guardado tu WhatsApp en tu tarjeta digital, así que este botón abrirá
            WhatsApp sin destinatario. Agrégalo para que los prospectos te escriban directo.
          </p>
        )}
      </div>
    </div>
  );
}


/**
 * Descarga del reporte. Vive sólo en esta pantalla, y a propósito.
 *
 * Antes era un menú "Exportar" en la cabecera, visible desde el primer paso: se podía
 * descargar un reporte de un diagnóstico con tres campos llenos, que es un documento que
 * desprestigia a quien lo entrega. Aquí abajo, el archivo sólo existe cuando el diagnóstico
 * ya está completo y el motor recalculó todo.
 */
function ReportDownloads() {
  const { data, diagnosis } = useFinance();

  /*
    Un estado por formato y no uno compartido: las dos librerías tardan en cargarse la primera
    vez, y con una sola bandera pulsar PDF dejaría también el botón de Excel en "generando",
    como si estuviera haciendo algo que nadie pidió.
  */
  const [busy, setBusy] = useState('');
  const [failed, setFailed] = useState('');

  /**
   * Corre el generador avisando en el botón.
   *
   * El error se muestra en pantalla en lugar de quedarse en la consola. Estas dos librerías
   * se descargan en el momento de pulsar, así que la falla más probable es de red —y pasa
   * justo cuando el asesor está frente al prospecto—. Un botón que no responde y no explica
   * nada es lo peor que puede ocurrir en ese instante.
   */
  const run = async (kind, generate) => {
    setBusy(kind);
    setFailed('');
    try {
      await generate(data, diagnosis);
    } catch {
      setFailed(kind);
    } finally {
      setBusy('');
    }
  };

  return (
    <Card>
      <div className="flex flex-col items-center gap-3 text-center">
        <p className="text-[11px] leading-relaxed text-zinc-400">
          Llévate tu diagnóstico completo, con el resumen, el detalle y tu plan de acción.
        </p>

        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
          {/*
            Contorno y no relleno: el botón de WhatsApp de arriba es la acción que se quiere,
            y dos botones sólidos compitiendo se anulan. Este se ve, pero va segundo.
          */}
          <Button
            variant="outline"
            icon={FileText}
            onClick={() => run('pdf', exportPDF)}
            disabled={busy !== ''}
            className="border-indigo-500/40 text-indigo-200 hover:border-indigo-400
                       hover:bg-indigo-500/10 hover:text-indigo-100"
          >
            {busy === 'pdf' ? 'Generando PDF…' : 'Descargar Reporte (PDF)'}
          </Button>

          <Button
            variant="ghost"
            icon={Sheet}
            onClick={() => run('xlsx', exportXLSX)}
            disabled={busy !== ''}
          >
            {busy === 'xlsx' ? 'Generando Excel…' : 'Excel (.xlsx)'}
          </Button>
        </div>

        {failed && (
          <p className="text-[11px] text-rose-300">
            No se pudo generar el archivo. Revisa tu conexión y vuelve a intentarlo.
          </p>
        )}
      </div>
    </Card>
  );
}


export default function OptimizationPanel({ advisorPhone }) {
  const { recommendations } = useFinance();

  return (
    <div className="space-y-4">
      <SectionTitle
        eyebrow="Módulo 10"
        title="Optimización y escenarios"
        description="Mueve las palancas y observa cómo se reconfigura tu economía completa en tiempo real. Tus datos originales no se alteran."
      />

      <Levers />

      <ReferralGate
        title="Desbloquea tu Plan de Optimización 360"
        description="Ya viste las palancas. Para liberar la comparación completa de escenarios y tu plan de acción priorizado, comparte el contacto de 2 personas a quienes también les pueda servir este diagnóstico gratuito."
      >
        <div className="space-y-4">
          <ScenarioComparison />
          <OptimizedOutcome />
          <Recommendations recommendations={recommendations} />

          <AdvisorCTA advisorPhone={advisorPhone} />
          <ReportDownloads />
        </div>
      </ReferralGate>
    </div>
  );
}
