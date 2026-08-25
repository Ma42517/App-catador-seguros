import { useState, useLayoutEffect, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import WhatsAppMark from './WhatsAppMark';

const INPUT =
  'w-full rounded-xl border border-slate-700 bg-slate-950/60 px-3 py-2.5 text-sm text-slate-100 '
  + '[color-scheme:dark] focus:border-indigo-500 focus:outline-none focus:ring-2 '
  + 'focus:ring-indigo-500';

const LABEL = 'mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-slate-500';

/** Fecha y hora de hoy, como punto de partida de los campos. */
function todayParts() {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return {
    date: `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`,
    time: `${pad(now.getHours())}:${pad(now.getMinutes())}`,
  };
}

/**
 * Un horario en palabras: "martes 25 de agosto a las 10:00".
 *
 * La fecha se descompone a mano en lugar de pasar el texto a `new Date()`:
 * `new Date('2026-08-25')` se interpreta como UTC y en México adelantaría
 * el día, mostrando una fecha distinta a la que el asesor eligió — misma
 * precaución ya documentada en `eventStatus.js`.
 */
function formatSlot(date, time) {
  const parts = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(date ?? ''));
  if (!parts || !time) return '';
  const local = new Date(Number(parts[1]), Number(parts[2]) - 1, Number(parts[3]));
  const label = local.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' });
  return `${label} a las ${time}`;
}

/**
 * src/components/Activities/PolicyDeliveryWhatsAppModal.jsx
 *
 * Paso intermedio del botón de WhatsApp de `PolicyDeliveryCard.jsx`: antes
 * de salir a la app, pide dos horarios para proponerle al cliente y los
 * arma dentro del mensaje. Ofrecer dos opciones concretas —en vez de un
 * "¿cuándo te queda bien?" abierto— es lo que convierte el mensaje en algo
 * que se contesta con una palabra.
 *
 * El botón final es un `<a target="_blank">` de verdad y no un
 * `window.open` disparado desde un `<button>`: en computadora los
 * navegadores bloquean en silencio un `window.open` que no venga de un
 * enlace real —el botón parecía "no hacer nada"—, aunque en celular casi
 * siempre lo dejaban pasar. Misma lección ya documentada en
 * `CallActivityCard.jsx`/`InitialMeetingCard.jsx`.
 *
 * Este modal no completa ni borra nada: la tarea de "Entrega de Póliza"
 * sigue viva en la agenda después de enviar el mensaje, porque mandar la
 * propuesta de horarios no es haber entregado la póliza — eso sólo lo
 * marca el botón "Entregada" de la propia tarjeta.
 *
 * @param {boolean} isOpen
 * @param {string} clientName
 * @param {string} phone Sólo dígitos, tal como lo deja `digits()`.
 * @param {() => void} onClose
 */
