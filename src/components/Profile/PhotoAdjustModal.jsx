import { useState, useRef, useEffect } from 'react';
import { Move, ZoomIn, Loader2 } from 'lucide-react';
import {
  CARD_ASPECT, DEFAULT_FOCUS, MIN_ZOOM, MAX_ZOOM, parseFocus, focusStyle,
} from '../../data/cardPhoto';

/** Mantiene un número dentro de sus límites. */
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

/**
 * Ajustador del encuadre de la foto, al estilo de la de perfil de WhatsApp.
 *
 * No recorta nada. La foto se guarda entera y aquí sólo se decide **qué parte se
 * mira**: se arrastra para colocar la cara y se acerca si hace falta. Por eso se
 * puede volver a abrir mil veces sin que la imagen se degrade, y por eso deja de
 * hacer falta tener a mano el archivo original para recolocarla.
 *
 * El marco tiene la proporción exacta del hueco de la tarjeta, así que lo que se
 * ve aquí es literalmente lo que se va a ver allí. Antes lo colocaba el sistema
 * por su cuenta —centrado y a ciegas— y en un retrato de cuerpo entero eso
 * dejaba la cara fuera o pegada al borde.
 */
export default function PhotoAdjustModal({
  imageUrl, focus, isOpen, onConfirm, onCancel, isSaving,
}) {
  const [value, setValue] = useState(DEFAULT_FOCUS);
  const frameRef = useRef(null);
  const dragRef = useRef(null);

  // Cada vez que se abre parte del encuadre guardado, no del último que se
  // manipuló: abrir y cancelar no debe dejar rastro.
  useEffect(() => {
    if (isOpen) setValue(parseFocus(focus));
  }, [isOpen, focus]);

  useEffect(() => {
    if (!isOpen) return undefined;
    const onKeyDown = (event) => { if (event.key === 'Escape') onCancel(); };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  /*
    El arrastre se mide contra el tamaño del marco y no en píxeles absolutos:
    `object-position` trabaja en porcentajes, y así el gesto recorre lo mismo en
    una pantalla pequeña que en una grande.

    Se invierte el signo porque mover la foto hacia abajo significa querer ver la
    parte de arriba, que es un valor de posición menor.
  */
  const onPointerDown = (event) => {
    const frame = frameRef.current;
    if (!frame) return;

    event.currentTarget.setPointerCapture?.(event.pointerId);
    dragRef.current = {
      startX: event.clientX,
      startY: event.clientY,
      origin: value,
      width: frame.clientWidth,
      height: frame.clientHeight,
    };
  };

  const onPointerMove = (event) => {
    const drag = dragRef.current;
    if (!drag) return;

    /*
      Al acercar, el mismo desplazamiento del dedo debe recorrer menos imagen:
      con más aumento hay menos margen que mover, y sin dividir por el zoom el
      gesto se sentiría acelerado y difícil de afinar.
    */
    const dx = ((event.clientX - drag.startX) / drag.width) * 100 / drag.origin.zoom;
    const dy = ((event.clientY - drag.startY) / drag.height) * 100 / drag.origin.zoom;

    setValue({
      ...drag.origin,
      x: clamp(drag.origin.x - dx, 0, 100),
      y: clamp(drag.origin.y - dy, 0, 100),
    });
  };

  const endDrag = () => { dragRef.current = null; };

  return (
    /*
      `z-[95]` lo pone por encima de la pantalla del editor y de sus botones. Con
      un valor menor, el contenido del editor se dibujaba encima y la barra del
      zoom quedaba debajo, imposible de arrastrar.
    */
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Ajustar la foto"
      className="fixed inset-0 z-[95] flex flex-col bg-black"
    >
      <header className="flex shrink-0 items-center justify-between gap-2 px-4 py-3">
        <button
          type="button"
          onClick={onCancel}
          disabled={isSaving}
          className="rounded-lg px-2 py-1.5 text-sm font-semibold text-white/80
                     transition-colors hover:text-white disabled:opacity-50"
        >
          Cancelar
        </button>

        <h2 className="truncate text-sm font-semibold text-white">Ajustar foto</h2>

        <button
          type="button"
          onClick={() => onConfirm(value)}
          disabled={isSaving}
          className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm font-bold
                     text-indigo-400 transition-colors hover:text-indigo-300
                     disabled:cursor-wait disabled:opacity-50"
        >
          {isSaving && <Loader2 size={15} className="animate-spin" />}
          Guardar
        </button>
      </header>

      <div className="flex flex-1 items-center justify-center px-6">
        {/*
          El marco replica el hueco real de la tarjeta con `aspect-ratio`, así que
          no hay que adivinar: lo que queda dentro es lo que se verá.

          `touch-none` es imprescindible en el móvil. Sin él, el navegador
          interpreta el arrastre como un gesto de desplazamiento de la página y se
          queda con él: la foto no se movería ni un píxel.
        */}
        <div
          ref={frameRef}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          style={{ aspectRatio: String(CARD_ASPECT) }}
          className="relative w-full max-w-[280px] cursor-move touch-none overflow-hidden
                     rounded-2xl bg-zinc-900 ring-1 ring-white/20 select-none"
        >
          <img
            src={imageUrl}
            alt=""
            referrerPolicy="no-referrer"
            draggable="false"
            style={focusStyle(value)}
            className="pointer-events-none h-full w-full object-cover"
          />

          {/* Guías de tercios: ayudan a colocar los ojos, como en cualquier cámara. */}
          <span className="pointer-events-none absolute inset-0" aria-hidden="true">
            <span className="absolute inset-x-0 top-1/3 border-t border-white/25" />
            <span className="absolute inset-x-0 top-2/3 border-t border-white/25" />
            <span className="absolute inset-y-0 left-1/3 border-l border-white/25" />
            <span className="absolute inset-y-0 left-2/3 border-l border-white/25" />
          </span>
        </div>
      </div>

      <footer className="shrink-0 px-5 pb-8 pt-4">
        <p className="mb-3 flex items-center justify-center gap-1.5 text-center text-[11px]
                      leading-relaxed text-white/55"
        >
          <Move size={12} aria-hidden="true" />
          Arrastra la foto para colocar tu rostro dentro del marco
        </p>

        <div className="flex items-center gap-3">
          <ZoomIn size={16} aria-hidden="true" className="shrink-0 text-white/60" />
          <input
            type="range"
            min={MIN_ZOOM}
            max={MAX_ZOOM}
            step="0.01"
            value={value.zoom}
            onChange={(event) => setValue((v) => ({ ...v, zoom: Number(event.target.value) }))}
            className="w-full accent-indigo-500"
            aria-label="Acercamiento de la foto"
          />
        </div>

        {/*
          Volver al centro sin tener que arrastrar a tientas. Es la salida cuando
          uno se pierde ajustando, y evita cerrar y volver a entrar.
        */}
        <button
          type="button"
          onClick={() => setValue(DEFAULT_FOCUS)}
          className="mx-auto mt-4 block rounded-full px-3 py-1.5 text-[11px] font-semibold
                     text-white/60 transition-colors hover:text-white"
        >
          Restablecer encuadre
        </button>
      </footer>
    </div>
  );
}
