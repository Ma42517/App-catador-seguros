import { fmtMXN, safeDiv } from '../../engine/finance';

/**
 * Lista de barras horizontales. Escala relativa al valor máximo,
 * que es la lectura correcta para comparar categorías entre sí.
 * @param {Array} items - [{ label, value, color?, note? }]
 */
export default function BarList({ items = [], format = fmtMXN, emptyText = 'Sin datos.' }) {
  const max = items.reduce((m, i) => Math.max(m, Math.abs(i.value)), 0);

  if (items.length === 0) {
    return <p className="text-xs text-slate-400">{emptyText}</p>;
  }

  return (
    <ul className="space-y-2.5">
      {items.map((item) => {
        const width = Math.max(2, safeDiv(Math.abs(item.value), max) * 100);
        return (
          <li key={item.label}>
            <div className="mb-1 flex items-baseline justify-between gap-2 text-xs">
              <span className="min-w-0 truncate text-slate-600">{item.label}</span>
              <span className="shrink-0 tabular-nums font-medium text-slate-900">
                {format(item.value)}
              </span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{ width: `${width}%`, backgroundColor: item.color || 'rgb(37 99 235)' }}
              />
            </div>
            {item.note && (
              <p className="mt-1 text-[10px] text-slate-400">{item.note}</p>
            )}
          </li>
        );
      })}
    </ul>
  );
}
