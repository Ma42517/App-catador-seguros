import {
  Wallet, ShoppingCart, CreditCard, TrendingUp, Target, Landmark,
  Activity, PiggyBank, Gauge, Layers,
} from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
import {
  Card, CardTitle, SectionTitle, StatCard, SegmentedControl,
  TrafficLightRow, Badge, Tooltip,
} from '../ui';
import { DonutChart, BarList, LineChart, StackedBar, ProgressBar } from '../charts';
import FindingsPanel from './FindingsPanel';
import Recommendations from './Recommendations';
import RiskBanners from './RiskBanners';
import {
  SCENARIO_MODES, EXPENSE_PRIORITIES, fmtMXN, fmtPct, safeDiv,
} from '../../engine/finance';

function monthsLabel(months) {
  if (months === null || months === undefined) return 'Nunca';
  if (months < 12) return `${months} m`;
  const y = Math.floor(months / 12);
  const m = months % 12;
  return m === 0 ? `${y} a` : `${y}a ${m}m`;
}

/** Puntaje global de salud con anillo. */
function HealthScore({ score }) {
  const tone = score >= 70 ? 'text-emerald-400' : score >= 40 ? 'text-amber-600' : 'text-red-400';
  const stroke = score >= 70 ? 'rgb(5 150 105)' : score >= 40 ? 'rgb(217 119 6)' : 'rgb(220 38 38)';
  const r = 30;
  const c = 2 * Math.PI * r;

  return (
    <div className="flex items-center gap-4">
      <div className="relative h-[76px] w-[76px] shrink-0">
        <svg width="76" height="76" className="-rotate-90">
          <circle cx="38" cy="38" r={r} fill="none" stroke="rgb(241 245 249)" strokeWidth="7" />
          <circle
            cx="38" cy="38" r={r} fill="none" stroke={stroke} strokeWidth="7"
            strokeDasharray={`${(score / 100) * c} ${c}`} strokeLinecap="round"
          />
        </svg>
        <div className="absolute inset-0 grid place-items-center">
          <span className={`text-lg font-bold tabular-nums ${tone}`}>{score}</span>
        </div>
      </div>
      <div>
        <p className="text-xs font-semibold text-slate-200">Salud financiera global</p>
        <p className="mt-0.5 text-[11px] leading-relaxed text-slate-400">
          Puntaje compuesto de flujo, deuda, liquidez, metas y retiro.
        </p>
      </div>
    </div>
  );
}


