import { useState, useEffect } from 'react';

/** Duración del slide-up/down; debe coincidir con la clase duration-300. */
const ANIM_MS = 300;

/**
 * Hoja inferior reutilizable con estética iOS.
 *
 * Se monta y desmonta con retardo para que la hoja pueda animar tanto la
 * entrada como la salida (un `if (!isOpen) return null` directo mataría la
 * animación de cierre). Cierra con Escape y al tocar el fondo, y congela el
 * scroll de la página mientras está abierta.
 */
export default function BottomSheet({ isOpen, onClose, label, children }) {
  const [isMounted, setIsMounted] = useState(isOpen);
  const [isShown, setIsShown] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsMounted(true);
      // Un frame de margen para que la transición arranque desde el estado inicial.
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
    <div className="fixed inset-0 z-[60]" role="dialog" aria-modal="true" aria-label={label}>
      <button
        type="button"
        aria-label="Cerrar"
        onClick={onClose}
        className={`absolute inset-0 h-full w-full cursor-default bg-black/60 backdrop-blur-sm
                    transition-opacity duration-300 ${isShown ? 'opacity-100' : 'opacity-0'}`}
      />

      <div
        className={`absolute bottom-0 left-0 right-0 mx-auto flex max-h-[85vh] w-full max-w-lg
                    transform flex-col overflow-y-auto rounded-t-3xl bg-zinc-50 px-6 pt-6
                    shadow-2xl transition-transform duration-300 ease-out
                    pb-[max(1.5rem,env(safe-area-inset-bottom))] dark:bg-zinc-900
                    ${isShown ? 'translate-y-0' : 'translate-y-full'}`}
      >
        <div
          className="mx-auto mb-6 h-1.5 w-12 shrink-0 rounded-full bg-zinc-300 dark:bg-zinc-700"
          aria-hidden="true"
        />
        {children}
      </div>
    </div>
  );
}
