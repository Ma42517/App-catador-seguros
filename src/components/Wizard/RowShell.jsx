import { Trash2 } from 'lucide-react';
import { IconButton } from '../ui';

/**
 * Contenedor de una fila editable (un ingreso, un gasto, una deuda...).
 * Muestra el cálculo derivado de la fila en la esquina para que el usuario
 * vea el efecto de lo que captura sin salir del campo.
 */
export default function RowShell({ title, derived, onRemove, children }) {
  return (
    <div className="surface-sunken p-3 transition-colors hover:border-zinc-600/60">
      <div className="mb-3 flex items-center gap-2">
        <span className="min-w-0 flex-1 truncate text-[11px] font-bold uppercase tracking-widest text-zinc-400">
          {title}
        </span>
        {derived && (
          <span className="shrink-0 rounded-lg bg-indigo-500/10 px-2 py-0.5 text-[11px] font-semibold tabular-nums text-indigo-300 ring-1 ring-indigo-500/25">
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
