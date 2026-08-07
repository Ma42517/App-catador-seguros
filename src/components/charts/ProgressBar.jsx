import { clamp } from '../../engine/finance';

const TONES = {
  green: 'bg-emerald-500',
  yellow: 'bg-amber-500',
  red: 'bg-red-500',
  blue: 'bg-blue-600',
};

/**
 * Barra de progreso con umbral opcional.
 * @param {number} value - Progreso en decimal (0 a 1).
 */
export default function ProgressBar({
  value = 0, tone = 'blue', label, right, height = 6, showPct = false,
}) {
  const pct = clamp(value, 0, 1) * 100;

  return (
    <div>
      {(label || right || showPct) && (
        <div className="mb-1 flex items-baseline justify-between gap-2 text-xs">
          {label && <span className="min-w-0 truncate text-slate-600">{label}</span>}
          <span className="shrink-0 tabular-nums font-medium text-slate-900">
            {right ?? `${Math.round(pct)}%`}
          </span>
        </div>
      )}
      <div
        className="w-full overflow-hidden rounded-full bg-slate-100"
        style={{ height }}
        role="progressbar"
        aria-valuenow={Math.round(pct)}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className={`h-full rounded-full transition-all duration-300 ${TONES[tone]}`}
          style={{ width: `${Math.max(pct > 0 ? 2 : 0, pct)}%` }}
        />
      </div>
    </div>
  );
}
