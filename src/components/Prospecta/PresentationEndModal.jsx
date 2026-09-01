import { useLayoutEffect, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, CalendarClock, Archive, Gift, ArrowLeft } from 'lucide-react';
import { PRESENTATION_END_GAMIFICATION } from '../../lib/presentationGamification';
import { useSession } from '../../context/SessionContext';
import {
  saveVipPasses, REQUIRED_PASSES, arePassesComplete, completePasses,
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
  // Arranca vacío: las invitaciones se agregan de una en una.
  const [passes, setPasses] = useState([]);

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
    setPasses([]);
  }, [isOpen]);

  /*
    Dos medidas distintas, y conviene no confundirlas:

      · `ready` son las invitaciones que ya se pueden guardar, una o tres. Es
        lo que decide si aparece el botón principal.
      · `passesComplete` es el lote entero, y sólo gobierna el bono.

    Antes se guardaba únicamente con las tres completas, así que un cliente que
    daba un solo nombre veía cómo ese contacto se perdía al cerrar la cita. Un
    referido de verdad vale aunque venga solo.
  */
  const ready = completePasses(passes);
  const readyCount = ready.length;
  const passesComplete = arePassesComplete(passes);

  const resolve = (action) => {
    onEarnPoints?.(PRESENTATION_END_GAMIFICATION.RESOLUTION_BASE);

    /*
      Los pases se guardan antes de enrutar y con el nombre del cliente que
      los dio (`fromClient`): al revisar la lista, un pase que salió de una
      cita se escribe distinto que uno que el asesor sacó de su propia red.
      Se guarda lo que haya; el bono es lo que exige el lote completo.
    */
    if (readyCount > 0) {
      saveVipPasses(identity?.key, ready, {
        origin: 'cita_inicial',
        fromClient: client?.name ?? '',
      });
    }
    if (passesComplete) {
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
                /*
                  Los dos pasos ocupan la pantalla de forma distinta a
                  propósito.

                  El paso 1 —la resolución— es una decisión rápida del asesor:
                  tarjeta centrada sobre el fondo atenuado, como cualquier
                  diálogo. El paso 2 se le muestra al cliente con el teléfono
                  girado hacia él, y ahí una tarjeta flotando sobre un velo
                  translúcido delata que hay una app detrás; a pantalla completa
                  y en negro, lo único que existe es el contenido.
                */
                className={pending
                  ? 'fixed inset-0 z-[90] bg-black'
                  : 'fixed inset-0 z-[90] flex items-center justify-center bg-black/70 p-4'
                    + ' backdrop-blur-sm'}
              >
                <motion.div
                  initial={pending
                    ? { opacity: 0, y: 12 }
                    : { opacity: 0, y: 16, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={pending ? { opacity: 0, y: 12 } : { opacity: 0, y: 16, scale: 0.97 }}
                  transition={{ duration: 0.25, ease: 'easeOut' }}
                  /*
                    En el paso 2 la columna ocupa el alto completo y se divide en
                    dos: el contenido se desplaza y la zona de acciones queda
                    fija abajo. Sin esa división, en un teléfono con el teclado
                    abierto el botón principal se iba fuera de la pantalla justo
                    cuando se acaba de escribir el último dato.

                    `dvh` y no `vh` para descontar la barra del navegador, misma
                    razón documentada en `MoreMenu.jsx`.
                  */
                  className={pending
                    ? 'flex h-[100dvh] w-full flex-col'
                    : 'max-h-[88dvh] w-full max-w-sm overflow-y-auto overscroll-contain'
                      + ' rounded-2xl border border-neutral-900 bg-black p-6 shadow-2xl'
                      + ' shadow-black/70'}
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
                    /*
                      ── Paso 2: vista para el cliente ──

                      Esta pantalla se le muestra físicamente al cliente, con el
                      teléfono girado hacia él, así que está escrita para él y no
                      para el asesor. Nada de "prospectos", "llegar en frío" ni
                      puntos: eso es instrumentación interna y leerla desde el
                      otro lado de la mesa convierte un obsequio en una cuota de
                      ventas.

                      Aquí había antes un bloque con degradado morado y franjas
                      diagonales. Se fue por lo mismo: en una app de gestión
                      patrimonial, una textura de banner es lo que separa una
                      herramienta profesional de una promoción.
                    */
                    <>
                      {/*
                        ── Zona desplazable ──

                        Alineada a la izquierda con margen amplio: el espacio
                        vacío a la derecha del título es lo que le da el aire de
                        documento y no de formulario.
                      */}
                      <div className="flex-1 overflow-y-auto overscroll-contain px-6 pt-6">
                        {/*
                          Columna de ancho acotado y centrada. Sin ella, en un
                          monitor el título y los campos se estiraban a todo el
                          ancho de la pantalla: una línea de texto de 1500px es
                          ilegible, y el botón de agregar quedaba como una barra
                          de lado a lado.

                          En móvil no cambia nada —el ancho disponible es menor
                          que el máximo, así que el contenedor simplemente lo
                          ocupa entero respetando el `px-6` del padre—, y en
                          escritorio queda la columna centrada de un formulario
                          de acceso.
                        */}
                        <div className="mx-auto w-full max-w-lg">
                        {/*
                          La flecha es la única salida hacia atrás, y con ella
                          desapareció el enlace "Cambiar resolución" que había
                          aquí. Dos razones: el gesto de volver ya se entiende
                          sin rótulo, y ese texto obligaba a nombrar la
                          resolución elegida —"Avanza a Propuesta", pero también
                          "No califica"— en una pantalla que el cliente está
                          mirando. El asesor sabe qué eligió hace un momento; el
                          cliente no tiene por qué leer el veredicto.
                        */}
                        <button
                          type="button"
                          onClick={() => setPending(null)}
                          aria-label="Volver"
                          className="-ml-2 grid h-9 w-9 place-items-center rounded-lg
                                     text-neutral-400 transition-colors hover:text-neutral-100
                                     focus-visible:outline-none focus-visible:ring-1
                                     focus-visible:ring-neutral-600"
                        >
                          <ArrowLeft size={20} strokeWidth={1.75} aria-hidden="true" />
                        </button>

                        <h2 className="mt-8 text-3xl font-semibold tracking-tight
                                       text-neutral-100"
                        >
                          Regala claridad financiera a {REQUIRED_PASSES} personas que te importan
                        </h2>

                        <p className="mt-3 flex items-start gap-2 text-sm text-neutral-400">
                          <Gift
                            size={15}
                            strokeWidth={1.75}
                            className="mt-0.5 shrink-0"
                            aria-hidden="true"
                          />
                          <span>
                            Antes de terminar, comparte tus {REQUIRED_PASSES} Pases VIP con
                            amigos que valores. Cada uno recibirá sin costo este análisis
                            patrimonial completo, como un regalo de tu parte.
                          </span>
                        </p>

                          <div className="mt-10 pb-6">
                            <VIPPassFields passes={passes} onChange={setPasses} />
                          </div>
                        </div>
                      </div>

                      {/*
                        ── Zona de acciones, fija ──

                        Queda fuera del área que se desplaza para que el botón
                        principal siga alcanzable con el teclado abierto, que es
                        exactamente cuando se acaba de escribir el último dato.
                      */}
                      <div className="shrink-0 border-t border-neutral-900 px-6 pb-8 pt-4">
                        {/*
                          La línea divisoria se queda a todo el ancho —marca la
                          separación entre lo que se desplaza y lo que no— pero
                          los botones se centran en la misma columna que el
                          contenido de arriba. Así el botón principal queda
                          exactamente debajo del de agregar en vez de estirarse
                          hasta las esquinas del monitor.
                        */}
                        <div className="mx-auto w-full max-w-lg space-y-2">
                        {/*
                          Aparece en cuanto hay UNA invitación completa, no al
                          llegar a tres: el cliente decide cuántas regala, y
                          exigir las tres para poder continuar convertiría el
                          obsequio en una cuota. Los tres siguen siendo lo que la
                          sesión incluye —y lo que paga el bono—, no un mínimo.

                          Blanco sobre negro, sin degradado ni sombra de color:
                          en una pantalla de puro negro el contraste es el
                          énfasis, y cualquier color saturado rompería la
                          sobriedad que sostiene la vista.
                        */}
                        {readyCount > 0 && (
                          <button
                            type="button"
                            onClick={finish}
                            className="w-full rounded-lg bg-neutral-100 px-4 py-3.5 text-sm
                                       font-medium text-black transition-colors
                                       hover:bg-white active:scale-[0.99]"
                          >
                            {readyCount === 1
                              ? 'Activar pase de cortesía'
                              : `Activar ${readyCount} pases de cortesía`}
                          </button>
                        )}

                        {/*
                          Botón fantasma, del todo desaturado: es la salida y no
                          debe competir con la acción principal. Existe porque un
                          paso sin salida deja atrapada una cita real cuando el
                          cliente no quiere dar nombres, y el prospecto se
                          quedaría sin siguiente paso en la agenda.
                        */}
                        <button
                          type="button"
                          onClick={finish}
                          className="w-full bg-transparent px-4 py-3 text-sm font-medium
                                     text-neutral-500 transition-colors hover:text-neutral-300"
                        >
                            {readyCount > 0 ? 'Continuar sin activar' : 'Omitir invitaciones'}
                          </button>
                        </div>
                      </div>
                    </>
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
