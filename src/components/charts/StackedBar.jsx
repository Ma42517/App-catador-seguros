import { fmtMXN, safeDiv } from '../../engine/finance';

/**
 * Barra de composición con marcador de referencia.
 * Sirve para contrastar en qué se compromete el dinero (segmentos)
 * contra cuánto dinero existe realmente (marcador).
 *
 * @param {Array} segments - [{ label, value, color }]
 * @param {number} reference - Valor de referencia (p.ej. ingreso sostenible).
 */
export default function StackedBar({ segments = [], reference, referenceLabel = 'Ingreso' }) {
  const total = segments.reduce((s, x) => s + Math.max(0, x.value), 0);
  // La escala considera ambos para que el marcador siempre quede visible.
  const scale = Math.max(total, reference ?? 0) || 1;
  const refPct = safeDiv(reference, scale) * 100;

  return (
    <div>
      <div className="relative">
        <div className="flex h-7 w-full overflow-hidden rounded-lg bg-slate-100">
          {segments.filter((s) => s.value > 0).map((s) => (
            <div
              key={s.label}
              className="h-full transition-all duration-300"
              style={{ width: `${safeDiv(s.value, scale) * 100}%`, backgroundColor: s.color }}
              title={`${s.label}: ${fmtMXN(s.value)}`}
            />
          ))}
        </div>

        {reference > 0 && (
          <div
            className="absolute -top-1 bottom-[-4px] w-0.5 bg-slate-900"
            style={{ left: `${Math.min(100, refPct)}%` }}
          >
            <span className="absolute -top-4 left-1/2 -translate-x-1/2 whitespace-nowrap text-[9px] font-semibold text-slate-900">
              {referenceLabel}
            </span>
          </div>
        )}
      </div>

      <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5">
        {segments.filter((s) => s.value > 0).map((s) => (
          <li key={s.label} className="flex items-center gap-1.5 text-[11px]">
            <span
              className="h-2 w-2 shrink-0 rounded-sm"
              style={{ backgroundColor: s.color }}
              aria-hidden="true"
            />
            <span className="text-slate-500">{s.label}</span>
            <span className="tabular-nums font-medium text-slate-800">{fmtMXN(s.value)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
