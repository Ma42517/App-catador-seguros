import { useState } from 'react';
import { PlayCircle, Sparkles, Clock } from 'lucide-react';
import { useEvents } from '../../context/EventContext';
import { useSession } from '../../context/SessionContext';
import { digits, prospectNameFrom } from '../../lib/prospectText';
import { generateStageWhatsAppLink } from '../../lib/whatsappConfirm';
import { readAdvisorProfile } from '../../data/advisorProfile';
import { markProspectDiscarded } from '../../data/prospectStatus';
import useAdvisorPoints from '../../lib/useAdvisorPoints';
import WhatsAppMark from './WhatsAppMark';
import TaskOptionsSheet from './TaskOptionsSheet';
import SwipeableCard from '../Layout/SwipeableCard';
import ProposalResolutionModal from './ProposalResolutionModal';

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
 * src/components/Activities/ProposalCard.jsx
 *
 * Tarjeta de "Cita de Propuesta" (`tipo_actividad === 'cita_propuesta'`):
 * la misma "Pill" oscura de botones circulares que ya usan
 * `CallActivityCard.jsx`/`FollowUpCard.jsx`/`InitialMeetingCard.jsx`, y no
 * la tarjeta reversible de `PipelineCard.jsx` (que hoy sólo atiende "Cita
 * de Cierre") — el botón "Iniciar" tiene que quedar siempre a la vista,
 * sin que haya que voltear nada para encontrarlo.
 *
 * "Iniciar" abre `ProposalResolutionModal.jsx`, el router de ventas de
 * esta etapa. De sus 3 resoluciones, sólo "Emitir Póliza" no pasa por
 * `ActivityForm.jsx`: el `Recordatorio de Emisión` es un estado interno
 * que nunca aparece en el catálogo de "Nueva Actividad", así que
 * `handleIssuePolicy` lo crea de inmediato con `addEvent`, sin pedirle
 * nada más al asesor. "Pidió Ajustes" sí usa el router genérico
 * (`onRouteToActivity`, hacia `ActivityForm` pre-llenado) porque un
 * Seguimiento de verdad necesita que el asesor elija cuándo va a dar
 * seguimiento.
 *
 * El botón ámbar ("Asistente", ícono `Sparkles`) vuelve a estar siempre a
 * la vista en esta tarjeta —igual que ya lo tenía la etapa cuando vivía
 * dentro de `PipelineCard.jsx`, antes de mudarse a esta "Pill"— y no
 * escondido detrás de ningún volteo: abre `UnderwritingDrawer.jsx` (el
 * expediente médico de las 3 Súper Preguntas) vía `onOpenRequirements`.
 * El mismo atajo se repite dentro de `ProposalResolutionModal.jsx`
 * ("Llenar Cuestionario"), para quien llega directo al router de ventas
 * sin haber tocado antes el ícono de la tarjeta — `handleOpenRequirements`
 * cierra primero el propio modal de resolución antes de abrir el
 * cuestionario, porque los dos comparten pantalla vía portales con
 * distinto `z-index` y, sin cerrarlo, el cuestionario quedaba tapado por
 * el modal y no se podía tocar ni un campo.
 */
export default function ProposalCard({ event, onOpenRequirements, onRouteToActivity }) {
  const { completeEvent, removeEvent, addEvent } = useEvents();
  const { identity } = useSession();
  const [, addPoints] = useAdvisorPoints(identity?.key);
  const [rescheduleOpen, setRescheduleOpen] = useState(false);
  const [resolutionOpen, setResolutionOpen] = useState(false);

  const prospectName = prospectNameFrom(event.title);
  const phone = digits(event.telefono);
  const hasPhone = phone.length > 0;

  const isVirtual = event.modality === 'virtual';
  const zoomLink = isVirtual ? readAdvisorProfile(identity?.key).zoomLink : '';
  const confirmHref = generateStageWhatsAppLink(
    'propuesta',
    { name: prospectName, phone: event.telefono },
    event.time,
    event.modality,
    event.location,
    { zoomLink },
  );

  /*
    "Emitir Póliza"/"Pidió Ajustes" completan esta cita —ya se resolvió,
    con el siguiente paso ya en marcha—; "No le interesó" la elimina del
    todo. Mismo criterio que `handleResolved` en `PipelineCard.jsx`.
  */
  const handleResolved = (resultType) => {
    if (resultType === 'discard') removeEvent(event.id);
    else completeEvent(event.id);
  };

  /*
    Crea el `Recordatorio de Emisión` directo en la agenda, sin abrir
    `ActivityForm.jsx`: es un estado interno del sistema, no algo que el
    asesor pueda teclear a mano. Nace hoy mismo, a la hora en que se
    resolvió la propuesta — no hay ninguna fecha que preguntar, la persona
    ya está frente a la tarjeta que dio pie a esta actividad.
  */
  const handleIssuePolicy = (client) => {
    const parts = nowParts();
    addEvent({
      tipo_actividad: 'recordatorio_emision',
      title: `Recordatorio de Emisión: ${client?.name || prospectName}`,
      telefono: client?.phone ?? event.telefono ?? '',
      date: parts.date,
      time: parts.time,
      priority: 'maxima',
      /*
        La Prima Anual, si esta Propuesta la traía, sigue viajando hacia
        adelante: es el monto que `PaymentCollectionCard.jsx` muestra al
        final del embudo ("cuánto hay que cobrar"). Sólo se escribe cuando
        existe, para no dejar un campo en cero que se leería como "no debe
        nada".
      */
      ...(event.primaAnual && { primaAnual: event.primaAnual }),
    });
  };

  /*
    El cuestionario (`UnderwritingDrawer.jsx`, montado en `App.jsx` con
    `z-[75]`) queda por debajo del router de ventas
    (`ProposalResolutionModal.jsx`, portal con `z-[90]`): sin cerrar este
    modal primero, se abría "detrás" — visible sólo como un fondo
    borroneado, sin poder tocar ni un campo. Se cierra el modal de
    resolución al pedir el cuestionario, no al revés: al terminarlo, la
    persona vuelve a la tarjeta y puede tocar "Iniciar" otra vez si sigue
    queriendo resolver la cita.
  */
  const handleOpenRequirements = () => {
    setResolutionOpen(false);
    onOpenRequirements?.(event);
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
              Cita de Propuesta
            </p>
            {/* Sin `truncate`: ver la nota de `ActionCardBase.jsx`. */}
            <p className="break-words text-sm font-semibold text-white">{prospectName}</p>
            <p className="mt-0.5 flex items-center gap-1.5 text-xs text-slate-500">
              <Clock size={11} aria-hidden="true" />
              {event.time || 'Sin hora'}
            </p>
          </div>

          <a
            href={confirmHref ?? undefined}
            target="_blank"
            rel="noopener noreferrer"
            aria-disabled={!hasPhone}
            onClick={(e) => { if (!hasPhone) e.preventDefault(); }}
            aria-label={`Enviar WhatsApp a ${prospectName}`}
            className={`grid h-10 w-10 shrink-0 place-items-center rounded-full transition-colors
                        active:scale-95 ${hasPhone
                ? 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20'
                : 'cursor-not-allowed bg-emerald-500/10 text-emerald-400 opacity-30'}`}
          >
            <WhatsAppMark size={16} />
          </a>

          <button
            type="button"
            onClick={handleOpenRequirements}
            aria-label={`Abrir cuestionario de requisitos de ${prospectName}`}
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full
                       bg-amber-500/10 text-amber-400 transition-colors
                       hover:bg-amber-500/20 active:scale-95"
          >
            <Sparkles size={16} aria-hidden="true" />
          </button>

          {/*
            Botón visible con texto, no sólo un ícono suelto: es la puerta
            de entrada al router de ventas de esta etapa, y tiene que
            leerse como una acción propia, distinta de los contactos
            rápidos de la izquierda.
          */}
          <button
            type="button"
            onClick={() => setResolutionOpen(true)}
            aria-label={`Iniciar gestión de la propuesta de ${prospectName}`}
            className="flex shrink-0 items-center gap-1.5 rounded-full bg-indigo-600 px-3.5
                       py-2 text-xs font-semibold text-white transition-colors
                       hover:bg-indigo-500 active:scale-95"
          >
            <PlayCircle size={15} aria-hidden="true" />
            Iniciar
          </button>
        </div>
      </SwipeableCard>

      <TaskOptionsSheet
        event={event}
        isOpen={rescheduleOpen}
        onClose={() => setRescheduleOpen(false)}
        initialReschedule
      />

      <ProposalResolutionModal
        isOpen={resolutionOpen}
        client={{ id: event.id, name: prospectName, phone: event.telefono }}
        onClose={() => setResolutionOpen(false)}
        onIssuePolicy={handleIssuePolicy}
        onOpenRequirements={handleOpenRequirements}
        onRouteToActivity={onRouteToActivity}
        onDiscardClient={(client) => markProspectDiscarded(identity?.key, client)}
        onResolved={handleResolved}
        onEarnPoints={addPoints}
      />
    </>
  );
}
