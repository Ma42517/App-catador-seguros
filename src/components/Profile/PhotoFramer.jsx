import { useState, useEffect, useMemo } from 'react';
import { Check, X, ZoomIn, MoveVertical, Loader2 } from 'lucide-react';
import { cropToCard, approximateBytes, verticalSlack } from '../../data/cardPhoto';

const SLIDER =
  'w-full accent-indigo-600 cursor-pointer';

const LABEL =
  'mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase '
  + 'tracking-wider text-zinc-500';

/**
 * Ajuste del encuadre de la foto antes de subirla.
 *
 * La vista previa no imita el recorte con CSS: se recorta de verdad en un lienzo
 * y se muestra el resultado. Así lo que se ve al mover los controles es
 * exactamente el archivo que se va a guardar, sin margen de diferencia entre la
 * simulación y la salida.
 *
 * Sólo hay dos controles, y son los que resuelven el problema real: cuánto se
 * acerca y a qué altura queda el recorte. El horizontal se deja centrado porque
 * en un retrato la cara ya viene al centro, y un tercer control sería una
 * decisión más que tomar sin ganancia.
 */
export default function PhotoFramer({ image, onConfirm, onCancel, isUploading }) {
  const [zoom, setZoom] = useState(1);
  const [offsetY, setOffsetY] = useState(0.2);

  /*
    Se arranca en 0.2 y no centrado: en un retrato la cara está en el tercio
    superior, y encuadrar al centro la dejaba cortada por arriba. Con el zoom al
    mínimo esto no cambia nada —no sobra alto que repartir—, pero deja el
    recorte alto en cuanto se acerca.
  */
  useEffect(() => {
    setZoom(1);
    setOffsetY(0.2);
  }, [image]);

  // El recorte se recalcula al mover un control. Es una operación de lienzo
  // sobre una imagen ya cargada: no hace falta aplazarla.
  const preview = useMemo(() => {
    if (!image) return '';
    try {
      return cropToCard(image, { zoom, offsetY });
    } catch {
      return '';
    }
  }, [image, zoom, offsetY]);

  // Con el zoom al mínimo la foto entra completa de alto y mover el recorte no
  // cambiaría nada. En ese caso el control se apaga en lugar de fingir que sirve.
  const puedeMoverse = useMemo(
    () => (image ? verticalSlack(image, zoom) >= 1 : false),
    [image, zoom],
  );

  if (!image) return null;

  const peso = preview ? Math.round(approximateBytes(preview) / 1024) : 0;

  return (
    <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-950/40">
      <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
        Ajusta el encuadre
      </p>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        {/* Vista previa: el recorte real, en la proporción de la tarjeta */}
        <div className="mx-auto shrink-0 sm:mx-0">
          <img
            src={preview}
            alt="Vista previa del encuadre"
            className="h-[260px] w-[128px] rounded-xl border border-zinc-300 object-cover
                       dark:border-zinc-700"
          />
          <p className="mt-1.5 text-center text-[10px] text-zinc-500">≈ {peso} KB</p>
        </div>

        <div className="min-w-0 flex-1">
          <div className="mb-4">
            <span className={LABEL}>
              <ZoomIn size={12} aria-hidden="true" />
              Acercamiento
            </span>
            <input
              type="range"
              min="1"
              max="2.5"
              step="0.05"
              value={zoom}
              onChange={(event) => setZoom(Number(event.target.value))}
              className={SLIDER}
              aria-label="Acercamiento de la foto"
            />
          </div>

          <div className="mb-4">
            <span className={`${LABEL} ${puedeMoverse ? '' : 'opacity-50'}`}>
              <MoveVertical size={12} aria-hidden="true" />
              Altura del recorte
            </span>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={offsetY}
              onChange={(event) => setOffsetY(Number(event.target.value))}
              disabled={!puedeMoverse}
              className={`${SLIDER} disabled:cursor-not-allowed disabled:opacity-40`}
              aria-label="Altura del recorte"
            />
            <p className="mt-1 text-[10px] text-zinc-500">
              {puedeMoverse
                ? 'Muévelo hasta que tu cara quede en el cuadro.'
                : 'Tu foto ya entra completa de alto. Acércala si quieres elegir qué parte se ve.'}
            </p>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => onConfirm(preview)}
              disabled={isUploading || !preview}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-indigo-600
                         px-4 py-2.5 text-sm font-semibold text-white transition-colors
                         hover:bg-indigo-500 active:scale-[0.98] disabled:cursor-wait
                         disabled:opacity-60"
            >
              {isUploading
                ? <Loader2 size={15} className="animate-spin" />
                : <Check size={15} />}
              {isUploading ? 'Subiendo...' : 'Usar esta foto'}
            </button>

            <button
              type="button"
              onClick={onCancel}
              disabled={isUploading}
              className="rounded-xl border border-zinc-300 px-4 py-2.5 text-sm font-semibold
                         text-zinc-600 transition-colors hover:bg-zinc-100 disabled:opacity-60
                         dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
            >
              <X size={15} />
              <span className="sr-only">Cancelar</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
