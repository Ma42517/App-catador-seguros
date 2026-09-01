import { useState, useEffect } from 'react';
import {
  CheckCircle, RotateCcw, Clock, Trash2, ChevronRight, Check, CalendarClock,
} from 'lucide-react';
import BottomSheet from '../Layout/BottomSheet';
import { useEvents } from '../../context/EventContext';
import { prospectNameFrom } from '../../lib/prospectText';
import { buildFollowUpEvent, followUpReasonFor } from '../../lib/followUpEvent';

const INPUT =
  'w-full rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-900 '
  + 'transition-colors [color-scheme:light] focus:border-indigo-500 focus:outline-none '
  + 'focus:ring-2 focus:ring-indigo-500 dark:border-zinc-700 dark:bg-zinc-950/60 '
  + 'dark:text-zinc-100 dark:[color-scheme:dark]';

const LABEL = 'mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-zinc-500';

/** Fila de acción del menú de la tarea. */
function OptionRow({ icon: Icon, label, tone, onClick, disabled = false }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`flex w-full items-center gap-3 rounded-xl px-3 py-3.5 text-left
                  transition-colors disabled:cursor-wait disabled:opacity-50 ${tone}`}
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
  const {
    completeEvent, reopenEvent, removeEvent, rescheduleEvent, resolveEvent,
  } = useEvents();
  const [isRescheduling, setIsRescheduling] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  /*
    Tercer paso de esta misma hoja, hermano de "Reprogramar": agendar un
    Seguimiento. Va aquí y no en un modal aparte porque este menú es el
    único punto que TODOS los eventos comparten —las tarjetas especiales de
    "Hoy", las filas de la Agenda, los recordatorios y los eventos viejos de
    antes de que existiera `tipo_actividad`—, así que conectarlo aquí es lo
    que vuelve el Seguimiento alcanzable desde cualquier cosa de la app en
    vez de sólo desde las etapas del embudo que ya tenían su router.
  */
  const [isFollowingUp, setIsFollowingUp] = useState(false);
  const [followUpDate, setFollowUpDate] = useState('');
  const [followUpTime, setFollowUpTime] = useState('');
  const [followUpReason, setFollowUpReason] = useState('');

  // Cada apertura arranca en el menú, con los valores actuales del evento —
  // salvo que se pida entrar directo a reprogramar (`initialReschedule`,
  // que usa el gesto de deslizar de `SwipeableCard.jsx`/`ActionableCard.jsx`:
  // ahí la persona ya eligió la acción, así que el menú intermedio sería un
  // paso de más).
  useEffect(() => {
    if (!isOpen) return;
    setIsRescheduling(Boolean(initialReschedule));
    setIsSubmitting(false);
    setDate(event?.date ?? '');
    setTime(event?.time ?? '');

    setIsFollowingUp(false);
    setFollowUpReason('');
    // El seguimiento arranca propuesto para mañana a la misma hora: casi
    // nunca se retoma el mismo día en que se pospuso.
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const pad = (n) => String(n).padStart(2, '0');
    setFollowUpDate(
      `${tomorrow.getFullYear()}-${pad(tomorrow.getMonth() + 1)}-${pad(tomorrow.getDate())}`,
    );
    setFollowUpTime(event?.time || `${pad(tomorrow.getHours())}:${pad(tomorrow.getMinutes())}`);
  }, [isOpen, event, initialReschedule]);

  if (!event) return null;

  const act = (fn) => { fn(); onClose(); };
  const isDone = Boolean(event.completed);

  const prospectName = prospectNameFrom(event.title);
  const defaultFollowUpReason = followUpReasonFor(event.tipo_actividad);

  /*
    Crea el Seguimiento y completa la tarea original: la actividad de hoy ya
    se resolvió —su desenlace fue "no se concretó, lo retomo tal día"—, y
    dejarla viva además del seguimiento nuevo duplicaría al mismo prospecto
    en la agenda. Un recordatorio suelto también se completa: su función era
    avisar, y ya avisó.
  */
  const scheduleFollowUp = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      const result = await resolveEvent({
        resolvingEventId: event.id,
        nextActivity: buildFollowUpEvent(event, {
          date: followUpDate,
          time: followUpTime,
          reason: followUpReason || defaultFollowUpReason,
        }),
      });
      if (result.status === 'committed' || result.status === 'already_resolved') onClose();
      else setIsSubmitting(false);
    } catch {
      setIsSubmitting(false);
    }
  };

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={() => { if (!isSubmitting) onClose(); }}
      label="Opciones de la tarea"
    >
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

      {isFollowingUp ? (
        <form
          onSubmit={(e) => { e.preventDefault(); scheduleFollowUp(); }}
          className="flex flex-col gap-4"
        >
          <p className="text-sm leading-relaxed text-zinc-500">
            Se crea un Seguimiento de {prospectName} y esta tarea se marca como resuelta.
          </p>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={LABEL} htmlFor="follow-up-task-date">Fecha</label>
              <input
                id="follow-up-task-date"
                type="date"
                required
                className={INPUT}
                value={followUpDate}
                onChange={(e) => setFollowUpDate(e.target.value)}
              />
            </div>
            <div>
              <label className={LABEL} htmlFor="follow-up-task-time">Hora</label>
              <input
                id="follow-up-task-time"
                type="time"
                required
                className={INPUT}
                value={followUpTime}
                onChange={(e) => setFollowUpTime(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className={LABEL} htmlFor="follow-up-task-reason">Motivo (opcional)</label>
            <input
              id="follow-up-task-reason"
              className={INPUT}
              value={followUpReason}
              onChange={(e) => setFollowUpReason(e.target.value)}
              placeholder={defaultFollowUpReason}
              autoComplete="off"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3
                       text-sm font-semibold text-white shadow-lg shadow-indigo-600/30
                       transition-all hover:bg-indigo-500 active:scale-95 disabled:cursor-wait
                       disabled:opacity-60"
          >
            <Check size={16} />
            Agendar seguimiento
          </button>

          <button
            type="button"
            onClick={() => setIsFollowingUp(false)}
            disabled={isSubmitting}
            className="rounded-xl px-4 py-3 text-sm font-semibold text-zinc-500
                       transition-colors hover:bg-zinc-100 disabled:cursor-wait
                       disabled:opacity-60 dark:hover:bg-white/5"
          >
            Volver
          </button>
        </form>
      ) : isRescheduling ? (
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

            {/*
              "Reprogramar" mueve ESTA tarea de fecha; "Requiere
              Seguimiento" la cierra y crea una actividad nueva de
              seguimiento. Se parecen, pero no son lo mismo y por eso
              conviven: mover la cita de ayer a mañana borra el rastro de que
              no se concretó, mientras que el seguimiento deja constancia del
              motivo y arrastra el teléfono y la prima del prospecto.

              No se ofrece en una tarea que ya es un Seguimiento: para eso
              está "Retomar" en su propia tarjeta
              (`FollowUpResolutionModal.jsx`), que además permite saltar a
              cualquier etapa del embudo y no sólo a otro seguimiento.
            */}
            {!isDone && event.tipo_actividad !== 'seguimiento' && (
              <OptionRow
                icon={CalendarClock}
                label="Requiere Seguimiento"
                tone="text-indigo-600 hover:bg-indigo-500/10 dark:text-indigo-400"
                onClick={() => setIsFollowingUp(true)}
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
