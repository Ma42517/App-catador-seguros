import { useState, useCallback } from 'react';
import Cropper from 'react-easy-crop';
import { ZoomIn, Loader2 } from 'lucide-react';
import { CARD_ASPECT, cropToCardBackground } from '../../data/cardPhoto';

/**
 * Recortador de la foto del retrato.
 *
 * El recuadro tiene la proporción exacta del hueco de la tarjeta, así que lo que
 * queda dentro es literalmente lo que se va a ver: la persona arrastra hasta
 * poner su cara donde quiere, acerca si hace falta, y eso se guarda ya recortado.
 * Nada vuelve a reencuadrarlo después.
 *
 * Se reparte en tres franjas fijas —cabecera, recuadro, zoom— y cada una tiene su
 * espacio propio. En la versión anterior el rótulo de ayuda quedaba pegado a la
 * barra del zoom y al arrastrarla se tapaban entre sí.
 */
export default function ImageCropperModal({ imageSrc, onConfirm, onCancel, isUploading }) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const [isProcessing, setProcessing] = useState(false);
  const [error, setError] = useState('');

  const onCropComplete = useCallback((_area, areaPixels) => {
    setCroppedAreaPixels(areaPixels);
  }, []);

  const confirm = async () => {
    if (!croppedAreaPixels) return;
    setProcessing(true);
    setError('');
    try {
      const dataUrl = await cropToCardBackground(imageSrc, croppedAreaPixels);
      onConfirm(dataUrl);
    } catch {
      setError('No se pudo recortar la imagen. Intenta de nuevo.');
    } finally {
      setProcessing(false);
    }
  };

  const busy = isUploading || isProcessing;

  return (
    /*
      `z-[95]` lo pone por encima de la pantalla completa del editor y de su botón
      flotante de guardar. Con un valor menor, ese botón se dibujaba sobre el
      recortador y el zoom quedaba debajo, imposible de arrastrar.
    */
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Ajusta tu encuadre"
      className="fixed inset-0 z-[95] flex flex-col bg-black"
    >
      {/* ── Cabecera: cancelar · título · guardar ── */}
      <header className="flex shrink-0 items-center justify-between gap-2 px-4 py-3">
        <button
          type="button"
          onClick={onCancel}
          disabled={busy}
          className="rounded-lg px-2 py-1.5 text-sm font-semibold text-white/80
                     transition-colors hover:text-white disabled:opacity-50"
        >
          Cancelar
        </button>

        <h2 className="truncate text-sm font-semibold text-white">Ajusta tu encuadre</h2>

        <button
          type="button"
          onClick={confirm}
          disabled={busy || !croppedAreaPixels}
          className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm font-bold
                     text-indigo-400 transition-colors hover:text-indigo-300
                     disabled:cursor-wait disabled:opacity-50"
        >
          {busy && <Loader2 size={15} className="animate-spin" />}
          Guardar
        </button>
      </header>

      {/*
        ── Recuadro ──

        `position: relative` es obligatorio: `react-easy-crop` se dibuja en
        posición absoluta y sin un límite propio llenaría la pantalla entera,
        tapando la cabecera y el zoom.
      */}
      <div className="relative flex-1 overflow-hidden">
        <Cropper
          image={imageSrc}
          crop={crop}
          zoom={zoom}
          aspect={CARD_ASPECT}
          minZoom={1}
          maxZoom={4}
          restrictPosition
          showGrid
          /*
            `cover` en lugar de `contain`: la foto entra llenando el recuadro, así
            que se empieza desde un encuadre ya utilizable en vez de una imagen
            pequeña con franjas negras que hay que acercar antes de poder mover.
          */
          objectFit="cover"
          onCropChange={setCrop}
          onZoomChange={setZoom}
          onCropComplete={onCropComplete}
        />
      </div>

      {/* ── Zoom, en su propia franja ── */}
      <footer className="shrink-0 px-5 pb-8 pt-4">
        {error && <p className="mb-3 text-center text-xs text-rose-400">{error}</p>}

        <p className="mb-3 text-center text-[11px] leading-relaxed text-white/55">
          Arrastra la foto para colocar tu rostro dentro del marco
        </p>

        <div className="flex items-center gap-3">
          <ZoomIn size={16} aria-hidden="true" className="shrink-0 text-white/60" />
          <input
            type="range"
            min="1"
            max="4"
            step="0.01"
            value={zoom}
            onChange={(event) => setZoom(Number(event.target.value))}
            className="w-full accent-indigo-500"
            aria-label="Acercamiento de la foto"
          />
        </div>
      </footer>
    </div>
  );
}
