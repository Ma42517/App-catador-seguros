import { useRef, useCallback } from 'react';
import { MIN_ZOOM, MAX_ZOOM, parseFocus } from '../../data/cardPhoto';

/** Mantiene un número dentro de sus límites. */
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

/** Distancia entre dos punteros, para medir el pellizco. */
function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

/**
 * Arrastrar y acercar la foto directamente sobre la tarjeta.
 *
 * Sustituye al recortador en pantalla aparte. Ese modal obligaba a ajustar el
 * retrato mirando un marco vacío, sin el nombre ni los botones que van encima:
 * se dejaba la cara centrada, se guardaba, y al volver resultaba que el texto
 * caía justo sobre ella. Ajustando aquí se ve la relación real desde el primer
 * movimiento, que es la única forma de acertar sin ensayo y error.
 *
 * No toca los píxeles del archivo. Sólo mueve dos porcentajes y una escala, que
 * es lo que la tarjeta usa para decidir qué parte de la foto se mira.
 */
export default function usePhotoFraming({ focus, onChange, enabled }) {
  const frameRef = useRef(null);

  /*
    Punteros activos. Hace falta un mapa y no un solo puntero porque el pellizco
    son dos dedos a la vez, y el navegador los reporta por separado: sin
    recordarlos, el segundo dedo se interpretaría como un arrastre nuevo y la
    imagen daría un salto.
  */
  const pointers = useRef(new Map());

  /** Estado al empezar el gesto, contra el que se miden los desplazamientos. */
  const origin = useRef(null);

  const begin = useCallback(() => {
    const frame = frameRef.current;
    if (!frame) return;

    const list = [...pointers.current.values()];
    origin.current = {
      focus: parseFocus(focus),
      width: frame.clientWidth,
      height: frame.clientHeight,
      // Con dos dedos se guarda la separación inicial; con uno, el punto de partida.
      spread: list.length >= 2 ? distance(list[0], list[1]) : null,
      point: list[0],
    };
  }, [focus]);

  const onPointerDown = useCallback((event) => {
    if (!enabled) return;

    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    /*
      Se captura el puntero para que el gesto siga siendo nuestro aunque el dedo
      salga del área de la foto. Sin esto, arrastrar un poco más allá del borde
      deja la imagen congelada a medio camino.
    */
    event.currentTarget.setPointerCapture?.(event.pointerId);
    begin();
  }, [enabled, begin]);

  const onPointerMove = useCallback((event) => {
    if (!enabled || !pointers.current.has(event.pointerId)) return;

    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });

    const start = origin.current;
    if (!start) return;

    const list = [...pointers.current.values()];

    // ── Pellizco: dos dedos ──
    if (list.length >= 2 && start.spread) {
      const ratio = distance(list[0], list[1]) / start.spread;
      onChange({
        ...start.focus,
        zoom: clamp(start.focus.zoom * ratio, MIN_ZOOM, MAX_ZOOM),
      });
      return;
    }

    // ── Arrastre: un dedo ──
    if (!start.point) return;

    /*
      El desplazamiento se mide en porcentaje del marco, no en píxeles, porque
      `object-position` trabaja en porcentajes y así el gesto recorre lo mismo en
      cualquier pantalla.

      Se divide por el acercamiento: con más aumento hay menos margen que mover, y
      sin esa corrección el gesto se sentiría acelerado e imposible de afinar.

      Y se invierte el signo, porque empujar la foto hacia abajo significa querer
      ver la parte de arriba, que es un valor de posición menor.
    */
    const dx = ((list[0].x - start.point.x) / start.width) * 100 / start.focus.zoom;
    const dy = ((list[0].y - start.point.y) / start.height) * 100 / start.focus.zoom;

    onChange({
      ...start.focus,
      x: clamp(start.focus.x - dx, 0, 100),
      y: clamp(start.focus.y - dy, 0, 100),
    });
  }, [enabled, onChange]);

  const release = useCallback((event) => {
    pointers.current.delete(event.pointerId);
    /*
      Al levantar un dedo de un pellizco queda el otro apoyado. Se vuelve a tomar
      el punto de partida para que ese dedo siga arrastrando desde donde está, en
      lugar de que la imagen salte al recalcularse contra una posición vieja.
    */
    if (pointers.current.size > 0) begin();
    else origin.current = null;
  }, [begin]);

  /** Acerca o aleja un paso. Es el respaldo del pellizco para quien usa ratón. */
  const stepZoom = useCallback((delta) => {
    const current = parseFocus(focus);
    onChange({ ...current, zoom: clamp(current.zoom + delta, MIN_ZOOM, MAX_ZOOM) });
  }, [focus, onChange]);

  return {
    frameRef,
    stepZoom,
    handlers: enabled
      ? {
        onPointerDown,
        onPointerMove,
        onPointerUp: release,
        onPointerCancel: release,
      }
      : {},
  };
}
