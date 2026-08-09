import { useState, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';

const DEFAULT_TEXT =
  'Hola, Marco. Tienes un excelente ritmo esta semana. '
  + '¿Qué te parece si agendamos una cita más hoy?';

/** Ritmo de escritura y cuánto permanece el cursor al terminar. */
const TYPE_MS = 30;
const CURSOR_LINGER_MS = 2000;

/** Si el usuario pidió menos movimiento, el texto aparece completo de una vez. */
function prefersReducedMotion() {
  return typeof window !== 'undefined'
    && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Asistente virtual: aro de luz dorado con escritura en vivo.
 *
 * El aro late mientras escribe y respira lento al terminar; después aparece la
 * guía dorada que conduce la mirada al botón central de la barra inferior.
 */
export default function GoldenAssistant({ text = DEFAULT_TEXT }) {
  const [typed, setTyped] = useState('');
  const [showCursor, setShowCursor] = useState(true);

  const isTyping = typed.length < text.length;

  // Escritura letra por letra.
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

  // El cursor se retira dos segundos después de terminar.
  useEffect(() => {
    if (isTyping) {
      setShowCursor(true);
      return undefined;
    }
    const id = setTimeout(() => setShowCursor(false), CURSOR_LINGER_MS);
    return () => clearTimeout(id);
  }, [isTyping]);

  return (
    <div className="mt-10 flex flex-col items-center">
      {/* Aro dorado */}
      <div
        className={`h-16 w-16 rounded-full border border-amber-400/80
                    shadow-[0_0_20px_rgba(251,191,36,0.4)]
                    ${isTyping ? 'animate-ring-active' : 'animate-breathe'}`}
        aria-hidden="true"
      />

      {/*
        El texto animado se oculta a los lectores de pantalla para que no lo
        anuncien letra por letra; en su lugar se expone el mensaje completo.
      */}
      <p className="sr-only">{text}</p>

      <p
        className="mt-6 max-w-sm text-center text-lg font-medium text-zinc-700 dark:text-zinc-200"
        aria-hidden="true"
      >
        {typed}
        {showCursor && <span className="animate-pulse text-amber-400">|</span>}
      </p>

      {/* Guía dorada: aparece con fade-in al terminar de escribir */}
      <div
        className={`mt-8 flex flex-col items-center transition-opacity duration-1000
                    ${isTyping ? 'opacity-0' : 'opacity-100'}`}
        aria-hidden="true"
      >
        <span className="h-14 w-px bg-gradient-to-b from-amber-400/80 to-transparent" />
        <ChevronDown size={18} className="-mt-1 animate-bounce text-amber-400" />
      </div>
    </div>
  );
}
