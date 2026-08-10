import { toYouTubeEmbed } from '../../data/videoEmbed';

/**
 * Video de presentación del asesor, arriba del reverso.
 *
 * Es un `iframe` a YouTube y no un archivo propio. La diferencia no es de
 * comodidad: un mp4 servido desde aquí se descarga entero en el teléfono del
 * prospecto y se paga en tráfico cada vez que alguien abre la tarjeta, sin
 * calidades alternativas ni reanudación. YouTube ya resuelve todo eso y además
 * decide la calidad según la red de quien mira.
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
  const embed = toYouTubeEmbed(url);
  if (!embed) return null;

  const who = fullName ? fullName.split(' ')[0] : 'tu asesor';

  return (
    <figure className="mb-4">
      {/*
        `aspect-video` reserva el hueco antes de que el reproductor cargue. Sin
        esa reserva, el contenido de abajo salta hacia su sitio cuando el
        `iframe` aparece, y el salto ocurre justo cuando el pulgar ya iba hacia
        el botón de agendar.
      */}
      <div
        className="relative aspect-video w-full overflow-hidden rounded-2xl border
                   border-white/10 bg-black shadow-lg shadow-black/40"
      >
        <iframe
          src={embed}
          title={`Video de presentación de ${who}`}
          /*
            `allow` enumera sólo lo que el reproductor necesita. La lista completa
            de YouTube incluye acelerómetro y giroscopio, que aquí no pintan nada:
            un video en una tarjeta no tiene por qué leer el movimiento del
            teléfono de quien lo ve.
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
      </div>

      <figcaption className="mt-2 text-center text-[11px] leading-snug text-zinc-500">
        Conoce en un minuto cómo trabaja
        {' '}
        {who}
      </figcaption>
    </figure>
  );
}
