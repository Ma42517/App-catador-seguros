import { useState } from 'react';
import { Check, X, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';
import {
  CARD_ASPECT, MIN_ZOOM, MAX_ZOOM, DEFAULT_FOCUS, parseFocus,
} from '../../data/cardPhoto';
import usePhotoFraming from '../Profile/usePhotoFraming';
import DigitalCard from './DigitalCard';

/**
 * Ajuste de la foto de la tarjeta del CLIENTE, encuadrando SOBRE la propia tarjeta.
 *
 * En lugar de un recuadro aparte con máscara, la tarjeta ES el editor: se arrastra
 * la foto con el dedo/ratón directamente sobre ella y se acerca con el control,
 * viendo desde el primer movimiento cómo queda con el nombre, los tags y el
 * degradado encima. A un lado, la MISMA tarjeta refleja el encuadre en vivo, sin
 * recortar en cada micro-movimiento: sólo cambian `objectPosition` y `scale`
 * (focusStyle), que el navegador resuelve en GPU. El recorte real —en canvas— se
 * hace una sola vez, al pulsar "Guardar recorte".
 *
 * El encuadre viaja como { x, y, zoom } (mismo formato que el mundo asesor). No
 * toca los píxeles del archivo mientras se ajusta; se guardan al confirmar.
 */

/**
 * Genera el recorte final a partir del encuadre (posición + acercamiento) sobre
 * la proporción del hueco del retrato de la tarjeta (CARD_ASPECT).
 *
 * Reproduce en canvas lo que en pantalla hacen `object-cover` + `objectPosition`
 * + `scale`, para que lo guardado coincida exactamente con lo que se vio.
 */
async function cropFromFocus(src, focus) {
  const { x, y, zoom } = parseFocus(focus);
  const image = await new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('No se pudo leer la imagen.'));
    img.src = src;
  });

  const iw = image.width;
  const ih = image.height;

  /*
    `object-cover` escala la imagen para que CUBRA el marco de proporción
    CARD_ASPECT; sobre esa base se aplica el acercamiento del usuario (zoom). La
    ventana de recorte, en píxeles del original, es la parte visible: el lado que
    "sobra" respecto al marco se recorta, y el zoom la encoge.
  */
  const imgAspect = iw / ih;
  let cropW; let cropH;
  if (imgAspect > CARD_ASPECT) {
    // La imagen es más ancha que el marco: el alto manda.
    cropH = ih / zoom;
    cropW = cropH * CARD_ASPECT;
  } else {
    cropW = iw / zoom;
    cropH = cropW / CARD_ASPECT;
  }

  // Posición: objectPosition en % traslada el sobrante (imagen − ventana).
  const maxX = Math.max(0, iw - cropW);
  const maxY = Math.max(0, ih - cropH);
  const sx = maxX * (x / 100);
  const sy = maxY * (y / 100);

  // Salida a una resolución cómoda para la tarjeta (ancho objetivo ~800px).
  const outW = Math.min(800, Math.round(cropW));
  const outH = Math.round(outW / CARD_ASPECT);

  const canvas = document.createElement('canvas');
  canvas.width = outW;
  canvas.height = outH;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Este navegador no pudo procesar la imagen.');
  ctx.drawImage(image, sx, sy, cropW, cropH, 0, 0, outW, outH);

  return canvas.toDataURL('image/jpeg', 0.9);
}

export default function PhotoCropModal({ src, cardData, onCancel, onConfirm }) {
  const [focus, setFocus] = useState(DEFAULT_FOCUS);
  const [saving, setSaving] = useState(false);

  // El gesto de arrastrar/pellizcar sobre la tarjeta vive en el mismo hook que ya
  // usa el mundo asesor: mueve x/y y ajusta el zoom, sin tocar los píxeles.
  const framing = usePhotoFraming({ focus, onChange: setFocus, enabled: true });

  // La tarjeta —editor y previa— comparten este cardData: la foto elegida más el
  // encuadre actual. Así lo que se arrastra en una se ve idéntico en la otra.
  const framed = { ...cardData, avatarUrl: src, photoFocus: focus };

  const confirmar = async () => {
    if (saving) return;
    setSaving(true);
    try {
      const dataUrl = await cropFromFocus(src, focus);
      await onConfirm(dataUrl);
    } finally {
      setSaving(false);
    }
  };

  const step = (delta) => setFocus((f) => {
    const cur = parseFocus(f);
    return { ...cur, zoom: Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, cur.zoom + delta)) };
  });

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
              Arrastra la foto sobre la tarjeta para reposicionarla y usa el control
              para acercarla. Lo que ves es exactamente como quedará.
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
                value={parseFocus(focus).zoom}
                onChange={(e) => setFocus((f) => ({ ...parseFocus(f), zoom: Number(e.target.value) }))}
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
            <button
              type="button"
              onClick={() => setFocus(DEFAULT_FOCUS)}
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
            <DigitalCard cardData={framed} />
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
