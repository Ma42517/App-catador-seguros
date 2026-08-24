import { useState, useLayoutEffect, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, Phone } from 'lucide-react';

const INPUT =
  'w-full rounded-xl border border-slate-700 bg-slate-950/60 px-3 py-2.5 text-sm text-slate-100 '
  + '[color-scheme:dark] focus:border-indigo-500 focus:outline-none focus:ring-2 '
  + 'focus:ring-indigo-500';

/** Fecha y hora de hoy, como respaldo inicial de los inputs — la persona puede cambiarlas. */
function todayParts() {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return {
    date: `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`,
    time: `${pad(now.getHours())}:${pad(now.getMinutes())}`,
  };
}

/**
 * src/components/Activities/ScheduleClosingModal.jsx
 *
 * Intercepción de comunicación de `IssuanceReminderCard.jsx`: tocar
 * WhatsApp o Llamada en el Recordatorio de Emisión no dispara la acción de
 * una vez — primero pregunta cuándo se va a ver al cliente para la
 * entrega, porque ese es justo el dato que hace falta agendar antes de
 * escribirle o llamarle. `actionType` ('whatsapp'|'call') sólo decide el
 * texto y el ícono del botón final; la ejecución de las 3 cosas
 * simultáneas (abrir el `href`, completar el Recordatorio, crear la Cita
 * de Cierre) es responsabilidad de quien monta este modal
 * (`onSubmit(date, time)`) — este componente es puramente de captura de
 * fecha/hora, no conoce `EventContext` ni construye ningún enlace.
 *
 * Se dibuja en un portal a `document.body`, misma razón ya documentada en
 * `StageResolutionModal.jsx`/`PresentationEndModal.jsx`: cualquier
 * ancestro con `transform` (la lista de "Hoy") se vuelve el marco de
 * referencia de un `position: fixed`.
 *
 * @param {boolean} isOpen
 * @param {'whatsapp'|'call'} actionType
 * @param {string} clientName
 * @param {() => void} onClose
 * @param {(date: string, time: string) => void} onSubmit
 */
export default function ScheduleClosingModal({
  isOpen, actionType, clientName, onClose, onSubmit,
}) {
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');

  const anchorRef = useRef(null);
  const [isDarkContext, setDarkContext] = useState(false);
  useLayoutEffect(() => {
    if (isOpen) setDarkContext(!!anchorRef.current?.closest('.dark'));
  }, [isOpen]);

  // Arranca en limpio cada vez que se abre, con la fecha/hora de hoy como
  // respaldo si la persona no toca los campos.
  useEffect(() => {
    if (!isOpen) return;
    const parts = todayParts();
    setDate(parts.date);
    setTime(parts.time);
  }, [isOpen]);

  const isCall = actionType === 'call';
  const SubmitIcon = isCall ? Phone : MessageCircle;
  const submitLabel = isCall ? 'Llamar' : 'Enviar WhatsApp';

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit?.(date, time);
    onClose?.();
  };

  const anchor = <span ref={anchorRef} className="hidden" aria-hidden="true" />;

  return (
    <>
      {anchor}
      {createPortal(
        <div className={isDarkContext ? 'dark' : undefined}>
          <AnimatePresence>
            {isOpen && (
              <motion.div
                role="dialog"
                aria-modal="true"
                aria-label="Agendar entrega de póliza"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="fixed inset-0 z-[90] flex items-center justify-center bg-black/70
                           p-4 backdrop-blur-sm"
              >
                <motion.div
                  initial={{ opacity: 0, y: 16, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 16, scale: 0.97 }}
                  transition={{ duration: 0.25, ease: 'easeOut' }}
                  className="w-full max-w-sm rounded-3xl border border-slate-800 bg-slate-900
                             p-6 shadow-2xl shadow-black/50"
                >
                  <form onSubmit={handleSubmit}>
                    <p className="text-[11px] font-bold uppercase tracking-widest text-indigo-400">
                      Agendar Entrega
                    </p>
                    <h2 className="mt-1.5 text-lg font-bold leading-snug text-white">
                      ¿Qué fecha y a qué hora quisieras ver a {clientName || 'tu cliente'}
                      {' '}
                      para la entrega?
                    </h2>

                    <div className="mt-4 grid grid-cols-2 gap-3">
                      <div>
                        <label
                          className="mb-1.5 block text-[11px] font-semibold uppercase
                                     tracking-wider text-slate-500"
                          htmlFor="closing-date"
                        >
                          Fecha
                        </label>
                        <input
                          id="closing-date"
                          type="date"
                          required
                          value={date}
                          onChange={(e) => setDate(e.target.value)}
                          className={INPUT}
                        />
                      </div>
                      <div>
                        <label
                          className="mb-1.5 block text-[11px] font-semibold uppercase
                                     tracking-wider text-slate-500"
                          htmlFor="closing-time"
                        >
                          Hora
                        </label>
                        <input
                          id="closing-time"
                          type="time"
                          required
                          value={time}
                          onChange={(e) => setTime(e.target.value)}
                          className={INPUT}
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl
                                 bg-indigo-600 px-4 py-3 text-sm font-semibold text-white
                                 transition-colors hover:bg-indigo-500 active:scale-[0.98]"
                    >
                      <SubmitIcon size={16} aria-hidden="true" />
                      {submitLabel}
                    </button>
                  </form>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>,
        document.body,
      )}
    </>
  );
}
