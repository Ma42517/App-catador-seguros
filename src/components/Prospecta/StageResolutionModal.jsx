import {
  useLayoutEffect, useRef, useState,
} from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowRight, CalendarClock, Archive, Check,
} from 'lucide-react';
import { PRESENTATION_END_GAMIFICATION } from '../../lib/presentationGamification';
import {
  PIPELINE_STAGES, PIPELINE_RESOLUTIONS, resolvePipelineStage,
} from '../../store/pipelineStore';

const INPUT =
  'w-full rounded-xl border border-slate-700 bg-slate-950/60 px-3 py-2.5 text-sm text-slate-100 '
  + 'placeholder:text-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-2 '
  + 'focus:ring-indigo-500';

/** Texto por etapa: qué se pregunta y cómo se llama cada resolución. */
const STAGE_COPY = {
  /*
    La "Cita" genérica del catálogo: el primer contacto informal que
    todavía no es un Análisis de Necesidades. Avanzar la convierte en Cita
    Inicial, que es la primera etapa formal del embudo — hasta que existió
    `AppointmentCard.jsx` esa transición estaba escrita en el motor
    (`ADVANCE_MAP`) pero ninguna pantalla la disparaba nunca.
  */
  [PIPELINE_STAGES.CITA]: {
    eyebrow: 'Cierre de la Cita',
    stageName: 'Cita',
    advanceLabel: 'Avanza a Cita Inicial',
    advanceHint: 'Agenda el Análisis de Necesidades formal.',
  },
  [PIPELINE_STAGES.PROPUESTA]: {
    eyebrow: 'Cierre de Propuesta',
    stageName: 'Cita de Propuesta',
    advanceLabel: 'Cierre Exitoso',
    advanceHint: 'Crea la Cita de Cierre con la Prima Anual ya validada.',
  },
  [PIPELINE_STAGES.CIERRE]: {
    eyebrow: 'Cierre de la Cita de Cierre',
    stageName: 'Cita de Cierre',
    advanceLabel: 'Entregada',
    advanceHint: 'Crea el Recordatorio de Cobro de la primera prima.',
  },
};

/**
 * src/components/Prospecta/StageResolutionModal.jsx
 *
 * Router de ventas de las etapas posteriores a la Cita Inicial —Propuesta y
 * Cierre—, mismo espíritu que `PresentationEndModal.jsx` (bloquea la
 * pantalla, sin botón de cerrar aparte, resuelve la etapa contra
 * `resolvePipelineStage` del "Motor de Embudo" en `store/pipelineStore.js`)
 * pero generalizado a dos etapas más y con el paso extra que sólo aplica a
 * Propuesta: "Cierre Exitoso" exige validar la Prima Anual antes de poder
 * confirmar, porque es el dato que de verdad importa dejar por escrito antes
 * de agendar el Cierre.
 *
 * Las 3 resoluciones son siempre las mismas —Avanza / Pide más tiempo / No
 * califica—, y el "Efecto Dominó" (a qué tipo de actividad se agenda
 * después, o si el prospecto se archiva) lo decide `resolvePipelineStage`,
 * no este componente: aquí sólo se recoge el clic y el dato de Prima Anual
 * cuando aplica, y se ejecuta lo que el motor devuelva a través de
 * `onRouteToActivity`/`onDiscardClient` — mismo desacople que ya usa
 * `PresentationEndModal.jsx`.
 *
 * Se dibuja en un portal a `document.body`, por la misma razón ya
 * documentada ahí: cualquier ancestro con `transform` (la lista de "Hoy",
 * la Agenda) se vuelve el marco de referencia de un `position: fixed`, y el
 * overlay dejaría de cubrir la pantalla completa.
 *
 * @param {boolean} isOpen
 * @param {'cita_propuesta'|'cita_cierre'} stage
 * @param {{id?: string, name?: string, phone?: string}} client
 * @param {() => void} onClose
 * @param {(tipoActividad: string, client: object, extra?: {primaAnual?: number}) => void} onRouteToActivity
 * @param {(client: object) => void} onDiscardClient
 * @param {() => void} [onResolved] Se llama siempre, sin importar la resolución — quien monta el modal completa aquí el evento actual.
 * @param {(amount: number) => void} onEarnPoints
 */
