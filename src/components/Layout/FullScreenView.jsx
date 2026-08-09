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
export default function FullScreenView({ isOpen, onClose, label, title, backLabel = 'Volver', children }) {
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
      className={`fixed inset-0 z-[70] overflow-y-auto overscroll-contain bg-white
                  transition-all duration-300 ease-out dark:bg-black
                  ${isShown ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}
    >
      {/* Cabecera fija: acompaña al scroll del contenido */}
      <header
        className="sticky top-0 z-20 border-b border-zinc-200/70 bg-white/85 backdrop-blur-xl
                   dark:border-zinc-800 dark:bg-black/85"
      >
        <div className="relative mx-auto flex h-14 max-w-md items-center px-4">
          <button
            type="button"
            onClick={onClose}
            className="relative z-10 -ml-1 flex items-center gap-0.5 rounded-lg py-1 pl-1 pr-2
                       text-sm font-semibold text-zinc-500 transition-colors
                       hover:text-zinc-900 dark:hover:text-white"
          >
            <ChevronLeft size={18} />
            {backLabel}
          </button>

          {/*
            El título va centrado respecto a la pantalla, no al espacio que deja
            el botón; `pointer-events-none` evita que tape el área táctil de
            "Volver" cuando el título es largo.
          */}
          <h1
            className="pointer-events-none absolute left-1/2 -translate-x-1/2 text-lg font-bold
                       text-zinc-900 dark:text-white"
          >
            {title}
          </h1>
        </div>
      </header>

      <div className="mx-auto max-w-md px-4 pb-16 pt-5">{children}</div>
    </div>
  );
}
