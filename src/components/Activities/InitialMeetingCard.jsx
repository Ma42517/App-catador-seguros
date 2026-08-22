import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, Video, PlayCircle, Clock } from 'lucide-react';
import { useEvents } from '../../context/EventContext';
import { useSession } from '../../context/SessionContext';
import useHourglassTimer from '../../lib/useHourglassTimer';
import { computeEndTime } from '../../lib/appointmentTime';
import { addOrphanProspect } from '../../data/orphanProspects';
import { digits, prospectNameFrom } from '../../lib/prospectText';
import { generateWhatsAppConfirmLink } from '../../lib/whatsappConfirm';
import { readAdvisorProfile } from '../../data/advisorProfile';
import WhatsAppMark from './WhatsAppMark';
import TaskOptionsSheet from './TaskOptionsSheet';
import SwipeableCard from '../Layout/SwipeableCard';

/**
 * src/components/Activities/InitialMeetingCard.jsx
 *
 * Tarjeta de una actividad de tipo "Cita Inicial": el evento más importante
 * del día del asesor. Sin botón de "Completado/Check" —igual que
 * `CallActivityCard.jsx`—, con exactamente 3 acciones rápidas y el "Reloj de
 * Arena" que castiga con 0 puntos si nadie inicia la sesión de presentación
 * a tiempo.
 *
 * ## `endTime`
 * El pedido asume que `appointment.endTime` llega ya resuelto como
 * timestamp. La actividad real que guarda `ActivityForm.jsx` sólo tiene
 * `date`+`time` de inicio, sin duración: si el propio evento no trae un
 * `endTime` explícito (una fuente futura que sí capture la duración real),
 * se calcula uno por defecto con `computeEndTime` (`appointmentTime.js`,
 * hoy 60 minutos). Así el contrato pedido se cumple sin inventar un campo
 * que el formulario todavía no captura.
 *
 * ## `prospectId`
 * Tampoco existe un identificador de prospecto separado del propio evento
 * hoy —no hay un CRM de prospectos en la app—, así que se usa `event.id`
 * como `prospectId`: es el mismo criterio de "el evento es la unidad" que ya
 * usa el resto de la agenda (`entries.js`).
 *
 * ## Persistencia de `sessionStarted`
 * Se guarda en la propia actividad vía `updateEvent` (`EventContext.jsx`):
 * un estado que sólo viviera en este componente se perdería al recargar la
 * página a media cita, justo el momento en el que más importa que el
 * "Seguro de Vida" siga activo.
 *
 * ## Alcance de esta tarjeta
 * Sólo implementa lo pedido: las 3 acciones y el Gatillo de 30 minutos. El
 * flujo posterior de "¿Se llevó a cabo la cita?" (para reportar el
 * resultado y cobrar los puntos reales de la Cita Inicial) es una pieza
 * distinta, todavía no solicitada de forma explícita junto con el Reloj de
 * Arena — no se mezcla aquí para no inventar un flujo de puntos que no se
 * pidió en este componente.
 */
