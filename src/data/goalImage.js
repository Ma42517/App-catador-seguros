/**
 * Preparación de la imagen de fondo de una meta.
 *
 * La foto se guarda en localStorage como URL de datos, y una foto de celular
 * ronda los 4 MB: en base64 sube a más de 5 MB y revienta la cuota del
 * navegador con una sola meta. Por eso se reescala y recomprime antes de
 * guardarla, en lugar de aceptar el archivo tal cual.
 *
 * No se sube a Supabase Storage a propósito: las metas son personales del
 * asesor, no contenido de la promotoría, y el bucket del Workplace es para lo
 * segundo. Guardarlas juntas mezclaría dos cosas con dueños distintos.
 */

/** Ancho máximo del fondo. Da de sobra para una tarjeta a ancho de pantalla. */
const MAX_WIDTH = 1000;

/** Calidad JPEG: por debajo de 0.7 se notan bloques en fondos con degradado. */
const QUALITY = 0.75;

/** Tope de seguridad para el archivo de entrada. */
export const MAX_IMAGE_BYTES = 12 * 1024 * 1024;

function loadImage(dataUrl) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('El archivo no parece ser una imagen válida.'));
    image.src = dataUrl;
  });
}

function readAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error('No se pudo leer el archivo.'));
    reader.readAsDataURL(file);
  });
}

/**
 * Devuelve `{ dataUrl, width, height, bytes }` con la imagen ya reducida.
 *
 * Lanza con un mensaje presentable si el archivo no sirve: quien lo llama lo
 * muestra tal cual en el formulario.
 */
export async function prepareGoalImage(file) {
  if (!file) throw new Error('No se eligió ninguna imagen.');

  if (!file.type.startsWith('image/')) {
    throw new Error('El fondo de la meta tiene que ser una imagen.');
  }

  if (file.size > MAX_IMAGE_BYTES) {
    throw new Error('La imagen es demasiado grande. Elige una de menos de 12 MB.');
  }

  const original = await readAsDataUrl(file);
  const image = await loadImage(original);

  const scale = Math.min(1, MAX_WIDTH / image.width);
  const width = Math.max(1, Math.round(image.width * scale));
  const height = Math.max(1, Math.round(image.height * scale));

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext('2d');
  if (!context) throw new Error('Este navegador no pudo procesar la imagen.');
  context.drawImage(image, 0, 0, width, height);

  // Siempre JPEG: un PNG de foto pesa varias veces más sin ganancia visible, y
  // aquí la imagen va detrás de un velo oscuro con texto encima.
  const dataUrl = canvas.toDataURL('image/jpeg', QUALITY);

  return {
    dataUrl,
    width,
    height,
    // Longitud del base64 menos la cabecera, ajustada por el factor 4/3.
    bytes: Math.round((dataUrl.length - dataUrl.indexOf(',') - 1) * 0.75),
  };
}
