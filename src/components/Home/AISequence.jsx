import { useState, useEffect } from 'react';
import { Pointer } from 'lucide-react';
import { useEvents } from '../../context/EventContext';
import ActionableCard from '../Activities/ActionableCard';

/** Ritmo de escritura, en ms por letra. */
const TYPE_MS = 30;

/** Si el usuario pidió menos movimiento, el texto aparece completo de una vez. */
function prefersReducedMotion() {
  return typeof window !== 'undefined'
    && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
}

/** El mensaje cambia según lo que haya en la agenda de hoy. */
function buildMessage(saludo, pendientes) {
  const nombre = saludo ? `, ${saludo}` : '';
  if (pendientes > 0) {
    // Se cuida el singular: "1 evento pendiente", no "1 eventos pendientes".
    const cuenta = pendientes === 1
      ? '1 evento pendiente'
      : `${pendientes} eventos pendientes`;
    return `Hola${nombre}. Tienes ${cuenta} para hoy. Empecemos por aquí...`;
  }
  return `Gran semana${nombre}. La agenda está libre. `
    + '¿Cerramos algún negocio pendiente hoy? Empieza por aquí...';
}

/**
 * Secuencia de inicio del panel principal, en tres fases:
 *
 *  1. Texto vivo: el mensaje se escribe solo, sin avatar, aro ni contenedor.
 *  2. Revelación: al caer la última letra, entran las tarjetas prioritarias
 *     y el contenido (`children`) con un fundido lento.
 *  3. Guía: una mano apuntando flota sobre el botón "+" y se retira en cuanto
 *     el usuario interactúa, para no estorbar una vez cumplido su propósito.
 */
export default function AISequence({ name, header, children }) {
  const { highPriorityToday } = useEvents();

  const saludo = name ? name.charAt(0).toUpperCase() + name.slice(1) : '';
  const text = buildMessage(saludo, highPriorityToday.length);

  const [typed, setTyped] = useState('');
  const [hasInteracted, setHasInteracted] = useState(false);
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

  // La guía cumple su función una sola vez: al primer toque o tecla, se va.
  useEffect(() => {
    const onFirst = () => setHasInteracted(true);
    window.addEventListener('pointerdown', onFirst, { once: true });
    window.addEventListener('keydown', onFirst, { once: true });
    return () => {
      window.removeEventListener('pointerdown', onFirst);
      window.removeEventListener('keydown', onFirst);
    };
  }, []);

  const revealClass = `transition-opacity duration-1000 ${isTyping ? 'opacity-0' : 'opacity-100'}`;
  const showGuide = !isTyping && !hasInteracted;

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
      <div className="flex min-h-[60vh] flex-col items-center justify-center px-6">
        {/* El mensaje completo, para lectores de pantalla. */}
        <p className="sr-only">{text}</p>

        <p
          className="max-w-md text-center text-xl font-light text-zinc-800 dark:text-white"
          aria-hidden="true"
        >
          {typed}
          {isTyping && <span className="animate-pulse text-amber-400">|</span>}
        </p>

        {/* Eventos de máxima prioridad para hoy, accionables al tocarlos */}
        {highPriorityToday.length > 0 && (
          <ul className={`mt-10 w-full max-w-md ${revealClass}`} aria-hidden={isTyping}>
            {highPriorityToday.map((event) => (
              <li key={event.id} className="mb-3">
                <ActionableCard event={event} />
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Fase 2 — revelación del contenido */}
      {children && (
        <div className={revealClass} aria-hidden={isTyping}>
          {children}
        </div>
      )}

      {/* Fase 3 — mano guiadora sobre el botón "+" */}
      <div
        className={`fixed bottom-24 left-1/2 z-50 -translate-x-1/2 transition-opacity duration-700
                    ${showGuide ? 'opacity-100' : 'pointer-events-none opacity-0'}`}
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
