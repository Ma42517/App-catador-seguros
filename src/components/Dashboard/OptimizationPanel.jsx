import { SlidersHorizontal, RotateCcw, Columns3, Zap, MessageCircle } from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
import {
  Card, CardTitle, SectionTitle, Slider, Button, Badge, Checkbox, Tooltip,
} from '../ui';
import { StackedBar } from '../charts';
import Recommendations from './Recommendations';
import ReferralGate from './ReferralGate';
import { fmtMXN, fmtPct, safeDiv } from '../../engine/finance';

const pctFmt = (v) => `${v > 0 ? '+' : ''}${Math.round(v * 100)}%`;
const ptFmt = (v) => `${v > 0 ? '+' : ''}${(v * 100).toFixed(1)} pp`;

/** Palancas del Scenario Engine. Cada movimiento recalcula todo el modelo. */
function Levers() {
  const { scenario, setScenario, resetScenario, debts, matrix } = useFinance();

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
        />
        <Slider
          label="Reducción de gasto"
          value={scenario.expenseReductionPct}
          onChange={(v) => setScenario({ expenseReductionPct: v })}
          min={0} max={0.5} step={0.01} format={pctFmt}
          help="El recorte se absorbe primero en lujo, luego discrecional y por último importante. Nunca toca lo esencial."
        />
        <Slider
          label="Aplazamiento de metas"
          value={scenario.goalPostponeYears}
          onChange={(v) => setScenario({ goalPostponeYears: v })}
          min={0} max={10} step={1}
          format={(v) => (v === 0 ? 'Sin cambio' : `+${v} año${v > 1 ? 's' : ''}`)}
          help="Dar más tiempo a una meta reduce la aportación mensual, aunque el costo final crece por inflación."
        />


        <Slider
          label="Ajuste de inflación"
          value={scenario.inflationDelta}
          onChange={(v) => setScenario({ inflationDelta: v })}
          min={-0.03} max={0.06} step={0.005} format={ptFmt}
          help="Prueba qué pasa con tus metas y tu retiro si la inflación es mayor o menor a la esperada."
        />
        <Slider
          label="Ajuste de rendimiento"
          value={scenario.returnDelta}
          onChange={(v) => setScenario({ returnDelta: v })}
          min={-0.05} max={0.05} step={0.005} format={ptFmt}
          help="Prueba la sensibilidad de tu plan a rendimientos mejores o peores."
        />
      </div>

      {debts.length > 0 && (
        <div className="mt-5 border-t border-slate-100 pt-4">
          <p className="mb-2 flex items-center gap-1 text-xs font-medium text-slate-600">
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
            <p className="mt-2 rounded-lg bg-emerald-50 p-2.5 text-[11px] text-emerald-800">
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
            <tr className="border-y border-slate-200 bg-slate-50">
              <th className="px-4 py-2 text-left font-medium text-slate-500">Concepto</th>
              {cols.map((c) => (
                <th key={c.key} className="px-3 py-2 text-right font-semibold text-slate-700">
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
                <tr key={row.key} className="border-b border-slate-100 last:border-0">
                  <td className={`px-4 py-2 text-slate-600 ${row.strong ? 'font-semibold text-slate-800' : ''}`}>
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
                        <span className={row.strong ? 'font-semibold text-slate-900' : 'text-slate-700'}>
                          {fmtMXN(v)}
                        </span>
                        {i > 0 && Math.abs(delta) >= 1 && (
                          <span className={`ml-1.5 text-[10px] ${
                            improved ? 'text-emerald-600' : worsened ? 'text-red-600' : 'text-slate-400'
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


            <tr className="border-t border-slate-200 bg-slate-50">
              <td className="px-4 py-2 font-semibold text-slate-700">Salud financiera</td>
              {cols.map((c) => {
                const s = scenarios[c.key];
                return (
                  <td key={c.key} className="px-3 py-2 text-right">
                    <Badge status={s.healthScore >= 70 ? 'green' : s.healthScore >= 40 ? 'yellow' : 'red'}>
                      {s.healthScore}/100
                    </Badge>
                  </td>
                );
              })}
            </tr>
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap gap-2 border-t border-slate-200 p-4">
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
        <div className="rounded-lg bg-slate-50 p-3">
          <p className="text-slate-500">Cambio en flujo libre</p>
          <p className={`text-base font-bold tabular-nums ${cashflowDelta >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
            {cashflowDelta >= 0 ? '+' : ''}{fmtMXN(cashflowDelta)}
          </p>
          <p className="text-[10px] text-slate-400">al mes</p>
        </div>
        <div className="rounded-lg bg-slate-50 p-3">
          <p className="text-slate-500">Cambio en brecha</p>
          <p className={`text-base font-bold tabular-nums ${gapDelta <= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
            {gapDelta > 0 ? '+' : ''}{fmtMXN(gapDelta)}
          </p>
          <p className="text-[10px] text-slate-400">al mes</p>
        </div>
      </div>

      <p className={`mt-3 rounded-lg p-3 text-[11px] leading-relaxed ${
        opt.INCOME_GAP <= 0 ? 'bg-emerald-50 text-emerald-800' : 'bg-amber-50 text-amber-900'
      }`}>
        {opt.INCOME_GAP <= 0
          ? `Con estas palancas tu plan se vuelve viable: tu ingreso cubre tu vida objetivo con ${fmtMXN(-opt.INCOME_GAP)} de excedente mensual.`
          : `Aun con estas palancas faltan ${fmtMXN(opt.INCOME_GAP)} mensuales. Necesitas ${fmtPct(safeDiv(opt.INCOME_GAP, opt.INCOME_SUSTAINABLE))} más de ingreso sostenible, o ajustar metas y gastos con mayor profundidad.`}
      </p>
    </Card>
  );
}


export default function OptimizationPanel() {
  const { recommendations, matrix, profile } = useFinance();

  const waMessage = `Hola, completé mi Diagnóstico Financiero 360${profile.name ? ` (${profile.name})` : ''}. `
    + `Mi flujo libre es de ${fmtMXN(matrix.NET_CASHFLOW)} al mes y tengo una brecha de retiro de `
    + `${fmtMXN(matrix.retirement.gap)}. Me interesa una consultoría.`;
  const waLink = `https://wa.me/?text=${encodeURIComponent(waMessage)}`;

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

          <Card className="border-emerald-200 bg-emerald-50/50">
            <div className="text-center">
              <h3 className="text-sm font-bold text-slate-900">
                ¿Quieres ayuda para ejecutar este plan?
              </h3>
              <p className="mx-auto mt-1.5 max-w-md text-[11px] leading-relaxed text-slate-600">
                Un asesor puede ayudarte a cerrar tu brecha de retiro de{' '}
                {fmtMXN(matrix.retirement.gap)} y a estructurar la protección que hoy te falta.
              </p>
              <a
                href={waLink}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-emerald-700"
              >
                <MessageCircle size={15} />
                Agendar consultoría por WhatsApp
              </a>
            </div>
          </Card>
        </div>
      </ReferralGate>
    </div>
  );
}
