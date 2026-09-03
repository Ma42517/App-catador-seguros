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
  return Boolean(resolveVideo(url).embedUrl || resolveVideo(url).fileUrl);
}


// ── Loom ─────────────────────────────────────────────────────────────────────

/*
  Loom identifica el video con un hash largo y alfanumérico. Igual que con
  YouTube, el asesor pegará el enlace de "compartir" (`loom.com/share/HASH`) o
  el de incrustar (`loom.com/embed/HASH`); ambos apuntan al mismo video, pero
  sólo el segundo funciona dentro de un `iframe`.
*/
const LOOM_HOSTS = new Set(['loom.com', 'www.loom.com']);
const LOOM_ID = /^[A-Za-z0-9]{16,}$/;

/** Dirección de incrustar de Loom, o `''` si el enlace no es de Loom. */
export function toLoomEmbed(url) {
  const raw = String(url ?? '').trim();
  if (!raw) return '';

  let parsed;
  try {
    parsed = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
  } catch {
    return '';
  }

  if (!LOOM_HOSTS.has(parsed.hostname)) return '';

  // loom.com/share/HASH  ·  loom.com/embed/HASH
  const path = parsed.pathname.split('/').filter(Boolean);
  const id = path[path.length - 1] ?? '';
  if (!['share', 'embed'].includes(path[path.length - 2]) || !LOOM_ID.test(id)) return '';

  return `https://www.loom.com/embed/${id}`;
}


// ── Vimeo ────────────────────────────────────────────────────────────────────

/*
  Vimeo identifica el video con un número. El enlace público es
  `vimeo.com/NUMERO` y el de incrustar es `player.vimeo.com/video/NUMERO`;
  también existe el privado con un segundo hash (`vimeo.com/NUMERO/HASH`), que
  hay que conservar o el reproductor responde "video privado".
*/
const VIMEO_HOSTS = new Set(['vimeo.com', 'www.vimeo.com', 'player.vimeo.com']);
const VIMEO_ID = /^\d+$/;
const VIMEO_HASH = /^[A-Za-z0-9]+$/;

/** Dirección de incrustar de Vimeo, o `''` si el enlace no es de Vimeo. */
export function toVimeoEmbed(url) {
  const raw = String(url ?? '').trim();
  if (!raw) return '';

  let parsed;
  try {
    parsed = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
  } catch {
    return '';
  }

  if (!VIMEO_HOSTS.has(parsed.hostname)) return '';

  const path = parsed.pathname.split('/').filter(Boolean);
  // player.vimeo.com/video/NUMERO → el número es el último segmento.
  const numberIndex = path.findIndex((seg) => VIMEO_ID.test(seg));
  if (numberIndex === -1) return '';

  const id = path[numberIndex];
  // El segmento siguiente, si existe y es alfanumérico, es el hash de privacidad.
  const hash = path[numberIndex + 1];
  const privacy = hash && VIMEO_HASH.test(hash) ? `?h=${hash}` : '';

  return `https://player.vimeo.com/video/${id}${privacy}`;
}


// ── Resolución unificada ──────────────────────────────────────────────────────

/**
 * Clasifica un enlace y devuelve cómo debe pintarse.
 *
 * @returns {{kind: string, embedUrl: string, fileUrl: string}}
 *   `kind` es `'youtube' | 'loom' | 'vimeo' | 'file' | ''`. Para los tres
 *   primeros viene `embedUrl` (va en un `iframe`); para `'file'` viene `fileUrl`
 *   (va en un `<video>`). Vacío en todo si el enlace no es de ningún host
 *   permitido.
 *
 * Se restringe la lista de hosts a propósito y no se acepta cualquier `iframe`:
 * la tarjeta se abre desde un enlace público, sin que nadie inicie sesión, así
 * que incrustar el dominio arbitrario que traiga el campo sería dejar una puerta
 * abierta —cualquiera que edite la tarjeta podría montar contenido de terceros,
 * publicidad o rastreadores sobre la marca del asesor—. Cerrando la lista a
 * YouTube, Loom, Vimeo y archivos de video conocidos, el reverso sólo reproduce
 * lo que se espera de una tarjeta de presentación.
 */
