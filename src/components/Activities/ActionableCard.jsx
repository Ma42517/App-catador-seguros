import { useState, useEffect } from 'react';
import {
  Bell, Calendar as CalendarIcon, CheckCircle, Clock, Trash2, ChevronRight, Check,
} from 'lucide-react';
import BottomSheet from '../Layout/BottomSheet';
import { useEvents } from '../../context/EventContext';

const INPUT =
  'w-full rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-900 '
  + 'transition-colors [color-scheme:light] focus:border-indigo-500 focus:outline-none '
  + 'focus:ring-2 focus:ring-indigo-500 dark:border-zinc-700 dark:bg-zinc-950/60 '
  + 'dark:text-zinc-100 dark:[color-scheme:dark]';

const LABEL = 'mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-zinc-500';

/** Fila de acción del menú de la tarea. */
function OptionRow({ icon: Icon, label, tone, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-3 rounded-xl px-3 py-3.5 text-left
                  transition-colors ${tone}`}
    >
      <Icon size={18} className="shrink-0" aria-hidden="true" />
      <span className="min-w-0 flex-1 text-sm font-semibold">{label}</span>
      <ChevronRight size={16} className="shrink-0 opacity-40" aria-hidden="true" />
    </button>
  );
}

/**
 * Menú de opciones de una tarea. "Reprogramar" abre un segundo paso dentro de
 * la misma hoja, para no encadenar modales.
 */
function TaskOptionsSheet({ event, isOpen, onClose }) {
  const { completeEvent, removeEvent, rescheduleEvent } = useEvents();
  const [isRescheduling, setIsRescheduling] = useState(false);
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');

  // Cada apertura arranca en el menú, con los valores actuales del evento.
  useEffect(() => {
    if (!isOpen) return;
    setIsRescheduling(false);
    setDate(event?.date ?? '');
    setTime(event?.time ?? '');
  }, [isOpen, event]);

  if (!event) return null;

  const act = (fn) => { fn(); onClose(); };

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} label="Opciones de la tarea">
      <div className="mb-5">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
          {event.type === 'recordatorio' ? 'Recordatorio' : 'Actividad'}
          {event.time ? ` · ${event.time}` : ''}
        </p>
        <h2 className="mt-1 text-lg font-bold leading-snug text-zinc-900 dark:text-white">
          {event.title}
        </h2>
      </div>

      {isRescheduling ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            act(() => rescheduleEvent(event.id, {
              date: date || event.date,
              time: time || event.time,
            }));
          }}
          className="flex flex-col gap-4"
        >
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={LABEL} htmlFor="reschedule-date">Nueva fecha</label>
              <input
                id="reschedule-date"
                type="date"
                className={INPUT}
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
            <div>
              <label className={LABEL} htmlFor="reschedule-time">Nueva hora</label>
              <input
                id="reschedule-time"
                type="time"
                className={INPUT}
                value={time}
                onChange={(e) => setTime(e.target.value)}
              />
            </div>
          </div>

          <button
            type="submit"
            className="flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3
                       text-sm font-semibold text-white shadow-lg shadow-indigo-600/30
                       transition-all hover:bg-indigo-500 active:scale-95"
          >
            <Check size={16} />
            Guardar cambio
          </button>

          <button
            type="button"
            onClick={() => setIsRescheduling(false)}
            className="rounded-xl px-4 py-3 text-sm font-semibold text-zinc-500
                       transition-colors hover:bg-zinc-100 dark:hover:bg-white/5"
          >
            Volver
          </button>
        </form>
      ) : (
        <>
          <div className="flex flex-col gap-1">
            <OptionRow
              icon={CheckCircle}
              label="Marcar como Completada"
              tone="text-emerald-600 hover:bg-emerald-500/10 dark:text-emerald-400"
              onClick={() => act(() => completeEvent(event.id))}
            />
            <OptionRow
              icon={Clock}
              label="Reprogramar"
              tone="text-blue-600 hover:bg-blue-500/10 dark:text-blue-400"
              onClick={() => setIsRescheduling(true)}
            />
            <OptionRow
              icon={Trash2}
              label="Eliminar"
              tone="text-rose-600 hover:bg-rose-500/10 dark:text-rose-400"
              onClick={() => act(() => removeEvent(event.id))}
            />
          </div>

          <button
            type="button"
            onClick={onClose}
            className="mt-4 w-full rounded-xl border border-zinc-200 px-4 py-3 text-sm
                       font-semibold text-zinc-600 transition-colors hover:bg-zinc-100
                       dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-white/5"
          >
            Cancelar
          </button>
        </>
      )}
    </BottomSheet>
  );
}

/**
 * Tarjeta de evento accionable: se toca para abrir el menú de opciones de la
 * tarea. Cada tarjeta administra su propia hoja, así la lista que la usa no
 * tiene que llevar el estado de cuál está seleccionada.
 */
export default function ActionableCard({ event }) {
  const [isOpen, setIsOpen] = useState(false);
  const Icon = event.type === 'recordatorio' ? Bell : CalendarIcon;

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="flex w-full items-center justify-between gap-3 rounded-xl border
                   border-zinc-900/10 bg-zinc-900/5 p-4 text-left backdrop-blur-sm
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
