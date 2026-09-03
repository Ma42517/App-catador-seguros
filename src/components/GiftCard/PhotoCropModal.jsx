import { useState } from 'react';
import {
  Check, X, ZoomIn, ZoomOut, RotateCcw,
  ArrowUp, ArrowDown, ArrowLeft, ArrowRight, Crosshair,
} from 'lucide-react';
import { CARD_ASPECT, MIN_ZOOM, MAX_ZOOM } from '../../data/cardPhoto';
import useFreeFraming, { DEFAULT_FREE_FOCUS, parseFreeFocus } from './useFreeFraming';
import DigitalCard from './DigitalCard';

/**
 * Ajuste de la foto de la tarjeta del CLIENTE, encuadrando SOBRE la propia tarjeta.
 *
 * La foto se agarra con el clic/dedo y se ARRASTRA libre, como un icono en el
 * escritorio: se lleva a donde se quiera —arriba, abajo, a un lado— para que la
 * cara no quede tapada por el nombre ni los botones. Puede salirse del marco; el
 * hueco no se ve negro, sino relleno con la misma foto difuminada (como WhatsApp).
 * A un lado, la MISMA tarjeta refleja el encuadre en vivo, sin recortar en cada
 * micro-movimiento. El recorte real —en canvas— corre una sola vez, al guardar.
 *
 * El encuadre viaja como { ox, oy, zoom }: desplazamiento libre en % del marco y
 * acercamiento. No toca los píxeles del archivo mientras se ajusta.
 */

/**
 * Genera el recorte final reproduciendo en canvas lo mismo que se ve en pantalla:
 * la foto centrada que cubre el marco (object-cover), acercada por `zoom` y
 * trasladada por `ox/oy` (% del marco). El resultado tiene la proporción del
 * hueco del retrato (CARD_ASPECT).
 *
 * Como la foto puede quedar movida dejando huella, primero se pinta el fondo
 * difuminado (misma foto, cubriendo todo) y encima la foto en su posición, igual
 * que en la vista: así lo guardado coincide con lo visto, sin bandas negras.
 */
async function cropFree(src, focus) {
  const { ox, oy, zoom } = parseFreeFocus(focus);
  const image = await new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('No se pudo leer la imagen.'));
    img.src = src;
  });

  // Lienzo de salida en la proporción de la tarjeta.
  const outW = 800;
  const outH = Math.round(outW / CARD_ASPECT);
  const canvas = document.createElement('canvas');
  canvas.width = outW;
  canvas.height = outH;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Este navegador no pudo procesar la imagen.');

  // Dimensiones de la foto al cubrir el marco (object-cover), antes del zoom.
  const scaleCover = Math.max(outW / image.width, outH / image.height);
  const drawW = image.width * scaleCover * zoom;
  const drawH = image.height * scaleCover * zoom;

  // Fondo: la misma foto ampliada y difuminada, para rellenar cualquier hueco.
  ctx.save();
  ctx.filter = 'blur(24px)';
  const bgScale = Math.max(outW / image.width, outH / image.height) * 1.25;
  const bgW = image.width * bgScale;
  const bgH = image.height * bgScale;
  ctx.drawImage(image, (outW - bgW) / 2, (outH - bgH) / 2, bgW, bgH);
  ctx.restore();

  // Retrato en su posición: centrado + desplazamiento (ox/oy en % del marco).
  const dx = (outW - drawW) / 2 + (ox / 100) * outW;
  const dy = (outH - drawH) / 2 + (oy / 100) * outH;
  ctx.drawImage(image, dx, dy, drawW, drawH);

  return canvas.toDataURL('image/jpeg', 0.9);
}

