import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { CalendarClock, Trash2 } from 'lucide-react';
import { claimSwipeTutorial, markSwipeTutorialSeen } from '../../data/swipeTutorial';

/*
  Anclaje "suave": hasta aquí llega la tarjeta si se suelta sin fuerza
  dentro de la banda de revelar el menú. Coincide con el ancho real de los
  2 botones del fondo (dos círculos de 40px + separación), así que el menú
  queda justo detrás y no con un sobrante de fondo vacío ni con un botón a
  medio cortar.
*/
const REVEAL_X = -100;

/*
  Banda de "deslizamiento suave" que ancla el menú, en vez de regresar a
  0 o de eliminar. Por debajo de `-50` (soltar casi sin mover) la tarjeta
  vuelve a su lugar; por encima de `AUTO_DELETE_THRESHOLD` se borra sola.
  Entre medio, se ancla en `REVEAL_X`.
*/
const SNAP_BACK_THRESHOLD = -50;

/** Umbral de distancia a partir del cual se dispara la auto-eliminación. */
const AUTO_DELETE_THRESHOLD = -150;

/*
  Umbral de velocidad: un manotazo rápido y corto (poca distancia, mucha
  inercia) borra igual que un arrastre largo — es lo que se pide con "se
  desliza con fuerza": la física del gesto pesa tanto como la distancia
  final. Negativo porque el gesto va de derecha a izquierda.
*/
const AUTO_DELETE_VELOCITY = -800;

/** Resorte del regreso a 0 o del anclaje en el menú: rebote suave, no rígido. */
const SNAP_SPRING = { type: 'spring', stiffness: 300, damping: 30 };

/** Salida de pantalla al auto-eliminar: rápida y sin rebote, la tarjeta se va y no vuelve. */
const EXIT_TRANSITION = { duration: 0.25, ease: 'easeInOut' };

/*
  Efecto "Nudge": cuánto se asoma la tarjeta hacia la izquierda y cuánto
  dura cada tramo del vaivén. Es la misma distancia con la que ya se
  documentó `REVEAL_X` como referencia visual, pero deliberadamente menor
  —20px y no 100px—: el Nudge sólo tiene que insinuar que ahí hay un gesto,
  no revelar el menú completo, que se sentiría como si la tarjeta ya
  estuviera siendo arrastrada de verdad.
*/
const NUDGE_X = -20;
const NUDGE_OUT_MS = 260;
const NUDGE_BACK_MS = 260;
const NUDGE_PAUSE_MS = 200;
/** Resorte del Nudge: más suave que `SNAP_SPRING`, es una insinuación, no un anclaje. */
const NUDGE_SPRING = { type: 'spring', stiffness: 260, damping: 22 };

/**
 * src/components/Layout/SwipeableCard.jsx
 *
 * Envoltura agnóstica de arrastre horizontal (Spotify/iOS Mail): recibe
 * cualquier tarjeta como `children` y le agrega, por debajo, dos acciones
 * secundarias que se revelan al deslizar de derecha a izquierda.
 *
 * No conoce el contenido de la tarjeta ni el tipo de actividad que
 * envuelve —eso es responsabilidad de quien la usa (`ActionableCard.jsx`,
 * o cualquier otra lista)—: sólo entiende de arrastre, umbrales y las dos
 * acciones fijas de "Reagendar" y "Descartar". `onReschedule`/`onDiscard`
 * son las únicas dos formas en que se comunica con el exterior; ninguna de
 * las dos sabe qué hacer con el evento real, eso lo decide quien la monta.
 *
 * Tres desenlaces al soltar (`onDragEnd`, con `info.offset.x` e
 * `info.velocity.x`):
 *  1. Casi sin mover (`offset.x > SNAP_BACK_THRESHOLD`): vuelve a 0 con resorte.
 *  2. Deslizamiento suave (entre los dos umbrales): se ancla en `REVEAL_X`,
 *     dejando el menú de 2 botones visible hasta el próximo toque.
 *  3. Deslizamiento largo o veloz (más allá de `AUTO_DELETE_THRESHOLD`, o
 *     con `velocity.x` por debajo de `AUTO_DELETE_VELOCITY` aunque la
 *     distancia no haya llegado al umbral): dispara `onDiscard` de una vez
 *     y anima la tarjeta fuera de la pantalla antes de desmontarla — no
 *     hace falta un segundo toque de confirmación, es la acción
 *     destructiva automática que pide el pedido.
 */
