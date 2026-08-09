import { CheckCircle2, AlertTriangle, ShieldAlert, Info } from 'lucide-react';

const LIGHT_STYLES = {
  green: {
    chip: 'bg-emerald-500/10 text-emerald-300 ring-emerald-500/30',
    dot: 'bg-emerald-400', glow: 'shadow-[0_0_8px_rgb(16_185_129/0.7)]',
    Icon: CheckCircle2,
  },
  yellow: {
    chip: 'bg-amber-500/10 text-amber-300 ring-amber-500/30',
    dot: 'bg-amber-400', glow: 'shadow-[0_0_8px_rgb(245_158_11/0.7)]',
    Icon: AlertTriangle,
  },
  red: {
    chip: 'bg-rose-500/10 text-rose-300 ring-rose-500/30',
    dot: 'bg-rose-400', glow: 'shadow-[0_0_8px_rgb(244_63_94/0.7)]',
    Icon: ShieldAlert,
  },
  neutral: {
    chip: 'bg-slate-700/40 text-slate-300 ring-slate-600/50',
    dot: 'bg-slate-400', glow: '',
    Icon: Info,
  },
};

export function Badge({ status = 'neutral', children, showIcon = true, className = '' }) {
  const s = LIGHT_STYLES[status] ?? LIGHT_STYLES.neutral;
  const { Icon } = s;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px]
        font-semibold uppercase tracking-wide ring-1 ${s.chip} ${className}`}
    >
      {showIcon && <Icon size={11} className="shrink-0" />}
      {children}
    </span>
  );
}

/** Fila del semáforo financiero: métrica, valor y veredicto. */
export function TrafficLightRow({ status = 'neutral', label, value, verdict, help }) {
  const s = LIGHT_STYLES[status] ?? LIGHT_STYLES.neutral;
  return (
    <div className="flex items-center gap-3 border-b border-slate-700/40 py-3 last:border-0">
      <span
        className={`h-2.5 w-2.5 shrink-0 rounded-full ${s.dot} ${s.glow}`}
        aria-hidden="true"
      />
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-semibold text-slate-200">{label}</p>
        {verdict && <p className="mt-0.5 truncate text-[11px] text-slate-500">{verdict}</p>}
      </div>
      <span className="shrink-0 text-sm font-bold tabular-nums text-slate-100">{value}</span>
      {help}
    </div>
  );
}

export { LIGHT_STYLES };
