import { useState } from 'react';
import { Phone, Clock, CheckCircle2 } from 'lucide-react';
import { useEvents } from '../../context/EventContext';
import { digits, prospectNameFrom } from '../../lib/prospectText';
import WhatsAppMark from './WhatsAppMark';
import TaskOptionsSheet from './TaskOptionsSheet';
import SwipeableCard from '../Layout/SwipeableCard';
import PolicyDeliveryWhatsAppModal from './PolicyDeliveryWhatsAppModal';

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
 * src/components/Activities/PolicyDeliveryCard.jsx
 *
 * Tarjeta de "Entrega de Póliza" (`tipo_actividad === 'entrega_poliza'`).
 * Misma "Pill" oscura de botones circulares que
 * `CallActivityCard.jsx`/`FollowUpCard.jsx`/`ProposalCard.jsx`: hasta
 * ahora este tipo caía en la rama genérica de `ActionableCard.jsx` —una
 * fila clara que sólo abría el menú de opciones—, así que no tenía ni
 * WhatsApp ni teléfono a mano, a diferencia del resto del embudo.
 *
 * El teléfono no se pide de nuevo en ningún punto de la cadena: viaja
 * desde la Cita de Propuesta original hasta aquí, evento por evento
 * (`ProposalCard.jsx` lo copia al Recordatorio de Emisión, y
 * `IssuanceReminderCard.jsx` lo copia a esta Entrega). Por eso los dos
 * botones de contacto ya funcionan en cuanto la tarjeta nace, sin que el
 * asesor vuelva a escribir nada — y si el evento llegó sin teléfono
 * (creado a mano desde "Nueva Actividad" sin ese campo), se dibujan
 * atenuados y sin acción, mismo criterio que las demás tarjetas.
 *
 * El botón de WhatsApp es el único de todo el embudo que no sale directo
 * a la app: abre primero `PolicyDeliveryWhatsAppModal.jsx` para capturar
 * dos horarios que van dentro del mensaje. Es el único punto del flujo
 * donde el asesor propone una cita en vez de confirmar una ya acordada,
 * así que el texto no se puede armar de antemano como en el resto de las
 * etapas (`lib/whatsappConfirm.js`).
 *
 * "Entregada" cierra esta actividad y crea el `Recordatorio de Cobro` de
 * la primera prima — el último eslabón del "Efecto Dominó" que ya
 * describe `resolvePipelineStage` (`store/pipelineStore.js`): entregar la
 * póliza nunca es el final del trámite, siempre queda el cobro por
 * confirmar.
 */
export default function PolicyDeliveryCard({ event }) {
  const { completeEvent, removeEvent, addEvent } = useEvents();
  const [rescheduleOpen, setRescheduleOpen] = useState(false);
  const [whatsAppOpen, setWhatsAppOpen] = useState(false);

  const prospectName = prospectNameFrom(event.title);
  const phone = digits(event.telefono);
  const hasPhone = phone.length > 0;

  const telHref = hasPhone ? `tel:${phone}` : null;

  const handleDelivered = () => {
    const parts = nowParts();
    addEvent({
      tipo_actividad: 'cobro',
      title: `Cobro: ${prospectName}`,
      telefono: event.telefono ?? '',
      date: parts.date,
      time: parts.time,
      priority: 'maxima',
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
              Entrega de Póliza
            </p>
            <p className="truncate text-sm font-semibold text-white">{prospectName}</p>
            <p className="mt-0.5 flex items-center gap-1.5 text-xs text-slate-500">
              <Clock size={11} aria-hidden="true" />
              {event.time || 'Sin hora'}
            </p>
          </div>

          {/*
            No sale directo a WhatsApp: abre primero el paso de los dos
            horarios (`PolicyDeliveryWhatsAppModal.jsx`), que es donde se
            arma el mensaje. El enlace real vive dentro de ese modal, para
            que la salida a la app siga siendo una navegación de verdad y
            no un `window.open` que el escritorio bloquea.
          */}
          <button
            type="button"
            disabled={!hasPhone}
            onClick={() => setWhatsAppOpen(true)}
            aria-label={`Enviar WhatsApp a ${prospectName}`}
            className={`grid h-10 w-10 shrink-0 place-items-center rounded-full transition-colors
                        active:scale-95 disabled:cursor-not-allowed disabled:opacity-30
                        ${hasPhone
                ? 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20'
                : 'bg-emerald-500/10 text-emerald-400'}`}
          >
            <WhatsAppMark size={16} />
          </button>

          <a
            href={telHref ?? undefined}
            aria-disabled={!hasPhone}
            onClick={(e) => { if (!hasPhone) e.preventDefault(); }}
            aria-label={`Llamar a ${prospectName}`}
            className={`grid h-10 w-10 shrink-0 place-items-center rounded-full transition-colors
                        active:scale-95 ${hasPhone
                ? 'bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20'
                : 'cursor-not-allowed bg-indigo-500/10 text-indigo-400 opacity-30'}`}
          >
            <Phone size={16} aria-hidden="true" />
          </a>

          <button
            type="button"
            onClick={handleDelivered}
            aria-label={`Marcar como entregada la póliza de ${prospectName}`}
            className="flex shrink-0 items-center gap-1.5 rounded-full bg-indigo-600 px-3.5
                       py-2 text-xs font-semibold text-white transition-colors
                       hover:bg-indigo-500 active:scale-95"
          >
            <CheckCircle2 size={15} aria-hidden="true" />
            Entregada
          </button>
        </div>
      </SwipeableCard>

      <TaskOptionsSheet
        event={event}
        isOpen={rescheduleOpen}
        onClose={() => setRescheduleOpen(false)}
        initialReschedule
      />

      {/*
        Cerrar este modal —haya salido a WhatsApp o no— no toca el evento:
        proponer horarios no es haber entregado la póliza, así que la
        tarjeta sigue en la agenda hasta que se toque "Entregada".
      */}
      <PolicyDeliveryWhatsAppModal
        isOpen={whatsAppOpen}
        clientName={prospectName}
        phone={phone}
        onClose={() => setWhatsAppOpen(false)}
      />
    </>
  );
}
