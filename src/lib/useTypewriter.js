import { useState, useEffect } from 'react';

/** Ritmo de escritura, en ms por letra. */
export const TYPE_MS = 30;

/** Si la persona pidió menos movimiento, el texto aparece completo de una vez. */
function prefersReducedMotion() {
  return typeof window !== 'undefined'
    && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Texto que se escribe solo, letra por letra.
 *
 * Vive aquí y no dentro de un componente porque ya hay pantallas que hablan
 * así —la bienvenida de inicio y el flujo de enfoque— y una segunda copia del
 * mismo intervalo se habría desviado de la primera en cuanto alguien tocara el
 * ritmo o la regla de accesibilidad.
 *
 * Devuelve también `isTyping`, que es lo que las pantallas usan para no revelar
 * los controles antes de terminar la frase: un botón que aparece a mitad de la
 * pregunta invita a contestar algo que todavía no se ha preguntado.
 *
 * `instant` salta la animación igual que "reducir movimiento": el texto
 * aparece completo desde el primer render, con `isTyping` ya en `false`. Lo
 * usa la Memoria de Sesión de `AISequence.jsx` — si la intro de "Hoy" ya se
 * vio esta sesión, no hay razón para volver a jugarla letra por letra cada
 * vez que se navega de ida y vuelta a esa pantalla.
 */
export default function useTypewriter(text, { speed = TYPE_MS, instant = false } = {}) {
  const skipAnimation = instant || prefersReducedMotion();

  /*
    El estado inicial ya resuelve el caso `skipAnimation`: sin esto, el
    primer render siempre arrancaría con `typed = ''` (así que `isTyping`
    sería `true` durante un fotograma) y sólo el efecto, que corre después
    de pintar, lo corregiría — un parpadeo de un cuadro que sobra por
    completo cuando lo que se pidió es que no haya demora alguna.
  */
  const [typed, setTyped] = useState(() => (skipAnimation ? text : ''));

  useEffect(() => {
    if (skipAnimation) {
      setTyped(text);
      return undefined;
    }

    setTyped('');
    let index = 0;
    const id = setInterval(() => {
      index += 1;
      setTyped(text.slice(0, index));
      if (index >= text.length) clearInterval(id);
    }, speed);

    return () => clearInterval(id);
  }, [text, speed, skipAnimation]);

  return { typed, isTyping: typed.length < text.length };
}
