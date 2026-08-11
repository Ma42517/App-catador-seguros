import { useState, useEffect } from 'react';
import { ChevronLeft } from 'lucide-react';

/** Duración de la entrada y salida; debe coincidir con duration-300. */
const ANIM_MS = 300;

/**
 * Carcasa de pantalla completa con cabecera fija.
 *
 * Cubre todo, incluida la barra inferior (z superior a la de navegación), y
 * concentra el comportamiento que comparten estas vistas: montaje diferido
 * para poder animar entrada y salida, cierre con Escape y congelado del
 * scroll de fondo.
 */
/**
 * @param immersive Negro absoluto, sin título ni separadores, y el contenido
 *   ocupa toda la altura para poder centrarse. Es para las vistas donde la
 *   pantalla *es* la experiencia y no un contenedor de tarjetas: los bloques de
 *   enfoque, por ejemplo, donde una cabecera con borde gris rompería el efecto de
 *   estar dentro del cronómetro y no en una sección más de la app.
 *
 *   No respeta el tema claro a propósito. El fondo negro no es decoración: es lo
 *   que hace que el reloj y el resplandor del "+" sean lo único que se ve.
 */
export default function FullScreenView({
  isOpen, onClose, label, title, backLabel = 'Volver', wide = false,
  immersive = false, children,
}) {
  const [isMounted, setIsMounted] = useState(isOpen);
  const [isShown, setIsShown] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsMounted(true);
      const raf = requestAnimationFrame(() => setIsShown(true));
      return () => cancelAnimationFrame(raf);
    }
    setIsShown(false);
    const timer = setTimeout(() => setIsMounted(false), ANIM_MS);
    return () => clearTimeout(timer);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return undefined;
    const onKeyDown = (e) => { if (e.key === 'Escape') onClose(); };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen, onClose]);

  if (!isMounted) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={label ?? title}
      className={`fixed inset-0 z-[70] overflow-y-auto overscroll-contain
                  transition-all duration-300 ease-out
                  ${immersive ? 'bg-black' : 'bg-white dark:bg-black'}
                  ${isShown ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}
    >
      {/* Cabecera fija: acompaña al scroll del contenido */}
      <header
        className={`sticky top-0 z-20 ${immersive
          ? 'bg-transparent'
          : 'border-b border-zinc-200/70 bg-white/85 backdrop-blur-xl dark:border-zinc-800 dark:bg-black/85'}`}
      >
        <div className="relative mx-auto flex h-14 max-w-md items-center px-4">
          <button
            type="button"
            onClick={onClose}
            className={`relative z-10 -ml-1 flex items-center gap-0.5 rounded-lg py-1 pl-1 pr-2
                        text-sm font-semibold transition-colors ${immersive
              ? 'text-white/30 hover:text-white'
              : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-white'}`}
          >
            <ChevronLeft size={18} />
            {/*
              En modo inmersivo el botón se queda en el gesto y suelta la palabra:
              "Volver" en la esquina de una pantalla que sólo tiene un reloj es la
              única cosa que se puede leer, y se convierte en el centro de atención.
            */}
            {immersive ? <span className="sr-only">{backLabel}</span> : backLabel}
          </button>

          {/*
            El título va centrado respecto a la pantalla, no al espacio que deja
            el botón; `pointer-events-none` evita que tape el área táctil de
            "Volver" cuando el título es largo.
          */}
          {immersive ? (
            <h1 className="sr-only">{title}</h1>
          ) : (
            <h1
              className="pointer-events-none absolute left-1/2 -translate-x-1/2 text-lg font-bold
                         text-zinc-900 dark:text-white"
            >
              {title}
            </h1>
          )}
        </div>
      </header>

      {/*
        `wide` es para las vistas que necesitan dos columnas en escritorio. El
        ancho de lectura por omisión sigue siendo `max-w-md`: la mayoría de estas
        pantallas son formularios, y estirarlos sólo aleja la etiqueta del campo.
      */}
      <div
        className={immersive
          /*
            Alto de pantalla menos la cabecera, para que el contenido pueda
            centrarse de verdad. `100dvh` y no `100vh`: en móvil la barra del
            navegador se recoge al hacer scroll y con `vh` el centro se calcula
            contra una altura que ya no existe, dejando el reloj descentrado.
          */
          ? 'mx-auto flex min-h-[calc(100dvh-3.5rem)] w-full max-w-md flex-col px-6 pb-10'
          : `mx-auto px-4 pb-16 pt-5 ${wide ? 'max-w-6xl' : 'max-w-md'}`}
      >
        {children}
      </div>
    </div>
  );
}
