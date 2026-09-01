import { useState, useLayoutEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, CalendarClock, Archive, Check, Sparkles } from 'lucide-react';
import { GAMIFICATION_ACTIONS } from '../../store/gamificationStore';

const INPUT =
  'w-full rounded-xl border border-slate-700 bg-slate-950/60 px-3 py-2.5 text-sm text-slate-100 '
  + 'placeholder:text-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-2 '
  + 'focus:ring-indigo-500';

/**
 * src/components/Activities/ProposalResolutionModal.jsx
 *
 * Router de ventas de "Cita de Propuesta", disparado por el botón
 * "Iniciar" de `ProposalCard.jsx`. Mismo espíritu que
 * `StageResolutionModal.jsx`/`PresentationEndModal.jsx` (bloquea la
 * pantalla, sin botón de cerrar aparte, un solo paso extra opcional antes
 * de confirmar) pero con 3 resoluciones propias de esta etapa:
 *
 *  - "Emitir Póliza": no pide ningún dato adicional — dispara de inmediato
 *    la creación del `Recordatorio de Emisión` (`onIssuePolicy`, que
 *    `ProposalCard.jsx` resuelve creando el evento directo, sin pasar por
 *    `ActivityForm.jsx`: ese tipo de actividad es un estado interno del
 *    sistema, nunca aparece en el catálogo de "Nueva Actividad").
 *  - "Pidió Ajustes": abre un paso con un textarea de notas opcional
 *    ("Anotar después" lo salta sin perder la resolución) y termina en un
 *    `Seguimiento` con esas notas como motivo — mismo router genérico
 *    `onRouteToActivity` que ya usan `PresentationEndModal.jsx`/
 *    `StageResolutionModal.jsx` para este mismo tipo de actividad.
 *  - "No le interesó": archiva al prospecto, mismo criterio que "No
 *    califica" en las otras dos etapas.
 *
 * Además de las 3 resoluciones, un cuarto botón —"Llenar Cuestionario"—
 * no resuelve nada: abre `UnderwritingDrawer.jsx` (`onOpenRequirements`,
 * el mismo Asistente ámbar de la propia tarjeta) sin cerrar este modal ni
 * pagar puntos, para quien llega directo al router de ventas y quiere
 * capturar el expediente médico antes de decidir cómo sigue la Cita de
 * Propuesta.
 *
 * Ninguna de las 3 resoluciones habla directo con `EventContext` ni con
 * `data/prospectStatus.js`: cada una llama a la prop correspondiente y es
 * quien monta este modal (`ProposalCard.jsx`) el que decide cómo
 * ejecutarla — mismo desacople ya documentado en los otros dos modales de
 * router.
 *
 * @param {boolean} isOpen
 * @param {{id?: string, name?: string, phone?: string}} client
 * @param {() => void} onClose
 * @param {(client: object) => void} onIssuePolicy
 * @param {() => void} [onOpenRequirements] Abre el cuestionario de requisitos; no cierra el modal ni cuenta como resolución.
 * @param {(activityType: 'seguimiento', client: object, extra?: {reason?: string}) => void} onRouteToActivity
 * @param {(client: object) => void} onDiscardClient
 */
