import { useState } from 'react';
import { MapPin, Video, CheckCircle } from 'lucide-react';
import { useEvents } from '../../context/EventContext';
import { useSession } from '../../context/SessionContext';
import { digits, prospectNameFrom } from '../../lib/prospectText';
import { generateWhatsAppConfirmLink } from '../../lib/whatsappConfirm';
import { readAdvisorProfile } from '../../data/advisorProfile';
import { markProspectDiscarded } from '../../data/prospectStatus';
import { PIPELINE_STAGES } from '../../store/pipelineStore';
import useAdvisorPoints from '../../lib/useAdvisorPoints';
import ActionCardBase from './ActionCardBase';
import CircleActionButton from './CircleActionButton';
import WhatsAppMark from './WhatsAppMark';
import TaskOptionsSheet from './TaskOptionsSheet';
import StageResolutionModal from '../Prospecta/StageResolutionModal';

/**
 * src/components/Activities/AppointmentCard.jsx
 *
 * Tarjeta de "Cita" (`tipo_actividad === 'cita'`), la genérica del catálogo
 * de `ActivityForm.jsx` — el primer contacto informal que todavía no es un
 * Análisis de Necesidades formal (un café, una presentación de cortesía,
 * una reunión que salió de un referido).
 *
 * Existe para cerrar la última fuga del embudo. Antes esta etapa caía en la
 * rama genérica de `ActionableCard.jsx`: una fila gris cuyo único menú era
 * completar, reprogramar o eliminar, sin ninguna forma de hacerla avanzar.
 * El motor (`ADVANCE_MAP`, en `store/pipelineStore.js`) ya declaraba que
 * una Cita avanza a Cita Inicial, pero esa regla no se ejecutaba nunca
 * porque ninguna pantalla la disparaba — código que decía una cosa
 * mientras la app hacía otra.
 *
 * Reutiliza `StageResolutionModal.jsx` en vez de traer un router propio:
 * las 3 resoluciones son las mismas de todas las etapas (avanza / pide más
 * tiempo / no califica) y el destino de cada una ya lo decide
 * `resolvePipelineStage`. Sólo hizo falta añadir el texto de esta etapa a
 * `STAGE_COPY`.
 *
 * Sus acciones son las de una cita cualquiera: ubicación o videollamada
 * —omitida por completo cuando no hay a dónde abrir—, WhatsApp con el
 * mensaje de confirmación genérico (`generateWhatsAppConfirmLink`, el mismo
 * que usa la Cita Inicial: confirma día, hora y lugar) y "Finalizar", que
 * abre el router.
 */
export default function AppointmentCard({ event, onRouteToActivity }) {
  const { completeEvent, removeEvent } = useEvents();
  const { identity } = useSession();
  const [, addPoints] = useAdvisorPoints(identity?.key);
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

  const confirmHref = generateWhatsAppConfirmLink(
    { name: prospectName, phone: event.telefono },
    event.time,
    event.modality,
    event.location,
    { zoomLink },
  );

  /*
    Avanzar a Cita Inicial o caer en un Seguimiento completan esta cita —ya
    se resolvió, con la siguiente actividad agendada—; "no califica" la
    elimina junto con el registro del prospecto. Mismo criterio que el resto
    de las etapas del embudo.
  */
  const handleResolved = (resultType) => {
    if (resultType === 'discard') removeEvent(event.id);
    else completeEvent(event.id);
  };

  return (
    <>
      <ActionCardBase
        label="Cita"
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
          label={`Confirmar cita con ${prospectName} por WhatsApp`}
        >
          <WhatsAppMark size={16} />
        </CircleActionButton>

        <CircleActionButton
          icon={CheckCircle}
          tone="indigo"
          onClick={() => setResolutionOpen(true)}
          label={`Finalizar cita con ${prospectName}`}
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
        stage={PIPELINE_STAGES.CITA}
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
