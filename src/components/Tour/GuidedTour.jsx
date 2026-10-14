import { useState, useEffect, useLayoutEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';

/**
 * src/components/Tour/GuidedTour.jsx
 *
 * Motor de los mini-tutoriales tipo "spotlight" (Call of Duty): el fondo se
 * oscurece y queda iluminado sólo el elemento del paso actual, con una tarjeta
 * que lo explica y una flecha que lo señala.
 *
 * ── Cómo ilumina (opción recorte, no interactivo) ──
 * No clona ni mueve el elemento real: dibuja un rectángulo transparente sobre su
 * posición y le da un `box-shadow` ENORME de color oscuro, que tapa toda la
 * pantalla MENOS ese rectángulo. Así el elemento se ve "iluminado" sin tocar el
 * DOM de la app, y el fondo entero queda bloqueado al tacto (sólo se avanza con
 * los botones de la tarjeta). Un halo verde suave rodea el recorte.
 *
 * ── Posicionamiento ──
 * Lee la posición real del elemento con `getBoundingClientRect()` y recoloca el
 * recorte y la tarjeta en cada cambio de paso, al redimensionar y al hacer
 * scroll. La tarjeta se pone debajo del elemento si hay sitio, o arriba si no,
 * para no salirse de la pantalla en móvil ni en escritorio.
 *
 * ── Reutilizable ──
 * No sabe nada de "Hoy": recibe `steps` (de `lib/tours.js`), el `name` para
 * personalizar el saludo, y avisa con `onFinish`/`onSkip`. Sirve igual para los
 * tutoriales de las otras pestañas.
 */

const PAD = 10; // Aire alrededor del elemento iluminado.
const CARD_W = 320; // Ancho de referencia de la tarjeta.
const GAP = 14; // Separación entre el recorte y la tarjeta.

/**
 * Lee el rect del elemento marcado con `data-tour={target}`, o null si todavía
 * no existe o no está REALMENTE visible. "Visible" aquí es estricto a propósito:
 * la pantalla "Hoy" entra con una máquina de escribir y un fundido, así que un
 * elemento puede estar ya en el DOM pero con `opacity: 0` o aún sin tamaño. Si se
 * iluminara en ese estado, el tour señalaría un hueco vacío (como pasó: el botón
 * "+" todavía no había aparecido). Devolver null mantiene el tour en espera.
 */
function readRect(target) {
  const el = document.querySelector(`[data-tour="${target}"]`);
  if (!el) return null;

  const r = el.getBoundingClientRect();
  // Sin tamaño real → aún no montado/medible.
  if (r.width === 0 && r.height === 0) return null;
  // Fuera del viewport (todavía por entrar) → esperar.
  if (r.bottom < 0 || r.top > window.innerHeight) return null;

  /*
    Opacidad del elemento o de cualquier ancestro cercano: si algo en la cadena
    está en transición de fundido (opacity < 1), aún no "terminó de aparecer".
    Se recorre hacia arriba unos niveles, que es donde viven los wrappers con
    `transition-opacity` de AISequence.
  */
  let node = el;
  for (let i = 0; i < 6 && node; i += 1) {
    const op = parseFloat(window.getComputedStyle(node).opacity);
    if (!Number.isNaN(op) && op < 0.99) return null;
    node = node.parentElement;
  }

  return r;
}

export default function GuidedTour({
  isOpen, steps, name = '', onFinish, onSkip,
}) {
  const [index, setIndex] = useState(0);
  const [rect, setRect] = useState(null);
  const [shown, setShown] = useState(false);

  const total = steps?.length ?? 0;
  const step = steps?.[index] ?? null;
  const isLast = index === total - 1;

  // Al abrir, arranca en el primer paso y hace el fundido de entrada.
  useEffect(() => {
    if (isOpen) {
      setIndex(0);
      const raf = requestAnimationFrame(() => setShown(true));
      return () => cancelAnimationFrame(raf);
    }
    setShown(false);
    return undefined;
  }, [isOpen]);

  // Mide el elemento del paso actual; re-mide al cambiar de paso, al
  // redimensionar y al hacer scroll (el layout puede moverse).
  const measure = useCallback(() => {
    if (!isOpen || !step) return null;
    const r = readRect(step.target);
    setRect(r);
    return r;
  }, [isOpen, step]);

  /*
    Espera ACTIVA a que el elemento del paso aparezca y esté visible. La pantalla
    "Hoy" entra con una animación (máquina de escribir + fundido), así que al
    arrancar el tour el elemento puede no estar listo todavía. En vez de adivinar
    un tiempo fijo, se reintenta la medición cada 150 ms hasta que `readRect`
    devuelve algo (ya visible); mientras tanto `rect` es null y no se pinta ni el
    recorte ni la tarjeta —el tour queda "esperando" sin señalar un hueco vacío—.
    Un tope de ~8 s evita quedarse reintentando para siempre si un paso apunta a
    algo que de verdad no existe.
  */
  useLayoutEffect(() => {
    if (!isOpen) return undefined;

    setRect(null); // Cada paso arranca "esperando" hasta confirmar su elemento.
    let tries = 0;
    const poll = setInterval(() => {
      tries += 1;
      const r = measure();
      if (r || tries > 50) clearInterval(poll);
    }, 150);

    window.addEventListener('resize', measure);
    window.addEventListener('scroll', measure, true);
    return () => {
      clearInterval(poll);
      window.removeEventListener('resize', measure);
      window.removeEventListener('scroll', measure, true);
    };
  }, [measure, isOpen, index]);

  const finish = () => { setShown(false); setTimeout(() => onFinish?.(), 200); };
  const skip = () => { setShown(false); setTimeout(() => onSkip?.(), 200); };

  const next = () => {
    if (isLast) finish();
    else setIndex((i) => i + 1);
  };

  // Cerrar con Escape = omitir. Bloquea el scroll del fondo mientras está abierto.
  useEffect(() => {
    if (!isOpen) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') skip(); };
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  if (!isOpen || !step) return null;

  /*
    Mientras el elemento del paso no esté medido y visible (`rect` null), el tour
    NO pinta nada: ni el fondo oscuro ni la tarjeta. Así se evita el defecto de
    mostrar la tarjeta flotando en el centro sobre una pantalla a medio cargar
    —que es justo lo que se veía—. El polling del effect sigue intentando; en
    cuanto el elemento aparece y termina su fundido, se pinta todo de una vez.
  */
  if (!rect) return null;

  const vw = window.innerWidth;
  const vh = window.innerHeight;

  // Geometría del recorte iluminado.
  const hole = {
    top: rect.top - PAD,
    left: rect.left - PAD,
    width: rect.width + PAD * 2,
    height: rect.height + PAD * 2,
  };

  /*
    Posición de la tarjeta: debajo del elemento si cabe, si no arriba. Centrada
    horizontalmente respecto al elemento pero sin salirse de los bordes. Si no
    se encontró el elemento, la tarjeta se centra en la pantalla (respaldo).
  */
  let cardStyle;
  let caretBelow = false; // true = la flecha sale de la parte de ARRIBA de la tarjeta (elemento arriba).
  const spaceBelow = vh - (hole.top + hole.height);
  const placeBelow = spaceBelow > 220;
  const cx = hole.left + hole.width / 2;
  const left = Math.min(Math.max(cx - CARD_W / 2, 12), vw - CARD_W - 12);
  const caretLeft = Math.min(Math.max(cx, left + 24), left + CARD_W - 24);
  if (placeBelow) {
    cardStyle = { top: hole.top + hole.height + GAP, left, width: CARD_W };
    caretBelow = true;
  } else {
    cardStyle = { bottom: vh - hole.top + GAP, left, width: CARD_W };
    caretBelow = false;
  }

  const title = (step.title || '').replace('{name}', name || '');

  return createPortal(
    <div
      className={`fixed inset-0 z-[120] transition-opacity duration-200
                  ${shown ? 'opacity-100' : 'opacity-0'}`}
      role="dialog"
      aria-modal="true"
      aria-label={`Tutorial, paso ${index + 1} de ${total}`}
    >
      {/*
        Capa que oscurece y recorta: un rectángulo sobre el elemento con una
        sombra gigante que tapa todo MENOS ese hueco, más el aro verde. Tocar
        fuera de la tarjeta avanza el tour, para que quien no vea los botones
        igual pueda continuar.
      */}
      <div
        aria-hidden="true"
        onClick={next}
        className="absolute rounded-2xl transition-all duration-300"
        style={{
          top: hole.top,
          left: hole.left,
          width: hole.width,
          height: hole.height,
          boxShadow: '0 0 0 9999px rgba(0,0,0,0.62), 0 0 0 3px rgba(27,67,50,0.9), 0 0 24px 6px rgba(27,67,50,0.55)',
        }}
      />

      {/* ── Tarjeta del tutorial ── */}
      <div
        className="absolute rounded-2xl border-2 border-[#1B4332] bg-[#F9F6F0] p-4 text-left
                   shadow-2xl dark:border-emerald-500/60 dark:bg-zinc-900"
        style={cardStyle}
      >
        {/* Caret: triángulo que apunta al elemento. */}
        <span
          aria-hidden="true"
          className="fixed h-3 w-3 rotate-45 border-[#1B4332] bg-[#F9F6F0]
                     dark:border-emerald-500/60 dark:bg-zinc-900"
          style={caretBelow
            ? { top: (cardStyle.top ?? 0) - 6, left: caretLeft - 6, borderLeftWidth: 2, borderTopWidth: 2 }
            : { bottom: (cardStyle.bottom ?? 0) - 6, left: caretLeft - 6, borderRightWidth: 2, borderBottomWidth: 2 }}
        />

        {/* Badge: PASO X DE N 🌟 */}
        <span
          className="inline-flex items-center gap-1 rounded-full bg-[#1B4332] px-2.5 py-1
                     text-[11px] font-bold uppercase tracking-wide text-[#F9F6F0]
                     dark:bg-emerald-600"
        >
          Paso {index + 1} de {total} 🌟
        </span>

        <h2 className="mt-3 text-lg font-bold leading-snug text-[#231F1B] dark:text-white">
          {title}
        </h2>
        <p className="mt-1.5 text-base leading-relaxed text-[#5C5346] dark:text-zinc-300">
          {step.body}
        </p>

        <div className="mt-4 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={skip}
            className="rounded-full px-3 py-2 text-sm font-semibold text-[#5C5346]
                       transition-colors hover:text-[#231F1B] dark:text-zinc-400
                       dark:hover:text-white"
          >
            Omitir
          </button>
          <button
            type="button"
            onClick={next}
            className="rounded-full bg-[#1B4332] px-5 py-2.5 text-sm font-bold text-white
                       shadow-md transition-all hover:brightness-110 active:scale-95
                       dark:bg-emerald-600"
          >
            {isLast ? '¡Listo, empezar! ✓' : 'Entendido ➔'}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
