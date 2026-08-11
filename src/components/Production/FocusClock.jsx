import { useState, useRef, useEffect } from 'react';
import { Plus, Minus } from 'lucide-react';
import { formatClock } from '../../data/timeBlocks';
import { tapFeedback } from '../../lib/haptics';

/** Cuánto se mueve el reloj con cada toque. */
export const STEP_SEC = 30;

/** Cuánto dura el "+30" antes de volver a ser un signo. */
const FLASH_MS = 500;

/**
 * Botón de ajuste que se convierte en su propio resultado.
 *
 * Al tocarlo, el signo se va y en su lugar salta un "+30". Es la única prueba de
 * que el toque contó: el reloj pasa de 24:30 a 25:00 y ese cambio de un dígito se
 * pierde de vista con facilidad, más aún tocando dos veces seguidas. El brinco
 * ocurre donde está el dedo, no en el reloj, que es donde la persona está mirando.
 */
function AdjustButton({ delta, disabled, onAdjust }) {
  /*
    `id` acompaña al texto para poder reiniciar la animación. Sin él, dos toques
    seguidos reutilizan el mismo elemento y el segundo brinco no ocurre: el
    navegador considera que esa animación ya se reprodujo.
  */
  const [flash, setFlash] = useState(null);
  const timer = useRef(null);

  // Un temporizador vivo tras desmontar dejaría un `setState` sobre un
  // componente que ya no existe.
  useEffect(() => () => clearTimeout(timer.current), []);

  const press = () => {
    onAdjust(delta);
    tapFeedback();

    setFlash({ id: Date.now() });
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setFlash(null), FLASH_MS);
  };

  const label = `${delta > 0 ? '+' : '-'}${Math.abs(delta)}`;
  const Icon = delta > 0 ? Plus : Minus;

  return (
    <button
      type="button"
      onClick={press}
      disabled={disabled}
      aria-label={`${delta > 0 ? 'Sumar' : 'Quitar'} ${Math.abs(delta)} segundos`}
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
      <AdjustButton delta={STEP_SEC} onAdjust={onAdjust} />

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

      <AdjustButton delta={-STEP_SEC} onAdjust={onAdjust} disabled={!canSubtract} />
    </div>
  );
}