export default function ProposalResolutionModal({
  isOpen, client, onClose, onIssuePolicy, onOpenRequirements, onRouteToActivity, onDiscardClient,
}) {
  const clientName = client?.name || 'este prospecto';

  /*
    Sólo aparece al tocar "Pidió Ajustes": un segundo paso dentro del mismo
    modal, no una pantalla aparte, para no perder el contexto de a quién
    se le está anotando el ajuste.
  */
  const [takingNotes, setTakingNotes] = useState(false);
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const anchorRef = useRef(null);
  const [isDarkContext, setDarkContext] = useState(false);
  useLayoutEffect(() => {
    if (isOpen) setDarkContext(!!anchorRef.current?.closest('.dark'));
  }, [isOpen]);

  const reset = () => {
    setTakingNotes(false);
    setNotes('');
    setIsSubmitting(false);
  };

  const runDirect = async (action) => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      await action();
      reset();
      onClose?.();
    } catch {
      setIsSubmitting(false);
    }
  };

  const handleIssuePolicy = () => runDirect(() => onIssuePolicy?.(client));

  const routeToFollowUp = (reason) => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    onRouteToActivity?.('seguimiento', client, {
      reason,
      resolvingEventId: client?.id,
      resolveMode: 'complete',
      awardAction: GAMIFICATION_ACTIONS.CITA_PROPUESTA_REALIZADA,
    });
    reset();
    onClose?.();
  };

  const handleConfirmAdjustments = (e) => {
    e.preventDefault();
    routeToFollowUp(notes.trim() || 'Pidió ajustes a su Cita de Propuesta');
  };

  const handleSkipNotes = () => routeToFollowUp('Pidió ajustes a su Cita de Propuesta');

  const handleNotInterested = () => runDirect(() => onDiscardClient?.(client));

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
                aria-label="Cierre de la Cita de Propuesta"
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
                  {takingNotes ? (
                    <form onSubmit={handleConfirmAdjustments}>
                      <p className="text-[11px] font-bold uppercase tracking-widest text-indigo-400">
                        Ajustes a la Propuesta
                      </p>
                      <h2 className="mt-1.5 text-lg font-bold leading-snug text-white">
                        ¿Qué le pidió {clientName}?
                      </h2>
                      <p className="mt-1 text-xs leading-relaxed text-slate-400">
                        Anótalo para no perder el detalle cuando le des seguimiento. Es opcional.
                      </p>

                      <textarea
                        autoFocus
                        rows={3}
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Ej. Bajar la prima, ajustar la suma asegurada..."
                        className={`${INPUT} mt-4 resize-none`}
                      />

                      <button
                        type="submit"
                        disabled={isSubmitting}
                        className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl
                                   bg-indigo-600 px-4 py-3 text-sm font-semibold text-white
                                   transition-colors hover:bg-indigo-500 active:scale-[0.98]"
                      >
                        <Check size={16} aria-hidden="true" />
                        Guardar y continuar
                      </button>

                      <button
                        type="button"
                        disabled={isSubmitting}
                        onClick={handleSkipNotes}
                        className="mt-2 w-full rounded-xl px-4 py-2.5 text-xs font-semibold
                                   text-slate-500 transition-colors hover:text-slate-300"
                      >
                        Anotar después
                      </button>

                      <button
                        type="button"
                        disabled={isSubmitting}
                        onClick={() => setTakingNotes(false)}
                        className="mt-1 w-full rounded-xl px-4 py-2 text-xs font-semibold
                                   text-slate-600 transition-colors hover:text-slate-400"
                      >
                        Volver
                      </button>
                    </form>
                  ) : (
                    <>
                      <p className="text-[11px] font-bold uppercase tracking-widest text-indigo-400">
                        Cierre de Propuesta
                      </p>
                      <h2 className="mt-1.5 text-lg font-bold leading-snug text-white">
                        ¿Qué sigue con {clientName}?
                      </h2>
                      <p className="mt-1 text-xs leading-relaxed text-slate-400">
                        Elige una resolución para continuar. La cita no se cierra sin decidir esto.
                      </p>

                      <div className="mt-5 flex flex-col gap-2.5">
                        <button
                          type="button"
                          disabled={isSubmitting}
                          onClick={handleIssuePolicy}
                          className="flex w-full items-center justify-between gap-3 rounded-xl
                                     bg-indigo-600 px-4 py-3.5 text-left text-sm font-semibold
                                     text-white transition-colors hover:bg-indigo-500
                                     active:scale-[0.98]"
                        >
                          <span>
                            Emitir Póliza
                            <span className="mt-0.5 block text-[11px] font-normal text-indigo-200">
                              Crea el Recordatorio de Emisión de inmediato.
                            </span>
                          </span>
                          <ArrowRight size={18} className="shrink-0" aria-hidden="true" />
                        </button>

                        <button
                          type="button"
                          disabled={isSubmitting}
                          onClick={() => setTakingNotes(true)}
                          className="flex w-full items-center justify-between gap-3 rounded-xl
                                     border border-slate-700 bg-slate-800 px-4 py-3.5 text-left
                                     text-sm font-semibold text-slate-200 transition-colors
                                     hover:bg-slate-700 active:scale-[0.98]"
                        >
                          Pidió Ajustes
                          <CalendarClock
                            size={18}
                            className="shrink-0 text-slate-400"
                            aria-hidden="true"
                          />
                        </button>

                        <button
                          type="button"
                          disabled={isSubmitting}
                          onClick={handleNotInterested}
                          className="flex w-full items-center justify-between gap-3 rounded-xl
                                     border border-slate-700 bg-slate-800 px-4 py-3.5 text-left
                                     text-sm font-semibold text-slate-400 transition-colors
                                     hover:bg-rose-500/10 hover:text-rose-300 active:scale-[0.98]"
                        >
                          No le interesó
                          <Archive size={18} className="shrink-0" aria-hidden="true" />
                        </button>
                      </div>

                      {/*
                        No es una cuarta resolución: no cierra el modal ni
                        paga puntos, sólo abre el mismo Asistente ámbar de
                        la tarjeta (`UnderwritingDrawer.jsx`) para quien
                        quiere capturar el expediente médico antes de
                        decidir. Separado con su propio borde para no
                        leerse como una opción más entre las 3 de arriba.
                      */}
                      {onOpenRequirements && (
                        <button
                          type="button"
                          disabled={isSubmitting}
                          onClick={onOpenRequirements}
                          className="mt-2.5 flex w-full items-center justify-center gap-2
                                     rounded-xl border border-dashed border-amber-500/30 px-4 py-3
                                     text-xs font-semibold text-amber-400 transition-colors
                                     hover:bg-amber-500/10 active:scale-[0.98]"
                        >
                          <Sparkles size={15} className="shrink-0" aria-hidden="true" />
                          Llenar Cuestionario
                        </button>
                      )}
                    </>
                  )}
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
