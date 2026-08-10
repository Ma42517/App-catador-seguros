/**
 * Subida del video de presentación a Cloudinary.
 *
 * ¿Por qué un servicio de video y no el bucket de Supabase, que ya está montado
 * y autorizado? Por una razón que sólo aparece con archivos reales: un video
 * grabado con un iPhone sale en HEVC dentro de un `.mov`, y ese formato no se
 * reproduce en Chrome ni en la mayoría de los Android. Guardado tal cual, el
 * asesor vería su video perfecto en su teléfono y sus prospectos verían un
 * cuadro negro —el peor de los fallos, porque quien lo publica no puede
 * detectarlo—. Cloudinary lo transcodifica a H.264 al recibirlo y lo entrega
 * desde su red, así que se ve igual en todas partes y no gasta el tráfico de
 * Supabase, que es el mismo del que dependen las fotos y los comunicados.
 *
 * La subida va directa del navegador a Cloudinary, sin pasar por esta app: un
 * video de decenas de megas atravesando un servidor propio sería pagarlo dos
 * veces en tráfico.
 */

/*
  ┌─────────────────────────────────────────────────────────────────────────┐
  │  TU_CLOUD_NAME — reemplaza la cadena vacía por el nombre de tu nube.    │
  │  Está arriba a la derecha del panel de Cloudinary, en "Cloud name".     │
  │  Ejemplo:  const TU_CLOUD_NAME = 'dq8xk2abc';                           │
  └─────────────────────────────────────────────────────────────────────────┘

  Se puede dejar vacía y usar la variable `VITE_CLOUDINARY_CLOUD_NAME` en Vercel,
  que es lo preferible: el mismo código sirve para pruebas y para producción sin
  editarlo. Pero escribirla aquí no es una fuga de seguridad y conviene saberlo:
  el nombre de la nube viaja en la dirección de todos los videos que se entregan,
  así que ya es público por definición. Lo que nunca debe escribirse en el código
  es el API Secret de Cloudinary, y aquí no hace falta ninguno porque la subida es
  "unsigned".
*/
const TU_CLOUD_NAME = '';

/** El preset de subida, también configurable por variable de entorno. */
const TU_UPLOAD_PRESET = 'tarjetas_video';

const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || TU_CLOUD_NAME;
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_VIDEO_PRESET || TU_UPLOAD_PRESET;

/** ¿Está configurado el servicio en este entorno? */
export const isVideoUploadConfigured = Boolean(CLOUD_NAME);

/**
 * Tope de duración.
 *
 * Diez segundos no es una limitación técnica, es la promesa de la tarjeta: quien
 * la recibe le concede unos segundos, y un video de tres minutos no se ve, se
 * abandona. Se deja un margen porque los teléfonos redondean la duración a su
 * manera y rechazar un video de 10.2 s grabado "de diez segundos" sería
 * incomprensible para quien lo grabó.
 */
export const MAX_VIDEO_SECONDS = 10;
const DURATION_TOLERANCE = 1.5;

/**
 * Tope de peso. Diez segundos en 4K rondan los 50 MB, así que el límite no está
 * para ahorrar espacio sino para no dejar a alguien esperando una subida
 * eterna con datos móviles.
 */
export const MAX_VIDEO_BYTES = 60 * 1024 * 1024;

/** Lo que acepta el input de archivo. */
export const ACCEPT_VIDEO = 'video/mp4,video/quicktime,video/webm,video/x-m4v';

export function formatSeconds(seconds) {
  if (!Number.isFinite(seconds)) return '';
  return `${seconds.toFixed(1).replace(/\.0$/, '')} s`;
}

