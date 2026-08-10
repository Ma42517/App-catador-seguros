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
 * Con 16:9 y no 9:16: el reverso tiene que mostrar el video, las preguntas y el
 * botón de agendar en la misma pantalla sin desplazar. Un video vertical se come
 * la altura completa de la tarjeta y empuja el botón —que es la razón de ser de
 * esta cara— fuera de la vista.
 *
 * Sin enlace no se dibuja nada. Un marco negro vacío en la tarjeta de un
 * desconocido se lee como algo roto, y el asesor se enteraría del problema por
 * su prospecto.
 */
export default function PitchVideo({ url, fullName }) {
  const kind = videoKind(url);
  if (!kind) return null;

  const who = fullName ? fullName.split(' ')[0] : 'tu asesor';

  return (
    <figure className="mb-4">
      {/*
        `aspect-video` reserva el hueco antes de que el reproductor cargue. Sin
        esa reserva, el contenido de abajo salta hacia su sitio cuando el video
        aparece, y el salto ocurre justo cuando el pulgar ya iba hacia el botón
        de agendar.
      */}
      <div
        className="relative aspect-video w-full overflow-hidden rounded-2xl border
                   border-white/10 bg-black shadow-lg shadow-black/40"
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
            /*
              `loading="lazy"`: el reverso está oculto hasta que alguien voltea la
              tarjeta. Sin esto, el reproductor se carga en cuanto se abre la cara
              frontal y le cuesta datos a quien nunca va a girarla.
            */
            loading="lazy"
            referrerPolicy="strict-origin-when-cross-origin"
            className="absolute inset-0 h-full w-full border-0"
          />
        ) : (
          <video
            src={videoFileUrl(url)}
            poster={videoPosterUrl(url)}
            controls
            /*
              `playsInline` es lo que impide que iOS se lleve el video a pantalla
              completa al pulsar play. Sin él, el prospecto sale de la tarjeta y
              vuelve a ella con el reproductor del sistema encima: se pierde el
              botón de agendar, que es a donde tenía que llegar.
            */
            playsInline
            /*
              `preload="metadata"`: se traen las dimensiones y la duración, no el
              video. Es lo que permite que la barra de tiempo aparezca completa
              desde el principio sin descargar diez segundos de video a quien
              todavía no ha decidido verlo.
            */
            preload="metadata"
            title={`Video de presentación de ${who}`}
            className="absolute inset-0 h-full w-full bg-black object-contain"
          >
            {/*
              Los subtítulos no existen todavía, pero la pista vacía evita que los
              validadores de accesibilidad marquen el video como contenido sin
              alternativa, y deja el sitio donde irían.
            */}
            <track kind="captions" />
          </video>
        )}
      </div>

      <figcaption className="mt-2 text-center text-[11px] leading-snug text-zinc-500">
        Conoce en un minuto cómo trabaja
        {' '}
        {who}
      </figcaption>
    </figure>
  );
}
