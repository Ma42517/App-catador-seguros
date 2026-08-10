import { useEffect } from 'react';
import { X } from 'lucide-react';
import { tapFeedback } from '../../lib/haptics';

/**
 * Reproductor del video de presentación, a pantalla completa sobre la tarjeta.
 *
 * El video no se guarda en Supabase: se incrusta desde YouTube o Vimeo. Un
 * video de presentación pesa cientos de megas y se ve unas pocas veces, así que
 * alojarlo consumiría el almacenamiento y el tráfico del proyecto para hacer
 * peor lo que esas plataformas ya hacen —convertir a varias calidades y servir
 * desde el nodo más cercano—.
 *
 * Igual que el QR, se dibuja con `absolute inset-0` y no `fixed`: así queda
 * dentro del marco cuando la tarjeta se muestra como maqueta de celular junto
 * al formulario, y ocupa la pantalla cuando la tarjeta ya es la pantalla.
 */
export default function VideoStoryModal({ embedUrl, isOpen, onClose, title }) {
  useEffect(() => {
    if (!isOpen) return undefined;
    const onKeyDown = (event) => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !embedUrl) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Video de presentación"
      className="absolute inset-0 z-40 flex flex-col bg-black/95 backdrop-blur-sm"
    >
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

      <div className="flex flex-1 items-center justify-center px-4 pb-10">
        {/*
          El hueco 16:9 se reserva con `aspect-video` antes de que el
          reproductor cargue. Sin él, el `iframe` nace con alto cero y la
          tarjeta da un salto en cuanto el video aparece.
        */}
        <div className="w-full overflow-hidden rounded-2xl border border-white/10 bg-black shadow-2xl">
          <div className="aspect-video w-full">
            <iframe
              src={embedUrl}
              title={title || 'Video de presentación'}
              className="h-full w-full"
              /*
                `allow` enumera sólo lo que el reproductor necesita. La cámara,
                el micrófono y la ubicación quedan fuera a propósito: es
                contenido de un tercero dentro de la tarjeta, y no tiene por qué
                poder pedirlos.
              */
              allow="accelerometer; autoplay; clipboard-write; encrypted-media;
                     gyroscope; picture-in-picture; fullscreen"
              referrerPolicy="strict-origin-when-cross-origin"
              allowFullScreen
            />
          </div>
        </div>
      </div>
    </div>
  );
}
