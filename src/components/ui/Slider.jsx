import Tooltip from './Tooltip';

/**
 * Deslizador para el Scenario Engine. Recalcula en cada movimiento:
 * el valor se propaga en `onInput`, no al soltar.
 */
export default function Slider({
  label, value, onChange, min = 0, max = 100, step = 1,
  format = (v) => v, help, tone = 'blue',
}) {
  const pct = max === min ? 0 : ((value - min) / (max - min)) * 100;
  const accent = tone === 'emerald' ? 'accent-emerald-600' : 'accent-blue-600';

  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between gap-2">
        <span className="flex items-center gap-1 text-xs font-medium text-slate-600">
          {label}
          {help && <Tooltip text={help} />}
        </span>
        <span className="text-xs font-semibold tabular-nums text-slate-900">
          {format(value)}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className={`h-1.5 w-full cursor-pointer appearance-none rounded-full bg-slate-200 ${accent}`}
        style={{
          background: `linear-gradient(to right, rgb(37 99 235) ${pct}%, rgb(226 232 240) ${pct}%)`,
        }}
      />
    </div>
  );
}
