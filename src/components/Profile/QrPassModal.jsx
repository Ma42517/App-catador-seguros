import { useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { QrCode } from 'lucide-react';
import { buildVCard, canBuildVCard } from '../../data/vcard';

/**
 * QR a pantalla completa, en plan "pase de abordaje".
 *
 * El código lleva una vCard: el nombre, el título, la empresa, el teléfono, el
 * WhatsApp y el correo del asesor, en el formato que reconocen las libretas de
 * direcciones. Al escanearlo con la cámara, el teléfono ofrece guardar el
 * contacto en el acto.
 *
 * Se eligió la vCard y no la dirección de la tarjeta porque el momento en que
 * este código se usa es cuando dos personas están frente a frente: lo que hace
 * falta ahí es que el número quede guardado, no abrir una página. Además funciona
 * sin depender de que el otro teléfono tenga señal.
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

  const isUsable = canBuildVCard(card);

  return (
    /*
      No lleva `aria-modal`: no cubre la aplicación entera, sólo la tarjeta. Y
      declararlo tendría un coste real —algunos lectores de pantalla encierran la
      navegación dentro del elemento marcado como modal, y el único botón para
      salir de aquí es la flecha de la tarjeta, que vive fuera—.
    */
    <div
      role="dialog"
      aria-label="Código QR de mi contacto"
      className="absolute inset-0 z-40 flex flex-col bg-black/95 backdrop-blur-sm"
    >
      {/*
        Sin botón de cerrar propio. La flecha de la tarjeta ya retrocede a la
        tarjeta desde aquí, y dos botones para lo mismo en la misma franja hacen
        dudar de si hacen lo mismo. El `pt-20` reserva su banda.
      */}
      <div className="flex flex-1 flex-col items-center justify-center px-6 pb-10 pt-20 text-center">
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
                /*
                  Una vCard genera bastantes más módulos que una dirección, así
                  que el nivel de corrección se deja en `M`: subirlo densificaría
                  el dibujo y lo volvería más difícil de leer, que es justo lo
                  contrario de lo que se busca.
                */
                size={256}
                level="M"
                marginSize={2}
                className="h-auto w-full max-w-[240px]"
              />
            </div>

            <p className="mt-5 max-w-[16rem] text-xs leading-relaxed text-zinc-400">
              Apunta la cámara de tu teléfono al código y mi nombre, teléfono y
              correo quedarán guardados como contacto.
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
