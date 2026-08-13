import {
  Wallet, ShoppingCart, CreditCard, TrendingUp, Target, Landmark,
  Activity, PiggyBank, Gauge, Layers, FlaskConical,
} from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
import { DASHBOARD_VERSIONS, useDashboardVersion } from '../../context/dashboardVersion';
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

/**
 * Puntaje global de salud con anillo.
 *
 * `score` puede ser `null`, y entonces no se dibuja ningún número: significa que
 * todavía no hay nada evaluable. Antes esa situación se resolvía con un cero que se
 * pintaba de rojo, así que el primer contacto con el diagnóstico era un veredicto
 * demoledor sobre una captura vacía.
 */
function HealthScore({ score }) {
  const pending = score === null || score === undefined;

  const tone = pending ? 'text-zinc-500'
    : score >= 70 ? 'text-emerald-400'
      : score >= 40 ? 'text-amber-400' : 'text-rose-400';
  const stroke = pending ? 'rgb(82 82 91)'
    : score >= 70 ? 'rgb(16 185 129)'
      : score >= 40 ? 'rgb(245 158 11)' : 'rgb(244 63 94)';
  const r = 30;
  const c = 2 * Math.PI * r;

  return (
    <div className="flex items-center gap-4">
      <div className="relative h-[76px] w-[76px] shrink-0">
        <svg width="76" height="76" className="-rotate-90">
          <circle cx="38" cy="38" r={r} fill="none" stroke="rgb(30 41 59)" strokeWidth="7" />
          <circle
            cx="38" cy="38" r={r} fill="none" stroke={stroke} strokeWidth="7"
            strokeDasharray={`${(pending ? 0 : score / 100) * c} ${c}`} strokeLinecap="round"
          />
        </svg>
        <div className="absolute inset-0 grid place-items-center">
          <span className={`text-lg font-bold tabular-nums ${tone}`}>
            {pending ? '—' : score}
          </span>
        </div>
      </div>
      <div>
        <p className="text-xs font-semibold text-zinc-200">Salud financiera global</p>
        <p className="mt-0.5 text-[11px] leading-relaxed text-zinc-400">
          {pending
            ? 'Captura tus ingresos y gastos para calcularlo.'
            : 'Promedio de los indicadores que ya se pueden evaluar.'}
        </p>
      </div>
    </div>
  );
}


/**
 * Versión actual del diagnóstico, la que está en uso.
 *
 * No cambió nada de su contenido al montarse el A/B: es la referencia contra la
 * que se compara el rediseño, y una referencia que se toca deja de servir para
 * comparar. Ya no es el `export default` porque ahora quien decide qué se ve es el
 * enrutador del final del archivo.
 */
