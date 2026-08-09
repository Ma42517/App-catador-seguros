/**
 * Reglas de los archivos adjuntos a un comunicado.
 *
 * El muro tiene que decidir cómo mostrar un adjunto sabiendo únicamente su URL,
 * porque es lo único que guarda la base. De ahí que todo aquí gire alrededor de
 * clasificar una URL, no un `File`.
 */

const IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'avif', 'bmp'];

const DOCUMENT_EXTENSIONS = [
  'pdf', 'doc', 'docx', 'txt', 'rtf', 'xls', 'xlsx', 'csv', 'ppt', 'pptx',
];

/** Lo que acepta el input de archivo del panel. */
export const ACCEPT_ATTACHMENTS = [
  'image/*',
  'application/pdf',
  '.doc', '.docx', '.txt', '.rtf',
  '.xls', '.xlsx', '.csv',
  '.ppt', '.pptx',
].join(',');

/** Etiqueta legible por extensión, para nombrar el adjunto en el muro. */
const DOCUMENT_LABELS = {
  pdf: 'PDF',
  doc: 'Documento Word',
  docx: 'Documento Word',
  txt: 'Documento de texto',
  rtf: 'Documento de texto',
  xls: 'Hoja de cálculo',
  xlsx: 'Hoja de cálculo',
  csv: 'Hoja de cálculo',
  ppt: 'Presentación',
  pptx: 'Presentación',
};

/**
 * Extensión en minúsculas, o cadena vacía.
 *
 * Descarta la query y el fragmento: las URLs firmadas de Storage llevan
 * parámetros después del nombre y sin recortarlos la extensión nunca calza.
 */
function extensionOf(url) {
  const clean = String(url ?? '').split(/[?#]/)[0];
  const lastSegment = clean.slice(clean.lastIndexOf('/') + 1);
  const dot = lastSegment.lastIndexOf('.');
  if (dot === -1) return '';
  return lastSegment.slice(dot + 1).toLowerCase();
}

/**
 * Clasifica el adjunto en 'image', 'document' o 'none'.
 *
 * Las URLs de datos (`data:`) se resuelven por su tipo MIME, porque no tienen
 * nombre de archivo del que sacar una extensión.
 */
export function attachmentKind(url) {
  const value = String(url ?? '').trim();
  if (!value) return 'none';

  if (value.startsWith('data:')) {
    if (value.startsWith('data:image/')) return 'image';
    return 'document';
  }

  const extension = extensionOf(value);

  if (IMAGE_EXTENSIONS.includes(extension)) return 'image';
  if (DOCUMENT_EXTENSIONS.includes(extension)) return 'document';

  // Sin extensión reconocible se asume imagen: es el caso de los servicios que
  // sirven fotos por identificador (picsum, unsplash) y equivocarse aquí sólo
  // cuesta una imagen que no carga, no un documento inaccesible.
  return 'image';
}

/**
 * Extensión deducida del tipo MIME de una URL de datos.
 *
 * En el modo sin Supabase el archivo se guarda como `data:` y no hay nombre del
 * que sacar la extensión, pero el MIME dice lo mismo.
 */
const MIME_EXTENSIONS = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'image/avif': 'avif',
  'application/pdf': 'pdf',
  'application/msword': 'doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  'text/plain': 'txt',
  'text/csv': 'csv',
  'application/vnd.ms-excel': 'xls',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
};

function dataUrlExtension(url) {
  const mime = url.slice(5).split(/[;,]/)[0];
  return MIME_EXTENSIONS[mime] ?? '';
}

/** Tipo de documento en palabras, para el texto de la tarjeta de adjunto. */
export function documentLabel(url) {
  const value = String(url ?? '');
  const extension = value.startsWith('data:')
    ? dataUrlExtension(value)
    : extensionOf(value);
  return DOCUMENT_LABELS[extension] ?? 'Documento adjunto';
}

/**
 * Nombre del archivo tal como se muestra al asesor.
 *
 * Quita el prefijo de milisegundos que se añade al subir, porque a quien lee el
 * muro no le dice nada, y descodifica los caracteres escapados de la URL.
 */
export function attachmentName(url) {
  const value = String(url ?? '');

  // Una URL de datos no tiene nombre de archivo, y cortarla por el último "/"
  // devolvería un pedazo del base64. Se nombra por su tipo.
  if (value.startsWith('data:')) {
    const extension = dataUrlExtension(value);
    return extension ? `archivo.${extension}` : 'archivo adjunto';
  }

  const clean = value.split(/[?#]/)[0];
  const raw = clean.slice(clean.lastIndexOf('/') + 1);
  let name = raw;
  try {
    name = decodeURIComponent(raw);
  } catch {
    // URL mal codificada: se usa el nombre tal cual.
  }
  return name.replace(/^\d{10,}-/, '');
}

/**
 * Tope para el modo sin Supabase, donde el archivo se guarda como URL de datos
 * dentro de localStorage. Base64 crece cerca de un tercio y la cuota del
 * navegador ronda los 5 MB, así que conviene quedarse muy por debajo.
 */
export const MAX_LOCAL_FILE_BYTES = 800 * 1024;

export function formatBytes(bytes) {
  if (!Number.isFinite(bytes)) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Nombre único para Storage.
 *
 * Los acentos y espacios en la clave del objeto generan URLs escapadas
 * frágiles, así que se normalizan. El prefijo de tiempo evita que dos flyers
 * con el mismo nombre se sobrescriban.
 */
export function storageFileName(originalName) {
  const safe = String(originalName ?? 'archivo')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._-]/g, '-')
    .replace(/-+/g, '-')
    .slice(-80);
  return `${Date.now()}-${safe}`;
}