export default function SwipeableCard({ children, onReschedule, onDiscard }) {
  const [x, setX] = useState(0);
  const [isRemoving, setIsRemoving] = useState(false);
  /*
    Posición en vivo mientras el dedo sigue tocando la pantalla. `x` (de
    arriba) sólo se actualiza al soltar —es lo que sirve para animar el
    regreso, el anclaje o la salida—, así que por sí solo no basta para
    saber "cuánto se ha deslizado ahora mismo": durante el arrastre real,
    Framer Motion mueve la tarjeta por su cuenta sin tocar ese estado.
    `liveDragX` es la copia que sí se actualiza en cada cuadro del
    arrastre (`onDrag`, más abajo), sólo para calcular cuánto revelar el
    fondo — nunca controla la posición de la tarjeta.
  */
  const [liveDragX, setLiveDragX] = useState(null);
  /*
    El Nudge cambia el resorte de la animación de posición mientras dura su
    propia secuencia (ver `NUDGE_SPRING` arriba, más suave que
    `SNAP_SPRING`): sin esto, el vaivén heredaría el resorte de anclaje y
    se sentiría tan firme como soltar la tarjeta a medio arrastre, no como
    una insinuación pasajera.
  */
  const [isNudging, setIsNudging] = useState(false);

  /*
    "Efecto Circo": sólo se enseña una vez, y sólo en la primera
    tarjeta/notificación que aparece en la pantalla — no una vez por cada
    tarjeta montada. `claimSwipeTutorial()` (`data/swipeTutorial.js`)
    reparte un único turno por carga de página entre todas las
    `SwipeableCard` que se monten a la vez; sólo la primera en pedirlo lo
    obtiene, así que en una lista de diez notificaciones se ve un solo
    asomo, en la primera de arriba, no diez asomándose al mismo tiempo. Dos
    repeticiones —no una, no un vaivén infinito— y se detiene para
    siempre, marcando la bandera persistente para que ni siquiera la
    primera tarjeta vuelva a animarlo en una visita futura.
  */
  useEffect(() => {
    if (!claimSwipeTutorial()) return undefined;

    let cancelled = false;
    const wait = (ms) => new Promise((resolve) => { setTimeout(resolve, ms); });

    const runNudge = async () => {
      if (cancelled) return;
      setIsNudging(true);
      setX(NUDGE_X);
      await wait(NUDGE_OUT_MS);
      if (cancelled) return;
      setX(0);
      await wait(NUDGE_BACK_MS);
    };

    (async () => {
      await runNudge();
      if (cancelled) return;
      await wait(NUDGE_PAUSE_MS);
      if (cancelled) return;
      await runNudge();
      if (cancelled) return;
      setIsNudging(false);
      markSwipeTutorialSeen();
    })();

    return () => { cancelled = true; };
    // Sólo al montar: es una demostración de una vez, no algo que deba
    // repetirse si `onReschedule`/`onDiscard` cambiaran de identidad entre
    // renders.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (isRemoving) return null;

  const handleDragEnd = (_event, info) => {
    const { x: offsetX } = info.offset;
    const { x: velocityX } = info.velocity;

    const swipedFarOrFast = offsetX <= AUTO_DELETE_THRESHOLD
      || velocityX <= AUTO_DELETE_VELOCITY;

    if (swipedFarOrFast) {
      // El desmontaje real ocurre después de que la propia tarjeta ya se
      // fue: `onDiscard` puede quitarla de una lista de arriba, y si
      // corriera antes de la animación, React desmontaría este componente
      // a mitad del vuelo hacia afuera.
      handleDiscardClick();
      return;
    }

    if (offsetX <= SNAP_BACK_THRESHOLD) {
      setX(REVEAL_X);
      return;
    }

    setX(0);
  };

  /*
    Cuánto revelar el fondo de acciones, de 0 (invisible del todo) a 1
    (completamente a la vista) — no sólo "cubierto por la tarjeta de
    encima", sino con su propia opacidad en cero por defecto. Esto es lo
    que corrige el reporte: `PipelineCard.jsx` gira su tarjeta en 3D
    (`rotateY`) al tocar "Tocar para gestionar", y a la mitad del giro la
    tarjeta queda de perfil —un plano casi sin área visible hacia la
    cámara—, dejando entrever lo que hay detrás durante esa fracción de
    segundo. Antes, "lo que había detrás" eran los íconos de
    Reagendar/Descartar a plena opacidad, sólo tapados por la tarjeta;
    ahora, mientras no se esté deslizando de verdad, están en opacidad 0 y
    no hay nada que ese instante del giro pueda dejar ver.
    `pointerEvents: 'none'` bajo cierto umbral evita además tocar por
    accidente un botón que todavía no se percibe como presente.
  */
  const revealX = liveDragX ?? x;
  const revealProgress = Math.min(1, Math.abs(revealX) / Math.abs(REVEAL_X));

  const handleRescheduleClick = () => {
    setX(0);
    onReschedule?.();
  };

  /*
    Mismo camino de salida que el auto-eliminado del `onDragEnd`: tocar el
    botón "Descartar" del menú revelado es una segunda puerta a la misma
    acción, no un atajo distinto — debe animar y desmontar exactamente
    igual, para que la tarjeta nunca desaparezca de golpe según por dónde
    se haya llegado a borrarla.
  */
  const handleDiscardClick = () => {
    setX(-1000);
    setIsRemoving(true);
    setTimeout(() => onDiscard?.(), EXIT_TRANSITION.duration * 1000);
  };

  return (
    <div className="relative w-full overflow-hidden rounded-xl">
      {/*
        Capa de fondo fija: siempre está ahí, detrás de la tarjeta, del alto
        exacto de la propia tarjeta (`absolute inset-0`, sin su propia
        altura declarada) — sólo se ve en cuanto la tarjeta se desliza y
        deja de cubrirla. Alineada a la derecha porque el gesto es de
        derecha a izquierda: los botones aparecen del lado hacia el que se
        deslizó, no del lado opuesto.
      */}
      <div
        className="absolute inset-0 flex items-stretch justify-end gap-2 pr-1"
        style={{
          opacity: revealProgress,
          pointerEvents: revealProgress > 0.05 ? 'auto' : 'none',
        }}
      >
        <button
          type="button"
          onClick={handleRescheduleClick}
          aria-label="Reagendar"
          className="grid w-11 shrink-0 place-items-center rounded-xl bg-sky-600
                     text-white transition-colors hover:bg-sky-500 active:scale-95"
        >
          <CalendarClock size={19} aria-hidden="true" />
        </button>

        <button
          type="button"
          onClick={handleDiscardClick}
          aria-label="Descartar"
          className="grid w-11 shrink-0 place-items-center rounded-xl bg-rose-600
                     text-white transition-colors hover:bg-rose-500 active:scale-95"
        >
          <Trash2 size={19} aria-hidden="true" />
        </button>
      </div>

      {/*
        La tarjeta real, encima de la capa de fondo. `drag="x"` restringe
        el arrastre al eje horizontal; `dragConstraints` evita que se vaya
        más allá de 0 hacia la derecha (no hay nada que revelar de ese
        lado) — el límite izquierdo se deja abierto porque es
        `handleDragEnd`, no una pared física, quien decide si acaba en 0,
        en `REVEAL_X` o fuera de la pantalla. `dragElastic` es la
        resistencia: se puede tirar más allá del límite derecho, pero con
        esfuerzo creciente, nunca de golpe.
      */}
      <motion.div
        drag="x"
        dragConstraints={{ left: -1000, right: 0 }}
        dragElastic={0.2}
        onDrag={(_e, info) => setLiveDragX(info.offset.x)}
        onDragEnd={(e, info) => { setLiveDragX(null); handleDragEnd(e, info); }}
        animate={{ x }}
        transition={isRemoving
          ? EXIT_TRANSITION
          : isNudging
            ? NUDGE_SPRING
            : SNAP_SPRING}
        style={{ opacity: isRemoving ? 0 : 1 }}
        className="relative"
      >
        {children}
      </motion.div>
    </div>
  );
}
