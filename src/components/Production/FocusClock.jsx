import { useState, useRef, useEffect } from 'react';
import { Plus, Minus } from 'lucide-react';
import { formatClock } from '../../data/timeBlocks';
import { tapFeedback, FAST_TAP_MS } from '../../lib/haptics';

/** Cuánto se mueve el reloj con un toque tranquilo. */
export const STEP_SEC = 30;

/** Cuánto se mueve cuando la persona ya lleva prisa. */
const FAST_STEP_SEC = 60;

/** A partir de qué toque seguido se acelera. */
const FAST_AFTER_TAPS = 4;

/** Silencio que devuelve el botón a su paso normal. */
const CALM_MS = 3000;

/** Cuánto dura el "+30s" antes de volver a ser un signo. */
const FLASH_MS = 500;

/**
 * Botón de ajuste que se convierte en su propio resultado.
 *
 * Al tocarlo, el signo se va y en su lugar salta un "+30". Es la única prueba de
 * que el toque contó: el reloj pasa de 24:30 a 25:00 y ese cambio de un dígito se
 * pierde de vista con facilidad, más aún tocando dos veces seguidas. El brinco
 * ocurre donde está el dedo, no en el reloj, que es donde la persona está mirando.
 */
function AdjustButton({ sign, disabled, onAdjust }) {
  /*
    `id` acompaña al texto para poder reiniciar la animación. Sin él, dos toques
    seguidos reutilizan el mismo elemento y el segundo brinco no ocurre: el
    navegador considera que esa animación ya se reprodujo.
  */
  const [flash, setFlash] = useState(null);

  /**
   * Toques seguidos dados a *este* botón.
   *
   * Es un ref y no un estado por dos razones. La primera es correctitud: dos toques
   * en el mismo ciclo de render leerían el mismo valor y los dos calcularían 30
   * segundos, con lo que la aceleración se atascaría justo cuando más rápido se
   * está tocando. La segunda es que este número no se dibuja —lo que se ve es la
   * etiqueta del brinco—, así que guardarlo en estado sólo añadiría un render por
   * toque.
   *
   * Cada botón lleva su propia cuenta, y eso hace que cambiar de dirección empiece
   * de nuevo en 30 segundos. Es deliberado: quien acelera hacia arriba y luego baja
   * es alguien que se pasó y está corrigiendo, y a una corrección hay que darle el
   * paso fino, no el de un minuto.
   */
  const taps = useRef(0);

  const calmTimer = useRef(null);
  const flashTimer = useRef(null);

  // Un temporizador vivo tras desmontar dejaría un `setState` sobre un componente
  // que ya no existe.
  useEffect(() => () => {
    clearTimeout(calmTimer.current);
    clearTimeout(flashTimer.current);
  }, []);

  const press = () => {
    taps.current += 1;
    const step = taps.current >= FAST_AFTER_TAPS ? FAST_STEP_SEC : STEP_SEC;

    onAdjust(sign * step);

    /*
      La vibración también acelera. Es la misma información que la etiqueta, pero
      llega por el dedo: se nota que el botón cambió de marcha sin tener que mirar,
      que es justo lo que pasa cuando alguien lo está tocando rápido.
    */
    tapFeedback(step === FAST_STEP_SEC ? FAST_TAP_MS : undefined);

    setFlash({ id: Date.now(), step });
    clearTimeout(flashTimer.current);
    flashTimer.current = setTimeout(() => setFlash(null), FLASH_MS);

    // Tres segundos sin tocar y el botón vuelve a su paso corto.
    clearTimeout(calmTimer.current);
    calmTimer.current = setTimeout(() => { taps.current = 0; }, CALM_MS);
  };

  const symbol = sign > 0 ? '+' : '-';
  const Icon = sign > 0 ? Plus : Minus;

  /*
    "30s" y "1m", no "30" y "60": en un reloj que muestra minutos y segundos, un
    "+60" suelto se lee como sesenta minutos con la misma facilidad que como
    sesenta segundos.
  */
  const label = flash?.step === FAST_STEP_SEC ? `${symbol}1m` : `${symbol}30s`;

  return (
    <button
      type="button"
      onClick={press}
      disabled={disabled}
      /*
        La etiqueta habla del toque tranquilo y no del acelerado: es lo que hace el
        botón cuando alguien lo encuentra por primera vez, y anunciar "sumar 30 ó 60
        segundos según la prisa" no ayuda a nadie a decidir si tocarlo.
      */
      aria-label={`${sign > 0 ? 'Sumar' : 'Quitar'} ${STEP_SEC} segundos`}
      className="grid h-14 w-14 shrink-0 place-items-center rounded-full text-white/60
                 transition-colors hover:text-white active:text-white
                 disabled:pointer-events-none disabled:text-white/15"
    >
      {flash ? (
        <span
          key={flash.id}
          className="animate-bump text-base font-bold tabular-nums text-white"
          aria-hidden="true"
        >
          {label}
        </span>
      ) : (
        <Icon size={26} strokeWidth={2.5} aria-hidden="true" />
      )}
    </button>
  );
}

/**
 * El reloj y sus dos controles.
 *
 * El mismo componente sirve antes de arrancar, corriendo y en pausa: lo único que
 * cambia entre esos tres momentos es qué botón hay debajo, y eso lo pone quien lo
 * usa. Tener un reloj distinto para "elegir el tiempo" y otro para "ver el tiempo"
 * obligaría a mantener dos veces la misma tipografía, el mismo ancho y el mismo
 * ajuste de ±30.
 *
 * Ojo con el orden: el `+` va a la izquierda y el `-` a la derecha, tal como se
 * pidió. Es al revés de la costumbre, así que si algún día alguien lo "arregla",
 * que sepa que estaba puesto a propósito.
 */
export default function FocusClock({ seconds, onAdjust, canSubtract = true, isDone = false }) {
  return (
    <div className="flex items-center justify-center gap-1 sm:gap-3">
      <AdjustButton sign={1} onAdjust={onAdjust} />

      {/*
        `font-mono` y `tabular-nums` por lo mismo: que todos los dígitos midan
        igual. Con tipografía proporcional el reloj se desplaza cada vez que un 1
        sustituye a un 8, y un número que tiembla en el centro de una pantalla
        negra es lo único que se mueve, así que se mira más que el trabajo.
      */}
      <p
        role="timer"
        aria-live="off"
        className={`font-mono text-[3.75rem] font-bold leading-none tabular-nums tracking-tight
                    transition-colors duration-500 sm:text-7xl
                    ${isDone ? 'text-emerald-400' : 'text-white'}`}
      >
        {formatClock(seconds)}
      </p>

      <AdjustButton sign={-1} onAdjust={onAdjust} disabled={!canSubtract} />
    </div>
  );
}
