/**
 * Estampa los datos del asesor sobre la imagen de un flyer.
 *
 * Se dibuja en un <canvas> para producir un archivo nuevo: compartir el flyer
 * original y "adjuntar" los datos aparte no serviría, porque al reenviarse por
 * WhatsApp la imagen viaja sola.
 */

/** Proporciones relativas al ancho de la imagen, para que escale a cualquier tamaño. */
const BAND_RATIO = 0.17;
const PAD_RATIO = 0.05;
const NAME_RATIO = 0.055;
const PHONE_RATIO = 0.042;
const JPEG_QUALITY = 0.92;

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('La imagen no se pudo interpretar.'));
    img.src = src;
  });
}

function canvasToBlob(canvas) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('No se pudo generar la imagen.'))),
      'image/jpeg',
      JPEG_QUALITY,
    );
  });
}

/**
 * Devuelve un Blob nuevo con la marca de agua aplicada.
 * Si no hay datos que estampar, devuelve el original sin tocarlo.
 */
export async function stampWatermark(blob, { displayName, phone } = {}) {
  const lines = [String(displayName ?? '').trim(), String(phone ?? '').trim()].filter(Boolean);
  if (lines.length === 0) return blob;

  /*
    La imagen se carga desde un object URL del blob ya descargado, no desde la
    URL remota: así el canvas queda del mismo origen y `toBlob` no falla por
    contaminación (SecurityError) al exportar.
  */
  const objectUrl = URL.createObjectURL(blob);
  try {
    const img = await loadImage(objectUrl);

    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;

    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0);

    // Velo inferior: garantiza legibilidad sobre fotos claras u ocupadas.
    const bandHeight = Math.round(canvas.height * BAND_RATIO);
    const bandTop = canvas.height - bandHeight;
    const scrim = ctx.createLinearGradient(0, bandTop, 0, canvas.height);
    scrim.addColorStop(0, 'rgba(0,0,0,0)');
    scrim.addColorStop(0.45, 'rgba(0,0,0,0.55)');
    scrim.addColorStop(1, 'rgba(0,0,0,0.88)');
    ctx.fillStyle = scrim;
    ctx.fillRect(0, bandTop, canvas.width, bandHeight);

    const pad = Math.round(canvas.width * PAD_RATIO);
    const nameSize = Math.round(canvas.width * NAME_RATIO);
    const phoneSize = Math.round(canvas.width * PHONE_RATIO);
    const gap = Math.round(nameSize * 0.35);

    ctx.textBaseline = 'alphabetic';
    ctx.textAlign = 'left';
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = 'rgba(0,0,0,0.55)';
    ctx.shadowBlur = Math.round(canvas.width * 0.012);

    // Se dibuja de abajo hacia arriba para anclar el bloque al borde inferior.
    let baseline = canvas.height - pad;
    for (let i = lines.length - 1; i >= 0; i -= 1) {
      const isName = i === 0;
      const size = isName ? nameSize : phoneSize;
      ctx.font = `${isName ? 700 : 500} ${size}px Inter, system-ui, -apple-system, sans-serif`;
      ctx.fillStyle = isName ? '#ffffff' : 'rgba(255,255,255,0.88)';
      ctx.fillText(lines[i], pad, baseline);
      baseline -= size + gap;
    }

    return await canvasToBlob(canvas);
  } finally {
    // Sin revocar, el blob queda retenido en memoria toda la sesión.
    URL.revokeObjectURL(objectUrl);
  }
}
