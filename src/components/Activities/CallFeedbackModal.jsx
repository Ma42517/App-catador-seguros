import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  PhoneOff, CalendarClock, PhoneMissed, CalendarCheck2, UserX, Check,
} from 'lucide-react';
import BottomSheet from '../Layout/BottomSheet';
import { useEvents } from '../../context/EventContext';
import { CALL_GAMIFICATION } from '../../lib/callGamification';

/** Etiqueta legible de "cita" — mismo valor que usa el catálogo cerrado de `ActivityForm.jsx` (`ACTIVITY_TYPE_OPTIONS`), sin importar ese módulo entero sólo por una constante. */
const CITA_LABEL = 'Cita';

const INPUT =
  'w-full rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-900 '
  + 'transition-colors [color-scheme:light] focus:border-indigo-500 focus:outline-none '
  + 'focus:ring-2 focus:ring-indigo-500 dark:border-zinc-700 dark:bg-zinc-950/60 '
  + 'dark:text-zinc-100 dark:[color-scheme:dark]';

const LABEL = 'mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-zinc-500';

/** Fecha y hora de hoy en el formato que esperan los inputs nativos — mismo helper que ya usa `ActivityForm.jsx`. */
function todayParts() {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return {
    date: `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`,
    time: `${pad(now.getHours())}:${pad(now.getMinutes())}`,
  };
}

/** Botón ancho de una opción del flujo: mismo armazón para las cinco (dos del Paso 1, dos del Paso 2, y el de confirmar reagenda). */
function OptionButton({ icon: Icon, label, tone, onClick }) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileTap={{ scale: 0.98 }}
      className={`flex w-full items-center gap-3 rounded-xl px-4 py-3.5 text-left
                  transition-colors ${tone}`}
    >
      <Icon size={18} className="shrink-0" aria-hidden="true" />
      <span className="text-sm font-semibold">{label}</span>
    </motion.button>
  );
}

/**
 * src/components/Activities/CallFeedbackModal.jsx
 *
 * Flujo de 1 a 2 pasos que aparece solo, al volver a la app después de una
 * llamada (ver `useCallReturnDetector.js` en `CallActivityCard.jsx`, que es
 * quien decide *cuándo* abrir esto — este componente sólo dibuja el flujo
 * una vez que ya está abierto). Pura selección de un clic, sin ningún
 * campo de texto: cada botón resuelve la tarea de la llamada por completo
 * (otorga puntos, y completa/reagenda/descarta el evento) y cierra el
 * flujo — la única excepción es "Reagendar", que abre un segundo paso
 * interno con dos inputs nativos de fecha/hora, todavía sin texto libre.
 *
 * `onEarnPoints(amount)` es lo único que este componente no puede hacer
 * por sí mismo —sumar al marcador de puntos del asesor (`useAdvisorPoints`,
 * un hook con su propio estado, no un contexto)— y viaja hacia arriba
 * hasta `CallActivityCard`, que es quien orquesta el toast, el sonido y la
 * vibración de recompensa. Agendar la cita nueva sí lo hace este mismo
 * componente, con `addEvent` de `EventContext`: "Agendar Cita" (Paso 2)
 * abre un mini-paso interno con fecha y hora —mismo patrón que
 * "Reagendar"— en vez de cerrar este flujo y abrir por separado el
 * formulario completo de "Nueva Actividad"; la persona ya dijo a quién y
 * para qué, sólo falta el cuándo, y eso se resuelve sin salir de aquí.
 */