export default function PolicyDeliveryWhatsAppModal({ isOpen, clientName, phone, onClose }) {
  const [firstDate, setFirstDate] = useState('');
  const [firstTime, setFirstTime] = useState('');
  const [secondDate, setSecondDate] = useState('');
  const [secondTime, setSecondTime] = useState('');

  const anchorRef = useRef(null);
  const [isDarkContext, setDarkContext] = useState(false);
  useLayoutEffect(() => {
    if (isOpen) setDarkContext(!!anchorRef.current?.closest('.dark'));
  }, [isOpen]);

  // Arranca en limpio en cada apertura, con la fecha de hoy en los dos
  // campos de fecha: lo más común es proponer dos horas del mismo día.
  useEffect(() => {
    if (!isOpen) return;
    const parts = todayParts();
    setFirstDate(parts.date);
    setFirstTime('');
    setSecondDate(parts.date);
    setSecondTime('');
  }, [isOpen]);

  const firstSlot = formatSlot(firstDate, firstTime);
  const secondSlot = formatSlot(secondDate, secondTime);
  const isComplete = Boolean(firstSlot && secondSlot);

  const message = `Hola ${clientName || 'tu cliente'}, ya tengo lista tu póliza y me gustaría `
    + 'entregártela en persona para revisarla juntos. Te propongo dos horarios: '
    + `${firstSlot} o ${secondSlot}. ¿Cuál te acomoda mejor?`;

  const href = isComplete && phone
    ? `https://wa.me/${phone.replace(/^\+/, '')}?text=${encodeURIComponent(message)}`
    : undefined;

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
                aria-label="Proponer horarios de entrega"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="fixed inset-0 z-[90] flex items-center justify-center bg-black/70
                           p-4 backdrop-blur-sm"
              >
                {/* El fondo cierra: este paso es opcional, no una resolución obligatoria. */}
                <button
                  type="button"
                  aria-label="Cerrar"
                  onClick={onClose}
                  className="absolute inset-0 h-full w-full cursor-default"
                />

                <motion.div
                  initial={{ opacity: 0, y: 16, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 16, scale: 0.97 }}
                  transition={{ duration: 0.25, ease: 'easeOut' }}
                  className="relative w-full max-w-sm rounded-3xl border border-slate-800
                             bg-slate-900 p-6 shadow-2xl shadow-black/50"
                >
                  <p className="text-[11px] font-bold uppercase tracking-widest text-indigo-400">
                    Entrega de Póliza
                  </p>
                  <h2 className="mt-1.5 text-lg font-bold leading-snug text-white">
                    Propón dos horarios
                  </h2>
                  <p className="mt-1 text-xs leading-relaxed text-slate-400">
                    Van dentro del mensaje para que sólo tenga que elegir uno.
                  </p>

                  <div className="mt-4">
                    <span className={LABEL}>Primera opción</span>
                    <div className="grid grid-cols-2 gap-3">
                      <input
                        type="date"
                        aria-label="Fecha de la primera opción"
                        value={firstDate}
                        onChange={(e) => setFirstDate(e.target.value)}
                        className={INPUT}
                      />
                      <input
                        type="time"
                        aria-label="Hora de la primera opción"
                        value={firstTime}
                        onChange={(e) => setFirstTime(e.target.value)}
                        className={INPUT}
                      />
                    </div>
                  </div>

                  <div className="mt-3">
                    <span className={LABEL}>Segunda opción</span>
                    <div className="grid grid-cols-2 gap-3">
                      <input
                        type="date"
                        aria-label="Fecha de la segunda opción"
                        value={secondDate}
                        onChange={(e) => setSecondDate(e.target.value)}
                        className={INPUT}
                      />
                      <input
                        type="time"
                        aria-label="Hora de la segunda opción"
                        value={secondTime}
                        onChange={(e) => setSecondTime(e.target.value)}
                        className={INPUT}
                      />
                    </div>
                  </div>

                  {/*
                    Vista previa del mensaje: el asesor está a punto de
                    mandarlo a un cliente real, así que puede leerlo antes
                    de salir a WhatsApp en vez de descubrir cómo quedó ya
                    dentro de la conversación.
                  */}
                  {isComplete && (
                    <p className="mt-4 rounded-xl border border-slate-800 bg-slate-950/60 p-3
                                  text-[11px] leading-relaxed text-slate-400"
                    >
                      {message}
                    </p>
                  )}

                  <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-disabled={!isComplete}
                    onClick={(e) => {
                      if (!isComplete) { e.preventDefault(); return; }
                      onClose?.();
                    }}
                    className={`mt-5 flex w-full items-center justify-center gap-2 rounded-xl
                                px-4 py-3 text-sm font-semibold transition-colors
                                ${isComplete
                        ? 'bg-emerald-600 text-white hover:bg-emerald-500 active:scale-[0.98]'
                        : 'cursor-not-allowed bg-emerald-600/30 text-white/50'}`}
                  >
                    <WhatsAppMark size={16} />
                    Enviar ahora
                  </a>

                  <button
                    type="button"
                    onClick={onClose}
                    className="mt-2 w-full rounded-xl px-4 py-2.5 text-xs font-semibold
                               text-slate-500 transition-colors hover:text-slate-300"
                  >
                    Cancelar
                  </button>
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
