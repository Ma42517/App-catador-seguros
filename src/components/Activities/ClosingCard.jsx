import { useState } from 'react';
import { MapPin, Video, Sparkles, CheckCircle } from 'lucide-react';
import { useEvents } from '../../context/EventContext';
import { useSession } from '../../context/SessionContext';
import { digits, prospectNameFrom } from '../../lib/prospectText';
import { generateStageWhatsAppLink } from '../../lib/whatsappConfirm';
import { readAdvisorProfile } from '../../data/advisorProfile';
import { markProspectDiscarded } from '../../data/prospectStatus';
import { upsertProspect, PIPELINE_STAGES } from '../../store/pipelineStore';
import ActionCardBase from './ActionCardBase';
import CircleActionButton from './CircleActionButton';
import WhatsAppMark from './WhatsAppMark';
import TaskOptionsSheet from './TaskOptionsSheet';
import StageResolutionModal from '../Prospecta/StageResolutionModal';

/**
 * src/components/Activities/ClosingCard.jsx
 *
 * Tarjeta de "Cita de Cierre" (`tipo_actividad === 'cita_cierre'`).
 *
 * Reemplaza a `PipelineCard.jsx` para esta etapa: esa era una tarjeta
 * reversible ("Flip Card") que escondía sus 4 acciones en el reverso, y era
 * la única del embudo que seguía funcionando así — todas las demás ya son
 * pastillas con los botones a la vista. Con el volteo, las acciones no
 * existían hasta que la persona descubría que había que tocar la tarjeta, y
 * durante el giro en 3D se alcanzaba a ver lo que había detrás (el bug de
 * los íconos asomándose que hubo que corregir en `SwipeableCard.jsx`). Las
 * mismas 4 acciones caben en la pastilla sin crecer de alto, así que el
 * volteo no compraba nada.
 *
 * Las 4 acciones, en el mismo orden que tenían en el reverso:
 *  - Ubicación/Videollamada — se omite por completo si no hay a dónde
 *    abrir (virtual sin `zoomLink`, presencial sin dirección): un botón sin
 *    ninguna función sigue pareciendo un botón e invita a tocarlo para nada.
 *  - WhatsApp, con el mensaje propio de la etapa de Cierre
 *    (`lib/whatsappConfirm.js`).
 *  - Asistente (ámbar) — abre el `DeliveryKitDrawer.jsx` (checklist de
 *    entrega) vía `onOpenRequirements`, que `App.jsx` resuelve según el
 *    `tipo_actividad` del evento.
 *  - Finalizar — abre `StageResolutionModal.jsx`, el router de ventas que
 *    decide el "Efecto Dominó" con `resolvePipelineStage`: una resolución
 *    favorable converge en Recordatorio de Emisión, "Pide más tiempo" cae
 *    en Seguimiento y "No califica" archiva al prospecto.
 */
export default function ClosingCard({ event, onOpenRequirements, onRouteToActivity }) {
  const { resolveEvent, removeEvent } = useEvents();
  const { identity } = useSession();
  const [rescheduleOpen, setRescheduleOpen] = useState(false);
  const [resolutionOpen, setResolutionOpen] = useState(false);

  const prospectName = prospectNameFrom(event.title);
  const phone = digits(event.telefono);
  const hasPhone = phone.length > 0;

  const isVirtual = event.modality === 'virtual';
  const zoomLink = isVirtual ? readAdvisorProfile(identity?.key).zoomLink : '';
  const locationHref = isVirtual
    ? (zoomLink || null)
    : (event.location
      ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(event.location)}`
      : null);
  const hasLocation = Boolean(locationHref);

  const confirmHref = generateStageWhatsAppLink(
    'cierre',
    { name: prospectName, phone: event.telefono },
    event.time,
    event.modality,
    event.location,
    { zoomLink },
  );

  const handleDiscardClient = (client) => {
    const result = resolveEvent({
      resolvingEventId: event.id,
      resolveMode: 'remove',
    });
    if (result.status === 'committed') markProspectDiscarded(identity?.key, client);
    return result;
  };

  const handleRouteToActivity = (tipoActividad, client, extra) => {
    const primaAnual = extra?.primaAnual ?? event.primaAnual;
    onRouteToActivity?.(tipoActividad, client, {
      ...extra,
      ...(primaAnual && { primaAnual }),
      afterCommit: () => {
        if (primaAnual) {
          upsertProspect({ id: client?.id ?? phone, ...client, primaAnual });
        }
      },
    });
  };

  return (
    <>
      <ActionCardBase
        label="Cita de Cierre"
        title={prospectName}
        time={event.time}
        onReschedule={() => setRescheduleOpen(true)}
        onDiscard={() => removeEvent(event.id)}
      >
        {hasLocation && (
          <CircleActionButton
            icon={isVirtual ? Video : MapPin}
            tone="sky"
            href={locationHref}
            label={isVirtual ? 'Abrir videollamada' : 'Abrir ubicación'}
          />
        )}

        <CircleActionButton
          tone="emerald"
          href={confirmHref ?? undefined}
          disabled={!hasPhone}
          label={`Enviar WhatsApp a ${prospectName}`}
        >
          <WhatsAppMark size={16} />
        </CircleActionButton>

        <CircleActionButton
          icon={Sparkles}
          tone="amber"
          onClick={() => onOpenRequirements?.(event)}
          label={`Abrir kit de entrega de ${prospectName}`}
        />

        <CircleActionButton
          icon={CheckCircle}
          tone="indigo"
          onClick={() => setResolutionOpen(true)}
          label={`Finalizar cita de cierre con ${prospectName}`}
        />
      </ActionCardBase>

      <TaskOptionsSheet
        event={event}
        isOpen={rescheduleOpen}
        onClose={() => setRescheduleOpen(false)}
        initialReschedule
      />

      <StageResolutionModal
        isOpen={resolutionOpen}
        stage={PIPELINE_STAGES.CIERRE}
        client={{ id: event.id, name: prospectName, phone: event.telefono }}
        onClose={() => setResolutionOpen(false)}
        onRouteToActivity={handleRouteToActivity}
        onDiscardClient={handleDiscardClient}
      />
    </>
  );
}
