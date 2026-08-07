import { Trash2 } from 'lucide-react';
import { IconButton } from '../ui';

/**
 * Contenedor de una fila editable (un ingreso, un gasto, una deuda...).
 * Muestra el cálculo derivado de la fila en la esquina para que el usuario
 * vea el efecto de lo que captura sin salir del campo.
 */
export default function RowShell({ title, derived, onRemove, children }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-3">
      <div className="mb-2.5 flex items-center gap-2">
        <span className="min-w-0 flex-1 truncate text-[11px] font-semibold uppercase tracking-wide text-slate-400">
          {title}
        </span>
        {derived && (
          <span className="shrink-0 rounded-md bg-white px-2 py-0.5 text-[11px] font-medium tabular-nums text-slate-600 ring-1 ring-slate-200">
            {derived}
          </span>
        )}
        {onRemove && (
          <IconButton icon={Trash2} onClick={onRemove} label="Eliminar" tone="danger" />
        )}
      </div>
      {children}
    </div>
  );
}

/** Rejilla de campos responsiva, mobile-first. */
export function RowGrid({ cols = 3, children }) {
  const map = {
    2: 'sm:grid-cols-2',
    3: 'sm:grid-cols-2 lg:grid-cols-3',
    4: 'sm:grid-cols-2 lg:grid-cols-4',
  };
  return <div className={`grid grid-cols-1 gap-3 ${map[cols]}`}>{children}</div>;
}