export function ExecutiveDashboardV1() {
  const { matrix: m, diagnosis, findings, recommendations, activeMode, setMode, profile } = useFinance();

  const lightRows = [
    {
      key: 'cashflow',
      label: 'Flujo de caja',
      value: fmtMXN(m.NET_CASHFLOW),
      /*
        Cada veredicto dice qué falta cuando su luz está en gris. Un indicador sin
        datos que no explica qué le falta deja al asesor buscando un problema
        inexistente.
      */
      verdict: m.lights.cashflow === 'neutral'
        ? 'Captura tus ingresos y gastos'
        : m.NET_CASHFLOW < 0
          ? 'Déficit: gastas más de lo que sostienes'
          : `Tasa de ahorro ${fmtPct(m.savingsRate)}`,
      help: 'Ingreso sostenible menos gastos menos servicio de deuda.',
    },
    {
      key: 'debt',
      label: 'Riesgo de deuda',
      value: fmtPct(m.debts.debtToIncomeRatio),
      verdict: m.debts.totalBalance <= 0 && m.DEBT_SERVICE <= 0
        ? 'Sin deuda registrada'
        : m.INCOME_SUSTAINABLE <= 0
          ? 'Pagas deuda sin ingreso registrado'
          : m.debts.debtToIncomeRatio > 0.5 ? 'Sobre el 50%: crítico'
            : m.debts.debtToIncomeRatio >= 0.3 ? 'Entre 30% y 50%: precaución'
              : 'Bajo el 30%: saludable',
      help: 'Proporción de tu ingreso sostenible comprometida en pagos de deuda.',
    },
    {
      key: 'emergency',
      label: 'Fondo de emergencia',
      value: m.lights.emergency === 'neutral'
        ? '—'
        : `${m.assets.emergencyMonths.toFixed(1)} meses`,
      verdict: m.lights.emergency === 'neutral'
        ? 'Registra tus gastos esenciales para calcularlo'
        : `Cubre tu gasto esencial de ${fmtMXN(m.expenses.essentialMonthly)}`,
      help: 'Meses de gasto esencial que puedes cubrir con tus activos líquidos.',
    },
    {
      key: 'goals',
      label: 'Viabilidad de metas',
      value: m.goals.totalMonthlyRequired > 0 ? `${m.goals.feasibilityScore}/100` : '—',
      verdict: m.goals.totalMonthlyRequired > 0
        ? `Requieren ${fmtMXN(m.goals.totalMonthlyRequired)} al mes`
        : 'Sin metas registradas',
      help: 'Qué proporción de la aportación requerida por tus metas cubre tu excedente.',
    },
    {
      key: 'retirement',
      label: 'Preparación para el retiro',
      value: m.lights.retirement === 'neutral' ? '—' : `${m.retirement.progressPct}%`,
      verdict: m.lights.retirement === 'neutral'
        ? 'Define la pensión mensual que quieres'
        : m.retirement.gap > 0
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

      {/* Matriz central: 1 col en móvil, 2 en tablet, 4 en desktop */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
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


      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
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
          /*
            La referencia es el ingreso ANTES de impuestos, porque los impuestos
            aparecen como uno de los destinos de la barra. Medirlos contra el
            ingreso ya neto los contaba dos veces y la barra se pasaba de la línea
            por el monto exacto de la carga fiscal, dando la impresión de un
            sobrecompromiso inexistente.
          */
          reference={m.SUSTAINABLE_GROSS}
          referenceLabel={m.taxDrag > 0 ? 'Tu ingreso bruto' : 'Tu ingreso'}
        />
        <p className={`mt-4 rounded-lg p-3 text-[11px] leading-relaxed ${
          m.INCOME_GAP > 0 ? 'bg-rose-500/10 text-rose-200' : 'bg-emerald-500/10 text-emerald-200'
        }`}>
          {/*
            Las dos cifras de la frase son brutas, igual que la brecha. Antes
            comparaba el requerido (bruto) contra el sostenible (neto), así que la
            resta no cuadraba con la brecha que anunciaba en la misma línea.
          */}
          {m.INCOME_GAP > 0
            ? `Tu vida objetivo cuesta ${fmtMXN(m.REQUIRED_INCOME)} al mes y tu ingreso sostenible es de ${fmtMXN(m.SUSTAINABLE_GROSS)}. Faltan ${fmtMXN(m.INCOME_GAP)} mensuales, o ${fmtMXN(m.INCOME_GAP * 12)} al año.`
            : `Tu ingreso sostenible cubre tu vida objetivo completa con un excedente de ${fmtMXN(-m.INCOME_GAP)} al mes.`}
        </p>
      </Card>


      {/* Semáforo */}
      <Card>
        <CardTitle icon={Gauge}>Semáforo financiero</CardTitle>
        <div className="mb-4 border-b border-zinc-700/50 pb-4">
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
            <p className="mt-3 border-t border-zinc-700/50 pt-2.5 text-[11px] text-zinc-400">
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
          <p className="mt-2 text-[11px] leading-relaxed text-zinc-400">
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
              <p className="text-zinc-400">Brecha</p>
              <p className="font-semibold tabular-nums text-rose-400">{fmtMXN(m.retirement.gap)}</p>
            </div>
            <div>
              <p className="text-zinc-400">Aportación faltante</p>
              <p className="font-semibold tabular-nums text-zinc-100">
                {fmtMXN(m.retirement.additionalMonthlyNeeded)}/mes
              </p>
            </div>
          </div>
          <p className="mt-3 text-[11px] leading-relaxed text-zinc-400">
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


/**
 * Rediseño del diagnóstico. Por ahora, el lienzo.
 *
 * Consume `useFinance` desde el primer día aunque todavía no dibuje nada, y eso es
 * lo importante de este esqueleto: la matriz, el diagnóstico y los hallazgos ya
 * están enchufados. Cuando llegue el diseño no habrá que pelearse con el cableado,
 * sólo con la forma.
 *
 * El renglón de comprobación de abajo existe por lo mismo. Sin él, un lienzo vacío
 * no distingue "todavía no hay diseño" de "los datos no llegan", y son dos problemas
 * muy distintos de encontrar dentro de un rediseño a medio hacer.
 */
export function ExecutiveDashboardV2() {
  const { matrix: m, diagnosis, findings, profile } = useFinance();

  return (
    <div className="space-y-4">
      <SectionTitle
        eyebrow="Rediseño"
        title={profile.name ? `Diagnóstico de ${profile.name}` : 'Diagnóstico ejecutivo'}
        description="Nueva propuesta visual del diagnóstico. Se construye sobre la misma matriz financiera que la versión actual: ninguna cifra se recalcula aquí."
      />

      <Card>
        <CardTitle icon={FlaskConical}>Espacio para Rediseño V2</CardTitle>

        <div className="grid place-items-center rounded-xl border border-dashed border-zinc-700
                        py-16 text-center"
        >
          <p className="text-sm font-semibold text-zinc-300">Espacio para Rediseño V2</p>
          <p className="mt-1 max-w-xs text-[11px] leading-relaxed text-zinc-500">
            El lienzo está listo y los datos ya llegan. Aquí se monta la nueva
            composición.
          </p>
        </div>

        {/*
          Prueba de vida de los datos, no decoración. Tres cifras de tres fuentes
          distintas —la matriz, la proyección y los hallazgos— para que se vea de un
          golpe que el cableado funciona antes de que exista una sola tarjeta nueva.
        */}
        <dl className="mt-4 grid grid-cols-3 gap-3 border-t border-zinc-700/50 pt-4 text-center">
          <div>
            <dt className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
              Flujo libre
            </dt>
            <dd className={`mt-0.5 text-sm font-bold tabular-nums ${m.NET_CASHFLOW < 0
              ? 'text-rose-400'
              : 'text-emerald-400'}`}
            >
              {fmtMXN(m.NET_CASHFLOW)}
            </dd>
          </div>
          <div>
            <dt className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
              Salud
            </dt>
            <dd className="mt-0.5 text-sm font-bold tabular-nums text-zinc-200">
              {m.healthScore === null ? '—' : `${m.healthScore}/100`}
            </dd>
          </div>
          <div>
            <dt className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
              Hallazgos
            </dt>
            <dd className="mt-0.5 text-sm font-bold tabular-nums text-zinc-200">
              {findings.length}
              <span className="ml-1 text-[10px] font-semibold text-zinc-500">
                · {diagnosis.wealthPath.length} años proyectados
              </span>
            </dd>
          </div>
        </dl>
      </Card>
    </div>
  );
}


/** Las dos versiones, con el texto corto que cabe en el interruptor. */
const VIEWS = DASHBOARD_VERSIONS.map((v) => ({ value: v.value, label: v.short }));

/**
 * Enrutador entre la versión actual y el rediseño.
 *
 * La elección ya no vive aquí: la guarda el contexto, en el Shell. Tenía que
 * mudarse porque ahora hay dos sitios que la deciden —este interruptor y el menú
 * "Ver más"— y con una copia local cada uno habría llevado su propia cuenta: se
 * elegía V2 en el menú, se llegaba al tablero y el tablero mostraba lo que él
 * recordaba, no lo que se acababa de pedir.
 *
 * El interruptor se queda de todos modos. Comparar dos diseños es alternar muchas
 * veces, y hacerlo sin salir de la pantalla es la diferencia entre comparar y
 * navegar.
 */
export default function ExecutiveDashboard() {
  const { version: view, setVersion: setView } = useDashboardVersion();

  return (
    <div className="space-y-4">
      {/*
        El interruptor va arriba de todo y separado por un borde: es un control de
        pruebas, no parte del diagnóstico. Mezclarlo con las tarjetas lo convertiría
        en una función del producto, y esto se va a quitar en cuanto V2 gane.
      */}
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl
                      border border-dashed border-zinc-700 p-2.5"
      >
        <span className="flex items-center gap-1.5 pl-1 text-[10px] font-bold uppercase
                         tracking-widest text-zinc-500"
        >
          <FlaskConical size={12} aria-hidden="true" />
          Prueba A/B
        </span>

        <SegmentedControl value={view} onChange={setView} options={VIEWS} />
      </div>

      {view === 'v1' ? <ExecutiveDashboardV1 /> : <ExecutiveDashboardV2 />}
    </div>
  );
}
