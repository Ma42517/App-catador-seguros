/**
 * Traducción de un enlace de video a su dirección para incrustar.
 *
 * El asesor pega el enlace que le da el navegador —el de la barra de
 * direcciones—, y ése no sirve dentro de un `iframe`: YouTube responde a
 * `/watch` con una cabecera que prohíbe mostrarlo dentro de otra página, así
 * que el reproductor saldría en blanco. Hay que convertirlo a `/embed`.
 *
 * La lista de dominios aceptados no es una comodidad, es la barrera de
 * seguridad: aquí se decide qué se va a cargar dentro de un `iframe` de la app.
 * Sin ella, cualquier texto pegado en ese campo —incluido un `javascript:` o una
 * página de terceros— terminaría incrustado y ejecutándose en el contexto de la
 * tarjeta. Sólo se devuelve una dirección cuando el enlace es reconocible como
 * YouTube o Vimeo; cualquier otra cosa devuelve `null` y no se muestra nada.
 */

/** Identificador de YouTube: once caracteres de letras, números, guion y guion bajo. */
const YT_ID = /^[\w-]{11}$/;

/** Identificador de Vimeo: sólo dígitos. */
const VIMEO_ID = /^\d+$/;

function youTubeEmbed(id) {
  // `rel=0` limita las sugerencias del final a ese mismo canal: al terminar el
  // video de presentación, lo último que conviene es una parrilla de videos
  // ajenos dentro de la tarjeta del asesor.
  return `https://www.youtube-nocookie.com/embed/${id}?rel=0&modestbranding=1`;
}

/**
 * Convierte un enlace de YouTube o Vimeo en su dirección para incrustar.
 *
 * @param {string} rawUrl Enlace tal como lo pegó la persona.
 * @returns {string|null} Dirección lista para el `iframe`, o `null` si no se reconoce.
 */
export function toEmbedUrl(rawUrl) {
  const value = String(rawUrl ?? '').trim();
  if (!value) return null;

  let url;
  try {
    // Se admite que falte el esquema, porque al copiar a mano suele perderse.
    url = new URL(/^https?:\/\//i.test(value) ? value : `https://${value}`);
  } catch {
    return null;
  }

  // Sólo `https`: un video por `http` haría que el navegador bloquee el
  // contenido mixto y el reproductor quedaría en blanco de todas formas.
  if (url.protocol !== 'https:') return null;

  const host = url.hostname.replace(/^www\./, '').toLowerCase();
  const segments = url.pathname.split('/').filter(Boolean);

  // youtu.be/ID
  if (host === 'youtu.be') {
    const id = segments[0] ?? '';
    return YT_ID.test(id) ? youTubeEmbed(id) : null;
  }

  if (host === 'youtube.com' || host === 'm.youtube.com' || host === 'youtube-nocookie.com') {
    // youtube.com/watch?v=ID
    const queryId = url.searchParams.get('v');
    if (queryId && YT_ID.test(queryId)) return youTubeEmbed(queryId);

    // youtube.com/embed/ID, /shorts/ID y /live/ID
    if (['embed', 'shorts', 'live'].includes(segments[0]) && YT_ID.test(segments[1] ?? '')) {
      return youTubeEmbed(segments[1]);
    }
    return null;
  }

  if (host === 'vimeo.com' || host === 'player.vimeo.com') {
    /*
      Vimeo reparte el identificador de dos formas: `vimeo.com/123456789` y
      `player.vimeo.com/video/123456789`. Se busca el último tramo que sea sólo
      dígitos, que cubre las dos y también los enlaces con nombre de canal
      delante.
    */
    const id = [...segments].reverse().find((part) => VIMEO_ID.test(part));
    return id ? `https://player.vimeo.com/video/${id}` : null;
  }

  return null;
}

/** ¿El enlace sirve para incrustarse? Útil para validar el formulario. */
export function isEmbeddableVideoUrl(rawUrl) {
  return toEmbedUrl(rawUrl) !== null;
}
