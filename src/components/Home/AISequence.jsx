import { useState, useEffect } from 'react';
import { Pointer } from 'lucide-react';

/** Ritmo de escritura, en ms por letra. */
const TYPE_MS = 30;

/** Si el usuario pidió menos movimiento, el texto aparece completo de una vez. */
function prefersReducedMotion() {
  return typeof window !== 'undefined'
    && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Secuencia de inicio del panel principal, en tres fases:
 *
 *  1. Texto vivo: el mensaje se escribe solo, sin avatar, aro ni contenedor.
 *  2. Revelación: al caer la última letra, el contenido (`children`) entra
 *     con un fundido lento.
 *  3. Guía: una mano apuntando aparece flotando sobre el botón "+".
 *
 * El alto del bloque del mensaje es fijo para que la revelación no empuje el
 * texto: el contenido aparece, no desplaza.
 */
export default function AISequence({ name, header, children }) {
  const saludo = name ? name.charAt(0).toUpperCase() + name.slice(1) : '';
  const text = `Gran semana${saludo ? `, ${saludo}` : ''}. `
    + '¿Cerramos algún negocio pendiente hoy? Empieza por aquí...';

  const [typed, setTyped] = useState('');
  const isTyping = typed.length < text.length;

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
    }, TYPE_MS);
    return () => clearInterval(id);
  }, [text]);

  // El encabezado y el contenido comparten el mismo fundido de la fase 2.
  const revealClass = `transition-opacity duration-1000 ${isTyping ? 'opacity-0' : 'opacity-100'}`;

  return (
    <>
      {/* Encabezado (saludo y día): se revela junto con el contenido para no
          romper el momento de texto puro de la fase 1. */}
      {header && (
        <div className={revealClass} aria-hidden={isTyping}>
          {header}
        </div>
      )}

      {/* Fase 1 — texto vivo, sin contenedor */}
      <div className="flex min-h-[60vh] items-center justify-center px-6">
        {/* El mensaje completo, para lectores de pantalla. */}
        <p className="sr-only">{text}</p>

        <p
          className="max-w-md text-center text-xl font-light text-zinc-800 dark:text-white"
          aria-hidden="true"
        >
          {typed}
          {isTyping && <span className="animate-pulse text-amber-400">|</span>}
        </p>
      </div>

      {/* Fase 2 — revelación del contenido */}
      {children && (
        <div className={revealClass} aria-hidden={isTyping}>
          {children}
        </div>
      )}

      {/* Fase 3 — mano guiadora sobre el botón "+" */}
      <div
        className={`fixed bottom-24 left-1/2 z-50 -translate-x-1/2 transition-opacity duration-1000
                    ${isTyping ? 'opacity-0' : 'opacity-100'}`}
        aria-hidden="true"
      >
        {/*
          El rebote va en el contenedor y el giro en el ícono: los keyframes de
          animate-bounce reescriben `transform`, así que una rotación en el
          mismo elemento se perdería al animar.
        */}
        <span className="block animate-bounce">
          <Pointer
            size={26}
            strokeWidth={1.25}
            className="rotate-180 text-amber-400 drop-shadow-[0_0_10px_rgba(251,191,36,0.45)]"
          />
        </span>
      </div>
    </>
  );
}
