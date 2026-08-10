import { useState } from 'react';
import { Bell, Calendar as CalendarIcon } from 'lucide-react';
import TaskOptionsSheet from './TaskOptionsSheet';
import { getEventStatus, eventStatusStyles } from './eventStatus';
import useNow from '../../lib/useNow';

/**
 * Tarjeta de evento accionable de la pantalla de inicio: se toca para abrir el
 * menú de opciones de la tarea. Cada tarjeta administra su propia hoja, así la
 * lista que la usa no tiene que llevar el estado de cuál está seleccionada.
 *
 * El estado temporal —normal, próximo o vencido— se pinta en la propia tarjeta
 * y nunca abre nada por su cuenta. Un evento que se acerca es información, no
 * una orden de atender: interrumpir con un panel al llegar la hora obliga a
 * cerrarlo antes de seguir, justo cuando la persona estaba en otra cosa.
 */
export default function ActionableCard({ event }) {
  const [isOpen, setIsOpen] = useState(false);
  const Icon = event.type === 'recordatorio' ? Bell : CalendarIcon;

  // El reloj entra como dependencia del render para que la tarjeta cambie de
  // estado sola al pasar la hora, sin tener que salir y volver a la pantalla.
  const now = useNow();
  const status = getEventStatus(event.time, {
    date: event.date,
    completed: event.completed,
    now,
  });
  const tone = eventStatusStyles(status);

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className={`flex w-full cursor-pointer items-center justify-between gap-3 rounded-xl
                    border bg-zinc-900/5 p-4 text-left backdrop-blur-sm transition-all
                    active:scale-95 focus-visible:outline-none focus-visible:ring-2
                    focus-visible:ring-indigo-500 dark:bg-zinc-800/40 ${tone.container}`}
      >
        <span className="flex min-w-0 items-center gap-3">
          <Icon size={16} className={`shrink-0 ${tone.icon}`} aria-hidden="true" />
          <span className="truncate text-sm font-medium text-zinc-800 dark:text-zinc-100">
            {event.title}
          </span>
        </span>

        <span className="flex shrink-0 items-center gap-1.5">
          {/*
            El punto acompaña a la hora, que es el dato que quedó atrás. Puesto
            en la esquina de la tarjeta se leería como un aviso del evento
            entero, sin decir qué es lo que está mal.
          */}
          {tone.showDot && (
            <span
              className="h-2 w-2 shrink-0 rounded-full bg-rose-500 dark:bg-rose-400"
              aria-hidden="true"
            />
          )}
          <span className={`text-xs tabular-nums ${tone.time}`}>
            {event.time || 'Sin hora'}
          </span>
        </span>

        {/*
          El estado también se nombra: el color y el latido no llegan a quien
          usa un lector de pantalla ni a quien no distingue el ámbar del rosa.
        */}
        {tone.label && <span className="sr-only">{tone.label}</span>}
      </button>

      <TaskOptionsSheet event={event} isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
}
