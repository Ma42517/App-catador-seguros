import { clamp } from '../../engine/finance';

const TONES = {
  green: { bar: 'bg-emerald-500', glow: 'rgb(16 185 129 / 0.6)' },
  yellow: { bar: 'bg-amber-500', glow: 'rgb(245 158 11 / 0.6)' },
  red: { bar: 'bg-rose-500', glow: 'rgb(244 63 94 / 0.6)' },
  blue: { bar: 'bg-indigo-500', glow: 'rgb(99 102 241 / 0.6)' },
};

/**
 * Barra de progreso con resplandor del acento.
 * @param {number} value - Progreso en decimal (0 a 1).
 */
export default function ProgressBar({
  value = 0, tone = 'blue', label, right, height = 6, showPct = false,
}) {
  const pct = clamp(value, 0, 1) * 100;
  const t = TONES[tone] ?? TONES.blue;

  return (
    <div>
      {(label || right || showPct) && (
        <div className="mb-1.5 flex items-baseline justify-between gap-2 text-xs">
          {label && <span className="min-w-0 truncate text-zinc-400">{label}</span>}
          <span className="shrink-0 font-semibold tabular-nums text-zinc-100">
            {right ?? `${Math.round(pct)}%`}
          </span>
        </div>
      )}
      <div
        className="w-full overflow-hidden rounded-full bg-zinc-700/40"
        style={{ height }}
        role="progressbar"
        aria-valuenow={Math.round(pct)}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className={`h-full rounded-full transition-all duration-500 ${t.bar}`}
          style={{
            width: `${Math.max(pct > 0 ? 2 : 0, pct)}%`,
            boxShadow: pct > 0 ? `0 0 10px ${t.glow}` : 'none',
          }}
        />
      </div>
    </div>
  );
}