export function resolveVideo(url) {
  const empty = { kind: '', embedUrl: '', fileUrl: '' };
  const value = String(url ?? '').trim();
  if (!value) return empty;

  const youtube = toYouTubeEmbed(value);
  if (youtube) return { kind: 'youtube', embedUrl: youtube, fileUrl: '' };

  const loom = toLoomEmbed(value);
  if (loom) return { kind: 'loom', embedUrl: loom, fileUrl: '' };

  const vimeo = toVimeoEmbed(value);
  if (vimeo) return { kind: 'vimeo', embedUrl: vimeo, fileUrl: '' };

  if (videoKind(value) === 'file') return { kind: 'file', embedUrl: '', fileUrl: videoFileUrl(value) };

  return empty;
}



// ── Videos servidos como archivo (los que sube el asesor) ────────────────────

const FILE_EXTENSIONS = ['mp4', 'webm', 'mov', 'm4v', 'ogv'];

/** Extensión en minúsculas, descartando la query y el fragmento. */
function extensionOf(url) {
  const clean = String(url ?? '').split(/[?#]/)[0];
  const lastSegment = clean.slice(clean.lastIndexOf('/') + 1);
  const dot = lastSegment.lastIndexOf('.');
  return dot === -1 ? '' : lastSegment.slice(dot + 1).toLowerCase();
}

/** ¿La dirección apunta a un video alojado en Cloudinary? */
function isCloudinaryVideo(url) {
  const value = String(url ?? '');
  return value.includes('res.cloudinary.com') && value.includes('/video/upload/');
}

/**
 * Clasifica la dirección guardada: `'youtube'`, `'file'` o `''`.
 *
 * La tarjeta necesita esto porque las dos fuentes se pintan con etiquetas
 * distintas —un `iframe` para YouTube, un `<video>` para un archivo— y lo único
 * que guarda la base es el texto de la dirección. Convive con las dos a
 * propósito: quien ya tenía su enlace de YouTube pegado no debería perderlo
 * porque ahora exista la subida directa.
 */
export function videoKind(url) {
  const value = String(url ?? '').trim();
  if (!value) return '';
  if (toYouTubeEmbed(value)) return 'youtube';
  if (isCloudinaryVideo(value) || FILE_EXTENSIONS.includes(extensionOf(value))) return 'file';
  return '';
}

/**
 * Dirección de entrega del archivo.
 *
 * En Cloudinary se le añaden `f_auto` y `q_auto`: el primero sirve el formato que
 * entienda cada navegador y el segundo elige la compresión según la red de quien
 * mira. Sin ellos, todos reciben el mismo archivo pesado, que es lo que se
 * quería evitar al no alojarlo aquí.
 *
 * Cualquier otra dirección se devuelve intacta: inventarle transformaciones a un
 * servidor que no las entiende rompería el enlace.
 */
export function videoFileUrl(url) {
  const value = String(url ?? '').trim();
  if (!isCloudinaryVideo(value)) return value;
  return value.replace('/video/upload/', '/video/upload/f_auto,q_auto/');
}

/**
 * Imagen de portada del video.
 *
 * Cloudinary entrega el primer fotograma cambiando la extensión por `.jpg`. Vale
 * la pena: sin portada, el reverso de la tarjeta abre con un rectángulo negro
 * hasta que alguien pulsa play, y un hueco negro se lee como algo que no cargó.
 */
export function videoPosterUrl(url) {
  const value = String(url ?? '').trim();
  if (!isCloudinaryVideo(value)) return '';

  const extension = extensionOf(value);
  const base = extension
    ? value.slice(0, value.length - extension.length - 1)
    : value;

  return `${base.replace('/video/upload/', '/video/upload/so_0/')}.jpg`;
}
