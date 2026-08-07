import { fmtCompact, safeDiv } from '../../engine/finance';

const W = 320;
const H = 140;
const PAD_L = 34;
const PAD_R = 6;
const PAD_T = 10;
const PAD_B = 20;

/**
 * Gráfica de línea con área y línea de objetivo opcional. SVG puro.
 * @param {Array} points - [{ x, y }]
 * @param {number} target - Valor de referencia horizontal.
 */
export default function LineChart({
  points = [], target, xLabel, color = 'rgb(99 102 241)', targetLabel = 'Meta',
}) {
  if (points.length < 2) {
    return <p className="text-xs text-slate-500">Datos insuficientes para proyectar.</p>;
  }

  const ys = points.map((p) => p.y);
  const maxY = Math.max(...ys, target ?? 0) * 1.08 || 1;
  const minX = points[0].x;
  const maxX = points[points.length - 1].x;

  const plotW = W - PAD_L - PAD_R;
  const plotH = H - PAD_T - PAD_B;

  const sx = (x) => PAD_L + safeDiv(x - minX, maxX - minX) * plotW;
  const sy = (y) => PAD_T + plotH - safeDiv(y, maxY) * plotH;

  const line = points.map((p) => `${sx(p.x).toFixed(1)},${sy(p.y).toFixed(1)}`).join(' ');
  const area = `${PAD_L},${PAD_T + plotH} ${line} ${sx(maxX).toFixed(1)},${PAD_T + plotH}`;

  // Cuatro marcas horizontales bastan para dar escala sin saturar.
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((t) => t * maxY);
  const uid = color.replace(/[^a-z0-9]/gi, '');
  const last = points[points.length - 1];


  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full overflow-visible" role="img">
        <defs>
          <linearGradient id={`grad-${uid}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.35" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Rejilla y escala vertical */}
        {ticks.map((t) => (
          <g key={t}>
            <line
              x1={PAD_L} y1={sy(t)} x2={W - PAD_R} y2={sy(t)}
              stroke="rgb(51 65 85)" strokeWidth="0.6" strokeDasharray="2 3"
            />
            <text
              x={PAD_L - 5} y={sy(t) + 3}
              textAnchor="end" fontSize="7" fill="rgb(100 116 139)"
            >
              {fmtCompact(t)}
            </text>
          </g>
        ))}

        {/* Línea de objetivo */}
        {target > 0 && target <= maxY && (
          <g>
            <line
              x1={PAD_L} y1={sy(target)} x2={W - PAD_R} y2={sy(target)}
              stroke="rgb(248 113 113)" strokeWidth="1" strokeDasharray="4 3"
            />
            <text
              x={W - PAD_R} y={sy(target) - 4}
              textAnchor="end" fontSize="7" fill="rgb(248 113 113)" fontWeight="700"
            >
              {targetLabel}
            </text>
          </g>
        )}

        <polygon points={area} fill={`url(#grad-${uid})`} />
        <polyline
          points={line} fill="none" stroke={color}
          strokeWidth="2" strokeLinejoin="round" strokeLinecap="round"
          style={{ filter: `drop-shadow(0 0 4px ${color}aa)` }}
        />
        {/* Punto final destacado */}
        <circle
          cx={sx(last.x)} cy={sy(last.y)} r="2.8"
          fill={color} stroke="rgb(15 23 42)" strokeWidth="1.5"
          style={{ filter: `drop-shadow(0 0 5px ${color})` }}
        />

        {/* Extremos del eje horizontal */}
        <text x={PAD_L} y={H - 6} fontSize="7" fill="rgb(100 116 139)">{minX}</text>
        <text x={W - PAD_R} y={H - 6} textAnchor="end" fontSize="7" fill="rgb(100 116 139)">
          {maxX}
        </text>
      </svg>
      {xLabel && (
        <p className="mt-1.5 text-center text-[10px] uppercase tracking-wide text-slate-500">
          {xLabel}
        </p>
      )}
    </div>
  );
}
