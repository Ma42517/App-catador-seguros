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
  const visible = segments.filter((s) => s.value > 0);
  const total = visible.reduce((s, x) => s + x.value, 0);
  // La escala considera ambos para que el marcador siempre quede visible.
  const scale = Math.max(total, reference ?? 0) || 1;
  const refPct = safeDiv(reference, scale) * 100;

  return (
    <div>
      <div className="relative pt-5">
        <div className="flex h-8 w-full overflow-hidden rounded-xl border border-zinc-700/50 bg-zinc-900/60">
          {visible.map((s) => (
            <div
              key={s.label}
              className="h-full transition-all duration-500"
              style={{
                width: `${safeDiv(s.value, scale) * 100}%`,
                backgroundColor: s.color,
                boxShadow: `inset 0 0 12px ${s.color}66`,
              }}
              title={`${s.label}: ${fmtMXN(s.value)}`}
            />
          ))}
        </div>

        {reference > 0 && (
          <div
            className="absolute top-3 bottom-[-5px] w-0.5 bg-zinc-100"
            style={{
              left: `${Math.min(100, refPct)}%`,
              boxShadow: '0 0 8px rgb(248 250 252 / 0.9)',
            }}
          >
            <span className="absolute -top-5 left-1/2 -tranzinc-x-1/2 whitespace-nowrap rounded-md bg-zinc-100 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-zinc-900">
              {referenceLabel}
            </span>
          </div>
        )}
      </div>

      <ul className="mt-4 flex flex-wrap gap-x-4 gap-y-2">
        {visible.map((s) => (
          <li key={s.label} className="flex items-center gap-1.5 text-[11px]">
            <span
              className="h-2 w-2 shrink-0 rounded-full"
              style={{ backgroundColor: s.color, boxShadow: `0 0 6px ${s.color}99` }}
              aria-hidden="true"
            />
            <span className="text-zinc-400">{s.label}</span>
            <span className="font-semibold tabular-nums text-zinc-100">{fmtMXN(s.value)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
