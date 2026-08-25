import { useState } from 'react';
import { Phone, CheckCircle2 } from 'lucide-react';
import { useEvents } from '../../context/EventContext';
import { useSession } from '../../context/SessionContext';
import { digits, prospectNameFrom } from '../../lib/prospectText';
import { markProspectDiscarded } from '../../data/prospectStatus';
import useAdvisorPoints from '../../lib/useAdvisorPoints';
import ActionCardBase from './ActionCardBase';
import CircleActionButton from './CircleActionButton';
import WhatsAppMark from './WhatsAppMark';
import TaskOptionsSheet from './TaskOptionsSheet';
import FollowUpResolutionModal from './FollowUpResolutionModal';

/**
 * src/components/Activities/FollowUpCard.jsx
 *
 * Tarjeta de "Seguimiento" (`tipo_actividad === 'seguimiento'`): el puente
 * universal del embudo. Toda resolución de "pidió más tiempo" aterriza
 * aquí, sin importar de qué etapa venía
 * (`StageResolutionModal.jsx`/`PresentationEndModal.jsx`/
 * `ProposalResolutionModal.jsx`).
 *
 * El subtítulo muestra el origen/motivo (`event.followUpReason`, escrito
 * por quien enruta la actividad — ver `handleRouteToActivity` en
 * `App.jsx`): sin ese dato la persona vería un nombre y una hora sin
 * ninguna pista de por qué existe esta tarea.
 *
 * Sus 4 acciones son siempre visibles, sin voltear nada: llamar, WhatsApp,
 * "Retomar" y completar. "Retomar" es lo que lo vuelve un puente de
 * verdad y no una nota suelta: abre `FollowUpResolutionModal.jsx`, desde
 * donde el prospecto puede saltar a CUALQUIER fase del embudo —no sólo a
 * la que seguía cuando se pausó—, porque alguien que pausó antes de la
 * Propuesta puede volver pidiendo directamente el cierre. Completar sigue
 * existiendo para el caso en que el seguimiento se resolvió sin generar una
 * etapa nueva (contestó una duda y nada más).
 */
export default function FollowUpCard({ event, onRouteToActivity }) {
  const { completeEvent, removeEvent } = useEvents();
  const { identity } = useSession();
  const [, addPoints] = useAdvisorPoints(identity?.key);
  const [resolutionOpen, setResolutionOpen] = useState(false);
  const [rescheduleOpen, setRescheduleOpen] = useState(false);

  const prospectName = prospectNameFrom(event.title);
  const phone = digits(event.telefono);
  const hasPhone = phone.length > 0;
  const reason = event.followUpReason || 'Seguimiento pendiente';

  const telHref = hasPhone ? `tel:${phone}` : undefined;
  const whatsAppHref = hasPhone
    ? `https://wa.me/${phone.replace(/^\+/, '')}?text=${encodeURIComponent(
      `Hola ${prospectName}, te escribo para dar seguimiento a lo que platicamos.`,
    )}`
    : undefined;

  /*
    Retomar en una etapa nueva completa este seguimiento —ya cumplió su
    función, hay una actividad real agendada—; "No califica" lo elimina
    junto con el registro del prospecto. Mismo criterio que las demás
    tarjetas del embudo.
  */
  const handleResolved = (resultType) => {
    if (resultType === 'discard') removeEvent(event.id);
    else completeEvent(event.id);
  };

  return (
    <>
      <ActionCardBase
        label="Seguimiento"
        title={prospectName}
        subtitle={reason}
        time={event.time}
        onReschedule={() => setRescheduleOpen(true)}
        onDiscard={() => removeEvent(event.id)}
      >
        <CircleActionButton
          icon={Phone}
          tone="indigo"
          href={telHref}
          disabled={!hasPhone}
          label={`Llamar a ${prospectName}`}
        />

        <CircleActionButton
          tone="emerald"
          href={whatsAppHref}
          disabled={!hasPhone}
          label={`Enviar WhatsApp a ${prospectName}`}
        >
          <WhatsAppMark size={16} />
        </CircleActionButton>

        <CircleActionButton
          icon={CheckCircle2}
          tone="slate"
          onClick={() => completeEvent(event.id)}
          label={`Completar seguimiento de ${prospectName}`}
        />

        {/*
          Con texto y no sólo un ícono: es la acción que de verdad mueve el
          embudo desde aquí, y tiene que leerse distinta de los contactos
          rápidos de la izquierda — mismo criterio que "Iniciar" en
          `ProposalCard.jsx`.
        */}
        <button
          type="button"
          onClick={() => setResolutionOpen(true)}
          aria-label={`Retomar el seguimiento de ${prospectName}`}
          className="flex shrink-0 items-center gap-1.5 rounded-full bg-indigo-600 px-3.5
                     py-2 text-xs font-semibold text-white transition-colors
                     hover:bg-indigo-500 active:scale-95"
        >
          Retomar
        </button>
      </ActionCardBase>

      <TaskOptionsSheet
        event={event}
        isOpen={rescheduleOpen}
        onClose={() => setRescheduleOpen(false)}
        initialReschedule
      />

      <FollowUpResolutionModal
        isOpen={resolutionOpen}
        client={{ id: event.id, name: prospectName, phone: event.telefono }}
        onClose={() => setResolutionOpen(false)}
        onRouteToActivity={onRouteToActivity}
        onDiscardClient={(client) => markProspectDiscarded(identity?.key, client)}
        onResolved={handleResolved}
        onEarnPoints={addPoints}
      />
    </>
  );
}