export default function StageResolutionModal({
  isOpen, stage, client, onClose, onRouteToActivity, onDiscardClient, onResolved, onEarnPoints,
}) {
  const clientName = client?.name || 'este prospecto';
  const copy = STAGE_COPY[stage] ?? STAGE_COPY[PIPELINE_STAGES.PROPUESTA];

  /*
    Sólo aparece cuando la etapa es Propuesta y se tocó "Cierre Exitoso":
    un segundo paso dentro del mismo modal, no una pantalla aparte, para no
    perder el contexto de a quién se está cerrando.
  */
  const [confirmingAdvance, setConfirmingAdvance] = useState(false);
  const [primaAnual, setPrimaAnual] = useState('');

  const anchorRef = useRef(null);
  const [isDarkContext, setDarkContext] = useState(false);
  useLayoutEffect(() => {
    if (isOpen) setDarkContext(!!anchorRef.current?.closest('.dark'));
  }, [isOpen]);

  const reset = () => { setConfirmingAdvance(false); setPrimaAnual(''); };

  const resolve = (resolution, payload) => {
    const result = resolvePipelineStage(stage, resolution, payload);
    onEarnPoints?.(PRESENTATION_END_GAMIFICATION.RESOLUTION_BASE);
    // `result.type` deja que quien monta el modal decida si la tarjeta
    // actual se completa (avanzó a la siguiente etapa o pidió más tiempo)
    // o se elimina del todo (no califica, ver `PipelineCard.jsx`).
    onResolved?.(result.type);
    if (result.type === 'discard') {
      onDiscardClient?.(client);
    } else {
      /*
        `stageName` y no `eyebrow`: el segundo es el encabezado del modal
        ("Cierre de la Cita de Cierre") y al meterlo en la frase producía
        "Pidió más tiempo en su Cierre de la Cita de Cierre" — redundante y
        tan largo que no cabía en el subtítulo de `FollowUpCard.jsx`. Con el
        nombre limpio de la etapa queda "Pidió más tiempo en su Cita de
        Cierre".
      */
      const reason = resolution === PIPELINE_RESOLUTIONS.MORE_TIME
        ? `Pidió más tiempo en su ${copy.stageName}` : undefined;
      onRouteToActivity?.(result.tipoActividad, client, { primaAnual: result.primaAnual, reason });
    }
    reset();
    onClose?.();
  };

  const handleAdvanceClick = () => {
    // Sólo Propuesta exige validar la Prima Anual antes de confirmar.
    if (stage === PIPELINE_STAGES.PROPUESTA) {
      setConfirmingAdvance(true);
      return;
    }
    resolve(PIPELINE_RESOLUTIONS.ADVANCE);
  };

  const handleConfirmPrima = (e) => {
    e.preventDefault();
    const parsed = Number(primaAnual);
    if (!Number.isFinite(parsed) || parsed <= 0) return;
    resolve(PIPELINE_RESOLUTIONS.ADVANCE, { primaAnual: parsed });
  };

  const handleMoreTime = () => resolve(PIPELINE_RESOLUTIONS.MORE_TIME);
  const handleDisqualify = () => resolve(PIPELINE_RESOLUTIONS.DISQUALIFY);

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
                aria-label={copy.eyebrow}
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
                  {confirmingAdvance ? (
                    <form onSubmit={handleConfirmPrima}>
                      <p className="text-[11px] font-bold uppercase tracking-widest text-indigo-400">
                        {copy.eyebrow}
                      </p>
                      <h2 className="mt-1.5 text-lg font-bold leading-snug text-white">
                        Prima Anual de {clientName}
                      </h2>
                      <p className="mt-1 text-xs leading-relaxed text-slate-400">
                        Antes de agendar el Cierre, valida la Prima Anual acordada.
                      </p>

                      <input
                        type="number"
                        inputMode="decimal"
                        min="1"
                        step="any"
                        autoFocus
                        value={primaAnual}
                        onChange={(e) => setPrimaAnual(e.target.value)}
                        placeholder="Ej. 18500"
                        className={`${INPUT} mt-4`}
                      />

                      <button
                        type="submit"
                        disabled={!primaAnual}
                        className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl
                                   bg-indigo-600 px-4 py-3 text-sm font-semibold text-white
                                   transition-colors hover:bg-indigo-500 active:scale-[0.98]
                                   disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <Check size={16} aria-hidden="true" />
                        Confirmar y agendar Cierre
                      </button>

                      <button
                        type="button"
                        onClick={() => setConfirmingAdvance(false)}
                        className="mt-2 w-full rounded-xl px-4 py-2.5 text-xs font-semibold
                                   text-slate-500 transition-colors hover:text-slate-300"
                      >
                        Volver
                      </button>
                    </form>
                  ) : (
                    <>
                      <p className="text-[11px] font-bold uppercase tracking-widest text-indigo-400">
                        {copy.eyebrow}
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
                          onClick={handleAdvanceClick}
                          className="flex w-full items-center justify-between gap-3 rounded-xl
                                     bg-indigo-600 px-4 py-3.5 text-left text-sm font-semibold
                                     text-white transition-colors hover:bg-indigo-500
                                     active:scale-[0.98]"
                        >
                          <span>
                            {copy.advanceLabel}
                            <span className="mt-0.5 block text-[11px] font-normal text-indigo-200">
                              {copy.advanceHint}
                            </span>
                          </span>
                          <ArrowRight size={18} className="shrink-0" aria-hidden="true" />
                        </button>

                        <button
                          type="button"
                          onClick={handleMoreTime}
                          className="flex w-full items-center justify-between gap-3 rounded-xl
                                     border border-slate-700 bg-slate-800 px-4 py-3.5 text-left
                                     text-sm font-semibold text-slate-200 transition-colors
                                     hover:bg-slate-700 active:scale-[0.98]"
                        >
                          Pide más tiempo
                          <CalendarClock
                            size={18}
                            className="shrink-0 text-slate-400"
                            aria-hidden="true"
                          />
                        </button>

                        <button
                          type="button"
                          onClick={handleDisqualify}
                          className="flex w-full items-center justify-between gap-3 rounded-xl
                                     border border-slate-700 bg-slate-800 px-4 py-3.5 text-left
                                     text-sm font-semibold text-slate-400 transition-colors
                                     hover:bg-rose-500/10 hover:text-rose-300 active:scale-[0.98]"
                        >
                          No califica
                          <Archive size={18} className="shrink-0" aria-hidden="true" />
                        </button>
                      </div>
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
