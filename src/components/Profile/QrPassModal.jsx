import { useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { QrCode } from 'lucide-react';
import { publicCardUrl } from '../../lib/publicRoute';

/**
 * QR a pantalla completa, en plan "pase de abordaje".
 *
 * El código lleva la dirección de la tarjeta, no una vCard.
 *
 * Antes llevaba los datos de contacto en crudo: al escanearlo, el teléfono
 * ofrecía guardar el contacto y ahí terminaba. Funcionaba, pero entregaba lo
 * mínimo —un nombre y un número— y dejaba fuera todo lo que la tarjeta explica:
 * el título, las especialidades, la biografía y los servicios del reverso.
 *
 * Con la dirección, quien escanea abre la tarjeta completa en su propio
 * teléfono, la puede recorrer, y desde ahí guardar el contacto si quiere. Además
 * se lleva algo que puede volver a abrir después, en lugar de una ficha suelta
 * en su libreta de direcciones.
 *
 * Se dibuja como `absolute inset-0` y no `fixed`: así queda dentro del marco de
 * la tarjeta cuando ésta se muestra como maqueta de celular junto al formulario,
 * y ocupa toda la pantalla cuando la tarjeta ya es la pantalla. Con `fixed`, en
 * el editor el QR saltaría fuera del "teléfono" y se comería la interfaz.
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

  /*
    Sin identificador no hay dirección que codificar: pasa con una tarjeta que
    todavía no se ha guardado. Se explica en lugar de dibujar un código que
    llevaría a una página inexistente.
  */
  const url = card?.id ? publicCardUrl(card.id) : '';

  return (
    /*
      No lleva `aria-modal`: no cubre la aplicación entera, sólo la tarjeta. Y
      declararlo tendría un coste real —algunos lectores de pantalla encierran la
      navegación dentro del elemento marcado como modal, y el único botón para
      salir de aquí es la flecha de la tarjeta, que vive fuera—.
    */
    <div
      role="dialog"
      aria-label="Código QR de mi tarjeta"
      className="absolute inset-0 z-40 flex flex-col bg-black/95 backdrop-blur-sm"
    >
      {/*
        Sin botón de cerrar propio. La flecha de la tarjeta ya retrocede a la
        tarjeta desde aquí, y dos botones para lo mismo en la misma franja hacen
        dudar de si hacen lo mismo. El `pt-20` reserva su banda.
      */}
      <div className="flex flex-1 flex-col items-center justify-center px-6 pb-10 pt-20 text-center">
        {url ? (
          <>
            <p className="mb-5 text-sm font-semibold text-white">
              Escanea para ver mi tarjeta
            </p>

            {/*
              Fondo blanco y margen propio alrededor del código. No es estética:
              un QR necesita contraste y una zona de silencio en el perímetro
              para que el lector encuentre sus esquinas. Sobre el fondo oscuro y
              a ras del borde, muchas cámaras no lo enganchan.
            */}
            <div className="rounded-2xl bg-white p-4 shadow-2xl">
              <QRCodeSVG
                value={url}
                /*
                  La dirección es corta, así que la matriz del código queda con
                  pocos módulos y muy legible. Se sube la corrección de errores a
                  `Q`: aguanta que el código salga algo borroso en la foto o con
                  un reflejo encima, que es lo normal al escanear una pantalla.
                */
                size={256}
                level="Q"
                marginSize={2}
                className="h-auto w-full max-w-[240px]"
              />
            </div>

            <p className="mt-5 max-w-[16rem] text-xs leading-relaxed text-zinc-400">
              Apunta la cámara de tu teléfono al código y se abrirá mi tarjeta
              completa, con todos mis datos.
            </p>
          </>
        ) : (
          <>
            <span
              className="mb-4 grid h-14 w-14 place-items-center rounded-2xl border
                         border-white/15 bg-white/10 text-white/60"
              aria-hidden="true"
            >
              <QrCode size={26} />
            </span>
            <p className="text-sm font-semibold text-white">
              Guarda tu tarjeta para generar el código
            </p>
            <p className="mt-2 max-w-[17rem] text-xs leading-relaxed text-zinc-400">
              El código apunta a la dirección de tu tarjeta, y esa dirección
              existe a partir de que la guardas.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
