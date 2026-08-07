import { useFinance } from '../../context/FinanceContext';
import { fmtMXN } from '../../engine/finance';

/**
 * Cinta de totales en vivo. Existe para hacer visible el recálculo en
 * tiempo real: cualquier tecla en cualquier campo mueve estos números.
 */
export default function LiveTotals() {
  const { matrix } = useFinance();

  const items = [
    { label: 'Ingreso sostenible', value: matrix.INCOME_SUSTAINABLE, tone: 'text-slate-900' },
    { label: 'Gastos', value: matrix.EXPENSES_TOTAL, tone: 'text-slate-900' },
    { label: 'Deuda', value: matrix.DEBT_SERVICE, tone: 'text-slate-900' },
    {
      label: 'Flujo libre',
      value: matrix.NET_CASHFLOW,
      tone: matrix.NET_CASHFLOW < 0 ? 'text-red-600' : 'text-emerald-600',
    },
  ];

  return (
    <div className="sticky top-[57px] z-20 -mx-4 mb-5 border-b border-slate-200 bg-white/95 px-4 py-2 backdrop-blur sm:mx-0 sm:rounded-lg sm:border sm:px-4">
      <div className="flex items-center gap-3 overflow-x-auto">
        {items.map((i) => (
          <div key={i.label} className="min-w-0 shrink-0 pr-3 last:pr-0">
            <p className="whitespace-nowrap text-[10px] uppercase tracking-wide text-slate-400">
              {i.label}
            </p>
            <p className={`whitespace-nowrap text-sm font-bold tabular-nums ${i.tone}`}>
              {fmtMXN(i.value)}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
