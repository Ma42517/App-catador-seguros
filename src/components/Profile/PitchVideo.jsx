import { useEffect, useRef, useState } from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import {
  toYouTubeEmbed, videoKind, videoFileUrl, videoPosterUrl,
} from '../../data/videoEmbed';

/**
 * Video de presentación del asesor, arriba del reverso.
 *
 * Acepta las dos fuentes y decide sola con qué etiqueta pintarlo: un `iframe`
 * para YouTube, un `<video>` para el archivo que el asesor subió. Conviven
 * porque quien ya había pegado su enlace no tiene por qué perderlo al aparecer
 * la subida directa, y porque un video largo sigue teniendo sentido en YouTube.
 *
 * Sin enlace no se dibuja nada. Un marco negro vacío en la tarjeta de un
 * desconocido se lee como algo roto, y el asesor se enteraría del problema por
 * su prospecto.
 */
export default function PitchVideo({ url, fullName, isActive = false }) {
  const videoRef = useRef(null);

  /*
    Orientación real del archivo, leída de sus metadatos.

    Se detecta en lugar de imponer un marco fijo porque la gente graba con el
    teléfono como lo tiene en la mano, y eso es en vertical. Con un marco 16:9
    forzado, un video vertical aparecía como una columna estrecha entre dos
    franjas negras enormes: la cara del asesor quedaba diminuta justo en la
    pieza que existe para que se le vea la cara.
  */
  const [isPortrait, setPortrait] = useState(false);

  /*
    Arranca en silencio y no por gusto: los navegadores bloquean la reproducción
    automática con sonido, y un `play()` con audio se rechaza sin más. La
    alternativa —esperar a que alguien pulse play— desperdicia el único momento
    en que se tiene la atención completa: justo después de girar la tarjeta.

    Así que empieza muda y con un botón grande para oírla. Es el mismo trato que
    hacen las redes sociales, y el prospecto ya lo conoce.
  */
  const [isMuted, setMuted] = useState(true);

  const kind = videoKind(url);

  /*
    Reproduce al girar la tarjeta y pausa al volver.

    La pausa importa tanto como el arranque: sin ella, el video sigue corriendo
    detrás de la cara frontal, gastando datos de quien ya se fue a otra cosa.

    `play()` devuelve una promesa que se rechaza si el navegador decide no
    permitirlo. Se recoge el fallo en silencio: el video se queda en su portada
    con los controles a la vista, que es exactamente lo que había antes de
    intentarlo.
  */
  useEffect(() => {
    const node = videoRef.current;
    if (!node || kind !== 'file') return;

    if (isActive) {
      node.play().catch(() => {});
    } else {
      node.pause();
      node.currentTime = 0;
    }
  }, [isActive, kind]);

  if (!kind) return null;

  const who = fullName ? fullName.split(' ')[0] : 'tu asesor';

  const toggleSound = () => {
    const node = videoRef.current;
    if (!node) return;
    const next = !isMuted;
    node.muted = next;
    setMuted(next);
    // Al quitar el silencio se reanuda: si el gesto llega con el video pausado,
    // subir el volumen de algo detenido no produce ningún sonido.
    if (!next) node.play().catch(() => {});
  };

  /*
    El vertical se muestra en 4:5 y no en 9:16, que es su proporción nativa.

    Un 9:16 dentro de una tarjeta de teléfono ocupa la pantalla completa y empuja
    el resto fuera de la vista. El 4:5 conserva la sensación vertical, deja el
    enganche y el botón asomando, y con `object-contain` no recorta nada.
  */
  const frameAspect = kind === 'file' && isPortrait ? 'aspect-[4/5]' : 'aspect-video';

  return (
    <figure className="mb-4">
      <div
        className={`relative mx-auto w-full max-w-sm overflow-hidden rounded-xl border
                    border-white/10 bg-zinc-800 shadow-lg shadow-black/40
                    transition-[aspect-ratio] duration-300 ${frameAspect}`}
      >
        {kind === 'youtube' ? (
          <iframe
            src={toYouTubeEmbed(url)}
            title={`Video de presentación de ${who}`}
            /*
              `allow` enumera sólo lo que el reproductor necesita. La lista
              completa de YouTube incluye acelerómetro y giroscopio, que aquí no
              pintan nada: un video en una tarjeta no tiene por qué leer el
              movimiento del teléfono de quien lo ve.
            */
            allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; fullscreen"
            allowFullScreen
            loading="lazy"
            referrerPolicy="strict-origin-when-cross-origin"
            className="absolute inset-0 h-full w-full border-0"
          />
        ) : (
          <>
            <video
              ref={videoRef}
              src={videoFileUrl(url)}
              poster={videoPosterUrl(url)}
              controls
              muted={isMuted}
              /*
                `playsInline` es lo que impide que iOS se lleve el video a
                pantalla completa al arrancar. Sin él, el prospecto sale de la
                tarjeta y vuelve con el reproductor del sistema encima: se pierde
                el botón de agendar, que es a donde tenía que llegar. Sin esto,
                además, el arranque automático ni siquiera se permite en iPhone.
              */
              playsInline
              preload="metadata"
              title={`Video de presentación de ${who}`}
              /*
                Aquí se mide la orientación. `videoWidth` y `videoHeight` son las
                dimensiones reales del archivo, no las del elemento, así que dicen
                cómo se grabó y no cómo se está pintando.
              */
              onLoadedMetadata={(event) => {
                const { videoWidth, videoHeight } = event.currentTarget;
                if (videoWidth && videoHeight) setPortrait(videoHeight > videoWidth);
              }}
              className="absolute inset-0 h-full w-full bg-zinc-800 object-contain"
            >
              <track kind="captions" />
            </video>

            {/*
              Botón de sonido, arriba a la derecha para no tapar los controles del
              reproductor, que viven abajo.

              Mientras está mudo el botón se anuncia solo con un anillo claro: es
              la única pista de que hay audio que no se está oyendo, y sin ella el
              prospecto ve mover la boca y da por hecho que el video no trae voz.
            */}
            <button
              type="button"
              onClick={toggleSound}
              aria-label={isMuted ? 'Activar el sonido del video' : 'Silenciar el video'}
              className={`absolute right-2 top-2 grid h-9 w-9 place-items-center rounded-full
                          bg-black/60 text-white backdrop-blur-md transition-all
                          active:scale-90 focus-visible:outline-none focus-visible:ring-2
                          focus-visible:ring-white
                          ${isMuted ? 'ring-2 ring-white/70' : 'ring-1 ring-white/20'}`}
            >
              {isMuted
                ? <VolumeX size={16} aria-hidden="true" />
                : <Volume2 size={16} aria-hidden="true" />}
            </button>
          </>
        )}
      </div>

      <figcaption className="mt-2 text-center text-[11px] leading-snug text-zinc-500">
        {kind === 'file' && isMuted
          ? 'Toca el altavoz para escucharlo'
          : `Conoce en un minuto cómo trabaja ${who}`}
      </figcaption>
    </figure>
  );
}
