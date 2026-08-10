import { useState, useEffect, useMemo } from 'react';

/** Pausa entre palabras: el ritmo que hace sentir la revelación "cinematográfica". */
const WORD_MS = 220;

/** Si el usuario pidió menos movimiento, el texto aparece completo y sin vibrar. */
function prefersReducedMotion() {
  return typeof window !== 'undefined'
    && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
}

/*
  Chrome en Android bloquea `navigator.vibrate` hasta que la persona haya
  dado al menos un toque en la página: es una protección contra sitios que
  vibran el teléfono sin permiso. Si la sesión ya estaba guardada, la app pasa
  de la pantalla de introducción directo a "Hoy" sin que haya mediado ningún
  toque todavía, y ese primer intento de vibrar se descarta en silencio (sin
  error, simplemente no pasa nada).

  Por eso se registra un oyente a nivel de módulo —una sola vez, al cargar el
  archivo— que marca el primer toque real en cualquier parte del documento.
  Vibrar sólo se intenta después de esa marca.
*/
let hasUserInteracted = false;

if (typeof window !== 'undefined') {
  const markInteracted = () => { hasUserInteracted = true; };
  const opts = { once: true, capture: true, passive: true };
  window.addEventListener('pointerdown', markInteracted, opts);
  window.addEventListener('touchstart', markInteracted, opts);
  window.addEventListener('keydown', markInteracted, opts);
}

/**
 * Vibración segura: si el navegador o el dispositivo no la soportan (la
 * mayoría de escritorio, Safari de iOS) `navigator.vibrate` ni siquiera
 * existe, y si todavía no hubo un primer toque en la página, Android la
 * bloquea aunque exista. Comprobar ambas cosas evita un error o un intento
 * que de todas formas no iba a sentirse.
 */
function triggerVibration(pattern) {
  if (hasUserInteracted && typeof navigator !== 'undefined' && navigator.vibrate) {
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