export default function PhotoCropModal({ src, cardData, onCancel, onConfirm }) {
  const [focus, setFocus] = useState(DEFAULT_FREE_FOCUS);
  const [saving, setSaving] = useState(false);

  const dragging = useFreeFraming({ focus, onChange: setFocus });
  // `framing` que recibe DigitalCard: ref + gestos + el encuadre libre para pintar.
  const framing = { ...dragging, free: parseFreeFocus(focus) };

  // La foto elegida entra como avatarUrl; el encuadre libre lo pinta DigitalCard.
  const framed = { ...cardData, avatarUrl: src };

  const confirmar = async () => {
    if (saving) return;
    setSaving(true);
    try {
      const dataUrl = await cropFree(src, focus);
      await onConfirm(dataUrl);
    } finally {
      setSaving(false);
    }
  };

  const step = (delta) => setFocus((f) => {
    const cur = parseFreeFocus(f);
    return { ...cur, zoom: Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, cur.zoom + delta)) };
  });

  /*
    Mover la foto a toques con las flechas. Cada toque desplaza un paso fijo (en %
    del marco); es el camino garantizado para quien no logra arrastrar. dx/dy
    positivos mueven la foto a la derecha/abajo, igual que el arrastre.
  */
  const NUDGE = 6;
  const nudge = (dx, dy) => setFocus((f) => parseFreeFocus({
    ...parseFreeFocus(f),
    ox: parseFreeFocus(f).ox + dx * NUDGE,
    oy: parseFreeFocus(f).oy + dy * NUDGE,
  }));

  return (
    <div
      className="fixed inset-0 z-[100] grid place-items-center bg-black/80 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Ajustar la foto de tu tarjeta"
    >
      <div className="max-h-[92dvh] w-full max-w-5xl overflow-y-auto rounded-3xl border
                      border-neutral-800 bg-neutral-950 p-5 sm:p-7"
      >
        <header className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-medium tracking-tight text-white">Ajusta tu foto</h2>
            <p className="mt-1 text-xs font-light leading-relaxed text-neutral-400">
              Mueve la foto con las flechas (o arrástrala) para colocarla donde quieras
              —así la cara no queda tapada por el texto— y usa el control para acercarla.
            </p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            aria-label="Cancelar"
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full border
                       border-neutral-800 text-neutral-400 hover:text-white"
          >
            <X size={16} />
          </button>
        </header>

        <div className="grid grid-cols-1 items-start gap-8 md:grid-cols-2">
          {/* ── Izquierda: la tarjeta ES el editor (se arrastra la foto encima) ── */}
          <div>
            <p className="mb-3 text-center text-[10px] uppercase tracking-[0.22em] text-neutral-600">
              Mueve la foto aquí
            </p>
            <DigitalCard cardData={framed} framing={framing} />

            {/* Control de acercamiento: slider + botones (respaldo del pellizco). */}
            <div className="mx-auto mt-5 flex max-w-[340px] items-center gap-3">
              <button
                type="button" onClick={() => step(-0.2)} aria-label="Alejar"
                className="grid h-9 w-9 shrink-0 place-items-center rounded-full border
                           border-neutral-800 text-neutral-300 hover:text-white"
              >
                <ZoomOut size={16} />
              </button>
              <input
                type="range"
                min={MIN_ZOOM}
                max={MAX_ZOOM}
                step={0.01}
                value={parseFreeFocus(focus).zoom}
                onChange={(e) => setFocus((f) => ({ ...parseFreeFocus(f), zoom: Number(e.target.value) }))}
                aria-label="Acercamiento"
                className="h-1 flex-1 cursor-pointer appearance-none rounded-full bg-neutral-700
                           accent-white"
              />
              <button
                type="button" onClick={() => step(0.2)} aria-label="Acercar"
                className="grid h-9 w-9 shrink-0 place-items-center rounded-full border
                           border-neutral-800 text-neutral-300 hover:text-white"
              >
                <ZoomIn size={16} />
              </button>
            </div>

            {/*
              Flechas para mover la foto a toques: la vía segura para quien no
              logra arrastrar. Distribución de cruceta —arriba, izquierda/centrar/
              derecha, abajo— con el botón central para volver al centro.
            */}
            <div className="mx-auto mt-5 grid w-max grid-cols-3 gap-2">
              <span />
              <button
                type="button" onClick={() => nudge(0, -1)} aria-label="Mover la foto hacia arriba"
                className="grid h-11 w-11 place-items-center rounded-xl border border-neutral-800
                           bg-neutral-900 text-neutral-200 hover:border-neutral-600 active:scale-95"
              >
                <ArrowUp size={18} />
              </button>
              <span />
              <button
                type="button" onClick={() => nudge(-1, 0)} aria-label="Mover la foto a la izquierda"
                className="grid h-11 w-11 place-items-center rounded-xl border border-neutral-800
                           bg-neutral-900 text-neutral-200 hover:border-neutral-600 active:scale-95"
              >
                <ArrowLeft size={18} />
              </button>
              <button
                type="button" onClick={() => setFocus(DEFAULT_FREE_FOCUS)} aria-label="Centrar la foto"
                className="grid h-11 w-11 place-items-center rounded-xl border border-neutral-800
                           bg-neutral-900 text-neutral-400 hover:border-neutral-600 hover:text-white active:scale-95"
              >
                <Crosshair size={16} />
              </button>
              <button
                type="button" onClick={() => nudge(1, 0)} aria-label="Mover la foto a la derecha"
                className="grid h-11 w-11 place-items-center rounded-xl border border-neutral-800
                           bg-neutral-900 text-neutral-200 hover:border-neutral-600 active:scale-95"
              >
                <ArrowRight size={18} />
              </button>
              <span />
              <button
                type="button" onClick={() => nudge(0, 1)} aria-label="Mover la foto hacia abajo"
                className="grid h-11 w-11 place-items-center rounded-xl border border-neutral-800
                           bg-neutral-900 text-neutral-200 hover:border-neutral-600 active:scale-95"
              >
                <ArrowDown size={18} />
              </button>
              <span />
            </div>

            <button
              type="button"
              onClick={() => setFocus(DEFAULT_FREE_FOCUS)}
              className="mx-auto mt-3 flex items-center gap-1.5 text-[11px] font-light
                         text-neutral-500 hover:text-neutral-300"
            >
              <RotateCcw size={12} /> Restablecer encuadre
            </button>
          </div>

          {/* ── Derecha: la misma tarjeta, sólo para ver (sin gestos) ── */}
          <div className="hidden md:block">
            <p className="mb-3 text-center text-[10px] uppercase tracking-[0.22em] text-neutral-600">
              Así se verá tu tarjeta
            </p>
            <DigitalCard cardData={framed} framing={{ free: parseFreeFocus(focus) }} />
          </div>
        </div>

        {/* ── Acciones ── */}
        <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-xl border border-neutral-800 px-5 py-3 text-sm font-light
                       text-neutral-300 hover:border-neutral-600 hover:text-white"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={confirmar}
            disabled={saving}
            className="flex items-center justify-center gap-2 rounded-xl bg-white px-6 py-3
                       text-sm font-semibold text-black transition-colors hover:bg-neutral-200
                       disabled:cursor-wait disabled:opacity-60"
          >
            <Check size={16} /> {saving ? 'Guardando…' : 'Guardar recorte'}
          </button>
        </div>
      </div>
    </div>
  );
}
