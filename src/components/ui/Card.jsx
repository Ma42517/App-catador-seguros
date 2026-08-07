import Tooltip from './Tooltip';

export function Card({ children, className = '', padded = true }) {
  return (
    <div className={`surface ${padded ? 'p-4 sm:p-5' : ''} ${className}`}>
      {children}
    </div>
  );
}

export function CardTitle({ icon: Icon, children, help, action, className = '' }) {
  return (
    <div className={`mb-4 flex items-start justify-between gap-3 ${className}`}>
      <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-100">
        {Icon && (
          <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg border border-slate-700/60 bg-slate-900/60 text-indigo-400">
            <Icon size={14} />
          </span>
        )}
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
        <p className="text-[11px] font-bold uppercase tracking-widest text-indigo-400">
          {eyebrow}
        </p>
      )}
      <h2 className="mt-1 text-xl font-bold tracking-tight text-slate-50 sm:text-2xl">
        {title}
      </h2>
      {description && (
        <p className="mt-2 max-w-2xl text-xs leading-relaxed text-slate-400 sm:text-[13px]">
          {description}
        </p>
      )}
    </div>
  );
}

export function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-700 bg-slate-900/40 px-4 py-9 text-center">
      {Icon && (
        <span className="mx-auto mb-3 grid h-11 w-11 place-items-center rounded-xl border border-slate-700/60 bg-slate-800/60">
          <Icon size={20} className="text-slate-500" />
        </span>
      )}
      <p className="text-sm font-semibold text-slate-300">{title}</p>
      {description && (
        <p className="mx-auto mt-1.5 max-w-sm text-xs leading-relaxed text-slate-500">
          {description}
        </p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}


/** Configuración visual por acento. */
const TONES = {
  neutral: {
    value: 'text-slate-100',
    icon: 'bg-slate-800 text-slate-400 border-slate-700',
    glow: 'rgb(100 116 139 / 0.35)',
    shadow: '',
  },
  positive: {
    value: 'text-emerald-400',
    icon: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
    glow: 'rgb(16 185 129 / 0.55)',
    shadow: 'shadow-glow-emerald',
  },
  negative: {
    value: 'text-red-400',
    icon: 'bg-red-500/10 text-red-400 border-red-500/30',
    glow: 'rgb(239 68 68 / 0.55)',
    shadow: 'shadow-glow-red',
  },
  accent: {
    value: 'text-indigo-300',
    icon: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30',
    glow: 'rgb(99 102 241 / 0.55)',
    shadow: 'shadow-glow-indigo',
  },
  warning: {
    value: 'text-amber-400',
    icon: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
    glow: 'rgb(245 158 11 / 0.55)',
    shadow: 'shadow-glow-amber',
  },
};

/**
 * Tarjeta de métrica del dashboard ejecutivo.
 * `emphasis` activa el borde con resplandor del acento.
 */
export function StatCard({
  label, value, sub, icon: Icon, tone = 'neutral', help, emphasis = false, badge,
}) {
  const t = TONES[tone] ?? TONES.neutral;

  return (
    <div
      className={`surface relative overflow-hidden p-4 ${emphasis ? `glow ${t.shadow}` : ''}`}
      style={emphasis ? { '--glow-from': t.glow } : undefined}
    >
      <div className="mb-2.5 flex items-start justify-between gap-2">
        <span className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-widest text-slate-400">
          {label}
          {help && <Tooltip text={help} />}
        </span>
        {Icon && (
          <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-xl border ${t.icon}`}>
            <Icon size={15} />
          </span>
        )}
      </div>

      <p className={`text-xl font-bold leading-none tracking-tight tabular-nums sm:text-2xl ${t.value}`}>
        {value}
      </p>

      {(sub || badge) && (
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          {badge}
          {sub && <span className="text-[11px] leading-snug text-slate-500">{sub}</span>}
        </div>
      )}
    </div>
  );
}
