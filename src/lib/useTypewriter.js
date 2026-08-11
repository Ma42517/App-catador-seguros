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
 * Vive aquí y no dentro de un componente porque ya hay dos pantallas que hablan
 * así —la bienvenida de inicio y el flujo de enfoque— y una segunda copia del
 * mismo intervalo se habría desviado de la primera en cuanto alguien tocara el
 * ritmo o la regla de accesibilidad.
 *
 * Devuelve también `isTyping`, que es lo que las pantallas usan para no revelar
 * los controles antes de terminar la frase: un botón que aparece a mitad de la
 * pregunta invita a contestar algo que todavía no se ha preguntado.
 */
export default function useTypewriter(text, { speed = TYPE_MS } = {}) {
  const [typed, setTyped] = useState('');

  useEffect(() => {
    if (prefersReducedMotion()) {
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
  }, [text, speed]);

  return { typed, isTyping: typed.length < text.length };
}
