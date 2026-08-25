import { CheckCircle2, Clock } from 'lucide-react';
import { useState } from 'react';
import { useEvents } from '../../context/EventContext';
import { prospectNameFrom } from '../../lib/prospectText';
import TaskOptionsSheet from './TaskOptionsSheet';
import SwipeableCard from '../Layout/SwipeableCard';

/** Fecha y hora de ahora mismo, en el formato que guarda el resto de la agenda. */
function nowParts() {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return {
    date: `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`,
    time: `${pad(now.getHours())}:${pad(now.getMinutes())}`,
  };
}

/**
 * src/components/Activities/IssuanceReminderCard.jsx
 *
 * Tarjeta de "Recordatorio de Emisión" (`tipo_actividad ===
 * 'recordatorio_emision'`): exclusiva del sistema — la crea
 * `ProposalCard.jsx` al resolver "Emitir Póliza" y nunca aparece en el
 * catálogo de "Nueva Actividad" (`ActivityForm.jsx`) — así que aquí nunca
 * llega una de estas tarjetas que el asesor haya tecleado a mano.
 *
 * Deliberadamente reducida a una sola acción dentro de la pastilla:
 * "Emitida". No lleva WhatsApp ni Llamada —sí los tenía antes, con una
 * intercepción que pedía fecha/hora de entrega, pero el pedido la
 * descartó a favor de algo más directo—: mientras la póliza sigue en
 * trámite no hay nada más que hacer con el prospecto desde esta tarjeta.
 * Al tocar "Emitida", nace de inmediato la actividad de "Entrega de
 * Póliza" (mismo `tipo_actividad`/etiqueta que ya usa el catálogo de
 * `ActivityForm.jsx`, para que la agenda la trate igual sin importar si
 * nació a mano o desde este router), y este Recordatorio se completa.
 */
export default function IssuanceReminderCard({ event }) {
  const { completeEvent, removeEvent, addEvent } = useEvents();
  const [rescheduleOpen, setRescheduleOpen] = useState(false);

  const prospectName = prospectNameFrom(event.title);

  const handleIssued = () => {
    const parts = nowParts();
    addEvent({
      tipo_actividad: 'entrega_poliza',
      title: `Entrega de Póliza: ${prospectName}`,
      telefono: event.telefono ?? '',
      date: parts.date,
      time: parts.time,
      priority: 'maxima',
      // Sigue de largo hacia el Cobro, que es donde el monto importa.
      ...(event.primaAnual && { primaAnual: event.primaAnual }),
    });
    completeEvent(event.id);
  };

  return (
    <>
      <SwipeableCard
        onReschedule={() => setRescheduleOpen(true)}
        onDiscard={() => removeEvent(event.id)}
      >
        <div
          className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-900
                     p-3.5"
        >
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-bold uppercase tracking-wide text-indigo-400">
              Recordatorio de Emisión
            </p>
            <p className="truncate text-sm font-semibold text-white">{prospectName}</p>
            <p className="mt-0.5 flex items-center gap-1.5 text-xs text-slate-500">
              <Clock size={11} aria-hidden="true" />
              {event.time || 'Sin hora'}
            </p>
          </div>

          <button
            type="button"
            onClick={handleIssued}
            aria-label={`Marcar como emitida la póliza de ${prospectName}`}
            className="flex shrink-0 items-center gap-1.5 rounded-full bg-indigo-600 px-3.5
                       py-2 text-xs font-semibold text-white transition-colors
                       hover:bg-indigo-500 active:scale-95"
          >
            <CheckCircle2 size={15} aria-hidden="true" />
            Emitida
          </button>
        </div>
      </SwipeableCard>

      <TaskOptionsSheet
        event={event}
        isOpen={rescheduleOpen}
        onClose={() => setRescheduleOpen(false)}
        initialReschedule
      />
    </>
  );
}
