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
    Dos pasos: primero se resuelve la cita, después se piden los pases.

    Antes los pases iban en la misma pantalla que las resoluciones, arriba de
    ellas, y bloqueaban los tres botones hasta llenarlos. Estaba al revés de
    como ocurre la conversación real: el asesor cierra el tema con el cliente
    —"avanzamos", "lo vemos luego"— y sólo entonces pide referidos. Puestos
    antes, los boletos parecían un requisito para poder opinar sobre la cita.

    `pending` guarda la resolución elegida y la ejecuta al final: nada se
    escribe hasta que el segundo paso termina, así que salir a medias no deja
    la cita medio resuelta.
  */
  const [pending, setPending] = useState(null);
  const [passes, setPasses] = useState(emptyPasses);

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

  // Cada cita arranca en el primer paso y con sus boletos en blanco: son los
  // referidos de este cliente, no los del anterior.
  useEffect(() => {
    if (!isOpen) return;
    setPending(null);
    setPasses(emptyPasses());
  }, [isOpen]);

  const passesComplete = arePassesComplete(passes);

  const resolve = (action) => {
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

  /*
    Las 3 resoluciones ya no ejecutan nada: apuntan la elección y pasan al
    segundo paso. Cada una guarda su etiqueta para poder recordarle al asesor
    qué está por confirmar mientras llena los boletos.
  */
  const RESOLUTIONS = {
    propuesta: {
      label: 'Avanza a Propuesta',
      run: () => onRouteToActivity?.('cita_propuesta', client),
    },
    seguimiento: {
      label: 'Requiere Seguimiento',
      run: () => onRouteToActivity?.('seguimiento', client),
    },
    descartado: {
      label: 'No califica',
      run: () => onDiscardClient?.(client),
    },
  };

  const finish = () => {
    const chosen = RESOLUTIONS[pending];
    if (!chosen) return;
    resolve(chosen.run);
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
                  {pending ? (
                    /*
                      ── Paso 2: los pases ──

                      El diseño rompe con el resto de los modales a propósito:
                      número gigante, franja diagonal de fondo y boletos
                      troquelados. Es el momento en que el asesor pide un favor
                      al cliente, y una pantalla que se parece a las demás no
                      ayuda a que se sienta un regalo con valor.
                    */
                    <div className="animate-rise">
                      <div className="relative mb-5 overflow-hidden rounded-2xl
                                      bg-gradient-to-br from-indigo-600 via-indigo-700
                                      to-violet-900 p-5"
                      >
                        {/*
                          Franjas diagonales tenues: la textura de un pase de
                          entrada. Se dibujan con un degradado repetido, sin
                          imagen ni SVG.
                        */}
                        <div
                          className="pointer-events-none absolute inset-0 opacity-[0.13]"
                          style={{
                            backgroundImage: 'repeating-linear-gradient(135deg, #fff 0 2px,'
                              + ' transparent 2px 12px)',
                          }}
                          aria-hidden="true"
                        />

                        <div className="relative">
                          <p className="text-[10px] font-bold uppercase tracking-[0.2em]
                                        text-indigo-200"
                          >
                            Antes de cerrar
                          </p>

                          <div className="mt-2 flex items-end gap-3">
                            <span className="font-mono text-5xl font-black leading-none
                                             text-white"
                            >
                              {REQUIRED_PASSES}
                            </span>
                            <span className="pb-1 text-sm font-bold leading-tight text-white">
                              pases de
                              <br />
                              cortesía
                            </span>
                          </div>

                          <p className="mt-3 text-[11px] leading-relaxed text-indigo-100">
                            Pregúntale a {clientName}: ¿a quién más le caería bien
                            este diagnóstico? Regálale uno de tu parte.
                          </p>
                        </div>
                      </div>

                      <VIPPassFields passes={passes} onChange={setPasses} />

                      {/*
                        Qué se va a ejecutar al confirmar, siempre a la vista.
                        Sin esto, en el segundo paso ya no habría rastro de la
                        resolución elegida y habría que recordarla de memoria.
                      */}
                      <button
                        type="button"
                        onClick={() => setPending(null)}
                        className="mt-4 flex w-full items-center justify-between gap-2
                                   rounded-xl border border-slate-800 bg-slate-950/60 px-3
                                   py-2.5 text-left transition-colors hover:bg-slate-800/60"
                      >
                        <span className="min-w-0">
                          <span className="block text-[10px] font-bold uppercase
                                           tracking-widest text-slate-500"
                          >
                            Resolución
                          </span>
                          <span className="block text-xs font-semibold text-slate-200">
                            {RESOLUTIONS[pending].label}
                          </span>
                        </span>
                        <span className="shrink-0 text-[10px] font-semibold text-indigo-400">
                          Cambiar
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={finish}
                        disabled={!passesComplete}
                        className="mt-3 flex w-full items-center justify-center gap-2
                                   rounded-xl bg-indigo-600 px-4 py-3.5 text-sm font-semibold
                                   text-white shadow-lg shadow-indigo-600/30
                                   transition-colors hover:bg-indigo-500 active:scale-[0.98]
                                   disabled:cursor-not-allowed disabled:opacity-40
                                   disabled:shadow-none"
                      >
                        <Ticket size={16} aria-hidden="true" />
                        Enviar pases y finalizar
                        <span className="text-[11px] font-bold text-indigo-200">
                          +{PRESENTATION_END_GAMIFICATION.REFERRAL_BONUS}
                        </span>
                      </button>

                      {/*
                        La salida, con su costo dicho en voz alta. Un candado sin
                        salida deja atrapada una cita real cuando el cliente se
                        niega a dar referidos: el prospecto quedaría sin
                        siguiente paso y la tarjeta vencida en la agenda — justo
                        la clase de fuga que se cerró en el resto del embudo.
                      */}
                      <button
                        type="button"
                        onClick={finish}
                        className="mx-auto mt-3 block text-[11px] text-slate-500
                                   underline-offset-2 transition-colors hover:text-slate-300
                                   hover:underline"
                      >
                        Hoy no soltó nombres, cerrar sin pases
                      </button>
                    </div>
                  ) : (
                    /* ── Paso 1: la resolución ── */
                    <>
                      <p className="text-[11px] font-bold uppercase tracking-widest
                                    text-indigo-400"
                      >
                        Cierre de Presentación
                      </p>
                      <h2 className="mt-1.5 text-lg font-bold leading-snug text-white">
                        ¿Qué sigue con {clientName}?
                      </h2>
                      <p className="mt-1 text-xs leading-relaxed text-slate-400">
                        Elige una resolución para continuar. La cita no se cierra sin
                        decidir esto.
                      </p>

                      <div className="mt-5 flex flex-col gap-2.5">
                        <button
                          type="button"
                          onClick={() => setPending('propuesta')}
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
                          onClick={() => setPending('seguimiento')}
                          className="flex w-full items-center justify-between gap-3 rounded-xl
                                     border border-slate-700 bg-slate-800 px-4 py-3.5
                                     text-left text-sm font-semibold text-slate-200
                                     transition-colors hover:bg-slate-700 active:scale-[0.98]"
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
                          onClick={() => setPending('descartado')}
                          className="flex w-full items-center justify-between gap-3 rounded-xl
                                     border border-slate-700 bg-slate-800 px-4 py-3.5
                                     text-left text-sm font-semibold text-slate-400
                                     transition-colors hover:bg-rose-500/10
                                     hover:text-rose-300 active:scale-[0.98]"
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
