import {
  useState, useEffect, useRef, useContext, createContext,
} from 'react';

/** Ritmo de escritura, en ms por letra. */
export const TYPE_MS = 30;

/*
  Multiplicador de velocidad compartido por todos los `useTypewriter` que
  viven dentro de un mismo `TypewriterSpeedContext.Provider`.

  Vale `1` (ritmo normal) fuera de cualquier Provider, así que el resto de
  la app —`AISequence.jsx`, `AdminLayout.jsx`, `ConversationalWizard.jsx`,
  `TypedLine.jsx`— sigue escribiendo a su ritmo de siempre sin tener que
  envolverse en nada: sólo `OnboardingFlow.jsx` y `FirstLoginIntro.jsx`
  proveen este contexto hoy, cada uno con su propio toque en pantalla que
  lo activa.
*/
export const TypewriterSpeedContext = createContext(1);

/** Si la persona pidió menos movimiento, el texto aparece completo de una vez. */
function prefersReducedMotion() {
  return typeof window !== 'undefined'
    && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Texto que se escribe solo, letra por letra.
 *
 * Vive aquí y no dentro de un componente porque ya hay dos pantallas que hablan
 * así —la bienvenida de inicio y el flujo de enfoque— y una segunda copia del
 * mismo intervalo se habría desviado de la primera en cuanto alguien tocara el
 * ritmo o la regla de accesibilidad.
 *
 * Devuelve también `isTyping`, que es lo que las pantallas usan para no revelar
 * los controles antes de terminar la frase: un botón que aparece a mitad de la
 * pregunta invita a contestar algo que todavía no se ha preguntado.
 *
 * La velocidad efectiva se ve reducida por `TypewriterSpeedContext`
 * (ver arriba) y se lee desde un `ref` en cada letra, no una sola vez al
 * montar: así, tocar la pantalla a media palabra hace que las letras que
 * faltan salgan más rápido a partir de ese instante, sin reiniciar lo que
 * ya se había escrito. Por eso el `useEffect` de abajo depende sólo de
 * `text` —un cambio de velocidad a mitad de camino no debe borrar el
 * avance— y usa una cadena de `setTimeout` en vez de un `setInterval` fijo,
 * que sí quedaría clavado en la velocidad que tenía al crearse.
 */
export default function useTypewriter(text, { speed = TYPE_MS } = {}) {
  const speedMultiplier = useContext(TypewriterSpeedContext);
  const speedRef = useRef(speed / speedMultiplier);
  speedRef.current = speed / speedMultiplier;

  const [typed, setTyped] = useState('');

  useEffect(() => {
    if (prefersReducedMotion()) {
      setTyped(text);
      return undefined;
    }

    setTyped('');
    let index = 0;
    let timeoutId;

    const tick = () => {
      index += 1;
      setTyped(text.slice(0, index));
      if (index >= text.length) return;
      timeoutId = setTimeout(tick, speedRef.current);
    };
    timeoutId = setTimeout(tick, speedRef.current);

    return () => clearTimeout(timeoutId);
    // Sólo `text` en las dependencias: la velocidad se lee en vivo desde
    // `speedRef` en cada `tick`, y meterla aquí reiniciaría el texto ya
    // escrito cada vez que alguien toca la pantalla para acelerarlo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text]);

  return { typed, isTyping: typed.length < text.length };
}
