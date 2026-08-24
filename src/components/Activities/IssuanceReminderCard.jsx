import { useState } from 'react';
import { Phone, Clock, CheckCircle2 } from 'lucide-react';
import { useEvents } from '../../context/EventContext';
import { digits, prospectNameFrom } from '../../lib/prospectText';
import WhatsAppMark from './WhatsAppMark';
import TaskOptionsSheet from './TaskOptionsSheet';
import SwipeableCard from '../Layout/SwipeableCard';
import ScheduleClosingModal from './ScheduleClosingModal';

/**
 * src/components/Activities/IssuanceReminderCard.jsx
 *
 * Tarjeta de "Recordatorio de Emisión" (`tipo_actividad ===
 * 'recordatorio_emision'`): exclusiva del sistema — la crea
 * `ProposalCard.jsx` al resolver "Emitir Póliza" y nunca aparece en el
 * catálogo de "Nueva Actividad" (`ActivityForm.jsx`) — así que aquí nunca
 * llega una de estas tarjetas que el asesor haya tecleado a mano.
 *
 * Misma "Pill" oscura de botones circulares que el resto de tarjetas de
 * actividad. La diferencia está en qué hacen sus dos primeros botones:
 * WhatsApp y Llamada no ejecutan nada de inmediato, abren
 * `ScheduleClosingModal.jsx` — la entrega de la póliza necesita una fecha
 * antes de poder escribirle o llamarle a nadie, y ese es justo el dato
 * que ese modal pregunta. `scheduleAction` guarda cuál de los dos disparó
 * la intercepción, para que el modal sepa qué texto y qué acción final
 * mostrar. "Emitida" (el check) no se intercepta: es la resolución directa
 * de esta tarjeta, no un canal de comunicación.
 */
export default function IssuanceReminderCard({ event }) {
  const { completeEvent, removeEvent, addEvent } = useEvents();
  const [rescheduleOpen, setRescheduleOpen] = useState(false);
  // 'whatsapp' | 'call' | null — qué botón disparó la intercepción.
  const [scheduleAction, setScheduleAction] = useState(null);

  const prospectName = prospectNameFrom(event.title);
  const phone = digits(event.telefono);
  const hasPhone = phone.length > 0;

  /*
    Las 3 cosas que pide el pedido, en el mismo instante: se abre el
    `href` de comunicación que corresponda, este Recordatorio se marca
    completado (ya cumplió su función: agendar la entrega) y nace la Cita
    de Cierre con la fecha/hora que la persona acaba de elegir en el
    modal.
  */
  const handleScheduled = (date, time) => {
    if (scheduleAction === 'whatsapp' && hasPhone) {
      const message = `Hola ${prospectName}, tu póliza ya está en trámite de emisión. `
        + `Te propongo vernos el ${date} a las ${time} para hacerte la entrega y revisar los `
        + 'detalles. ¡Un saludo!';
      window.open(
        `https://wa.me/${phone.replace(/^\+/, '')}?text=${encodeURIComponent(message)}`,
        '_blank',
        'noopener',
      );
    } else if (scheduleAction === 'call' && hasPhone) {
      window.location.href = `tel:${phone}`;
    }

    completeEvent(event.id);

    addEvent({
      tipo_actividad: 'cita_cierre',
      title: `Cita de Cierre: ${prospectName}`,
      telefono: event.telefono ?? '',
      date,
      time,
      priority: 'maxima',
    });

    setScheduleAction(null);
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
            disabled={!hasPhone}
            onClick={() => setScheduleAction('whatsapp')}
            aria-label={`Enviar WhatsApp a ${prospectName}`}
            className={`grid h-10 w-10 shrink-0 place-items-center rounded-full
                        transition-colors active:scale-95 disabled:cursor-not-allowed
                        disabled:opacity-30 ${hasPhone
                ? 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20'
                : 'bg-emerald-500/10 text-emerald-400'}`}
          >
            <WhatsAppMark size={16} />
          </button>

          <button
            type="button"
            disabled={!hasPhone}
            onClick={() => setScheduleAction('call')}
            aria-label={`Llamar a ${prospectName}`}
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full
                       bg-indigo-500/10 text-indigo-400 transition-colors
                       hover:bg-indigo-500/20 active:scale-95 disabled:cursor-not-allowed
                       disabled:opacity-30"
          >
            <Phone size={16} aria-hidden="true" />
          </button>

          <button
            type="button"
            onClick={() => completeEvent(event.id)}
            aria-label={`Marcar como emitida la póliza de ${prospectName}`}
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full
                       bg-slate-500/10 text-slate-300 transition-colors
                       hover:bg-slate-500/20 active:scale-95"
          >
            <CheckCircle2 size={16} aria-hidden="true" />
          </button>
        </div>
      </SwipeableCard>

      <TaskOptionsSheet
        event={event}
        isOpen={rescheduleOpen}
        onClose={() => setRescheduleOpen(false)}
        initialReschedule
      />

      <ScheduleClosingModal
        isOpen={Boolean(scheduleAction)}
        actionType={scheduleAction}
        clientName={prospectName}
        onClose={() => setScheduleAction(null)}
        onSubmit={handleScheduled}
      />
    </>
  );
}
