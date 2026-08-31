import { useLayoutEffect, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, CalendarClock, Archive, Ticket } from 'lucide-react';
import { PRESENTATION_END_GAMIFICATION } from '../../lib/presentationGamification';
import { useSession } from '../../context/SessionContext';
import {
  saveVipPasses, REQUIRED_PASSES, arePassesComplete, emptyPasses,
} from '../../data/vipPasses';
import VIPPassFields from './VIPPassFields';

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
 * @param {() => void} [onResolved] Se llama siempre, sin importar la resolución elegida: la Cita Inicial que se está cerrando ya se llevó a cabo, así que quien monta el modal debe quitarla de la agenda sin importar a dónde se enrutó el prospecto después.
 */
export default function PresentationEndModal({
  isOpen, client, onClose, onRouteToActivity, onDiscardClient, onEarnPoints, onResolved,
}) {
  const clientName = client?.name || 'este prospecto';
  const { identity } = useSession();

  /*
    Los 3 Pases VIP que el cliente entrega al cerrar la cita. `skipped` es la
    salida explícita: sin ella el modal sería un callejón cuando el cliente se
    niega a dar referidos (ver la nota de `canResolve`, más abajo).
  */
  const [passes, setPasses] = useState(emptyPasses);
  const [skipped, setSkipped] = useState(false);

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

  // Cada cita arranca con sus boletos en blanco: son los referidos de este
  // cliente, no los del anterior.
  useEffect(() => {
    if (!isOpen) return;
    setPasses(emptyPasses());
    setSkipped(false);
  }, [isOpen]);

  const passesComplete = arePassesComplete(passes);
  /*
    El "peaje" de los pases: hay que llenarlos o saltarlos a propósito, pero
    nunca bloquea de forma definitiva.

    Se eligió esta variante y no deshabilitar "Finalizar" para siempre. Un
    bloqueo duro deja atrapada una cita real cuando el cliente se niega a dar
    referidos: el asesor no podría cerrarla, el prospecto quedaría sin
    siguiente paso y la tarjeta se quedaría vencida en la agenda — justo la
    clase de fuga que se cerró en el resto del embudo. Aquí la fricción es
    hacer explícita la decisión, no impedir el trabajo.
  */
  const canResolve = passesComplete || skipped;

  const resolve = (action) => {
    if (!canResolve) return;

    onEarnPoints?.(PRESENTATION_END_GAMIFICATION.RESOLUTION_BASE);

    /*
      Los pases se guardan antes de enrutar y con el nombre del cliente que
      los dio (`fromClient`): al revisar la lista, un pase que salió de una
      cita se escribe distinto que uno que el asesor sacó de su propia red.
      El bono sólo se paga si de verdad hay tres contactos capturados.
    */
    if (passesComplete) {
      saveVipPasses(identity?.key, passes, {
        origin: 'cita_inicial',
        fromClient: client?.name ?? '',
      });
      onEarnPoints?.(PRESENTATION_END_GAMIFICATION.REFERRAL_BONUS);
    }

    action();
    // Sin importar cuál de las 3 resoluciones se elija, la Cita Inicial ya
    // se llevó a cabo: su tarjeta debe salir de "Hoy" en las tres, no sólo
    // en "No califica" (que la borraba de rebote al descartar al
    // prospecto). "Avanzamos a Propuesta" y "Requiere Seguimiento" sólo
    // creaban la siguiente actividad y dejaban ésta huérfana en la lista.
    onResolved?.();
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
                  /*
                    Desplazable: con la sección de Pases el contenido pasa del
                    alto de la pantalla en un teléfono, y sin esto las tres
                    resoluciones quedaban por debajo del borde inferior,
                    imposibles de alcanzar. `dvh` y no `vh` para descontar la
                    barra del navegador, misma razón documentada en
                    `MoreMenu.jsx`.
                  */
                  className="max-h-[88dvh] w-full max-w-sm overflow-y-auto overscroll-contain
                             rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-2xl
                             shadow-black/50"
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

                  {/*
                    ── Pases VIP de cortesía ──

                    Va ANTES de las resoluciones, no después: pedir referidos
                    es parte de cerrar la cita, y puesto al final se leería
                    como un trámite opcional que se salta con el pulgar ya
                    encima del botón de finalizar.
                  */}
                  <section className="mt-5 rounded-2xl border border-indigo-500/20
                                      bg-indigo-500/[0.04] p-3.5"
                  >
                    <div className="mb-2.5 flex items-start gap-2.5">
                      <span
                        className="grid h-8 w-8 shrink-0 place-items-center rounded-lg
                                   bg-indigo-500/15 text-indigo-300"
                        aria-hidden="true"
                      >
                        <Ticket size={16} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-[11px] font-bold uppercase tracking-widest
                                      text-indigo-300"
                        >
                          Pases VIP de Cortesía
                        </p>
                        <p className="mt-1 text-[11px] leading-relaxed text-slate-400">
                          Pídele a {clientName} {REQUIRED_PASSES} personas a quienes también
                          les regalarías un Diagnóstico 360.
                        </p>
                      </div>
                    </div>

                    <VIPPassFields passes={passes} onChange={setPasses} disabled={skipped} />

                    {passesComplete && (
                      <p className="mt-2.5 text-[11px] font-semibold text-emerald-400">
                        +{PRESENTATION_END_GAMIFICATION.REFERRAL_BONUS} puntos de bono al
                        finalizar.
                      </p>
                    )}

                    {/*
                      La salida, con su costo dicho en voz alta. No esconde
                      que se pierde el bono: es lo que la vuelve una decisión
                      informada en vez de un atajo silencioso.
                    */}
                    {!passesComplete && (
                      <button
                        type="button"
                        onClick={() => setSkipped((v) => !v)}
                        className={`mt-2.5 block text-[11px] underline-offset-2
                                    transition-colors hover:underline ${skipped
                          ? 'font-semibold text-amber-400'
                          : 'text-slate-500 hover:text-slate-300'}`}
                      >
                        {skipped
                          ? `Sin pases: cierro sin el bono de +${PRESENTATION_END_GAMIFICATION.REFERRAL_BONUS}. Cambiar de opinión`
                          : 'Hoy no dio referidos, cerrar sin pases'}
                      </button>
                    )}
                  </section>

                  {/*
                    Las tres resoluciones quedan atenuadas y sin acción hasta
                    que los pases estén llenos o se haya elegido cerrar sin
                    ellos. La cita siempre se puede cerrar; lo que no se puede
                    es pasar de largo por la pregunta sin verla.
                  */}
                  <div
                    className={`mt-4 flex flex-col gap-2.5 transition-opacity
                                ${canResolve ? 'opacity-100' : 'opacity-40'}`}
                  >
                    <button
                      type="button"
                      onClick={handleAdvanceToProposal}
                      disabled={!canResolve}
                      className="flex w-full items-center justify-between gap-3 rounded-xl
                                 bg-indigo-600 px-4 py-3.5 text-left text-sm font-semibold
                                 text-white transition-colors hover:bg-indigo-500
                                 active:scale-[0.98] disabled:cursor-not-allowed"
                    >
                      Avanzamos a Propuesta
                      <ArrowRight size={18} className="shrink-0" aria-hidden="true" />
                    </button>

                    <button
                      type="button"
                      onClick={handleNeedsFollowUp}
                      disabled={!canResolve}
                      className="flex w-full items-center justify-between gap-3 rounded-xl
                                 border border-slate-700 bg-slate-800 px-4 py-3.5 text-left
                                 text-sm font-semibold text-slate-200 transition-colors
                                 hover:bg-slate-700 active:scale-[0.98]
                                 disabled:cursor-not-allowed"
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
                      disabled={!canResolve}
                      className="flex w-full items-center justify-between gap-3 rounded-xl
                                 border border-slate-700 bg-slate-800 px-4 py-3.5 text-left
                                 text-sm font-semibold text-slate-400 transition-colors
                                 hover:bg-rose-500/10 hover:text-rose-300 active:scale-[0.98]
                                 disabled:cursor-not-allowed"
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
