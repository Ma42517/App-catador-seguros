import Tooltip from './Tooltip';

export function Card({ children, className = '', padded = true }) {
  return (
    <div className={`rounded-xl border border-slate-200 bg-white shadow-sm ${padded ? 'p-4 sm:p-5' : ''} ${className}`}>
      {children}
    </div>
  );
}

export function CardTitle({ icon: Icon, children, help, action, className = '' }) {
  return (
    <div className={`mb-4 flex items-start justify-between gap-3 ${className}`}>
      <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-800">
        {Icon && <Icon size={16} className="shrink-0 text-slate-400" />}
        {children}
        {help && <Tooltip text={help} />}
      </h3>
      {action}
    </div>
  );
}

/** Título de sección para el wizard. */
export function SectionTitle({ eyebrow, title, description }) {
  return (
    <div className="mb-5">
      {eyebrow && (
        <p className="text-[11px] font-semibold uppercase tracking-wider text-blue-600">{eyebrow}</p>
      )}
      <h2 className="mt-0.5 text-lg font-bold text-slate-900">{title}</h2>
      {description && (
        <p className="mt-1 text-xs leading-relaxed text-slate-500">{description}</p>
      )}
    </div>
  );
}

export function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="rounded-xl border-2 border-dashed border-slate-200 px-4 py-8 text-center">
      {Icon && <Icon size={26} className="mx-auto mb-2 text-slate-300" />}
      <p className="text-sm font-medium text-slate-600">{title}</p>
      {description && <p className="mx-auto mt-1 max-w-sm text-xs text-slate-400">{description}</p>}
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}


const TONES = {
  neutral: 'text-slate-900',
  positive: 'text-emerald-600',
  negative: 'text-red-600',
  accent: 'text-blue-600',
};

const ICON_TONES = {
  neutral: 'bg-slate-100 text-slate-500',
  positive: 'bg-emerald-50 text-emerald-600',
  negative: 'bg-red-50 text-red-600',
  accent: 'bg-blue-50 text-blue-600',
};

/** Tarjeta KPI del dashboard ejecutivo. */
export function StatCard({
  label, value, sub, icon: Icon, tone = 'neutral', help, emphasis = false,
}) {
  return (
    <div className={`rounded-xl border bg-white p-4 shadow-sm ${
      emphasis ? 'border-blue-200 ring-1 ring-blue-100' : 'border-slate-200'
    }`}>
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="flex items-center gap-1 text-[11px] font-medium uppercase tracking-wide text-slate-500">
          {label}
          {help && <Tooltip text={help} />}
        </span>
        {Icon && (
          <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-lg ${ICON_TONES[tone]}`}>
            <Icon size={14} />
          </span>
        )}
      </div>
      <p className={`text-xl font-bold tabular-nums leading-tight sm:text-2xl ${TONES[tone]}`}>
        {value}
      </p>
      {sub && <p className="mt-1 text-[11px] leading-snug text-slate-400">{sub}</p>}
    </div>
  );
}
