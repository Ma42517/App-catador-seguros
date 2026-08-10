import { useState, useEffect, useMemo } from 'react';

/** Tiempo que tarda en aparecer cada palabra. */
const WORD_MS = 220;

/** Si el usuario pidió menos movimiento, el texto aparece completo de una vez. */
function prefersReducedMotion() {
  return typeof window !== 'undefined'
    && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Saludo de bienvenida que entra palabra por palabra.
 *
 * No vibra, y no es un olvido. Una vibración de bienvenida no se siente en
 * ningún teléfono: Chrome en Android la descarta mientras la persona no haya
 * tocado la página, y WebKit —todo navegador en iPhone— no implementa la API.
 * Además, un teléfono que vibra solo al abrir la app se siente como una
 * notificación que nadie pidió. El golpe al tacto vive donde sí aporta y sí
 * funciona: en los botones y en los avisos del cronómetro (`src/lib/haptics.js`).
 *
 * La secuencia la lleva una cadena de `setTimeout` gobernada por
 * `visibleIndex`: cada palabra programa la siguiente, y el `clearTimeout` del
 * cierre evita que siga corriendo si la persona cambia de pantalla a media
 * frase.
 *
 * `accentWords` marca qué palabras (normalmente el nombre del asesor) se
 * pintan con el color de acento en vez del color de texto normal.
 */
export default function WelcomeGreeting({ text, accentWords = [], className = '' }) {
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

    const timer = setTimeout(() => setVisibleIndex(visibleIndex + 1), WORD_MS);

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
          de línea mientras se escribe.
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