export default function ExecutiveDashboard() {
  const { matrix: m, diagnosis, findings, recommendations, activeMode, setMode, profile } = useFinance();

  const lightRows = [
    {
      key: 'cashflow',
      label: 'Flujo de caja',
      value: fmtMXN(m.NET_CASHFLOW),
      verdict: m.NET_CASHFLOW < 0
        ? 'Déficit: gastas más de lo que sostienes'
        : `Tasa de ahorro ${fmtPct(m.savingsRate)}`,
      help: 'Ingreso sostenible menos gastos menos servicio de deuda.',
    },
    {
      key: 'debt',
      label: 'Riesgo de deuda',
      value: fmtPct(m.debts.debtToIncomeRatio),
      verdict: m.debts.debtToIncomeRatio > 0.5 ? 'Sobre el 50%: crítico'
        : m.debts.debtToIncomeRatio >= 0.3 ? 'Entre 30% y 50%: precaución'
        : 'Bajo el 30%: saludable',
      help: 'Proporción de tu ingreso sostenible comprometida en pagos de deuda.',
    },
    {
      key: 'emergency',
      label: 'Fondo de emergencia',
      value: `${m.assets.emergencyMonths.toFixed(1)} meses`,
      verdict: `Cubre tu gasto esencial de ${fmtMXN(m.expenses.essentialMonthly)}`,
      help: 'Meses de gasto esencial que puedes cubrir con tus activos líquidos.',
    },
    {
      key: 'goals',
      label: 'Viabilidad de metas',
      value: `${m.goals.feasibilityScore}/100`,
      verdict: m.goals.totalMonthlyRequired > 0
        ? `Requieren ${fmtMXN(m.goals.totalMonthlyRequired)} al mes`
        : 'Sin metas registradas',
      help: 'Qué proporción de la aportación requerida por tus metas cubre tu excedente.',
    },
    {
      key: 'retirement',
      label: 'Preparación para el retiro',
      value: `${m.retirement.progressPct}%`,
      verdict: m.retirement.gap > 0
        ? `Brecha de ${fmtMXN(m.retirement.gap)}`
        : 'Trayectoria suficiente',
      help: 'Avance de tu capital proyectado frente al capital necesario.',
    },
  ];


  return (
    <div className="space-y-4">
      <SectionTitle
        eyebrow="Módulos 11 y 12"
        title={profile.name ? `Diagnóstico de ${profile.name}` : 'Diagnóstico ejecutivo'}
        description="Todas las cifras provienen de una sola matriz financiera. Cambia de escenario para ver cómo se reconfigura tu economía completa."
      />

      {/* Selector de escenario: puede desplazarse en pantallas estrechas */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="-mx-4 max-w-full overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0 sm:pb-0">
          <SegmentedControl
            value={activeMode}
            onChange={setMode}
            options={SCENARIO_MODES}
          />
        </div>
        {activeMode === 'aspirational' && (
          <Badge status="yellow">Incluye la aportación al retiro que aún no haces</Badge>
        )}
        {activeMode === 'optimized' && (
          <Badge status="green">Con las palancas del paso de Optimización</Badge>
        )}
      </div>

      {/* Riesgos que pueden destruir el patrimonio: van antes que cualquier cifra */}
      <RiskBanners matrix={m} />

      {/* Matriz central */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="Ingreso sostenible" value={fmtMXN(m.INCOME_SUSTAINABLE)} icon={Wallet} tone="accent"
          sub={m.income.extraordinaryMonthly > 0
            ? `Excluye ${fmtMXN(m.income.extraordinaryMonthly)} extraordinarios`
            : 'Base de todo compromiso'}
          help="Único ingreso que el motor considera comprometible. Excluye lo extraordinario y descuenta el factor de variabilidad."
        />
        <StatCard
          label="Gastos totales" value={fmtMXN(m.EXPENSES_TOTAL)} icon={ShoppingCart}
          sub={`${fmtPct(m.expenses.expenseToIncomeRatio)} de tu ingreso`}
        />
        <StatCard
          label="Servicio de deuda" value={fmtMXN(m.DEBT_SERVICE)} icon={CreditCard}
          tone={m.debts.debtToIncomeRatio > 0.3 ? 'negative' : 'neutral'}
          sub={`${fmtMXN(m.debts.monthlyInterest)} son intereses`}
        />
        <StatCard
          label="Flujo de caja libre" value={fmtMXN(m.NET_CASHFLOW)} icon={Activity}
          tone={m.NET_CASHFLOW < 0 ? 'negative' : 'positive'}
          sub={m.NET_CASHFLOW < 0 ? 'Déficit mensual' : `Tasa de ahorro ${fmtPct(m.savingsRate)}`}
          emphasis
        />
      </div>


      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="Compromiso de ahorro" value={fmtMXN(m.SAVINGS_COMMITMENT)} icon={PiggyBank}
          sub="Aportaciones a tus activos"
          help="Suma de las aportaciones mensuales a todos tus activos, incluida la cuenta de retiro."
        />
        <StatCard
          label="Costo de metas" value={fmtMXN(m.GOALS_COST)} icon={Target}
          sub={m.goals.unfundedMonthly > 0 ? `Faltan ${fmtMXN(m.goals.unfundedMonthly)}` : 'Cubiertas'}
        />
        <StatCard
          label="Ingreso requerido" value={fmtMXN(m.REQUIRED_INCOME)} icon={Gauge}
          sub="Para sostener tu vida objetivo"
          help="Gastos + deuda + ahorro + metas + impuestos aplicables."
        />
        <StatCard
          label="Brecha de ingreso" value={fmtMXN(m.INCOME_GAP)} icon={TrendingUp}
          tone={m.INCOME_GAP > 0 ? 'negative' : 'positive'}
          sub={m.INCOME_GAP > 0
            ? `Necesitas ${fmtPct(safeDiv(m.INCOME_GAP, m.INCOME_SUSTAINABLE))} más de ingreso`
            : 'Tu ingreso alcanza'}
          emphasis
        />
      </div>

      {/* Composición del ingreso requerido */}
      <Card>
        <CardTitle
          icon={Layers}
          help="La barra muestra en qué se compromete tu dinero. La línea vertical marca cuánto dinero existe realmente."
        >
          A dónde va cada peso
        </CardTitle>
        <StackedBar
          segments={[
            { label: 'Gastos', value: m.EXPENSES_TOTAL, color: 'rgb(234 88 12)' },
            { label: 'Deuda', value: m.DEBT_SERVICE, color: 'rgb(220 38 38)' },
            { label: 'Ahorro', value: m.SAVINGS_COMMITMENT, color: 'rgb(16 185 129)' },
            { label: 'Metas', value: m.GOALS_COST, color: 'rgb(124 58 237)' },
            ...(m.taxDrag > 0 ? [{ label: 'Impuestos', value: m.taxDrag, color: 'rgb(100 116 139)' }] : []),
          ]}
          reference={m.INCOME_SUSTAINABLE}
          referenceLabel="Tu ingreso"
        />
        <p className={`mt-4 rounded-lg p-3 text-[11px] leading-relaxed ${
          m.INCOME_GAP > 0 ? 'bg-red-500/10 text-red-200' : 'bg-emerald-500/10 text-emerald-200'
        }`}>
          {m.INCOME_GAP > 0
            ? `Tu vida objetivo cuesta ${fmtMXN(m.REQUIRED_INCOME)} al mes y tu ingreso sostenible es de ${fmtMXN(m.INCOME_SUSTAINABLE)}. Faltan ${fmtMXN(m.INCOME_GAP)} mensuales, o ${fmtMXN(m.INCOME_GAP * 12)} al año.`
            : `Tu ingreso sostenible cubre tu vida objetivo completa con un excedente de ${fmtMXN(-m.INCOME_GAP)} al mes.`}
        </p>
      </Card>


      {/* Semáforo */}
      <Card>
        <CardTitle icon={Gauge}>Semáforo financiero</CardTitle>
        <div className="mb-4 border-b border-slate-700/50 pb-4">
          <HealthScore score={m.healthScore} />
        </div>
        <div>
          {lightRows.map((row) => (
            <TrafficLightRow
              key={row.key}
              status={m.lights[row.key]}
              label={row.label}
              value={row.value}
              verdict={row.verdict}
              help={<Tooltip text={row.help} />}
            />
          ))}
        </div>
      </Card>

      {/* Gastos y deuda */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardTitle icon={ShoppingCart}>Distribución del gasto</CardTitle>
          <DonutChart
            data={EXPENSE_PRIORITIES.map((p) => ({
              label: p.label,
              value: m.expenses.byPriority[p.value] || 0,
              color: p.color,
            }))}
            centerValue={fmtMXN(m.EXPENSES_TOTAL)}
            centerLabel="al mes"
            size={130}
          />
        </Card>

        <Card>
          <CardTitle
            icon={CreditCard}
            action={<Badge status={m.lights.debt}>{fmtPct(m.debts.debtToIncomeRatio)}</Badge>}
          >
            Deuda por saldo
          </CardTitle>
          <BarList
            items={m.debts.items.map((d) => ({
              label: d.name || d.typeLabel,
              value: d.balance,
              color: d.annualRate > 0.35 ? 'rgb(220 38 38)'
                : d.annualRate > 0.15 ? 'rgb(234 88 12)' : 'rgb(37 99 235)',
              note: `${fmtPct(d.annualRate)} · ${fmtMXN(d.payment)}/mes · ${monthsLabel(d.payoffMonths)}`,
            }))}
            emptyText="Sin deuda registrada."
          />
          {m.debts.totalBalance > 0 && (
            <p className="mt-3 border-t border-slate-700/50 pt-2.5 text-[11px] text-slate-400">
              Saldo total {fmtMXN(m.debts.totalBalance)} · Intereses anuales {fmtMXN(m.debts.annualInterest)}
            </p>
          )}
        </Card>
      </div>


      {/* Patrimonio y retiro */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardTitle
            icon={Landmark}
            action={<Badge status={m.netWorth.isNegative ? 'red' : 'green'}>{fmtMXN(m.NET_WORTH)}</Badge>}
          >
            Proyección de patrimonio
          </CardTitle>
          <LineChart
            points={diagnosis.wealthPath.map((p) => ({ x: p.year, y: p.value }))}
            xLabel="Años a partir de hoy"
            color="rgb(16 185 129)"
          />
          <p className="mt-2 text-[11px] leading-relaxed text-slate-400">
            Simulación con tu flujo libre actual de {fmtMXN(Math.max(0, m.NET_CASHFLOW))} al mes a una
            tasa real de {fmtPct(m.retirement.preRealRate)}. No es una promesa de rendimiento.
          </p>
        </Card>

        <Card>
          <CardTitle
            icon={Target}
            action={<Badge status={m.lights.retirement}>{m.retirement.progressPct}%</Badge>}
          >
            Camino al retiro
          </CardTitle>
          <ProgressBar
            value={m.retirement.progress}
            tone={m.lights.retirement}
            label={`${fmtMXN(m.retirement.projectedCapital)} de ${fmtMXN(m.retirement.requiredCapital)}`}
            height={8}
          />
          <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
            <div>
              <p className="text-slate-400">Brecha</p>
              <p className="font-semibold tabular-nums text-red-400">{fmtMXN(m.retirement.gap)}</p>
            </div>
            <div>
              <p className="text-slate-400">Aportación faltante</p>
              <p className="font-semibold tabular-nums text-slate-100">
                {fmtMXN(m.retirement.additionalMonthlyNeeded)}/mes
              </p>
            </div>
          </div>
          <p className="mt-3 text-[11px] leading-relaxed text-slate-400">
            Te quedan {m.retirement.yearsToRetirement} años de acumulación para financiar{' '}
            {m.retirement.yearsInRetirement} años de retiro.
          </p>
        </Card>
      </div>

      {/* Metas */}
      {m.goals.items.length > 0 && (
        <Card>
          <CardTitle
            icon={Target}
            action={<Badge status={m.lights.goals}>{m.goals.feasibilityScore}/100</Badge>}
          >
            Avance de metas
          </CardTitle>
          <div className="space-y-3">
            {m.goals.items.map((g) => (
              <ProgressBar
                key={g.id}
                value={g.coverage}
                tone={g.isFeasible ? 'green' : g.coverage > 0.5 ? 'yellow' : 'red'}
                label={`${g.name || 'Meta'} · ${fmtMXN(g.monthlyRequired)}/mes · ${g.years} años`}
                right={`${g.feasibilityScore}%`}
              />
            ))}
          </div>
        </Card>
      )}

      <FindingsPanel findings={findings} />
      <Recommendations recommendations={recommendations} limit={3} />
    </div>
  );
}
