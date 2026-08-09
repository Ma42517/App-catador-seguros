import { useState, useEffect } from 'react';
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
 * Secuencia de inicio del panel principal, en dos fases:
 *
 *  1. Texto vivo: el mensaje se escribe solo, sin avatar, aro ni contenedor.
 *  2. Revelación: al caer la última letra, entran las tarjetas prioritarias
 *     y el contenido (`children`) con un fundido lento.
 */
export default function AISequence({ name, header, children }) {
  const { highPriorityToday } = useEvents();

  const saludo = name ? name.charAt(0).toUpperCase() + name.slice(1) : '';
  const text = buildMessage(saludo, highPriorityToday.length);

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

  // El encabezado y el contenido comparten el mismo fundido de la revelación.
  const revealClass = `transition-opacity duration-1000 ${isTyping ? 'opacity-0' : 'opacity-100'}`;

  return (
    <>
      {/* Encabezado (saludo y día): se revela junto con el contenido para no
          romper el momento de texto puro de la primera fase. */}
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

    </>
  );
}
