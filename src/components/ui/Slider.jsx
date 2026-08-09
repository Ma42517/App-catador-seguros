import Tooltip from './Tooltip';

const TRACKS = {
  indigo: 'rgb(99 102 241)',
  emerald: 'rgb(16 185 129)',
  amber: 'rgb(245 158 11)',
};

/**
 * Deslizador para el Scenario Engine. Recalcula en cada movimiento:
 * el valor se propaga en cada `change`, no al soltar.
 */
export default function Slider({
  label, value, onChange, min = 0, max = 100, step = 1,
  format = (v) => v, help, tone = 'indigo',
}) {
  const pct = max === min ? 0 : ((value - min) / (max - min)) * 100;
  const color = TRACKS[tone] ?? TRACKS.indigo;
  const active = pct > 0;

  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between gap-2">
        <span className="flex items-center gap-1 text-[11px] font-medium uppercase tracking-wide text-zinc-400">
          {label}
          {help && <Tooltip text={help} />}
        </span>
        <span
          className={`rounded-lg px-2 py-0.5 text-xs font-bold tabular-nums transition-colors ${
            active ? 'bg-indigo-500/15 text-indigo-300' : 'text-zinc-500'
          }`}
        >
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
        className="range-dark"
        style={{
          background:
            `linear-gradient(to right, ${color} ${pct}%, rgb(51 65 85) ${pct}%)`,
        }}
      />
    </div>
  );
}
