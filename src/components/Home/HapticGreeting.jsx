import { useState, useEffect, useMemo } from 'react';

/**
 * Tiempo que tarda en aparecer cada palabra.
 *
 * Deliberadamente lento: cada palabra lleva su propio pulso, y por debajo de
 * ~250 ms los pulsos se encadenan y el motor del teléfono se siente como un
 * zumbido continuo en lugar de un golpeteo con ritmo.
 */
const WORD_MS = 350;

/** Pulso de una palabra: corto y seco, un "tic". */
const TICK_MS = 15;

/** Pulso de cierre de la frase: golpe-pausa-golpe, para marcar el final. */
const FINAL_PATTERN = [20, 50, 20];

/** Si el usuario pidió menos movimiento, el texto aparece completo y sin vibrar. */
function prefersReducedMotion() {
  return typeof window !== 'undefined'
    && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Saludo de bienvenida con revelación palabra por palabra y vibración
 * sincronizada 1:1 con el texto.
 *
 * La secuencia no la lleva un `setInterval` que corre por su cuenta, sino una
 * cadena de `setTimeout` gobernada por `visibleIndex`: cada palabra que entra
 * programa la siguiente, y el pulso se dispara en el mismo momento en que el
 * índice avanza. Así no hay forma de que el texto y la vibración se separen,
 * que es lo que pasaba cuando el temporizador y el render iban por caminos
 * distintos.
 *
 * El `clearTimeout` del cierre es lo que evita que el teléfono siga vibrando
 * si la persona cambia de pantalla a media frase.
 *
 * `accentWords` marca qué palabras (normalmente el nombre del asesor) se
 * pintan con el color de acento en vez del color de texto normal.
 */
export default function HapticGreeting({ text, accentWords = [], className = '' }) {
  const words = useMemo(() => text.trim().split(/\s+/), [text]);
  const reduced = prefersReducedMotion();

  const [visibleIndex, setVisibleIndex] = useState(() => (reduced ? words.length : 0));

  // Si el saludo cambia (otro nombre, otra hora del día) la secuencia
  // vuelve a empezar en lugar de quedarse a medias con el texto nuevo.
  useEffect(() => {
    setVisibleIndex(reduced ? words.length : 0);
  }, [words, reduced]);

  useEffect(() => {
    if (reduced) return undefined;
    if (visibleIndex >= words.length) return undefined;

    const timer = setTimeout(() => {
      const isLastWord = visibleIndex === words.length - 1;

      // El avance del índice y el pulso ocurren juntos: la palabra se pinta y
      // el teléfono responde en el mismo tic, no uno detrás del otro.
      setVisibleIndex(visibleIndex + 1);

      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(isLastWord ? FINAL_PATTERN : TICK_MS);
      }
    }, WORD_MS);

    // Cambiar de pantalla a media frase corta la cadena aquí mismo.
    return () => clearTimeout(timer);
  }, [visibleIndex, words, reduced]);

  // Sin marcas de puntuación, para comparar "Juan" con "Juan," o "Bosco."
  // sin que la coma o el punto rompan la coincidencia.
  const isAccent = (word) => accentWords.some(
    (name) => word.toLowerCase().replace(/[.,¿?!]/g, '') === name.toLowerCase(),
  );

  return (
    <p className={`text-2xl font-bold tracking-tight md:text-3xl ${className}`}>
      {/* La frase completa, de una pieza, para lectores de pantalla. */}
      <span className="sr-only">{text}</span>

      <span aria-hidden="true">
        {/*
          Todas las palabras se montan desde el principio y sólo cambian de
          opacidad. Ocupar el espacio desde el inicio evita que el texto salte
          de línea mientras se escribe, y sin `delay` en la transición la
          palabra aparece exactamente cuando avanza el índice.
        */}
        {words.map((word, index) => (
          <span
            key={`${word}-${index}`}
            className={`mr-[0.28em] inline-block transition-opacity duration-150 last:mr-0
                        ${index < visibleIndex ? 'opacity-100' : 'opacity-0'}
                        ${isAccent(word)
                          ? 'text-indigo-600 dark:text-indigo-400'
                          : 'text-zinc-900 dark:text-white'}`}
          >
            {word}
          </span>
        ))}
      </span>
    </p>
  );
}
