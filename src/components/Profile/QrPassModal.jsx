import { useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { X, QrCode } from 'lucide-react';
import { buildVCard, canBuildVCard } from '../../data/vcard';
import { tapFeedback } from '../../lib/haptics';

/**
 * QR a pantalla completa, en plan "pase de abordaje".
 *
 * Se dibuja como `absolute inset-0` y no `fixed`: así queda dentro del marco de
 * la tarjeta cuando ésta se muestra como maqueta de celular junto al
 * formulario, y ocupa toda la pantalla cuando la tarjeta ya es la pantalla. Con
 * `fixed`, en el editor el QR saltaría fuera del "teléfono" y se comería la
 * interfaz de alrededor.
 *
 * El QR se genera en SVG y no en canvas: se mantiene nítido al escalarlo, y de
 * eso depende que la cámara del otro teléfono lo lea al primer intento.
 */
export default function QrPassModal({ card, isOpen, onClose }) {
  useEffect(() => {
    if (!isOpen) return undefined;
    const onKeyDown = (event) => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const isUsable = canBuildVCard(card);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Código QR de mi contacto"
      className="absolute inset-0 z-40 flex flex-col bg-black/95 backdrop-blur-sm"
    >
      {/* Cerrar, arriba y alineado a la derecha */}
      <div className="flex items-center justify-end p-4">
        <button
          type="button"
          onClick={() => { tapFeedback(); onClose(); }}
          className="flex items-center gap-1.5 rounded-full border border-white/15 bg-white/10
                     px-3 py-1.5 text-xs font-semibold text-white backdrop-blur-md
                     transition-colors hover:bg-white/20 active:scale-95"
        >
          <X size={15} />
          Cerrar
        </button>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center px-6 pb-10 text-center">
        {isUsable ? (
          <>
            <p className="mb-5 text-sm font-semibold text-white">
              Escanea para guardar mi contacto
            </p>

            {/*
              Fondo blanco y margen propio alrededor del código. No es estética:
              un QR necesita contraste y una zona de silencio en el perímetro
              para que el lector encuentre sus esquinas. Sobre el fondo oscuro y
              a ras del borde, muchas cámaras no lo enganchan.
            */}
            <div className="rounded-2xl bg-white p-4 shadow-2xl">
              <QRCodeSVG
                value={buildVCard(card)}
                // El tamaño se fija en el SVG y se deja escalar por CSS, para
                // que llene la tarjeta sin recalcular la matriz del código.
                size={256}
                level="M"
                marginSize={2}
                className="h-auto w-full max-w-[240px]"
              />
            </div>

            <p className="mt-5 max-w-[16rem] text-xs leading-relaxed text-zinc-400">
              Apunta la cámara de tu teléfono al código y tus datos quedarán
              guardados como contacto.
            </p>
          </>
        ) : (
          /*
            Sin nombre y sin al menos una vía de contacto, el QR crearía un
            contacto vacío: el prospecto se iría creyendo que tiene los datos.
            Más vale decir qué falta.
          */
          <>
            <span
              className="mb-4 grid h-14 w-14 place-items-center rounded-2xl border
                         border-white/15 bg-white/10 text-white/60"
              aria-hidden="true"
            >
              <QrCode size={26} />
            </span>
            <p className="text-sm font-semibold text-white">
              Todavía no hay datos que compartir
            </p>
            <p className="mt-2 max-w-[17rem] text-xs leading-relaxed text-zinc-400">
              Completa tu nombre y al menos un teléfono o correo en la tarjeta.
              El código se genera con esos datos.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
