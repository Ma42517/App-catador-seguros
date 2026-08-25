import { useState, useLayoutEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Handshake, FileSignature, PackageCheck, CalendarClock, Archive, ArrowRight, CheckCircle2,
} from 'lucide-react';
import { PRESENTATION_END_GAMIFICATION } from '../../lib/presentationGamification';
import {
  PIPELINE_STAGES, PIPELINE_RESOLUTIONS, resolvePipelineStage,
} from '../../store/pipelineStore';

/**
 * A qué puede saltar un Seguimiento, con el texto y el ícono de cada
 * destino. El orden sigue el avance natural del embudo, y "otro
 * Seguimiento" va al final porque es el desenlace de "sigue sin
 * concretarse" — el más frecuente, pero el que menos avanza.
 *
 * Los `value` son los mismos de `FOLLOW_UP_TARGETS` (`pipelineStore.js`);
 * ese arreglo es el que valida, esta lista sólo los presenta.
 */
const TARGETS = [
  {
    value: PIPELINE_STAGES.CITA_INICIAL,
    label: 'Agendar Cita Inicial',
    hint: 'Retomar desde el Análisis de Necesidades.',
    Icon: Handshake,
  },
  {
    value: PIPELINE_STAGES.PROPUESTA,
    label: 'Agendar Cita de Propuesta',
    hint: 'Ya vio el análisis, toca presentarle números.',
    Icon: FileSignature,
  },
  {
    value: PIPELINE_STAGES.CIERRE,
    label: 'Agendar Cita de Cierre',
    hint: 'Ya aceptó la propuesta, falta firmar.',
    Icon: FileSignature,
  },
  {
    value: PIPELINE_STAGES.ENTREGA,
    label: 'Agendar Entrega de Póliza',
    hint: 'La póliza ya está emitida y lista.',
    Icon: PackageCheck,
  },
  {
    value: PIPELINE_STAGES.SEGUIMIENTO,
    label: 'Otro Seguimiento',
    hint: 'Sigue sin concretarse; recuérdamelo después.',
    Icon: CalendarClock,
  },
];

/**
 * src/components/Activities/FollowUpResolutionModal.jsx
 *
 * Router de ventas del Seguimiento, disparado por el botón "Retomar" de
 * `FollowUpCard.jsx`.
 *
 * A diferencia de las demás etapas —que tienen un único destino cuando
 * avanzan, fijo en `ADVANCE_MAP` (`pipelineStore.js`)—, el Seguimiento es
 * el puente universal del embudo: ahí aterriza todo "pidió más tiempo",
 * venga de la etapa que venga, así que al retomarlo el prospecto puede
 * entrar a cualquier fase y no necesariamente a la que seguía cuando se
 * pausó. Alguien que pausó antes de la Propuesta puede volver pidiendo
 * directamente el cierre.
 *
 * Por eso este modal presenta una lista de destinos en vez de las 3
 * resoluciones de los otros routers: el destino elegido viaja como
 * `payload.targetStage` a `resolvePipelineStage`, que lo valida contra
 * `FOLLOW_UP_TARGETS` antes de devolverlo. "No califica" sigue siendo la
 * salida de archivo, igual que en el resto de las etapas.
 *
 * @param {boolean} isOpen
 * @param {{id?: string, name?: string, phone?: string}} client
 * @param {() => void} onClose
 * @param {(tipoActividad: string, client: object, extra?: object) => void} onRouteToActivity
 * @param {(client: object) => void} onDiscardClient
 * @param {(resultType: 'schedule'|'discard') => void} [onResolved]
 * @param {(amount: number) => void} onEarnPoints
 */
