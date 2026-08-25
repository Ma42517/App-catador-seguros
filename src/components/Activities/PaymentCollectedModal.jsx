import { useState, useLayoutEffect, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, CalendarClock } from 'lucide-react';
import {
  PAYMENT_FREQUENCIES, DEFAULT_PAYMENT_FREQUENCY, nextPaymentDate, formatPaymentDate, todayKey,
} from '../../lib/paymentSchedule';

const INPUT =
  'w-full rounded-xl border border-slate-700 bg-slate-950/60 px-3 py-2.5 text-sm text-slate-100 '
  + '[color-scheme:dark] focus:border-indigo-500 focus:outline-none focus:ring-2 '
  + 'focus:ring-indigo-500';

const LABEL = 'mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-slate-500';

/**
 * src/components/Activities/PaymentCollectedModal.jsx
 *
 * Paso de confirmación del botón "Cobrado" de
 * `PaymentCollectionCard.jsx`. Antes ese botón sólo cerraba la tarea, y
 * con eso la póliza desaparecía de la agenda para siempre: una póliza de
 * prima mensual quedaba sin nadie recordando los once cobros restantes del
 * año. Aquí se captura lo mínimo para que la app siga recordándolos sola:
 *
 *  1. Cuándo se cobró (por omisión hoy, editable — un cobro se registra a
 *     veces días después de haber entrado).
 *  2. Cada cuánto se cobra (`PAYMENT_FREQUENCIES`, con "Pago único" como
 *     opción explícita para las pólizas que no se repiten).
 *  3. La próxima fecha, calculada sola a partir de las dos anteriores pero
 *     editable: la fecha real de cargo puede no caer exactamente al mes,
 *     y forzar el cálculo obligaría a reagendar la tarjeta después.
 *
 * El recordatorio siguiente lo crea quien monta este modal
 * (`onConfirm`), no este componente: aquí sólo se recogen los tres datos
 * — mismo desacople de `EventContext` que ya usan los demás modales de
 * este flujo.
 *
 * @param {boolean} isOpen
 * @param {string} clientName
 * @param {string} [amount] Monto ya formateado, si la póliza lo trae; sólo se muestra.
 * @param {string} [initialFrequency] Frecuencia ya conocida de esta póliza, para no volver a elegirla en cada cobro.
 * @param {() => void} onClose
 * @param {(data: {collectedOn: string, frequency: string, nextDate: string}) => void} onConfirm
 */
