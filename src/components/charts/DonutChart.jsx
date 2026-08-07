import { fmtMXN, safeDiv } from '../../engine/finance';

/**
 * Dona en SVG puro, sin librerías.
 * @param {Array} data - [{ label, value, color }]
 */
export default function DonutChart({
  data = [], size = 148, thickness = 18, centerLabel, centerValue,
}) {
  const total = data.reduce((s, d) => s + Math.max(0, d.value), 0);
  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;

  let offset = 0;
  const segments = data
    .filter((d) => d.value > 0)
    .map((d) => {
      const share = safeDiv(d.value, total);
      const length = share * circumference;
      const seg = {
        ...d,
        share,
        dash: `${length} ${circumference - length}`,
        rotation: (offset / circumference) * 360,
      };
      offset += length;
      return seg;
    });

  return (
    <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-center sm:gap-6">
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90 overflow-visible">
          {/* Riel de fondo */}
          <circle
            cx={center} cy={center} r={radius}
            fill="none" stroke="rgb(51 65 85 / 0.55)" strokeWidth={thickness}
          />
          {segments.map((s) => (
            <circle
              key={s.label}
              cx={center} cy={center} r={radius}
              fill="none"
              stroke={s.color}
              strokeWidth={thickness}
              strokeDasharray={s.dash}
              strokeLinecap="butt"
              transform={`rotate(${s.rotation} ${center} ${center})`}
              style={{ filter: `drop-shadow(0 0 5px ${s.color}55)` }}
            />
          ))}
        </svg>


        <div className="absolute inset-0 grid place-items-center text-center">
          <div>
            {centerValue && (
              <p className="text-base font-bold leading-none tabular-nums text-slate-50">
                {centerValue}
              </p>
            )}
            {centerLabel && (
              <p className="mt-1 text-[10px] uppercase tracking-widest text-slate-500">
                {centerLabel}
              </p>
            )}
          </div>
        </div>
      </div>

      <ul className="w-full min-w-0 space-y-2">
        {segments.length === 0 && (
          <li className="text-xs text-slate-500">Sin datos para mostrar.</li>
        )}
        {segments.map((s) => (
          <li key={s.label} className="flex items-center gap-2.5 text-xs">
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: s.color, boxShadow: `0 0 7px ${s.color}99` }}
              aria-hidden="true"
            />
            <span className="min-w-0 flex-1 truncate text-slate-400">{s.label}</span>
            <span className="shrink-0 font-semibold tabular-nums text-slate-100">
              {fmtMXN(s.value)}
            </span>
            <span className="w-9 shrink-0 text-right tabular-nums text-slate-500">
              {Math.round(s.share * 100)}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
