import { Pencil, Trash2 } from 'lucide-react';
import { IconButton } from '../ui';

/**
 * Fila capturada, en modo lectura.
 *
 * Sustituye al formulario permanentemente abierto de `RowShell`. Un módulo con doce
 * gastos mostraba sesenta campos a la vez y unos cuatro metros de scroll: para
 * comprobar un solo monto había que recorrer toda la captura. Aquí cada registro
 * ocupa un renglón y los campos se piden cuando se van a usar.
 *
 * El renglón entero abre la edición, y además va el lápiz. Es a propósito: el lápiz
 * es lo que se ve —dice que esto se puede corregir, cosa que una tarjeta de sólo
 * lectura no insinúa— y el renglón es lo que se acierta con el pulgar.
 *
 * El botón de borrar queda fuera de esa zona, como hermano y no como hijo: anidado
 * dentro del área que abre la edición, el HTML sería inválido y un toque cerca del
 * borde acabaría abriendo el formulario en lugar de borrar.
 */
export default function CompactRow({
  title, subtitle, amount, note, badge, onEdit, onRemove,
}) {
  return (
    <div className="surface-sunken flex items-center gap-1 p-2.5 transition-colors
                    hover:border-zinc-600/60"
    >
      <button
        type="button"
        onClick={onEdit}
        className="flex min-w-0 flex-1 items-center gap-3 rounded-lg text-left
                   focus-visible:outline-none focus-visible:ring-2
                   focus-visible:ring-indigo-500/60"
      >
        <span className="min-w-0 flex-1">
          <span className="flex min-w-0 items-center gap-1.5">
            <span className="truncate text-[13px] font-semibold text-zinc-100">
              {title}
            </span>
            {/* Aviso del motor: utilización alta, un pago que no cubre el interés... */}
            {badge}
          </span>
          {subtitle && (
            <span className="block truncate text-[10.5px] leading-tight text-zinc-500">
              {subtitle}
            </span>
          )}
        </span>

        <span className="shrink-0 text-right">
          <span className="block text-[13px] font-bold tabular-nums text-zinc-50">
            {amount}
          </span>
          {note && (
            <span className="block text-[10px] leading-tight text-zinc-500">{note}</span>
          )}
        </span>
      </button>

      <IconButton icon={Pencil} onClick={onEdit} label="Editar" />
      <IconButton icon={Trash2} onClick={onRemove} label="Eliminar" tone="danger" />
    </div>
  );
}
