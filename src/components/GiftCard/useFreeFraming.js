import { useRef, useCallback } from 'react';
import { MIN_ZOOM, MAX_ZOOM } from '../../data/cardPhoto';

/**
 * Arrastre LIBRE de la foto sobre la tarjeta, como se mueve un icono en el
 * escritorio: se toma con el clic/dedo y se lleva a donde se quiera, incluso
 * fuera del marco. Es distinto de `usePhotoFraming` (mundo asesor), que sólo
 * recorre el sobrante de la imagen con `object-position` y por eso, con la foto
 * ajustada al marco, "no se movía": aquí la foto puede salirse, y el hueco que
 * deja se rellena con la propia foto difuminada (efecto tipo WhatsApp), no con
 * negro.
 *
 * El encuadre es { ox, oy, zoom }:
 *  · ox, oy → desplazamiento en PORCENTAJE del lado del marco. 0 = centrada.
 *             Positivo mueve la foto a la derecha/abajo. Puede pasarse de ±100.
 *  · zoom   → acercamiento, con los mismos límites que el resto de la app.
 *
 * No toca los píxeles del archivo: sólo tres números que el recorte final
 * traduce a un `drawImage`.
 */

const clamp = (v, min, max) => Math.min(max, Math.max(min, v));
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

/** Cuánto se deja arrastrar la foto fuera del marco, en % del lado. */
const OVERFLOW = 60;

export const DEFAULT_FREE_FOCUS = { ox: 0, oy: 0, zoom: 1 };

export function parseFreeFocus(raw) {
  const v = raw && typeof raw === 'object' ? raw : {};
  return {
    ox: Number.isFinite(Number(v.ox)) ? clamp(Number(v.ox), -OVERFLOW, OVERFLOW) : 0,
    oy: Number.isFinite(Number(v.oy)) ? clamp(Number(v.oy), -OVERFLOW, OVERFLOW) : 0,
    zoom: Number.isFinite(Number(v.zoom)) ? clamp(Number(v.zoom), MIN_ZOOM, MAX_ZOOM) : 1,
  };
}

export default function useFreeFraming({ focus, onChange }) {
  const frameRef = useRef(null);
  const pointers = useRef(new Map());
  const origin = useRef(null);

  const begin = useCallback(() => {
    const frame = frameRef.current;
    if (!frame) return;
    const list = [...pointers.current.values()];
    origin.current = {
      focus: parseFreeFocus(focus),
      width: frame.clientWidth,
      height: frame.clientHeight,
      spread: list.length >= 2 ? dist(list[0], list[1]) : null,
      point: list[0],
    };
  }, [focus]);

  const onPointerDown = useCallback((event) => {
    /*
      Sin `preventDefault`, el navegador arranca su PROPIO arrastre de imagen —el
      de "sacar la foto para guardarla"— y se queda con el gesto: se ve cómo se
      jala el PNG pero el encuadre no se mueve. Cancelarlo aquí es lo que deja el
      arrastre para nosotros. (Va con las imágenes en `draggable=false` y el
      contenedor en `touch-action: none`, que cubren el resto de los casos.)
    */
    event.preventDefault();
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    event.currentTarget.setPointerCapture?.(event.pointerId);
    begin();
  }, [begin]);

  const onPointerMove = useCallback((event) => {
    if (!pointers.current.has(event.pointerId)) return;
    event.preventDefault();
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    const start = origin.current;
    if (!start) return;
    const list = [...pointers.current.values()];

    // Dos dedos: pellizco para acercar.
    if (list.length >= 2 && start.spread) {
      const ratio = dist(list[0], list[1]) / start.spread;
      onChange({ ...start.focus, zoom: clamp(start.focus.zoom * ratio, MIN_ZOOM, MAX_ZOOM) });
      return;
    }

    // Un dedo: arrastre DIRECTO (la foto sigue al puntero, como un icono). Sin
    // invertir el signo y sin dividir por el zoom: se mueve tal cual el gesto.
    if (!start.point) return;
    const dx = ((list[0].x - start.point.x) / start.width) * 100;
    const dy = ((list[0].y - start.point.y) / start.height) * 100;
    onChange({
      ...start.focus,
      ox: clamp(start.focus.ox + dx, -OVERFLOW, OVERFLOW),
      oy: clamp(start.focus.oy + dy, -OVERFLOW, OVERFLOW),
    });
  }, [onChange]);

  const release = useCallback((event) => {
    pointers.current.delete(event.pointerId);
    if (pointers.current.size > 0) begin();
    else origin.current = null;
  }, [begin]);

  const stepZoom = useCallback((delta) => {
    const cur = parseFreeFocus(focus);
    onChange({ ...cur, zoom: clamp(cur.zoom + delta, MIN_ZOOM, MAX_ZOOM) });
  }, [focus, onChange]);

  return {
    frameRef,
    stepZoom,
    handlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp: release,
      onPointerCancel: release,
      // Corta el arrastre nativo de imagen del navegador, que si no se roba el gesto.
      onDragStart: (e) => e.preventDefault(),
    },
  };
}
