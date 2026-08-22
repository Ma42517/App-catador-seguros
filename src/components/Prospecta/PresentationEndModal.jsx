import { useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, CalendarClock, Archive } from 'lucide-react';
import { PRESENTATION_END_GAMIFICATION } from '../../lib/presentationGamification';

/**
 * src/components/Prospecta/PresentationEndModal.jsx
 *
 * Formulario de resolución obligatorio al terminar una Cita Inicial
 * (`CitaInicialWizard.jsx`, botón "Terminar cita"). No es un simple
 * check de "completado": es el router de ventas que decide a dónde va el
 * prospecto después de esta cita — a "Nueva Actividad" pre-llenada con el
 * siguiente paso, o al archivo permanente si no califica.
 *
 * Bloquea la pantalla (overlay fijo, sin botón de cerrar aparte): la única
 * salida es elegir una de las 3 resoluciones, porque cada una decide qué
 * pasa con el prospecto y dejar la pantalla sin elegir dejaría el
 * expediente en un estado a medias.
 *
 * Se dibuja en un portal a `document.body`, igual que `BottomSheet.jsx` — y
 * por la misma razón, documentada ahí: este modal vive anidado dentro del
 * paso 7 de `CitaInicialWizard.jsx`, que trae su propio `.animate-rise`
 * (`animation-fill-mode: backwards`, sin transform al terminar, así que no
 * debería atrapar nada) pero también dentro de `ProspectaScreen.jsx`, cuyo
 * contenedor con transición de entrada (`translate-y-4`→`translate-y-0`)
 * SÍ conserva un `transform` mientras está abierto. Cualquier ancestro con
 * `transform`/`filter` distinto de `none` se vuelve el bloque contenedor de
 * los descendientes `position: fixed`: el overlay ya no cubría la pantalla
 * completa, sino sólo el recuadro de ese contenedor, y aparecía a media
 * altura sin blur visible fuera de esa franja — exactamente lo reportado
 * ("no cubrió toda la pantalla, sólo la parte de UDIs/Dólares, y hubo que
 * hacer scroll para encontrarlo"). Desde el portal, el `fixed inset-0` mide
 * contra la ventana real sin importar qué transform tenga cualquier
 * ancestro.
 *
 * Las 3 resoluciones no le hablan directamente a `EventContext` ni a
 * Supabase: cada una llama a la prop correspondiente (`onRouteToActivity`,
 * `onDiscardClient`) y es quien monta este modal el que decide cómo
 * ejecutarlo — mismo desacople que ya usa `CallFeedbackModal.jsx` con
 * `onEarnPoints`.
 *
 * No hay pregunta de referidos: pedirla aquí, de memoria y después de la
 * cita, no tiene ninguna certeza de que en verdad se solicitaron durante la
 * conversación — es un dato que se presta a inventarse para sumar puntos, y
 * ese es justo el fraude que el Reloj de Arena (`InitialMeetingCard.jsx`)
 * ya viene a evitar en otra parte del flujo. Los 3 puntos base de la
 * resolución no dependen de nada más que de haber cerrado el expediente.
 *
 * @param {boolean} isOpen
 * @param {{id?: string, name?: string, phone?: string}} client
 * @param {() => void} onClose
 * @param {(activityType: 'cita_propuesta'|'seguimiento', client: object) => void} onRouteToActivity
 * @param {(client: object) => void} onDiscardClient
 * @param {(amount: number) => void} onEarnPoints
 */
export default function PresentationEndModal({
  isOpen, client, onClose, onRouteToActivity, onDiscardClient, onEarnPoints,
}) {
  const clientName = client?.name || 'este prospecto';

  /*
    El tema no se hereda a través de un portal (ver la nota de
    `BottomSheet.jsx`): sin este ancla y sin volver a poner `.dark` a mano,
    el modal saldría en tema claro en medio de una app que en esta pantalla
    siempre está oscura.
  */
  const anchorRef = useRef(null);
  const [isDarkContext, setDarkContext] = useState(false);
  useLayoutEffect(() => {
    if (isOpen) setDarkContext(!!anchorRef.current?.closest('.dark'));
  }, [isOpen]);

  const resolve = (action) => {
    onEarnPoints?.(PRESENTATION_END_GAMIFICATION.RESOLUTION_BASE);
    action();
    onClose?.();
  };

  const handleAdvanceToProposal = () => resolve(() => onRouteToActivity?.('cita_propuesta', client));
  const handleNeedsFollowUp = () => resolve(() => onRouteToActivity?.('seguimiento', client));
  const handleNotQualified = () => resolve(() => onDiscardClient?.(client));

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
                aria-label="Cierre de la Cita Inicial"
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
                  <p className="text-[11px] font-bold uppercase tracking-widest text-indigo-400">
                    Cierre de Presentación
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
                      onClick={handleAdvanceToProposal}
                      className="flex w-full items-center justify-between gap-3 rounded-xl
                                 bg-indigo-600 px-4 py-3.5 text-left text-sm font-semibold
                                 text-white transition-colors hover:bg-indigo-500
                                 active:scale-[0.98]"
                    >
                      Avanzamos a Propuesta
                      <ArrowRight size={18} className="shrink-0" aria-hidden="true" />
                    </button>

                    <button
                      type="button"
                      onClick={handleNeedsFollowUp}
                      className="flex w-full items-center justify-between gap-3 rounded-xl
                                 border border-slate-700 bg-slate-800 px-4 py-3.5 text-left
                                 text-sm font-semibold text-slate-200 transition-colors
                                 hover:bg-slate-700 active:scale-[0.98]"
                    >
                      Requiere Seguimiento
                      <CalendarClock
                        size={18}
                        className="shrink-0 text-slate-400"
                        aria-hidden="true"
                      />
                    </button>

                    <button
                      type="button"
                      onClick={handleNotQualified}
                      className="flex w-full items-center justify-between gap-3 rounded-xl
                                 border border-slate-700 bg-slate-800 px-4 py-3.5 text-left
                                 text-sm font-semibold text-slate-400 transition-colors
                                 hover:bg-rose-500/10 hover:text-rose-300 active:scale-[0.98]"
                    >
                      No califica
                      <Archive size={18} className="shrink-0" aria-hidden="true" />
                    </button>
                  </div>
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
