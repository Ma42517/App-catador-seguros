import { useState, useCallback } from 'react';
import Cropper from 'react-easy-crop';
import { Check, X, ZoomIn, Loader2 } from 'lucide-react';
import { CARD_ASPECT, cropToCardBackground, approximateBytes } from '../../data/cardPhoto';

/**
 * Modal de recorte de la foto de fondo de la tarjeta.
 *
 * Se abre en cuanto el asesor elige un archivo, antes de subir nada: el marco
 * de la tarjeta es vertical y angosto, así que una foto normal necesita decidir
 * qué parte se conserva. Bloquear el aspecto en `CARD_ASPECT` (9:16, como la
 * pantalla de un celular) es lo que hace que el recorte de aquí sea exactamente
 * lo que después se ve de fondo, sin sorpresas al guardar.
 *
 * Arrastrar centra el rostro y la barra de abajo controla el acercamiento; son
 * los dos gestos que resuelven el encuadre y, al ser gestos nativos del propio
 * `react-easy-crop`, funcionan igual con el dedo en un celular que con el
 * mouse en escritorio.
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
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Recortar foto de la tarjeta"
      className="fixed inset-0 z-[90] flex flex-col bg-black/95"
    >
      {/* Cabecera */}
      <div className="flex items-center justify-between px-4 py-3 text-white">
        <button
          type="button"
          onClick={onCancel}
          disabled={busy}
          className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm font-semibold
                     text-white/80 transition-colors hover:text-white disabled:opacity-50"
        >
          <X size={17} />
          Cancelar
        </button>
        <p className="text-sm font-semibold">Ajusta el encuadre</p>
        <button
          type="button"
          onClick={confirm}
          disabled={busy || !croppedAreaPixels}
          className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm font-semibold
                     text-indigo-400 transition-colors hover:text-indigo-300
                     disabled:cursor-wait disabled:opacity-50"
        >
          {busy
            ? <Loader2 size={16} className="animate-spin" />
            : <Check size={17} />}
          Aceptar
        </button>
      </div>

      {/*
        Área de recorte. `position: relative` es obligatorio: react-easy-crop
        se dibuja `absolute` y llenaría toda la pantalla si el contenedor no le
        da un límite propio.
      */}
      <div className="relative flex-1 overflow-hidden">
        <Cropper
          image={imageSrc}
          crop={crop}
          zoom={zoom}
          aspect={CARD_ASPECT}
          minZoom={1}
          maxZoom={3}
          showGrid
          objectFit="cover"
          onCropChange={setCrop}
          onZoomChange={setZoom}
          onCropComplete={onCropComplete}
        />
      </div>

      {/* Controles inferiores */}
      <div className="px-5 py-4">
        {error && (
          <p className="mb-3 text-center text-xs text-rose-400">{error}</p>
        )}

        <div className="mb-2 flex items-center gap-3 text-white">
          <ZoomIn size={16} aria-hidden="true" className="shrink-0 text-white/70" />
          <input
            type="range"
            min="1"
            max="3"
            step="0.02"
            value={zoom}
            onChange={(event) => setZoom(Number(event.target.value))}
            className="w-full accent-indigo-500"
            aria-label="Acercamiento de la foto"
          />
        </div>

        <p className="text-center text-[11px] text-white/50">
          Arrastra la foto para centrar el rostro y usa la barra para acercar.
        </p>
      </div>
    </div>
  );
}