export default function PaymentCollectedModal({
  isOpen, clientName, amount, initialFrequency, onClose, onConfirm,
}) {
  const [collectedOn, setCollectedOn] = useState('');
  const [frequency, setFrequency] = useState(DEFAULT_PAYMENT_FREQUENCY);
  const [nextDate, setNextDate] = useState('');
  /*
    Si la persona ya movió la fecha siguiente a mano, dejar de recalcularla
    por su cuenta: sin esta marca, cambiar la frecuencia o la fecha de
    cobro le pisaría encima la fecha que acaba de escribir.
  */
  const [nextDateTouched, setNextDateTouched] = useState(false);

  const anchorRef = useRef(null);
  const [isDarkContext, setDarkContext] = useState(false);
  useLayoutEffect(() => {
    if (isOpen) setDarkContext(!!anchorRef.current?.closest('.dark'));
  }, [isOpen]);

  // Arranca en limpio en cada apertura. La frecuencia respeta la que ya
  // tenía esta póliza (`initialFrequency`): en el segundo cobro y los
  // siguientes ya no hay que volver a elegirla.
  useEffect(() => {
    if (!isOpen) return;
    setCollectedOn(todayKey());
    setFrequency(initialFrequency || DEFAULT_PAYMENT_FREQUENCY);
    setNextDateTouched(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // La próxima fecha se recalcula mientras nadie la haya escrito a mano.
  useEffect(() => {
    if (nextDateTouched) return;
    setNextDate(nextPaymentDate(collectedOn, frequency));
  }, [collectedOn, frequency, nextDateTouched]);

  const isRecurring = frequency !== 'unico';
  const canConfirm = Boolean(collectedOn) && (!isRecurring || Boolean(nextDate));

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!canConfirm) return;
    onConfirm?.({
      collectedOn,
      frequency,
      nextDate: isRecurring ? nextDate : '',
    });
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
                aria-label="Registrar cobro"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="fixed inset-0 z-[90] flex items-center justify-center bg-black/70
                           p-4 backdrop-blur-sm"
              >
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
                  <form onSubmit={handleSubmit}>
                    <p className="text-[11px] font-bold uppercase tracking-widest text-emerald-400">
                      Cobro registrado
                    </p>
                    <h2 className="mt-1.5 text-lg font-bold leading-snug text-white">
                      {clientName || 'Este cliente'}
                      {amount && <span className="text-emerald-400"> · {amount}</span>}
                    </h2>
                    <p className="mt-1 text-xs leading-relaxed text-slate-400">
                      Con esto la app te recuerda sola el siguiente cobro de esta póliza.
                    </p>

                    <div className="mt-4">
                      <label className={LABEL} htmlFor="collected-on">¿Cuándo se cobró?</label>
                      <input
                        id="collected-on"
                        type="date"
                        required
                        value={collectedOn}
                        onChange={(e) => setCollectedOn(e.target.value)}
                        className={INPUT}
                      />
                    </div>

                    <div className="mt-3">
                      <label className={LABEL} htmlFor="payment-frequency">
                        ¿Cada cuándo se cobra?
                      </label>
                      <select
                        id="payment-frequency"
                        value={frequency}
                        onChange={(e) => { setFrequency(e.target.value); setNextDateTouched(false); }}
                        className={INPUT}
                      >
                        {PAYMENT_FREQUENCIES.map((option) => (
                          <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                      </select>
                    </div>

                    {/*
                      El pago único no tiene fecha siguiente que pedir: se
                      deja de dibujar el campo por completo, en vez de
                      mostrarlo deshabilitado — un campo que no aplica pero
                      sigue ahí invita a preguntarse qué le falta.
                    */}
                    {isRecurring && (
                      <div className="mt-3">
                        <label className={LABEL} htmlFor="next-payment-date">
                          Próximo cobro
                        </label>
                        <input
                          id="next-payment-date"
                          type="date"
                          required
                          value={nextDate}
                          onChange={(e) => { setNextDate(e.target.value); setNextDateTouched(true); }}
                          className={INPUT}
                        />
                        {nextDate && (
                          <p className="mt-1.5 flex items-center gap-1.5 text-[11px] text-slate-500">
                            <CalendarClock size={12} className="shrink-0" aria-hidden="true" />
                            Se agenda para el {formatPaymentDate(nextDate)}
                          </p>
                        )}
                      </div>
                    )}

                    {!isRecurring && (
                      <p className="mt-3 rounded-xl border border-slate-800 bg-slate-950/60 p-3
                                    text-[11px] leading-relaxed text-slate-400"
                      >
                        Al ser pago único, esta póliza no genera más recordatorios de cobro.
                      </p>
                    )}

                    <button
                      type="submit"
                      disabled={!canConfirm}
                      className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl
                                 bg-emerald-600 px-4 py-3 text-sm font-semibold text-white
                                 transition-colors hover:bg-emerald-500 active:scale-[0.98]
                                 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <Check size={16} aria-hidden="true" />
                      {isRecurring ? 'Confirmar y agendar el siguiente' : 'Confirmar cobro'}
                    </button>

                    <button
                      type="button"
                      onClick={onClose}
                      className="mt-2 w-full rounded-xl px-4 py-2.5 text-xs font-semibold
                                 text-slate-500 transition-colors hover:text-slate-300"
                    >
                      Cancelar
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
