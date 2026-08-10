/**
 * Normaliza cualquier dirección de YouTube a una de incrustar.
 *
 * El asesor va a pegar lo que su teléfono le dé: el enlace de "compartir"
 * (`youtu.be/ID`), la barra del navegador (`watch?v=ID`) o el de un Short. Los
 * tres apuntan al mismo video pero ninguno funciona dentro de un `iframe`:
 * YouTube responde con "el video no puede reproducirse aquí" y el asesor no
 * tiene forma de saber que el problema es la forma del enlace y no su video.
 * Traducirlo aquí es más barato que pedirle que copie un formato concreto.
 *
 * Se descarta cualquier otro dominio a propósito. Aceptar direcciones libres
 * significaría incrustar en la tarjeta lo que apunte el campo, y un `iframe`
 * hacia un sitio cualquiera es una puerta abierta en la página pública del
 * asesor.
 */

/*
  El identificador de YouTube son once caracteres de un alfabeto cerrado. Se
  comprueba en lugar de confiar en la posición dentro del texto: así un enlace
  con parámetros de rastreo —`?si=`, listas, marcas de tiempo— no arrastra basura
  al `src`.
*/
const VIDEO_ID = /^[A-Za-z0-9_-]{11}$/;

const HOSTS = new Set([
  'youtube.com', 'www.youtube.com', 'm.youtube.com',
  'youtu.be', 'www.youtu.be',
  'youtube-nocookie.com', 'www.youtube-nocookie.com',
]);

/** Saca el identificador de las formas conocidas, o `''` si no es una de ellas. */
function videoIdFrom(url) {
  const raw = String(url ?? '').trim();
  if (!raw) return '';

  let parsed;
  try {
    // Sin esquema, `URL` no puede interpretarlo: se asume https, que es lo que
    // hace cualquiera al pegar "youtu.be/algo" sin el principio.
    parsed = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
  } catch {
    return '';
  }

  if (!HOSTS.has(parsed.hostname)) return '';

  // youtu.be/ID  ·  /embed/ID  ·  /shorts/ID  ·  /live/ID
  const path = parsed.pathname.split('/').filter(Boolean);
  const last = path[path.length - 1] ?? '';
  if (parsed.hostname.endsWith('youtu.be') && VIDEO_ID.test(last)) return last;
  if (['embed', 'shorts', 'live', 'v'].includes(path[path.length - 2]) && VIDEO_ID.test(last)) {
    return last;
  }

  // youtube.com/watch?v=ID
  const query = parsed.searchParams.get('v') ?? '';
  return VIDEO_ID.test(query) ? query : '';
}

/**
 * Dirección lista para el `src` de un `iframe`, o `''` si el enlace no sirve.
 *
 * Va al dominio `nocookie`: la tarjeta se abre desde un enlace compartido, sin
 * que nadie haya aceptado nada, y el dominio normal deja marcas de publicidad en
 * el navegador del prospecto sólo por cargar el reproductor.
 *
 * `rel=0` evita que al terminar aparezcan videos de otros asesores, que es
 * exactamente lo contrario de lo que busca una tarjeta de presentación.
 * `playsinline=1` es lo que impide que iOS se lo lleve a pantalla completa y
 * saque al prospecto de la tarjeta.
 */
export function toYouTubeEmbed(url) {
  const id = videoIdFrom(url);
  if (!id) return '';

  const params = new URLSearchParams({
    rel: '0',
    modestbranding: '1',
    playsinline: '1',
  });

  return `https://www.youtube-nocookie.com/embed/${id}?${params}`;
}

/** ¿Este texto es un enlace de YouTube que se puede incrustar? */
export function isEmbeddableVideo(url) {
  return Boolean(toYouTubeEmbed(url));
}
