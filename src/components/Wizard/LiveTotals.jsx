import { Wallet, TrendingDown, CreditCard, DollarSign, Activity } from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
import { Badge } from '../ui';
import { fmtMXN, fmtPct, clamp } from '../../engine/finance';

/** Tarjeta compacta de métrica con resplandor de acento. */
function MetricCard({ label, value, icon: Icon, accent, badge, note }) {
  return (
    <div
      className="glow surface relative overflow-hidden p-3"
      style={{ '--glow-from': accent.glow }}
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="truncate text-[9px] font-bold uppercase tracking-widest text-zinc-500">
          {label}
        </span>
        <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-lg border ${accent.icon}`}>
          <Icon size={12} />
        </span>
      </div>
      <p className={`truncate text-base font-bold leading-none tabular-nums ${accent.text}`}>
        {value}
      </p>
      <div className="mt-1.5 flex items-center gap-1.5">
        {badge}
        {note && <span className="truncate text-[10px] text-zinc-500">{note}</span>}
      </div>
    </div>
  );
}

const ACCENTS = {
  indigo: {
    text: 'text-zinc-50', glow: 'rgb(99 102 241 / 0.5)',
    icon: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30',
  },
  amber: {
    text: 'text-zinc-50', glow: 'rgb(245 158 11 / 0.5)',
    icon: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
  },
  red: {
    text: 'text-zinc-50', glow: 'rgb(244 63 94 / 0.5)',
    icon: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
  },
  emerald: {
    text: 'text-emerald-400', glow: 'rgb(16 185 129 / 0.55)',
    icon: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
  },
  negative: {
    text: 'text-rose-400', glow: 'rgb(244 63 94 / 0.6)',
    icon: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
  },
};


/** Medidor de salud financiera 0-100 con barra brillante. */
function HealthMeter({ score }) {
  /*
    `score` es null mientras no haya nada evaluable. La barra se queda vacía y en
    gris en lugar de mostrar un cero rojo: al empezar a capturar, un 0/100 en rojo
    describe la captura, no las finanzas.
  */
  const pending = score === null || score === undefined;
  const pct = pending ? 0 : clamp(score / 100, 0, 1) * 100;
  const tone = pending
    ? { bar: 'from-zinc-600 to-zinc-500', text: 'text-zinc-500', glow: 'transparent' }
    : score >= 70
    ? { bar: 'from-emerald-500 to-emerald-400', text: 'text-emerald-400', glow: 'rgb(16 185 129 / 0.7)' }
    : score >= 40
      ? { bar: 'from-amber-500 to-amber-400', text: 'text-amber-400', glow: 'rgb(245 158 11 / 0.7)' }
      : { bar: 'from-rose-500 to-rose-400', text: 'text-rose-400', glow: 'rgb(244 63 94 / 0.7)' };

  return (
    <div className="surface p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-widest text-zinc-500">
          <Activity size={11} className="text-zinc-500" />
          Salud financiera
        </span>
        <span className="text-[10px] font-medium tabular-nums text-zinc-500">
          <span className={`text-sm font-bold ${tone.text}`}>{pending ? '—' : score}</span> / 100
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-700/40">
        <div
          className={`h-full rounded-full bg-gradient-to-r transition-all duration-700 ${tone.bar}`}
          style={{ width: `${Math.max(2, pct)}%`, boxShadow: `0 0 12px ${tone.glow}` }}
        />
      </div>
    </div>
  );
}

/**
 * Banda de métricas en vivo. Existe para hacer visible el recálculo en
 * tiempo real: cualquier tecla en cualquier campo mueve estos números.
 */
export default function LiveTotals() {
  const { matrix: m } = useFinance();
  const deficit = m.NET_CASHFLOW < 0;

  return (
    <div className="mb-6 space-y-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          label="Ingreso sostenible"
          value={fmtMXN(m.INCOME_SUSTAINABLE)}
          icon={Wallet}
          accent={ACCENTS.indigo}
          note="al mes"
        />
        <MetricCard
          label="Gastos"
          value={fmtMXN(m.EXPENSES_TOTAL)}
          icon={TrendingDown}
          accent={ACCENTS.amber}
          badge={
            m.INCOME_SUSTAINABLE > 0 && (
              <Badge
                status={m.expenses.expenseToIncomeRatio > 0.75 ? 'red'
                  : m.expenses.expenseToIncomeRatio > 0.5 ? 'yellow' : 'green'}
                showIcon={false}
              >
                {fmtPct(m.expenses.expenseToIncomeRatio)}
              </Badge>
            )
          }
        />
        <MetricCard
          label="Deuda"
          value={fmtMXN(m.DEBT_SERVICE)}
          icon={CreditCard}
          accent={ACCENTS.red}
          badge={
            m.INCOME_SUSTAINABLE > 0 && (
              <Badge status={m.lights.debt} showIcon={false}>
                {fmtPct(m.debts.debtToIncomeRatio)}
              </Badge>
            )
          }
        />
        <MetricCard
          label="Flujo libre"
          value={fmtMXN(m.NET_CASHFLOW)}
          icon={DollarSign}
          accent={deficit ? ACCENTS.negative : ACCENTS.emerald}
          badge={
            <Badge status={deficit ? 'red' : m.savingsRate < 0.1 ? 'yellow' : 'green'} showIcon={false}>
              {deficit ? 'Déficit' : fmtPct(m.savingsRate)}
            </Badge>
          }
        />
      </div>

      <HealthMeter score={m.healthScore} />
    </div>
  );
}
