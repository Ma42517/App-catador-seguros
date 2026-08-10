/**
 * Recorte de la foto de la tarjeta digital.
 *
 * La foto se usa en dos lugares de la tarjeta: como retrato nítido dentro de un
 * círculo, y como fondo desenfocado a pantalla completa. El círculo es el que
 * manda, porque es donde se ve el detalle, y un círculo necesita un cuadrado:
 * cualquier otra proporción obliga al navegador a recortar por su cuenta al
 * meterla ahí, y ese recorte automático parte por el centro, justo donde no está
 * la cara. El fondo no impone nada, ya que un desenfoque fuerte oculta la
 * proporción de origen.
 *
 * Antes se recortaba al marco entero de la tarjeta (320×650, muy alto y
 * estrecho) porque el diseño anterior usaba la foto como fondo nítido a sangre.
 * Al pasar al retrato circular, esa tira alta habría quedado peor que la foto
 * original: el círculo la habría recortado a su parte central y decapitado al
 * retrato.
 *
 * El recorte queda grabado en el archivo que se sube, así que la tarjeta se ve
 * igual en cualquier dispositivo sin guardar datos de encuadre en la base.
 */

/** El retrato es circular, así que el recorte es cuadrado. */
export const AVATAR_ASPECT = 1;

/**
 * Tamaño de salida. El círculo se dibuja a 128 px, pero el mismo archivo se
 * estira a pantalla completa como fondo, y ahí 128 px se verían como una malla
 * de bloques incluso desenfocados.
 */
const OUTPUT_SIZE = 640;

/** Calidad JPEG: por debajo de 0.8 se notan bloques en la piel de un retrato. */
const QUALITY = 0.82;

export const MAX_INPUT_BYTES = 12 * 1024 * 1024;

/** Carga el archivo en un elemento de imagen, listo para dibujar en el lienzo. */
export function loadImageFromFile(file) {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      reject(new Error('El archivo tiene que ser una imagen.'));
      return;
    }
    if (file.size > MAX_INPUT_BYTES) {
      reject(new Error('La imagen es demasiado grande. Elige una de menos de 12 MB.'));
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => reject(reader.error ?? new Error('No se pudo leer el archivo.'));
    reader.onload = () => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error('El archivo no parece ser una imagen válida.'));
      image.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Recorta la imagen a un cuadrado y devuelve una URL de datos.
 *
 * `zoom` es 1 en el encuadre más amplio posible: el que aprovecha toda la foto
 * que cabe. `offsetY` va de 0 (arriba) a 1 (abajo) y decide qué parte se
 * conserva cuando sobra alto, que es lo que permite dejar la cara en el cuadro.
 *
 * El mismo cálculo alimenta la vista previa y el archivo final, así que lo que
 * se ve al ajustar es exactamente lo que se guarda.
 */
export function cropToAvatar(image, { zoom = 1, offsetY = 0.5 } = {}) {
  const canvas = document.createElement('canvas');
  canvas.width = OUTPUT_SIZE;
  canvas.height = OUTPUT_SIZE;

  const context = canvas.getContext('2d');
  if (!context) throw new Error('Este navegador no pudo procesar la imagen.');

  // Escala mínima que cubre el cuadro por completo, ampliada por el zoom.
  const cover = Math.max(OUTPUT_SIZE / image.width, OUTPUT_SIZE / image.height);
  const scale = cover * Math.max(1, zoom);

  // Trozo de la foto original que acaba siendo visible.
  const sourceSize = OUTPUT_SIZE / scale;

  // Horizontal siempre centrado; vertical lo decide la persona.
  const sourceX = Math.max(0, (image.width - sourceSize) / 2);
  const sourceY = Math.max(0, (image.height - sourceSize) * Math.min(1, Math.max(0, offsetY)));

  context.drawImage(
    image,
    sourceX, sourceY, sourceSize, sourceSize,
    0, 0, OUTPUT_SIZE, OUTPUT_SIZE,
  );

  // Siempre JPEG: un PNG de retrato pesa varias veces más sin ganancia visible.
  return canvas.toDataURL('image/jpeg', QUALITY);
}

/**
 * Píxeles de alto que sobran con este zoom, es decir, cuánto margen hay para
 * subir o bajar el recorte.
 *
 * Con un recorte cuadrado hay margen desde el principio en cualquier foto más
 * alta que ancha —la mayoría de los retratos—, así que el control de altura
 * sirve sin necesidad de acercar. En una foto apaisada, en cambio, el alto entra
 * completo y lo que sobra es el ancho: ahí vale 0 hasta que se acerca.
 *
 * Lo usa la interfaz para no ofrecer un control que no haría nada.
 */
export function verticalSlack(image, zoom = 1) {
  const cover = Math.max(OUTPUT_SIZE / image.width, OUTPUT_SIZE / image.height);
  const scale = cover * Math.max(1, zoom);
  return Math.max(0, image.height - OUTPUT_SIZE / scale);
}

/** Convierte la URL de datos del recorte en un archivo listo para subir. */
export async function dataUrlToFile(dataUrl, name = 'foto.jpg') {
  const blob = await (await fetch(dataUrl)).blob();
  return new File([blob], name, { type: 'image/jpeg' });
}

/** Peso aproximado del recorte, para avisar antes de subir algo enorme. */
export function approximateBytes(dataUrl) {
  return Math.round((dataUrl.length - dataUrl.indexOf(',') - 1) * 0.75);
}
