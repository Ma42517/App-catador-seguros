import { useState, useEffect } from 'react';
import {
  CheckCircle, RotateCcw, Clock, Trash2, ChevronRight, Check,
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
 * Menú de opciones de una tarea, compartido por la pantalla de inicio y la
 * agenda: ambas abren exactamente el mismo panel, así una tarea se administra
 * igual desde donde se la encuentre.
 *
 * "Reprogramar" abre un segundo paso dentro de la misma hoja, para no encadenar
 * modales. Todas las acciones escriben en `EventContext`, de modo que el cambio
 * se refleja al instante en las dos vistas.
 */
export default function TaskOptionsSheet({ event, isOpen, onClose, initialReschedule = false }) {
  const { completeEvent, reopenEvent, removeEvent, rescheduleEvent } = useEvents();
  const [isRescheduling, setIsRescheduling] = useState(false);
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');

  // Cada apertura arranca en el menú, con los valores actuales del evento —
  // salvo que se pida entrar directo a reprogramar (`initialReschedule`,
  // que usa el gesto de deslizar de `SwipeableCard.jsx`/`ActionableCard.jsx`:
  // ahí la persona ya eligió la acción, así que el menú intermedio sería un
  // paso de más).
  useEffect(() => {
    if (!isOpen) return;
    setIsRescheduling(Boolean(initialReschedule));
    setDate(event?.date ?? '');
    setTime(event?.time ?? '');
  }, [isOpen, event, initialReschedule]);

  if (!event) return null;

  const act = (fn) => { fn(); onClose(); };
  const isDone = Boolean(event.completed);

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} label="Opciones de la tarea">
      <div className="mb-5">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
          {event.type === 'recordatorio' ? 'Recordatorio' : 'Actividad'}
          {event.time ? ` · ${event.time}` : ''}
          {isDone ? ' · Completada' : ''}
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
            {/*
              En la agenda también se ven las tareas ya completadas. Ofrecerles
              "Marcar como Completada" no haría nada, así que se invierte la
              acción para poder devolverlas a pendiente.
            */}
            {isDone ? (
              <OptionRow
                icon={RotateCcw}
                label="Marcar como pendiente"
                tone="text-zinc-600 hover:bg-zinc-500/10 dark:text-zinc-300"
                onClick={() => act(() => reopenEvent(event.id))}
              />
            ) : (
              <OptionRow
                icon={CheckCircle}
                label="Marcar como Completada"
                tone="text-emerald-600 hover:bg-emerald-500/10 dark:text-emerald-400"
                onClick={() => act(() => completeEvent(event.id))}
              />
            )}

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
