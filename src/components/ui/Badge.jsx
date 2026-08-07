import { CheckCircle2, AlertTriangle, ShieldAlert, Info } from 'lucide-react';

const LIGHT_STYLES = {
  green: { chip: 'bg-emerald-50 text-emerald-700 ring-emerald-200', dot: 'bg-emerald-500', Icon: CheckCircle2 },
  yellow: { chip: 'bg-amber-50 text-amber-700 ring-amber-200', dot: 'bg-amber-500', Icon: AlertTriangle },
  red: { chip: 'bg-red-50 text-red-700 ring-red-200', dot: 'bg-red-500', Icon: ShieldAlert },
  neutral: { chip: 'bg-slate-100 text-slate-600 ring-slate-200', dot: 'bg-slate-400', Icon: Info },
};

export function Badge({ status = 'neutral', children, showIcon = true, className = '' }) {
  const s = LIGHT_STYLES[status] ?? LIGHT_STYLES.neutral;
  const { Icon } = s;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ${s.chip} ${className}`}>
      {showIcon && <Icon size={11} className="shrink-0" />}
      {children}
    </span>
  );
}

/**
 * Fila del semáforo financiero: métrica, valor y veredicto.
 */
export function TrafficLightRow({ status = 'neutral', label, value, verdict, help }) {
  const s = LIGHT_STYLES[status] ?? LIGHT_STYLES.neutral;
  return (
    <div className="flex items-center gap-3 border-b border-slate-100 py-2.5 last:border-0">
      <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${s.dot}`} aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-medium text-slate-700">{label}</p>
        {verdict && <p className="truncate text-[11px] text-slate-400">{verdict}</p>}
      </div>
      <span className="shrink-0 text-sm font-semibold tabular-nums text-slate-900">{value}</span>
      {help}
    </div>
  );
}

export { LIGHT_STYLES };
