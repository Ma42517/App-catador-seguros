import { useState, useEffect } from 'react';
import { Check, CalendarClock } from 'lucide-react';
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

/** Fecha de mañana y la misma hora: un seguimiento casi nunca es para hoy. */
function tomorrowParts(fallbackTime) {
  const now = new Date();
  now.setDate(now.getDate() + 1);
  const pad = (n) => String(n).padStart(2, '0');
  return {
    date: `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`,
    time: fallbackTime || `${pad(now.getHours())}:${pad(now.getMinutes())}`,
  };
}

/**
 * src/components/Activities/FollowUpSchedulerSheet.jsx
 *
 * Hoja para agendar un Seguimiento desde cualquier tarjeta del embudo que
 * se haya atorado: la póliza que no se emite, la entrega que no se
 * concreta, la prima que no se paga. Antes esas tres tarjetas sólo tenían
 * el camino de "salió bien" —Emitida, Entregada, Cobrado— y el de
 * descartar; no había forma de decir "no pasó todavía, recuérdamelo
 * después" sin perder al prospecto o dejar la tarea vencida en la agenda.
 *
 * Pide sólo fecha, hora y un motivo opcional. El motivo trae un texto por
 * omisión según la etapa de origen (`followUpReasonFor`), así que dejarlo
 * vacío sigue produciendo un subtítulo útil en `FollowUpCard.jsx` — que es
 * justo lo que evita la fila de seguimientos anónimos sin saber por qué
 * existen.
 *
 * El evento se arma con `buildFollowUpEvent` y no a mano: es el mismo
 * constructor que usan el menú de opciones y el feedback de llamada, para
 * que un Seguimiento se vea y se comporte igual sin importar de dónde
 * nació.
 *
 * @param {boolean} isOpen
 * @param {object} event Evento de origen; de él se heredan nombre, teléfono y prima.
 * @param {string} stage Etapa de origen, para el motivo por omisión (`PIPELINE_STAGES`).
 * @param {() => void} onClose
 * @param {() => void} [onScheduled] Se llama tras crear el seguimiento; quien monta decide qué hacer con la tarea original (completarla, dejarla viva...).
 */
export default function FollowUpSchedulerSheet({
  isOpen, event, stage, onClose, onScheduled,
}) {
  const { addEvent } = useEvents();
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [reason, setReason] = useState('');

  const defaultReason = followUpReasonFor(stage);

  useEffect(() => {
    if (!isOpen) return;
    const parts = tomorrowParts(event?.time);
    setDate(parts.date);
    setTime(parts.time);
    setReason('');
  }, [isOpen, event]);

  if (!event) return null;

  const prospectName = prospectNameFrom(event.title);

  const handleSubmit = (e) => {
    e.preventDefault();
    addEvent(buildFollowUpEvent(event, { date, time, reason: reason || defaultReason }));
    onScheduled?.();
    onClose();
  };

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} label="Agendar seguimiento">
      <div className="mb-5">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-indigo-500
                      dark:text-indigo-400"
        >
          Requiere Seguimiento
        </p>
        <h2 className="mt-1 text-lg font-bold leading-snug text-zinc-900 dark:text-white">
          ¿Cuándo retomas a {prospectName}?
        </h2>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={LABEL} htmlFor="follow-up-date">Fecha</label>
            <input
              id="follow-up-date"
              type="date"
              required
              className={INPUT}
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
          <div>
            <label className={LABEL} htmlFor="follow-up-time">Hora</label>
            <input
              id="follow-up-time"
              type="time"
              required
              className={INPUT}
              value={time}
              onChange={(e) => setTime(e.target.value)}
            />
          </div>
        </div>

        <div>
          <label className={LABEL} htmlFor="follow-up-reason">Motivo (opcional)</label>
          <input
            id="follow-up-reason"
            className={INPUT}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder={defaultReason}
            autoComplete="off"
          />
          <p className="mt-1.5 text-[11px] leading-relaxed text-zinc-500">
            Se muestra en la tarjeta del seguimiento para recordarte por qué quedó pendiente.
          </p>
        </div>

        <button
          type="submit"
          className="flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3
                     text-sm font-semibold text-white shadow-lg shadow-indigo-600/30
                     transition-all hover:bg-indigo-500 active:scale-95"
        >
          <Check size={16} aria-hidden="true" />
          Agendar seguimiento
        </button>

        <button
          type="button"
          onClick={onClose}
          className="flex items-center justify-center gap-1.5 rounded-xl px-4 py-2.5 text-xs
                     font-semibold text-zinc-500 transition-colors hover:text-zinc-700
                     dark:hover:text-zinc-300"
        >
          <CalendarClock size={13} aria-hidden="true" />
          Cancelar
        </button>
      </form>
    </BottomSheet>
  );
}