export default function CallFeedbackModal({
  event, prospectName, isOpen, onClose, onEarnPoints,
}) {
  const {
    completeEvent, removeEvent, rescheduleEvent, addEvent,
  } = useEvents();

  /*
    'estado' (Paso 1) → 'resultado' (Paso 2, sólo si "Contestó") →
    'reagendar' o 'cita' (dos mini-pasos internos con fecha/hora, cada uno
    alcanzable sólo desde su paso correspondiente: "Reagendar" desde el
    Paso 1, "Agendar Cita" desde el Paso 2). Los dos comparten la misma
    forma de campos, pero nunca el mismo destino: uno mueve la llamada
    original, el otro crea un evento nuevo aparte y cierra la llamada
    original como completada.
  */
  const [step, setStep] = useState('estado');
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [rescheduleTime, setRescheduleTime] = useState('');
  const [appointmentDate, setAppointmentDate] = useState('');
  const [appointmentTime, setAppointmentTime] = useState('');

  // Cada apertura arranca siempre en el Paso 1: es un flujo nuevo por cada
  // llamada, nunca continúa donde quedó la anterior.
  useEffect(() => {
    if (!isOpen) return;
    setStep('estado');
    const parts = todayParts();
    setRescheduleDate(parts.date);
    setRescheduleTime(parts.time);
    setAppointmentDate(parts.date);
    setAppointmentTime(parts.time);
  }, [isOpen]);

  if (!event) return null;

  const finishWithEffort = () => {
    onEarnPoints(CALL_GAMIFICATION.LLAMADA_ESFUERZO);
    completeEvent(event.id);
    onClose();
  };

  const confirmReschedule = () => {
    onEarnPoints(CALL_GAMIFICATION.LLAMADA_ESFUERZO);
    rescheduleEvent(event.id, { date: rescheduleDate, time: rescheduleTime });
    onClose();
  };

  /*
    Confirma la cita nueva con la fecha y hora elegidas en el mini-paso
    'cita'. Se crea un evento aparte (`addEvent`, mismo contrato que ya usa
    `ActivityForm.jsx`: `tipo_actividad`, `title`, `telefono`, `date`,
    `time`, `priority`) — la llamada original se completa, no se
    transforma en la cita, porque son dos actividades distintas del
    embudo: la llamada ya ocurrió, la cita es lo que viene después.
  */
  const confirmAppointment = () => {
    onEarnPoints(CALL_GAMIFICATION.CITA_AGENDADA);
    addEvent({
      type: 'actividad',
      tipo_actividad: 'cita',
      title: `${CITA_LABEL}: ${prospectName}`,
      telefono: event.telefono ?? '',
      date: appointmentDate,
      time: appointmentTime,
      priority: 'maxima',
    });
    completeEvent(event.id);
    onClose();
  };

  const dismissNotInterested = () => {
    onEarnPoints(CALL_GAMIFICATION.LLAMADA_ESFUERZO);
    // "Descarta al prospecto de la vista diaria": se elimina el evento en
    // vez de completarlo — no es que la llamada haya fallado, es que ese
    // prospecto ya no debe volver a aparecer en la agenda de hoy.
    removeEvent(event.id);
    onClose();
  };

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} label="Resultado de la llamada">
      <AnimatePresence mode="wait">
        {step === 'estado' && (
          <motion.div
            key="estado"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            <h2 className="mb-5 text-lg font-bold leading-snug text-zinc-900 dark:text-white">
              ¿Cómo te fue en la llamada con {prospectName}?
            </h2>

            <div className="flex flex-col gap-2">
              <OptionButton
                icon={Check}
                label="Contestó"
                tone="bg-indigo-600 text-white hover:bg-indigo-500"
                onClick={() => setStep('resultado')}
              />
              <OptionButton
                icon={PhoneMissed}
                label="No contestó"
                tone="text-zinc-600 hover:bg-zinc-500/10 dark:text-zinc-300"
                onClick={finishWithEffort}
              />
              <OptionButton
                icon={CalendarClock}
                label="Reagendar"
                tone="text-zinc-600 hover:bg-zinc-500/10 dark:text-zinc-300"
                onClick={() => setStep('reagendar')}
              />
            </div>
          </motion.div>
        )}

        {step === 'resultado' && (
          <motion.div
            key="resultado"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            <h2 className="mb-5 text-lg font-bold leading-snug text-zinc-900 dark:text-white">
              Excelente. ¿Cuál fue el resultado?
            </h2>

            <div className="flex flex-col gap-2">
              <OptionButton
                icon={CalendarCheck2}
                label="Agendar Cita"
                tone="bg-indigo-600 text-white hover:bg-indigo-500"
                onClick={() => setStep('cita')}
              />
              <OptionButton
                icon={UserX}
                label="No está interesado"
                tone="text-zinc-600 hover:bg-zinc-500/10 dark:text-zinc-300"
                onClick={dismissNotInterested}
              />
            </div>
          </motion.div>
        )}

        {step === 'cita' && (
          <motion.div
            key="cita"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            <h2 className="mb-5 flex items-center gap-2 text-lg font-bold leading-snug
                          text-zinc-900 dark:text-white"
            >
              <CalendarCheck2 size={18} className="shrink-0 text-indigo-500" aria-hidden="true" />
              ¿Para cuándo agendamos la cita con {prospectName}?
            </h2>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={LABEL} htmlFor="appointment-date">Fecha</label>
                <input
                  id="appointment-date"
                  type="date"
                  className={INPUT}
                  value={appointmentDate}
                  onChange={(e) => setAppointmentDate(e.target.value)}
                />
              </div>
              <div>
                <label className={LABEL} htmlFor="appointment-time">Hora</label>
                <input
                  id="appointment-time"
                  type="time"
                  className={INPUT}
                  value={appointmentTime}
                  onChange={(e) => setAppointmentTime(e.target.value)}
                />
              </div>
            </div>

            <button
              type="button"
              onClick={confirmAppointment}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl
                         bg-indigo-600 px-4 py-3 text-sm font-semibold text-white
                         shadow-lg shadow-indigo-600/30 transition-all hover:bg-indigo-500
                         active:scale-95"
            >
              <Check size={16} aria-hidden="true" />
              Confirmar Cita
            </button>
          </motion.div>
        )}

        {step === 'reagendar' && (
          <motion.div
            key="reagendar"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            <h2 className="mb-5 flex items-center gap-2 text-lg font-bold leading-snug
                          text-zinc-900 dark:text-white"
            >
              <PhoneOff size={18} className="shrink-0 text-zinc-400" aria-hidden="true" />
              ¿Para cuándo reagendamos con {prospectName}?
            </h2>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={LABEL} htmlFor="reschedule-call-date">Nueva fecha</label>
                <input
                  id="reschedule-call-date"
                  type="date"
                  className={INPUT}
                  value={rescheduleDate}
                  onChange={(e) => setRescheduleDate(e.target.value)}
                />
              </div>
              <div>
                <label className={LABEL} htmlFor="reschedule-call-time">Nueva hora</label>
                <input
                  id="reschedule-call-time"
                  type="time"
                  className={INPUT}
                  value={rescheduleTime}
                  onChange={(e) => setRescheduleTime(e.target.value)}
                />
              </div>
            </div>

            <button
              type="button"
              onClick={confirmReschedule}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl
                         bg-indigo-600 px-4 py-3 text-sm font-semibold text-white
                         shadow-lg shadow-indigo-600/30 transition-all hover:bg-indigo-500
                         active:scale-95"
            >
              <Check size={16} aria-hidden="true" />
              Confirmar nueva fecha
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </BottomSheet>
  );
}