export default function FollowUpResolutionModal({
  isOpen, client, onClose, onRouteToActivity, onDiscardClient, onResolved, onComplete,
  onEarnPoints,
}) {
  const clientName = client?.name || 'este prospecto';

  const anchorRef = useRef(null);
  const [isDarkContext, setDarkContext] = useState(false);
  useLayoutEffect(() => {
    if (isOpen) setDarkContext(!!anchorRef.current?.closest('.dark'));
  }, [isOpen]);

  const resolve = (resolution, payload) => {
    const result = resolvePipelineStage(PIPELINE_STAGES.SEGUIMIENTO, resolution, payload);
    onEarnPoints?.(PRESENTATION_END_GAMIFICATION.RESOLUTION_BASE);
    onResolved?.(result.type);
    if (result.type === 'discard') {
      onDiscardClient?.(client);
    } else {
      onRouteToActivity?.(result.tipoActividad, client, {
        reason: `Retomado desde un Seguimiento de ${clientName}`,
      });
    }
    onClose?.();
  };

  /*
    "Quedó resuelto" no pasa por `resolvePipelineStage`: no hay etapa
    siguiente que calcular ni prospecto que archivar, sólo se cierra la
    tarea. Tampoco paga puntos de resolución —no se movió el embudo— pero sí
    completa la tarjeta, que es lo que la saca de "Hoy".
  */
  const onResolveWithoutNextStep = () => {
    onComplete?.();
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
                aria-label="Retomar seguimiento"
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
                    Retomar Seguimiento
                  </p>
                  <h2 className="mt-1.5 text-lg font-bold leading-snug text-white">
                    ¿En qué etapa retomas a {clientName}?
                  </h2>
                  <p className="mt-1 text-xs leading-relaxed text-slate-400">
                    Elige a dónde entra ahora. El seguimiento se cierra al decidirlo.
                  </p>

                  <div className="mt-5 flex flex-col gap-2.5">
                    {TARGETS.map(({ value, label, hint, Icon }, index) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => resolve(PIPELINE_RESOLUTIONS.ADVANCE, { targetStage: value })}
                        className={`flex w-full items-center justify-between gap-3 rounded-xl
                                    px-4 py-3 text-left text-sm font-semibold transition-colors
                                    active:scale-[0.98] ${index === 0
                            ? 'bg-indigo-600 text-white hover:bg-indigo-500'
                            : 'border border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700'}`}
                      >
                        <span>
                          {label}
                          <span className={`mt-0.5 block text-[11px] font-normal ${index === 0
                            ? 'text-indigo-200' : 'text-slate-500'}`}
                          >
                            {hint}
                          </span>
                        </span>
                        <Icon
                          size={18}
                          className={`shrink-0 ${index === 0 ? '' : 'text-slate-400'}`}
                          aria-hidden="true"
                        />
                      </button>
                    ))}

                    {/*
                      Cerrar sin siguiente etapa: el seguimiento se resolvió
                      solo (contestó una duda, ya no hacía falta nada más).
                      Es un desenlace legítimo, pero antes era el
                      comportamiento del botón de check de la tarjeta, que
                      cerraba en silencio sin dejar constancia de que no
                      hubo siguiente paso. Aquí, al menos, es una elección
                      deliberada entre las demás.
                    */}
                    <button
                      type="button"
                      onClick={onResolveWithoutNextStep}
                      className="flex w-full items-center justify-between gap-3 rounded-xl
                                 border border-slate-700 bg-slate-800 px-4 py-3 text-left
                                 text-sm font-semibold text-slate-300 transition-colors
                                 hover:bg-emerald-500/10 hover:text-emerald-300
                                 active:scale-[0.98]"
                    >
                      <span>
                        Quedó resuelto
                        <span className="mt-0.5 block text-[11px] font-normal text-slate-500">
                          Se cierra sin agendar nada más.
                        </span>
                      </span>
                      <CheckCircle2 size={18} className="shrink-0" aria-hidden="true" />
                    </button>

                    <button
                      type="button"
                      onClick={() => resolve(PIPELINE_RESOLUTIONS.DISQUALIFY)}
                      className="flex w-full items-center justify-between gap-3 rounded-xl
                                 border border-slate-700 bg-slate-800 px-4 py-3 text-left
                                 text-sm font-semibold text-slate-400 transition-colors
                                 hover:bg-rose-500/10 hover:text-rose-300 active:scale-[0.98]"
                    >
                      No califica
                      <Archive size={18} className="shrink-0" aria-hidden="true" />
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={onClose}
                    className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl
                               px-4 py-2.5 text-xs font-semibold text-slate-500
                               transition-colors hover:text-slate-300"
                  >
                    Seguir esperando
                    <ArrowRight size={13} className="shrink-0" aria-hidden="true" />
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
