import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  RefreshCcw, MapPin, Video, MessageCircle, Sparkles, CheckCircle, Clock,
} from 'lucide-react';
import { useEvents } from '../../context/EventContext';
import { useSession } from '../../context/SessionContext';
import { digits, prospectNameFrom } from '../../lib/prospectText';
import { generateWhatsAppConfirmLink } from '../../lib/whatsappConfirm';
import { readAdvisorProfile } from '../../data/advisorProfile';

/*
  Física del giro: un resorte ágil, no una curva de tiempo fija. `stiffness`
  alto es lo que hace que arranque rápido —nada de un giro perezoso—, y
  `damping` justo debajo de la crítica deja un rebote mínimo al llegar,
  que es lo que se lee como "ágil" y no como un simple `ease`.
*/
const FLIP_SPRING = { type: 'spring', stiffness: 400, damping: 26 };

/**
 * src/components/Activities/PipelineCard.jsx
 *
 * Tarjeta de una actividad del embudo de ventas posterior a la Cita Inicial
 * —hoy sólo "Cita de Propuesta" (`tipo_actividad === 'cita_propuesta'`)—,
 * resuelta como tarjeta reversible ("Flip Card") para no crecer de tamaño.
 *
 * El problema que resuelve: "Cita de Propuesta" más el nombre del cliente ya
 * llenan el ancho completo de la fila delgada que usa el resto de la agenda
 * (`ActionableCard.jsx`, un solo renglón con `p-4`), y esa fila no tiene
 * sitio para 4 botones de acción sin ensancharse o crecer de alto — lo que
 * el pedido prohíbe. En vez de eso, la tarjeta gira: el frente es sólo
 * texto, y las acciones viven en el reverso, dentro de la misma caja.
 *
 * `perspective` va en el contenedor exterior y `rotateY` en el interior —el
 * mismo patrón (y el mismo motivo) que ya usa `DigitalCardPreview.jsx` para
 * su tarjeta de dos caras—: cada cara aplica `backfaceVisibility: 'hidden'`
 * para que la que está de espaldas ni se vea ni se pueda tocar a través de
 * la otra.
 */
export default function PipelineCard({ event, onOpenRequirements }) {
  const { completeEvent } = useEvents();
  const { identity } = useSession();
  const [isFlipped, setIsFlipped] = useState(false);

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
    Los botones del reverso no deben voltear la tarjeta de vuelta al
    tocarlos: cada uno para la propagación del clic antes de abrir su
    enlace o disparar su acción — sin esto, el `onClick` del contenedor
    (que voltea la tarjeta) también correría, y el frente aparecería justo
    cuando la persona ya está usando el reverso.
  */
  const stop = (handler) => (e) => { e.stopPropagation(); handler?.(); };

  const handleFinish = () => completeEvent(event.id);

  return (
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

            Se descarta el ícono suelto de "tres puntos": era una pista
            demasiado sutil, fácil de leer como decoración y no como una
            invitación a tocar. En su lugar, una barra inferior de ancho
            completo, con su propio fondo (`bg-slate-800`, un tono más
            claro que el `bg-slate-900` de la tarjeta) y texto explícito —
            "Tocar para gestionar"— deja clarísimo que ahí hay una acción,
            sin necesidad de adivinar qué significa un ícono aislado.

            La tarjeta no crece: el footer vive dentro de los mismos 68px
            totales, como una franja fija en la base (`h-6`), y el bloque
            de texto de arriba ocupa el resto (`flex-1`) — no se suma
            altura nueva, se reparte la que ya había.
          */}
          <div
            className="absolute inset-0 flex flex-col overflow-hidden rounded-xl border
                       border-slate-800 bg-slate-900"
            style={{ backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden' }}
          >
            <div className="min-w-0 flex-1 px-3.5 pt-2.5 text-left">
              <p className="truncate text-sm font-semibold text-white">
                Cita de Propuesta
                <span className="font-normal text-slate-400"> · {prospectName}</span>
              </p>
              <p className="mt-0.5 flex items-center gap-1.5 text-xs text-slate-500">
                <Clock size={11} aria-hidden="true" />
                {event.time || 'Sin hora'}
              </p>
            </div>

            <div className="flex h-6 shrink-0 items-center justify-center gap-1.5 bg-slate-800">
              <RefreshCcw size={11} className="shrink-0 text-slate-500" aria-hidden="true" />
              <span className="text-[10px] font-medium text-slate-500">
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
              Sin `zoomLink` guardado (virtual) o sin dirección capturada
              (presencial), este botón no tiene nada que abrir — no es un
              caso "deshabilitado que se puede resolver después" como el
              teléfono sin número, es un botón sin ninguna función. Se
              deja de dibujar por completo, igual que en
              `InitialMeetingCard.jsx` (ver esa nota para el detalle).
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
              aria-label="Asistente de requisitos"
              className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-amber-500/10
                         text-amber-400 transition-colors hover:bg-amber-500/20 active:scale-95"
            >
              <Sparkles size={17} aria-hidden="true" />
            </button>

            <button
              type="button"
              onClick={stop(handleFinish)}
              aria-label={`Finalizar cita de propuesta con ${prospectName}`}
              className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-indigo-500/10
                         text-indigo-400 transition-colors hover:bg-indigo-500/20 active:scale-95"
            >
              <CheckCircle size={17} aria-hidden="true" />
            </button>
          </div>
        </motion.div>
      </button>
    </div>
  );
}
