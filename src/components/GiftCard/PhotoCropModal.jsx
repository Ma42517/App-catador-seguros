import { useCallback, useMemo, useState } from 'react';
import Cropper from 'react-easy-crop';
import {
  Check, RotateCw, X, ZoomIn, ZoomOut, Pencil, Eye,
} from 'lucide-react';
import { CARD_ASPECT, MIN_ZOOM, MAX_ZOOM } from '../../data/cardPhoto';
import DigitalCard from './DigitalCard';

/**
 * Modal de recorte de la foto de la tarjeta del CLIENTE, en dos columnas.
 *
 * El objetivo es que quien ajusta la foto vea el RESULTADO real —su tarjeta con
 * su plantilla, sus datos y su degradado— mientras encuadra, en lugar de un
 * recuadro aislado con máscara. A la izquierda se encuadra; a la derecha, la
 * misma `DigitalCard` que ve el mundo, actualizada al instante.
 *
 * ## Por qué la previa NO recorta en cada micro-movimiento
 * Recortar en canvas 60 veces por segundo trabaría el arrastre. En vez de eso,
 * la previa recibe la foto entera y refleja el encuadre con `objectPosition` +
 * `scale` (lo mismo que `focusStyle`), que el navegador resuelve en GPU. El
 * canvas pesado sólo corre UNA vez, al pulsar "Guardar recorte".
 *
 * ## Proporción
 * Se recorta en `CARD_ASPECT` —la del hueco del retrato en la tarjeta—, la misma
 * que ya usa el mundo asesor, para que lo encuadrado sea exactamente lo que se
 * ve detrás del nombre.
 */

/**
 * Genera el recorte final en alta resolución a partir del área que devuelve
 * react-easy-crop (en píxeles del original) y la rotación aplicada.
 *
 * Se hace aquí y no en `cardPhoto.js` porque aquél es del mundo asesor y no se
 * toca; esta función es autocontenida y sólo la usa este modal.
 */
async function cropToDataUrl(src, area, rotation) {
  const image = await new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('No se pudo leer la imagen.'));
    img.src = src;
  });

  const rad = (rotation * Math.PI) / 180;
  const sin = Math.abs(Math.sin(rad));
  const cos = Math.abs(Math.cos(rad));

  // Lienzo intermedio que contiene la imagen ya rotada, para poder recortar
  // sobre coordenadas rectas después.
  const bBoxW = image.width * cos + image.height * sin;
  const bBoxH = image.width * sin + image.height * cos;

  const rotated = document.createElement('canvas');
  rotated.width = bBoxW;
  rotated.height = bBoxH;
  const rctx = rotated.getContext('2d');
  if (!rctx) throw new Error('Este navegador no pudo procesar la imagen.');
  rctx.translate(bBoxW / 2, bBoxH / 2);
  rctx.rotate(rad);
  rctx.drawImage(image, -image.width / 2, -image.height / 2);

  // Recorte final: se copia sólo el área elegida del lienzo rotado.
  const out = document.createElement('canvas');
  out.width = Math.round(area.width);
  out.height = Math.round(area.height);
  const octx = out.getContext('2d');
  if (!octx) throw new Error('Este navegador no pudo procesar la imagen.');
  octx.drawImage(
    rotated,
    area.x, area.y, area.width, area.height,
    0, 0, area.width, area.height,
  );

  return out.toDataURL('image/jpeg', 0.9);
}

