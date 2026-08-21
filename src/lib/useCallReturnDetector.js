import { useEffect, useRef, useCallback } from 'react';

/*
  Cuánto tiempo mínimo tiene que estar la pestaña oculta para contar como
  "se fue a hacer la llamada y volvió", y no como un cambio de pestaña de
  medio segundo (revisar una notificación, un parpadeo del sistema al
  abrir el marcador). Una llamada real —aunque nadie conteste— tarda al
  menos un par de segundos en sonar; por debajo de ese umbral es más
  probable que sea ruido que una llamada de verdad.
*/
const MIN_AWAY_MS = 2000;

/**
 * src/lib/useCallReturnDetector.js
 *
 * Detecta el regreso a la pestaña después de haber salido a hacer una
 * llamada (`tel:`), sin disparar falsos positivos.
 *
 * Dos guardas, no una sola, es lo que hace esto robusto:
 *
 *   1. **Armado explícito** (`arm()`): el detector no escucha nada hasta
 *      que la propia tarjeta lo activa, justo en el `onClick` del ícono de
 *      teléfono — cambiar de pestaña, minimizar el navegador o que llegue
 *      una notificación cualquier otro día no dispara nada, porque nadie
 *      llamó a `arm()`.
 *   2. **Tiempo mínimo fuera** (`MIN_AWAY_MS`): incluso armado, sólo cuenta
 *      si la pestaña estuvo oculta al menos ese tiempo. Un `tel:` que el
 *      sistema rechaza al instante (sin app de teléfono, por ejemplo)
 *      vuelve a "visible" casi de inmediato y no debe abrir el modal de
 *      feedback de una llamada que nunca ocurrió.
 *
 * El armado se consume solo: cada llamada a `arm()` cubre un único ciclo
 * oculto→visible, y no vuelve a dispararse hasta la siguiente vez que se
 * toque el ícono.
 *
 * @param {() => void} onReturn - Se llama una sola vez por cada ciclo armado que cumple el tiempo mínimo.
 * @returns {() => void} `arm` — llamar justo antes de abrir el `tel:`.
 */
export default function useCallReturnDetector(onReturn) {
  const armedRef = useRef(false);
  const hiddenAtRef = useRef(0);
  const onReturnRef = useRef(onReturn);
  onReturnRef.current = onReturn;

  const arm = useCallback(() => {
    armedRef.current = true;
    hiddenAtRef.current = 0;
  }, []);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!armedRef.current) return;

      if (document.visibilityState === 'hidden') {
        hiddenAtRef.current = Date.now();
        return;
      }

      // De vuelta a "visible": sólo cuenta si de verdad se había ocultado
      // antes (evita el caso raro de dos eventos "visible" consecutivos).
      if (document.visibilityState === 'visible' && hiddenAtRef.current) {
        const awayMs = Date.now() - hiddenAtRef.current;
        armedRef.current = false;
        hiddenAtRef.current = 0;
        if (awayMs >= MIN_AWAY_MS) onReturnRef.current?.();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  return arm;
}
