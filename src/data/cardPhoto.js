/**
 * Recorte de la foto de la tarjeta digital.
 *
 * El marco de la tarjeta es muy alto y estrecho (320×650, proporción 0.49). Una
 * foto normal —apaisada o cuadrada— metida ahí con `object-cover` se amplía
 * enormemente: se recorta a lo ancho hasta dejar sólo el centro, y el resultado
 * parece un acercamiento accidental.
 *
 * No se resuelve con clases de CSS: el problema es que la foto y el marco tienen
 * proporciones distintas. Aquí se recorta la imagen a la proporción del marco
 * antes de subirla, de modo que el archivo guardado ya encaja y `object-cover`
 * no tiene nada que recortar. Como el recorte queda grabado en el archivo, la
 * tarjeta se ve igual en cualquier dispositivo sin guardar datos de encuadre.
 */

/** Proporción del marco de la tarjeta: 320 de ancho por 650 de alto. */
export const CARD_ASPECT = 320 / 650;

/** Tamaño de salida. El doble del marco, para que se vea nítida en pantallas densas. */
const OUTPUT_WIDTH = 640;
const OUTPUT_HEIGHT = Math.round(OUTPUT_WIDTH / CARD_ASPECT);

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
 * Recorta la imagen al marco de la tarjeta y devuelve una URL de datos.
 *
 * `zoom` es 1 en el encuadre más amplio posible: el que aprovecha toda la foto
 * que cabe. `offsetY` va de 0 (arriba) a 1 (abajo) y decide qué parte se
 * conserva cuando sobra alto, que es lo que permite dejar la cara en el cuadro.
 *
 * El mismo cálculo alimenta la vista previa y el archivo final, así que lo que
 * se ve al ajustar es exactamente lo que se guarda.
 */
export function cropToCard(image, { zoom = 1, offsetY = 0.5 } = {}) {
  const canvas = document.createElement('canvas');
  canvas.width = OUTPUT_WIDTH;
  canvas.height = OUTPUT_HEIGHT;

  const context = canvas.getContext('2d');
  if (!context) throw new Error('Este navegador no pudo procesar la imagen.');

  // Escala mínima que cubre el marco por completo, ampliada por el zoom.
  const cover = Math.max(OUTPUT_WIDTH / image.width, OUTPUT_HEIGHT / image.height);
  const scale = cover * Math.max(1, zoom);

  // Trozo de la foto original que acaba siendo visible.
  const sourceWidth = OUTPUT_WIDTH / scale;
  const sourceHeight = OUTPUT_HEIGHT / scale;

  // Horizontal siempre centrado; vertical lo decide la persona.
  const sourceX = Math.max(0, (image.width - sourceWidth) / 2);
  const sourceY = Math.max(0, (image.height - sourceHeight) * Math.min(1, Math.max(0, offsetY)));

  context.drawImage(
    image,
    sourceX, sourceY, sourceWidth, sourceHeight,
    0, 0, OUTPUT_WIDTH, OUTPUT_HEIGHT,
  );

  // Siempre JPEG: un PNG de retrato pesa varias veces más sin ganancia visible.
  return canvas.toDataURL('image/jpeg', QUALITY);
}

/**
 * Píxeles de alto que sobran con este zoom, es decir, cuánto margen hay para
 * subir o bajar el recorte.
 *
 * Casi siempre vale 0 con el zoom al mínimo. La escala se calcula con el mayor
 * de los dos factores necesarios para cubrir el marco, así que la dimensión que
 * manda se usa entera y sólo sobra la otra. Como el marco es más alto que 2:1,
 * en una foto normal —apaisada, cuadrada o retrato 3:4— lo que sobra es el
 * ancho: la altura entra completa y no hay nada que decidir. Sólo al acercar
 * aparece margen vertical.
 *
 * Lo usa la interfaz para no ofrecer un control que no haría nada.
 */
export function verticalSlack(image, zoom = 1) {
  const cover = Math.max(OUTPUT_WIDTH / image.width, OUTPUT_HEIGHT / image.height);
  const scale = cover * Math.max(1, zoom);
  return Math.max(0, image.height - OUTPUT_HEIGHT / scale);
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