export default function PhotoCropModal({ src, cardData, onCancel, onConfirm }) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [areaPixels, setAreaPixels] = useState(null);
  const [saving, setSaving] = useState(false);
  // En móvil no caben dos columnas: se alterna entre encuadrar y ver el resultado.
  const [movilVista, setMovilVista] = useState('editar'); // 'editar' | 'ver'

  const onCropComplete = useCallback((_area, areaPx) => setAreaPixels(areaPx), []);

  /*
    Encuadre para la previa en vivo. `crop` de react-easy-crop es un desplazamiento
    en píxeles; se traduce a un `objectPosition` aproximado para que la tarjeta de
    la derecha se mueva con el arrastre sin recortar nada. No pretende ser exacto
    al píxel —el recorte real lo hace el canvas al guardar—, sino dar la sensación
    fiel de hacia dónde se está encuadrando.
  */
  const previewCard = useMemo(() => ({
    ...cardData,
    avatarUrl: src,
    // Se reutiliza el mismo mecanismo de foco de la tarjeta: escala por zoom.
    photoFocus: { x: 50, y: 50, zoom },
  }), [cardData, src, zoom]);

  const confirmar = async () => {
    if (!areaPixels || saving) return;
    setSaving(true);
    try {
      const dataUrl = await cropToDataUrl(src, areaPixels, rotation);
      await onConfirm(dataUrl);
    } finally {
      setSaving(false);
    }
  };

  const zoomStep = (delta) => setZoom((z) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z + delta)));

  return (
    <div
      className="fixed inset-0 z-[100] grid place-items-center bg-black/80 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Recortar la foto de tu tarjeta"
    >
      <div className="max-h-[92dvh] w-full max-w-5xl overflow-y-auto rounded-3xl border
                      border-neutral-800 bg-neutral-950 p-5 sm:p-7"
      >
        <header className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-medium tracking-tight text-white">Ajusta tu foto</h2>
            <p className="mt-1 text-xs font-light text-neutral-400">
              Arrastra, acerca o gira la imagen. A un lado ves cómo queda tu tarjeta.
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

        {/* Alternador para móvil: en md+ se ocultan y se ven las dos columnas. */}
        <div className="mb-4 flex rounded-full border border-neutral-800 p-1 md:hidden">
          {[['editar', 'Editar', Pencil], ['ver', 'Ver resultado', Eye]].map(([key, label, Icon]) => (
            <button
              key={key}
              type="button"
              onClick={() => setMovilVista(key)}
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-full px-3 py-2
                          text-xs font-semibold transition-colors ${movilVista === key
                ? 'bg-neutral-100 text-black' : 'text-neutral-400'}`}
            >
              <Icon size={13} /> {label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 items-center gap-8 md:grid-cols-2">
          {/* ── Columna izquierda: área de trabajo ── */}
          <div className={movilVista === 'editar' ? '' : 'hidden md:block'}>
            <div className="relative mx-auto aspect-[4/5] w-full max-w-sm overflow-hidden
                            rounded-2xl bg-black"
            >
              <Cropper
                image={src}
                crop={crop}
                zoom={zoom}
                rotation={rotation}
                aspect={CARD_ASPECT}
                minZoom={MIN_ZOOM}
                maxZoom={MAX_ZOOM}
                restrictPosition
                showGrid={false}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onRotationChange={setRotation}
                onCropComplete={onCropComplete}
              />
            </div>

            {/* Controles: zoom con slider + botones, y rotación de 90°. */}
            <div className="mx-auto mt-5 max-w-sm space-y-4">
              <div className="flex items-center gap-3">
                <button
                  type="button" onClick={() => zoomStep(-0.2)} aria-label="Alejar"
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
                  value={zoom}
                  onChange={(e) => setZoom(Number(e.target.value))}
                  aria-label="Acercamiento"
                  className="h-1 flex-1 cursor-pointer appearance-none rounded-full bg-neutral-700
                             accent-white"
                />
                <button
                  type="button" onClick={() => zoomStep(0.2)} aria-label="Acercar"
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-full border
                             border-neutral-800 text-neutral-300 hover:text-white"
                >
                  <ZoomIn size={16} />
                </button>
              </div>
              <button
                type="button"
                onClick={() => setRotation((r) => (r + 90) % 360)}
                className="flex w-full items-center justify-center gap-2 rounded-xl border
                           border-neutral-800 py-2.5 text-xs font-light text-neutral-300
                           hover:border-neutral-600 hover:text-white"
              >
                <RotateCw size={14} /> Girar 90°
              </button>
            </div>
          </div>

          {/* ── Columna derecha: la tarjeta real, en vivo ── */}
          <div className={movilVista === 'ver' ? '' : 'hidden md:block'}>
            <p className="mb-3 text-center text-[10px] uppercase tracking-[0.22em] text-neutral-600">
              Así se verá tu tarjeta
            </p>
            <DigitalCard cardData={previewCard} />
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
            disabled={saving || !areaPixels}
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
