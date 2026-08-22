import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  MapPin, Video, MessageCircle, Sparkles, CheckCircle, Clock,
} from 'lucide-react';
import { useEvents } from '../../context/EventContext';
import { useSession } from '../../context/SessionContext';
import { digits, prospectNameFrom } from '../../lib/prospectText';
import { generateStageWhatsAppLink } from '../../lib/whatsappConfirm';
import { readAdvisorProfile } from '../../data/advisorProfile';
import { markProspectDiscarded } from '../../data/prospectStatus';
import { upsertProspect } from '../../store/pipelineStore';
import useAdvisorPoints from '../../lib/useAdvisorPoints';
import SwipeableCard from '../Layout/SwipeableCard';
import TaskOptionsSheet from './TaskOptionsSheet';
import StageResolutionModal from '../Prospecta/StageResolutionModal';

/*
  Física del giro: un resorte ágil, no una curva de tiempo fija. `stiffness`
  alto es lo que hace que arranque rápido —nada de un giro perezoso—, y
  `damping` justo debajo de la crítica deja un rebote mínimo al llegar,
  que es lo que se lee como "ágil" y no como un simple `ease`.
*/
const FLIP_SPRING = { type: 'spring', stiffness: 400, damping: 26 };

/** Texto del anverso y de la etapa del router, según `tipo_actividad`. */
const STAGE_META = {
  cita_propuesta: { title: 'Cita de Propuesta', waStage: 'propuesta', routerStage: 'cita_propuesta' },
  cita_cierre: { title: 'Cita de Cierre', waStage: 'cierre', routerStage: 'cita_cierre' },
};

/**
 * src/components/Activities/PipelineCard.jsx
 *
 * Tarjeta base del embudo de ventas posterior a la Cita Inicial —hoy sirve
 * a las dos etapas con este mismo diseño, "Cita de Propuesta"
 * (`tipo_actividad === 'cita_propuesta'`) y "Cita de Cierre"
 * (`'cita_cierre'`), diferenciadas sólo por `STAGE_META` de arriba—,
 * resuelta como tarjeta reversible ("Flip Card") para no crecer de tamaño.
 *
 * El problema que resuelve: el título más el nombre del cliente ya llenan
 * el ancho completo de la fila delgada que usa el resto de la agenda
 * (`ActionableCard.jsx`, un solo renglón con `p-4`), y esa fila no tiene
 * sitio para 4 botones de acción sin ensancharse o crecer de alto — lo que
 * el pedido prohíbe. En vez de eso, la tarjeta gira: el frente es sólo
 * texto, y las acciones viven en el reverso, dentro de la misma caja.
 *
 * `perspective` va en el contenedor exterior y `rotateY` en el interior —el
 * mismo patrón (y el mismo motivo) que ya usa `DigitalCardPreview.jsx` para
 * su tarjeta de dos caras—: cada cara aplica `backfaceVisibility: 'hidden'`
 * para que la que está de espaldas ni se vea ni se pueda tocar a través de
 * la otra. El giro es manual: sólo ocurre al tocar la tarjeta
 * (`onClick`), nunca por su cuenta.
 *
 * También envuelta en `SwipeableCard.jsx`: esta cita es igualmente una
 * notificación del día, y debe poder reagendarse o descartarse con el mismo
 * gesto que el resto de "Hoy", sin obligar a voltear la tarjeta y usar
 * "Finalizar" en el reverso. El arrastre horizontal de `SwipeableCard` y el
 * toque para voltear conviven sin pisarse: uno exige mover el dedo una
 * distancia real, el otro es un toque breve sin desplazamiento.
 *
 * "Finalizar" ya no completa la actividad directo: abre
 * `StageResolutionModal.jsx`, el router de ventas que decide el "Efecto
 * Dominó" —a qué tipo de actividad se agenda después, o si el prospecto se
 * archiva— a través de `resolvePipelineStage` (`store/pipelineStore.js`).
 * `onRouteToActivity` es la única forma en que esta tarjeta habla hacia
 * arriba para crear la siguiente actividad; el descarte
 * (`markProspectDiscarded`) lo resuelve aquí mismo, igual que
 * `CitaInicialWizard.jsx` con su propio `PresentationEndModal`.
 */