export default function InitialMeetingCard({ event, onStartSession }) {
  const { updateEvent, removeEvent } = useEvents();
  const { identity } = useSession();
  const username = identity?.key;

  const [isArchiving, setIsArchiving] = useState(false);
  const archivedRef = useRef(false);
  // Sólo lo abre "Reagendar" del gesto de deslizar; tocar la tarjeta sigue
  // sin abrir ningún menú, es el mismo comportamiento de siempre.
  const [rescheduleOpen, setRescheduleOpen] = useState(false);

  const sessionStarted = Boolean(event.sessionStarted);
  const endTime = event.endTime ?? computeEndTime(event);
  const { isExpired, isWarning, minutesUntilPenalty } = useHourglassTimer(
    endTime, sessionStarted,
  );

  const prospectName = prospectNameFrom(event.title);
  const phone = digits(event.telefono);
  const hasPhone = phone.length > 0;

  /*
    Modalidad de la cita (`entry-modality` de `ActivityForm.jsx`, guardada
    en el propio evento): "virtual" abre el enlace fijo de Zoom/Meet del
    perfil del asesor (`data/advisorProfile.js`); sin ese link guardado, el
    ícono de ubicación no tiene a dónde abrir —pero el de WhatsApp sí sigue
    funcionando, con el mensaje de recordatorio que se adapta solo (Caso C
    de `lib/whatsappConfirm.js`). "presencial" abre el mapa de la dirección
    capturada en el formulario.
  */
  const isVirtual = event.modality === 'virtual';
  const zoomLink = isVirtual ? readAdvisorProfile(username).zoomLink : '';
  const locationHref = isVirtual
    ? (zoomLink || null)
    : (event.location ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(event.location)}` : null);
  const hasLocation = Boolean(locationHref);

  /*
    Los dos íconos de acción se dibujan como `<a target="_blank">` reales y
    no como `window.open` disparado desde un `<button>`: en computadora los
    navegadores bloquean en silencio un `window.open` que no venga de un
    enlace de verdad —el botón parecía "no hacer nada"—, aunque en celular
    casi siempre lo dejaban pasar. Un `<a>` nunca cuenta como pop-up. Mismo
    ajuste que ya se hizo en `CallActivityCard.jsx`.

    El mensaje de WhatsApp usa la misma lógica de degradación elegante que
    describe `lib/whatsappConfirm.js`: presencial con dirección, virtual con
    el link fijo del asesor si lo tiene guardado, o virtual sin link como
    simple recordatorio si no lo tiene — nunca inventa un dato que no existe.
  */
  const confirmHref = generateWhatsAppConfirmLink(
    { name: prospectName, phone: event.telefono },
    event.time,
    event.modality,
    event.location,
    { zoomLink },
  );

  /*
    Gatillo de 30 minutos: en cuanto el reloj de arena marca `isExpired`, se
    dispara el desmontaje una sola vez (el `ref` evita que un segundo tic del
    temporizador, mientras dura la animación de salida, vuelva a archivar el
    mismo prospecto dos veces).
  */
  useEffect(() => {
    if (!isExpired || archivedRef.current) return;
    archivedRef.current = true;
    setIsArchiving(true);
  }, [isExpired]);

  /*
    `handleOrphanProspect`: corre sólo cuando la animación de salida ya
    terminó (`onExitComplete` de `AnimatePresence`, más abajo) — no antes,
    para que la persona vea la tarjeta desaparecer y no que simplemente se
    esfume de golpe mientras la agenda se actualiza.
  */
  const handleOrphanProspect = () => {
    addOrphanProspect(username, {
      prospectId: event.id,
      name: prospectName,
      phone: event.telefono ?? '',
      reason: 'sin_sesion_30min',
    });
    removeEvent(event.id);
  };

  /*
    "Seguro de Vida": marcar `sessionStarted` es lo único que apaga el
    reloj de arena de forma permanente (`useHourglassTimer.js`), y sólo
    hace falta escribirlo la primera vez. La redirección al módulo de
    presentación es responsabilidad de quien monta esta tarjeta
    —`onStartSession`, opcional—: esta tarjeta no decide rutas, sólo avisa
    que la sesión ya empezó.

    El botón se queda siempre activo, incluso después de la primera vez:
    antes tenía `disabled={sessionStarted}`, así que en cuanto se marcaba
    la sesión como iniciada el ícono quedaba apagado para siempre y ya no
    volvía a abrir la presentación —justo el reporte de que "sólo sirve una
    vez"—. El Seguro de Vida sigue siendo permanente (nunca se vuelve a
    escribir `sessionStarted: false`), pero eso no debe impedir volver a
    entrar al módulo de presentación cuantas veces haga falta (la llamada
    se cortó, se cerró por accidente, etc.).
  */
  const handleStartSession = () => {
    if (!sessionStarted) updateEvent(event.id, { sessionStarted: true });
    onStartSession?.(event);
  };

  return (
    <AnimatePresence onExitComplete={() => { if (isArchiving) handleOrphanProspect(); }}>
      {!isArchiving && (
        <motion.div
          key={event.id}
          layout
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 0.92, height: 0, marginBottom: 0 }}
          transition={{ duration: 0.35, ease: 'easeInOut' }}
          className="overflow-hidden"
        >
          {/*
            Mismo gesto de deslizar que ya tienen las demás tarjetas de
            "Hoy": es la Cita Inicial más importante del día, pero sigue
            siendo una notificación que la persona debe poder descartar sin
            depender del Reloj de Arena. El auto-archivo a los 30 minutos
            (arriba) sigue intacto y corre por su cuenta; esto sólo agrega
            la salida manual.
          */}
          <SwipeableCard
            onReschedule={() => setRescheduleOpen(true)}
            onDiscard={() => removeEvent(event.id)}
          >
            <div
              className={`rounded-xl border p-3.5 transition-colors ${
                isWarning
                  ? 'animate-pulse border-amber-500/60 bg-slate-900'
                  : 'border-slate-800 bg-slate-900'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-white">{prospectName}</p>
                  <p className="mt-0.5 flex items-center gap-1.5 text-xs text-slate-500">
                    <Clock size={11} aria-hidden="true" />
                    {event.time || 'Sin hora'}
                    {!sessionStarted && isWarning && minutesUntilPenalty !== null && (
                      <span className="font-semibold text-amber-400">
                        · Se archiva en {minutesUntilPenalty}
                        {' '}
                        {minutesUntilPenalty === 1 ? 'minuto' : 'minutos'}
                      </span>
                    )}
                  </p>
                </div>

                {/*
                  En una cita virtual sin `zoomLink` guardado, este ícono no
                  tiene absolutamente nada que abrir — ni siquiera queda un
                  "recordatorio" que mostrar, a diferencia del mensaje de
                  WhatsApp, que sí sabe degradarse (Caso C de
                  `whatsappConfirm.js`). Antes se dibujaba igual, sólo
                  atenuado y deshabilitado: un botón sin ninguna función
                  sigue pareciendo un botón, e invita a tocarlo para nada.
                  Se deja de renderizar por completo — presencial sin
                  dirección cae en el mismo caso, por la misma razón.
                */}
                {hasLocation && (
                  <a
                    href={locationHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={isVirtual ? 'Abrir videollamada' : 'Abrir ubicación'}
                    className="grid h-10 w-10 shrink-0 place-items-center rounded-full
                               bg-sky-500/10 text-sky-400 transition-colors
                               hover:bg-sky-500/20 active:scale-95"
                  >
                    {isVirtual
                      ? <Video size={16} aria-hidden="true" />
                      : <MapPin size={16} aria-hidden="true" />}
                  </a>
                )}

                <a
                  href={confirmHref ?? undefined}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-disabled={!hasPhone}
                  onClick={(e) => { if (!hasPhone) e.preventDefault(); }}
                  aria-label={`Confirmar cita con ${prospectName} por WhatsApp`}
                  className={`grid h-10 w-10 shrink-0 place-items-center rounded-full
                              transition-colors active:scale-95 ${hasPhone
                      ? 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20'
                      : 'cursor-not-allowed bg-emerald-500/10 text-emerald-400 opacity-30'}`}
                >
                  <WhatsAppMark size={16} />
                </a>

                <button
                  type="button"
                  onClick={handleStartSession}
                  aria-label={sessionStarted ? 'Abrir presentación' : 'Iniciar sesión de presentación'}
                  className="grid h-10 w-10 shrink-0 place-items-center rounded-full
                             bg-indigo-500/10 text-indigo-400 transition-colors
                             hover:bg-indigo-500/20 active:scale-95"
                >
                  <PlayCircle size={16} aria-hidden="true" />
                </button>
              </div>
            </div>
          </SwipeableCard>

          <TaskOptionsSheet
            event={event}
            isOpen={rescheduleOpen}
            onClose={() => setRescheduleOpen(false)}
            initialReschedule
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