export function formatMegabytes(bytes) {
  if (!Number.isFinite(bytes)) return '';
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Duración del archivo, leyendo sólo sus metadatos.
 *
 * Devuelve `null` cuando el navegador no puede decodificarlo, y eso **no** es un
 * error: es justo el caso del `.mov` en HEVC que motiva usar Cloudinary. Un
 * navegador que no sabe leerlo tampoco sabe su duración, y rechazar el archivo
 * ahí impediría subir precisamente los que hay que convertir.
 */
export function readVideoDuration(file) {
  return new Promise((resolve) => {
    const objectUrl = URL.createObjectURL(file);
    const probe = document.createElement('video');

    // Si el archivo no se puede leer, no se espera indefinidamente: hay
    // navegadores que no disparan ningún evento con un códec desconocido.
    const timer = setTimeout(() => finish(null), 4000);

    function finish(value) {
      clearTimeout(timer);
      probe.removeAttribute('src');
      URL.revokeObjectURL(objectUrl);
      resolve(value);
    }

    probe.preload = 'metadata';
    probe.muted = true;
    probe.onloadedmetadata = () => {
      finish(Number.isFinite(probe.duration) && probe.duration > 0 ? probe.duration : null);
    };
    probe.onerror = () => finish(null);
    probe.src = objectUrl;
  });
}

/**
 * Revisa el archivo antes de gastar datos en subirlo.
 *
 * Devuelve el mensaje del problema, o `''` si puede subirse. Se valida aquí y no
 * al recibir la respuesta porque el aviso tiene que llegar antes de la espera:
 * enterarse de que el video era muy largo después de dos minutos de subida es
 * cobrarle a la persona el error dos veces.
 */
export async function validateVideoFile(file) {
  if (!file) return 'Elige un archivo de video.';

  if (!/^video\//.test(file.type)) {
    return 'Ese archivo no es un video. Elige uno grabado con tu cámara.';
  }

  if (file.size > MAX_VIDEO_BYTES) {
    return `El video pesa ${formatMegabytes(file.size)} y el tope es `
      + `${formatMegabytes(MAX_VIDEO_BYTES)}. Grábalo en menor calidad o más corto.`;
  }

  const duration = await readVideoDuration(file);
  if (duration !== null && duration > MAX_VIDEO_SECONDS + DURATION_TOLERANCE) {
    return `El video dura ${formatSeconds(duration)} y el máximo son `
      + `${MAX_VIDEO_SECONDS} segundos. Recórtalo desde la galería de tu teléfono.`;
  }

  return '';
}

/**
 * Traduce los fallos de Cloudinary a algo que se pueda arreglar.
 *
 * Los mensajes originales están en inglés y describen la causa técnica. "Upload
 * preset not found" no le dice a nadie que falta configurar el preset, ni dónde.
 */
function explain(raw, status) {
  const text = String(raw ?? '');

  if (/preset not found|Invalid upload preset/i.test(text)) {
    return 'Falta configurar el preset de subida en Cloudinary, o su nombre no coincide. '
      + 'Revisa que exista uno llamado como VITE_CLOUDINARY_VIDEO_PRESET y que sea "unsigned".';
  }
  if (/File size too large|larger than/i.test(text)) {
    return 'Cloudinary rechazó el video por su peso. Grábalo más corto o en menor calidad.';
  }
  if (/Invalid image file|not a valid|unsupported/i.test(text)) {
    return 'Cloudinary no pudo procesar ese archivo. Prueba con un video en MP4.';
  }
  /*
    "Unknown API key" con un 401 suena a credenciales, y no lo es.

    Cloudinary contesta eso cuando no reconoce la petición como una subida sin
    firma, y entonces busca una clave de API que aquí nunca se manda. Comprobado
    contra la API: devuelve exactamente el mismo texto con un preset inventado,
    con un nombre de nube inventado y sin preset alguno, así que el mensaje no
    distingue la causa y culpar al nombre de la nube manda a revisar lo que casi
    siempre está bien.

    El orden de las causas es el de su frecuencia real: el nombre del preset
    escrito distinto —un punto donde va un guion bajo— es lo más común, y que la
    cuenta no tenga habilitadas las subidas sin firma lo segundo.
  */
  if (status === 401 || /Unknown API key|disabled/i.test(text)) {
    return 'Cloudinary no reconoció la subida. Revisa, en este orden: '
      + `1) que el preset se llame exactamente "${UPLOAD_PRESET}" `
      + '—con guion bajo, no con punto—; '
      + '2) que en Settings › Upload esté habilitado el uso de presets sin firma; '
      + '3) que el preset esté guardado con Signing mode en "Unsigned".';
  }
  if (status === 420 || /Rate limit/i.test(text)) {
    return 'Demasiadas subidas seguidas. Espera un momento y vuelve a intentar.';
  }

  return text || 'No se pudo subir el video. Revisa tu conexión e inténtalo de nuevo.';
}

/**
 * Sube el video y devuelve `{ url, error }`.
 *
 * Va con `XMLHttpRequest` y no con `fetch` por un motivo concreto: `fetch` no
 * informa del avance de la subida. Con datos móviles, un video tarda decenas de
 * segundos, y una pantalla que sólo dice "espera" sin moverse se interpreta como
 * colgada —la persona cierra la app y lo intenta otra vez, duplicando el gasto—.
 *
 * `onProgress` recibe un entero de 0 a 100.
 */
export function uploadVideo(file, { onProgress } = {}) {
  return new Promise((resolve) => {
    if (!isVideoUploadConfigured) {
      resolve({
        url: '',
        error: {
          message: 'Falta configurar Cloudinary en este entorno.',
          hint: 'Define VITE_CLOUDINARY_CLOUD_NAME en las variables del proyecto.',
        },
      });
      return;
    }

    const body = new FormData();
    body.append('file', file);
    body.append('upload_preset', UPLOAD_PRESET);

    const request = new XMLHttpRequest();
    request.open('POST', `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/video/upload`);

    request.upload.onprogress = (event) => {
      if (!event.lengthComputable || typeof onProgress !== 'function') return;
      onProgress(Math.round((event.loaded / event.total) * 100));
    };

    request.onload = () => {
      let data = {};
      try {
        data = JSON.parse(request.responseText);
      } catch {
        data = {};
      }

      /*
        Se comprueba el estado además de la presencia de `secure_url`. Cloudinary
        contesta 400 con `{ error: { message } }`, y mirando sólo si vino la URL
        el fallo se vive como un botón que no hace nada: la subida termina, no
        aparece el video y nadie dice por qué.
      */
      if (request.status >= 200 && request.status < 300 && data.secure_url) {
        resolve({ url: data.secure_url, error: null });
        return;
      }

      resolve({
        url: '',
        error: { message: explain(data?.error?.message, request.status) },
      });
    };

    request.onerror = () => resolve({
      url: '',
      error: { message: 'Se cortó la conexión durante la subida. Inténtalo de nuevo.' },
    });

    request.onabort = () => resolve({
      url: '',
      error: { message: '', code: 'ABORTED' },
    });

    request.send(body);

    // Se devuelve la forma de cancelar por el propio objeto de la promesa: quien
    // llama puede abortar si la persona cierra el panel a medio subir.
    uploadVideo.lastRequest = request;
  });
}

/** Corta la subida en curso, si hay alguna. */
export function abortVideoUpload() {
  const request = uploadVideo.lastRequest;
  if (request && request.readyState !== 4) request.abort();
}
