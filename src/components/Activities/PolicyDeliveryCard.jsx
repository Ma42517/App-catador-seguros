import { useState } from 'react';
import { Phone, CheckCircle2, CalendarClock } from 'lucide-react';
import { useEvents } from '../../context/EventContext';
import { digits, prospectNameFrom } from '../../lib/prospectText';
import { PIPELINE_STAGES } from '../../store/pipelineStore';
import WhatsAppMark from './WhatsAppMark';
import TaskOptionsSheet from './TaskOptionsSheet';
import ActionCardBase from './ActionCardBase';
import CircleActionButton from './CircleActionButton';
import FollowUpSchedulerSheet from './FollowUpSchedulerSheet';
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
  const [followUpOpen, setFollowUpOpen] = useState(false);

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
      // Último salto del monto: aquí es donde de verdad se usa.
      ...(event.primaAnual && { primaAnual: event.primaAnual }),
    });
    completeEvent(event.id);
  };

  return (
    <>
      <ActionCardBase
        label="Entrega de Póliza"
        title={prospectName}
        time={event.time}
        onReschedule={() => setRescheduleOpen(true)}
        onDiscard={() => removeEvent(event.id)}
      >
        {/*
          No sale directo a WhatsApp: abre primero el paso de los dos
          horarios (`PolicyDeliveryWhatsAppModal.jsx`), que es donde se
          arma el mensaje. El enlace real vive dentro de ese modal, para
          que la salida a la app siga siendo una navegación de verdad y
          no un `window.open` que el escritorio bloquea.
        */}
        <CircleActionButton
          tone="emerald"
          onClick={() => setWhatsAppOpen(true)}
          disabled={!hasPhone}
          label={`Enviar WhatsApp a ${prospectName}`}
        >
          <WhatsAppMark size={16} />
        </CircleActionButton>

        <CircleActionButton
          icon={Phone}
          tone="indigo"
          href={telHref ?? undefined}
          disabled={!hasPhone}
          label={`Llamar a ${prospectName}`}
        />

        {/*
          La entrega se reprograma seguido —el cliente cancela, no llega—,
          y sin esta salida había que fingir que ya se entregó o descartar
          al prospecto ya emitido, que es lo peor que podía pasar aquí.
        */}
        <CircleActionButton
          icon={CalendarClock}
          tone="slate"
          onClick={() => setFollowUpOpen(true)}
          label={`Agendar seguimiento de la entrega de ${prospectName}`}
        />

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
      </ActionCardBase>

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

      <FollowUpSchedulerSheet
        isOpen={followUpOpen}
        event={event}
        stage={PIPELINE_STAGES.ENTREGA}
        onClose={() => setFollowUpOpen(false)}
        onScheduled={() => completeEvent(event.id)}
      />
    </>
  );
}
