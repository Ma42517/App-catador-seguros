import { useEffect } from 'react';

/** Tiempo que permanece visible antes de retirarse solo. */
const VISIBLE_MS = 2600;

/**
 * Aviso flotante breve. Se sitúa por encima de las pantallas completas y las
 * hojas inferiores (z mayor) para que nunca quede tapado, y se retira solo:
 * un mensaje de confirmación no debería pedir una acción para desaparecer.
 */
export default function Toast({ message, onDone }) {
  useEffect(() => {
    if (!message) return undefined;
    const timer = setTimeout(onDone, VISIBLE_MS);
    return () => clearTimeout(timer);
  }, [message, onDone]);

  if (!message) return null;

  return (
    /*
      El centrado se hace con flex, no con `-translate-x-1/2`: los keyframes de
      `animate-rise` reescriben `transform` y anularían ese desplazamiento,
      dejando el aviso descuadrado a la derecha.
    */
    <div
      className="pointer-events-none fixed inset-x-0 bottom-10 z-[80] flex justify-center px-4"
    >
      <div
        role="status"
        className="animate-rise max-w-[90vw] rounded-full bg-zinc-900 px-4 py-2 text-center
                   text-xs font-semibold text-white shadow-xl ring-1 ring-white/10
                   dark:bg-zinc-800"
      >
        {message}
      </div>
    </div>
  );
}
