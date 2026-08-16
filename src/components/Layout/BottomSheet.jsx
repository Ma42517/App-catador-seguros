import { useState, useEffect, useLayoutEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

/** Duración del slide-up/down; debe coincidir con la clase duration-300. */
const ANIM_MS = 300;

/**
 * Hoja inferior reutilizable con estética iOS.
 *
 * Se monta y desmonta con retardo para que la hoja pueda animar tanto la
 * entrada como la salida (un `if (!isOpen) return null` directo mataría la
 * animación de cierre). Cierra con Escape y al tocar el fondo, y congela el
 * scroll de la página mientras está abierta.
 *
 * SE DIBUJA EN UN PORTAL A `document.body`, Y ES LO QUE HACE QUE FUNCIONE.
 *
 * `position: fixed` no siempre se mide contra la ventana: cualquier antepasado con
 * `transform`, `filter` o `backdrop-filter` distinto de `none` se convierte en su
 * bloque contenedor. En esta app pasaba de verdad: `.animate-rise` —la entrada de
 * cada paso del diagnóstico— se declara con `animation-fill-mode: both`, así que al
 * terminar conserva el `transform: translateY(0)` de su último fotograma para
 * siempre. La hoja quedaba anclada al paso en lugar de a la pantalla: aparecía a
 * media página, se salía por abajo y su `max-h-[85vh]` no recortaba nada, así que
 * tampoco había scroll interno. Desde el portal ya no hay antepasado que la
 * contenga, ni ahora ni el día que alguien añada otra animación.
 */
export default function BottomSheet({ isOpen, onClose, label, children }) {
  const [isMounted, setIsMounted] = useState(isOpen);
  const [isShown, setIsShown] = useState(false);

  /*
    El tema no se hereda a través de un portal.

    Las clases `dark:` dependen de tener un `.dark` por encima en el árbol del DOM, y
    el Diagnóstico 360 fuerza esa clase en su propio contenedor, no en la raíz. Al
    saltar a `document.body` la hoja se quedaba fuera de ese contenedor y salía en
    tema claro —fondo casi blanco— en medio de una pantalla negra.

    El ancla se queda en el sitio original del árbol y sólo sirve para preguntar, con
    `closest`, si a la hoja le tocaba ser oscura. Se resuelve en un efecto de
    disposición, antes de pintar, para que no se vea un fogonazo claro.
  */
  const anchorRef = useRef(null);
  const [isDarkContext, setDarkContext] = useState(false);

  useLayoutEffect(() => {
    if (isOpen) setDarkContext(!!anchorRef.current?.closest('.dark'));
  }, [isOpen]);

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

  const anchor = <span ref={anchorRef} className="hidden" aria-hidden="true" />;

  if (!isMounted) return anchor;

  return (
    <>
      {anchor}
      {createPortal(
        <div className={isDarkContext ? 'dark' : undefined}>
          <div className="fixed inset-0 z-[60]" role="dialog" aria-modal="true" aria-label={label}>
            <button
              type="button"
              aria-label="Cerrar"
              onClick={onClose}
              className={`absolute inset-0 h-full w-full cursor-default bg-black/60 backdrop-blur-sm
                          transition-opacity duration-300 ${isShown ? 'opacity-100' : 'opacity-0'}`}
            />

            {/*
              `overscroll-contain` corta el encadenamiento del scroll: sin él, al llegar
              al final de la hoja el gesto seguía desplazando la página de detrás.
            */}
            <div
              className={`absolute bottom-0 left-0 right-0 mx-auto flex max-h-[85vh] w-full max-w-lg
                          transform flex-col overflow-y-auto overscroll-contain rounded-t-3xl
                          bg-zinc-50 px-6 pt-6 shadow-2xl transition-transform duration-300
                          ease-out pb-[max(1.5rem,env(safe-area-inset-bottom))] dark:bg-zinc-900
                          ${isShown ? 'translate-y-0' : 'translate-y-full'}`}
            >
              <div
                className="mx-auto mb-6 h-1.5 w-12 shrink-0 rounded-full bg-zinc-300 dark:bg-zinc-700"
                aria-hidden="true"
              />
              {children}
            </div>
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}
