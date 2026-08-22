import { useEffect, useRef, useCallback } from 'react';

/*
  Red de seguridad: si pasado este tiempo desde que se armó el detector nunca
  llegó un aviso fiable de que la persona volvió, se abre el feedback de
  todos modos.

  Existe por el caso real que se reportó: en ciertos navegadores o
  dispositivos `tel:` no hace nada visible —no hay app de teléfono
  instalada, o el sistema simplemente lo ignora— así que la pestaña nunca
  pasa a "hidden" y nunca "regresa": sin esta red, el feedback no se abría
  ni en ese intento ni en ninguno de los siguientes, porque no había ningún
  evento real que lo disparara. Con la red, tocar el ícono de teléfono
  siempre termina abriendo el modal, tarde o temprano — que es justo lo que
  se pidió ("que siempre lo hiciera, independientemente").
*/
const FALLBACK_MS = 4000;

/**
 * src/lib/useCallReturnDetector.js
 *
 * Detecta el regreso a la pestaña después de haber salido a hacer una
 * llamada (`tel:`), armado explícitamente por quien toca el ícono
 * (`arm()`, justo antes de abrir el `tel:`) — cambiar de pestaña o que
 * llegue una notificación cualquier otro día no dispara nada, porque nadie
 * llamó a `arm()`.
 *
 * Dos señales de "regresé", no una sola:
 *   1. `visibilitychange` a "visible": el caso normal en celular, donde
 *      abrir el marcador sí manda la pestaña a segundo plano.
 *   2. `focus` de la ventana: cubre el escritorio, donde `tel:` a veces
 *      sólo muestra un diálogo de confirmación del sistema y la pestaña
 *      nunca llega a "hidden", pero sí pierde y recupera el foco.
 * Cualquiera de las dos que llegue primero abre el feedback; la otra, si
 * llega después, ya no hace nada (el armado se consume solo).
 *
 * Ya no hay un tiempo mínimo fuera antes de contar como regreso real: un
 * primer intento de esa guarda (para filtrar parpadeos) acabó bloqueando
 * regresos legítimos en ciertos navegadores, que es un daño mayor que el
 * de abrir el modal alguna vez de más. Entre "puede que sobre una vez" y
 * "puede que nunca abra", se eligió lo primero.
 *
 * @param {() => void} onReturn - Se llama una sola vez por cada ciclo armado.
 * @returns {() => void} `arm` — llamar justo antes de abrir el `tel:`.
 */
export default function useCallReturnDetector(onReturn) {
  const armedRef = useRef(false);
  const onReturnRef = useRef(onReturn);
  onReturnRef.current = onReturn;
  const timeoutRef = useRef(null);

  const clearFallback = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  };

  const fire = useCallback(() => {
    if (!armedRef.current) return;
    armedRef.current = false;
    clearFallback();
    onReturnRef.current?.();
  }, []);

  const arm = useCallback(() => {
    armedRef.current = true;
    clearFallback();
    timeoutRef.current = setTimeout(fire, FALLBACK_MS);
  }, [fire]);

  useEffect(() => {
    const onVisible = () => {
      // El evento de `visibilitychange` dispara en ambas direcciones; sólo
      // el regreso a "visible" cuenta como que la persona volvió.
      if (document.visibilityState === 'visible') fire();
    };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', fire);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', fire);
      clearFallback();
    };
  }, [fire]);

  return arm;
}