export default function PipelineCard({ event, onOpenRequirements, onRouteToActivity }) {
  const { completeEvent, removeEvent } = useEvents();
  const { identity } = useSession();
  const [, addPoints] = useAdvisorPoints(identity?.key);
  const [isFlipped, setIsFlipped] = useState(false);
  // Sólo lo abre "Reagendar" del gesto de deslizar; tocar la tarjeta sigue
  // volteándola como siempre, sin abrir ningún menú.
  const [rescheduleOpen, setRescheduleOpen] = useState(false);
  const [resolutionOpen, setResolutionOpen] = useState(false);

  const meta = STAGE_META[event.tipo_actividad] ?? STAGE_META.cita_propuesta;

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
    meta.waStage,
    { name: prospectName, phone: event.telefono },
    event.time,
    event.modality,
    event.location,
    { zoomLink },
  );

  /*
    Los botones del reverso no deben voltear la tarjeta de vuelta al
    tocarlos: cada uno para la propagación del clic antes de abrir su
    enlace o disparar su acción — sin esto, el `onClick` del contenedor
    (que voltea la tarjeta) también correría, y el frente aparecería justo
    cuando la persona ya está usando el reverso.
  */
  const stop = (handler) => (e) => { e.stopPropagation(); handler?.(); };

  /*
    Resultado del router de ventas (`resolvePipelineStage`, dentro de
    `StageResolutionModal`): "avanzó" o "pidió más tiempo" completan esta
    actividad —ya se resolvió, con una siguiente actividad agendada—;
    "no califica" la elimina del todo, junto con el registro del
    prospecto. Ninguno de los dos caminos necesita el `onExitComplete` que
    sí usa `InitialMeetingCard.jsx`: aquí no hay animación de archivado
    propia, la tarjeta simplemente sale de la lista al cambiar el estado
    del evento.
  */
  const handleResolved = (resultType) => {
    if (resultType === 'discard') {
      removeEvent(event.id);
    } else {
      completeEvent(event.id);
    }
  };

  const handleDiscardClient = (client) => {
    markProspectDiscarded(identity?.key, client);
  };

  const handleRouteToActivity = (tipoActividad, client, extra) => {
    if (extra?.primaAnual) {
      upsertProspect({ id: client?.id ?? phone, ...client, primaAnual: extra.primaAnual });
    }
    onRouteToActivity?.(tipoActividad, client, extra);
  };

  return (
    <>
      <SwipeableCard
        onReschedule={() => setRescheduleOpen(true)}
        onDiscard={() => removeEvent(event.id)}
      >
        <div className="relative h-[68px] w-full [perspective:1000px]">
          <button
            type="button"
            onClick={() => setIsFlipped((v) => !v)}
            aria-label={isFlipped
              ? `Ocultar acciones de ${prospectName}`
              : `Ver acciones de ${prospectName}`}
            className="relative h-full w-full rounded-xl focus-visible:outline-none
                       focus-visible:ring-2 focus-visible:ring-indigo-500"
            style={{ transformStyle: 'preserve-3d' }}
          >
            <motion.div
              className="absolute inset-0"
              style={{ transformStyle: 'preserve-3d' }}
              animate={{ rotateY: isFlipped ? 180 : 0 }}
              transition={FLIP_SPRING}
            >
              {/*
                ── Anverso: texto + footer de pista ──

                Sin ícono ni fondo de color en el footer —discreto a
                propósito—: sólo el texto "Tocar para gestionar", en un
                gris apagado que se funde con el `bg-slate-900` de la
                tarjeta, sin competir con el contenido de arriba.

                La tarjeta no crece: el footer vive dentro de los mismos
                68px totales, como una franja fija en la base (`h-6`), y el
                bloque de texto de arriba ocupa el resto (`flex-1`) — no se
                suma altura nueva, se reparte la que ya había.
              */}
              <div
                className="absolute inset-0 flex flex-col overflow-hidden rounded-xl border
                           border-slate-800 bg-slate-900"
                style={{ backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden' }}
              >
                <div className="min-w-0 flex-1 px-3.5 pt-2.5 text-left">
                  {/*
                    Mismo patrón que las demás tarjetas de actividad
                    (Llamada, Cita Inicial, Seguimiento): la etiqueta del
                    tipo va arriba, en su propia línea, y el nombre abajo.
                    Antes iban juntos en una sola línea ("Cita de
                    Propuesta · Mario") y se veía distinto al resto.
                  */}
                  <p className="text-[10px] font-bold uppercase tracking-wide text-indigo-400">
                    {meta.title}
                  </p>
                  <p className="truncate text-sm font-semibold text-white">{prospectName}</p>
                  <p className="mt-0.5 flex items-center gap-1.5 text-xs text-slate-500">
                    <Clock size={11} aria-hidden="true" />
                    {event.time || 'Sin hora'}
                  </p>
                </div>

                <div className="flex h-6 shrink-0 items-center justify-center">
                  <span className="text-[10px] font-medium text-slate-600">
                    Tocar para gestionar
                  </span>
                </div>
              </div>

              {/* ── Reverso: sólo acciones ── */}
              <div
                className="absolute inset-0 flex items-center justify-evenly rounded-xl
                           border border-slate-800 bg-slate-900 px-2"
                style={{
                  backfaceVisibility: 'hidden',
                  WebkitBackfaceVisibility: 'hidden',
                  transform: 'rotateY(180deg)',
                }}
              >
                {/*
                  Sin `zoomLink` guardado (virtual) o sin dirección
                  capturada (presencial), este botón no tiene nada que
                  abrir — no es un caso "deshabilitado que se puede
                  resolver después" como el teléfono sin número, es un
                  botón sin ninguna función. Se deja de dibujar por
                  completo, igual que en `InitialMeetingCard.jsx` (ver esa
                  nota para el detalle).
                */}
                {hasLocation && (
                  <button
                    type="button"
                    onClick={stop(() => window.open(locationHref, '_blank', 'noopener'))}
                    aria-label={isVirtual ? 'Abrir videollamada' : 'Abrir ubicación'}
                    className="grid h-10 w-10 shrink-0 place-items-center rounded-full
                               bg-sky-500/10 text-sky-400 transition-colors
                               hover:bg-sky-500/20 active:scale-95"
                  >
                    {isVirtual
                      ? <Video size={17} aria-hidden="true" />
                      : <MapPin size={17} aria-hidden="true" />}
                  </button>
                )}

                <button
                  type="button"
                  disabled={!hasPhone}
                  onClick={stop(() => window.open(confirmHref, '_blank', 'noopener'))}
                  aria-label={`Enviar WhatsApp a ${prospectName}`}
                  className={`grid h-10 w-10 shrink-0 place-items-center rounded-full
                              transition-colors active:scale-95 disabled:cursor-not-allowed
                              disabled:opacity-30 ${hasPhone
                      ? 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20'
                      : 'bg-emerald-500/10 text-emerald-400'}`}
                >
                  <MessageCircle size={17} aria-hidden="true" />
                </button>

                <button
                  type="button"
                  onClick={stop(() => onOpenRequirements?.(event))}
                  aria-label="Asistente"
                  className="grid h-10 w-10 shrink-0 place-items-center rounded-full
                             bg-amber-500/10 text-amber-400 transition-colors
                             hover:bg-amber-500/20 active:scale-95"
                >
                  <Sparkles size={17} aria-hidden="true" />
                </button>

                <button
                  type="button"
                  onClick={stop(() => setResolutionOpen(true))}
                  aria-label={`Finalizar cita con ${prospectName}`}
                  className="grid h-10 w-10 shrink-0 place-items-center rounded-full
                             bg-indigo-500/10 text-indigo-400 transition-colors
                             hover:bg-indigo-500/20 active:scale-95"
                >
                  <CheckCircle size={17} aria-hidden="true" />
                </button>
              </div>
            </motion.div>
          </button>
        </div>
      </SwipeableCard>

      <TaskOptionsSheet
        event={event}
        isOpen={rescheduleOpen}
        onClose={() => setRescheduleOpen(false)}
        initialReschedule
      />

      <StageResolutionModal
        isOpen={resolutionOpen}
        stage={meta.routerStage}
        client={{ id: event.id, name: prospectName, phone: event.telefono }}
        onClose={() => setResolutionOpen(false)}
        onRouteToActivity={handleRouteToActivity}
        onDiscardClient={handleDiscardClient}
        onResolved={handleResolved}
        onEarnPoints={addPoints}
      />
    </>
  );
}
