import { useState } from 'react';
import { Bell, Calendar as CalendarIcon } from 'lucide-react';
import TaskOptionsSheet from './TaskOptionsSheet';

/**
 * Tarjeta de evento accionable de la pantalla de inicio: se toca para abrir el
 * menú de opciones de la tarea. Cada tarjeta administra su propia hoja, así la
 * lista que la usa no tiene que llevar el estado de cuál está seleccionada.
 */
export default function ActionableCard({ event }) {
  const [isOpen, setIsOpen] = useState(false);
  const Icon = event.type === 'recordatorio' ? Bell : CalendarIcon;

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="flex w-full cursor-pointer items-center justify-between gap-3 rounded-xl
                   border border-zinc-900/10 bg-zinc-900/5 p-4 text-left backdrop-blur-sm
                   transition-transform active:scale-95 focus-visible:outline-none
                   focus-visible:ring-2 focus-visible:ring-indigo-500
                   dark:border-white/10 dark:bg-zinc-800/40"
      >
        <span className="flex min-w-0 items-center gap-3">
          <Icon
            size={16}
            className="shrink-0 text-rose-500 dark:text-rose-400"
            aria-hidden="true"
          />
          <span className="truncate text-sm font-medium text-zinc-800 dark:text-zinc-100">
            {event.title}
          </span>
        </span>
        <span className="shrink-0 text-xs tabular-nums text-zinc-500 dark:text-zinc-400">
          {event.time || 'Sin hora'}
        </span>
      </button>

      <TaskOptionsSheet event={event} isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
}
