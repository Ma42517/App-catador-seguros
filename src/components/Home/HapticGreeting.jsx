import { useState, useEffect, useMemo } from 'react';

/** Pausa entre palabras: el ritmo que hace sentir la revelación "cinematográfica". */
const WORD_MS = 220;

/** Si el usuario pidió menos movimiento, el texto aparece completo y sin vibrar. */
function prefersReducedMotion() {
  return typeof window !== 'undefined'
    && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Vibración seleccionar: si el navegador o el dispositivo no la soportan
 * (la mayoría de escritorio, Safari de iOS), `navigator.vibrate` ni siquiera
 * existe. Comprobarlo antes evita un error en cada palabra.
 */
function triggerVibration(pattern) {
  if (typeof navigator !== 'undefined' && navigator.vibrate) {
    navigator.vibrate(pattern);
  }
}

/**
 * Saludo de bienvenida con revelación palabra por palabra y vibración
 * sincronizada, estilo "Inception": cada palabra entra con un pulso corto, y
 * la última cierra la secuencia con un pulso más profundo.
 *
 * `accentWords` marca qué palabras (normalmente el nombre del asesor) se
 * pintan con el color de acento en vez del blanco puro del resto del texto.
 */
export default function HapticGreeting({ text, accentWords = [], className = '' }) {
  const words = useMemo(() => text.trim().split(/\s+/), [text]);
  const [count, setCount] = useState(prefersReducedMotion() ? words.length : 0);

  useEffect(() => {
    if (prefersReducedMotion()) {
      setCount(words.length);
      return undefined;
    }

    setCount(0);
    let index = 0;
    const id = setInterval(() => {
      index += 1;
      setCount(index);

      // Pulso corto por cada palabra; el de la última es más profundo, para
      // que la vibración cierre la frase igual que lo hace el ojo al leerla.
      triggerVibration(index === words.length ? [50, 100, 150] : 40);

      if (index >= words.length) clearInterval(id);
    }, WORD_MS);

    return () => clearInterval(id);
  }, [words]);

  // Sin marcas de puntuación ni tildes, para comparar "Juan" con "Juan," o
  // "Bosco." sin que la coma o el punto rompan la coincidencia.
  const isAccent = (word) => accentWords.some(
    (name) => word.toLowerCase().replace(/[.,¿?!]/g, '') === name.toLowerCase(),
  );

  return (
    <p className={`text-2xl font-bold tracking-tight md:text-3xl ${className}`}>
      <span className="sr-only">{text}</span>
      <span aria-hidden="true">
        {words.slice(0, count).map((word, index) => (
          <span
            key={`${word}-${index}`}
            className={`animate-fade-in-up mr-[0.35em] inline-block last:mr-0
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
