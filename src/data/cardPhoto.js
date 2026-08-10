/**
 * Recorte de la foto de fondo de la tarjeta digital.
 *
 * El diseño de la tarjeta es "Full Image Background": la foto ocupa todo el
 * fondo del marco (vertical, tipo póster de celular), con un degradado oscuro
 * encima y el contenido sobrepuesto abajo. Por eso el recorte que le importa a
 * esta pantalla ya no es cuadrado sino vertical, en la misma proporción del
 * marco de la tarjeta (9:16, igual que la pantalla de un celular). Así lo que
 * el asesor encuadra en el recortador es exactamente lo que se ve detrás de su
 * nombre y sus datos de contacto.
 *
 * El recorte se hace con un `<canvas>` nativo a partir del área que devuelve
 * `react-easy-crop`, y queda grabado en el archivo que se sube: la tarjeta se
 * ve igual en cualquier dispositivo sin guardar datos de encuadre en la base.
 */

/**
 * Proporción del recorte: ancho / alto de la zona donde vive el retrato.
 *
 * No es la del teléfono entero, es la de la **mitad superior** de la tarjeta,
 * que es lo único que se ve nítido. En el marco de 320 × 650 esa zona mide
 * 320 × 390, o sea 0.82; se usa 4/5 (0.8), que es prácticamente el mismo valor y
 * un formato estándar de retrato.
 *
 * Antes valía 9/16, la del teléfono completo. Con esa proporción el recuadro del
 * recortador era mucho más alto y estrecho que el hueco real, así que lo que la
 * persona encuadraba no era lo que después se veía: al pintarse en una zona más
 * cuadrada, los bordes se perdían y la cara acababa descentrada. Ése era el
 * origen del problema del encuadre.
 */
export const CARD_ASPECT = 4 / 5;

/** Alto de salida. El ancho se deriva de `CARD_ASPECT` para mantener nitidez
 *  en pantallas grandes sin generar un archivo pesado. */
const OUTPUT_HEIGHT = 1280;
const OUTPUT_WIDTH = Math.round(OUTPUT_HEIGHT * CARD_ASPECT);

/** Calidad JPEG: por debajo de 0.8 se notan bloques en fotos de personas. */
const QUALITY = 0.85;

export const MAX_INPUT_BYTES = 12 * 1024 * 1024;

/**
 * Valida el archivo y lo convierte en una URL de datos, lista para pasarse al
 * recortador. `react-easy-crop` necesita una URL (no un `Image` ya decodificado
 * como antes), así que aquí sólo se lee el archivo, sin decodificarlo.
 */
export function readImageFile(file) {
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
    reader.onload = () => resolve(String(reader.result));
    reader.readAsDataURL(file);
  });
}

/** Carga una URL de datos en un elemento `<img>`, listo para dibujarse en un lienzo. */
function loadImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    // Evita el error de "canvas contaminado" al recortar imágenes que ya
    // vinieron de otro origen (la propia URL de datos no lo necesita, pero
    // no hace daño dejarlo listo para cuando la fuente sea remota).
    image.crossOrigin = 'anonymous';
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('El archivo no parece ser una imagen válida.'));
    image.src = src;
  });
}

/**
 * Recorta la imagen al área elegida en el recortador y la escala al tamaño de
 * salida de la tarjeta.
 *
 * `croppedAreaPixels` viene de `onCropComplete` de `react-easy-crop`: es el
 * rectángulo, en píxeles de la imagen original, que el asesor dejó dentro del
 * marco. Aquí sólo se traduce ese rectángulo a un archivo real.
 */
export async function cropToCardBackground(imageSrc, croppedAreaPixels) {
  const image = await loadImage(imageSrc);

  const canvas = document.createElement('canvas');
  canvas.width = OUTPUT_WIDTH;
  canvas.height = OUTPUT_HEIGHT;

  const context = canvas.getContext('2d');
  if (!context) throw new Error('Este navegador no pudo procesar la imagen.');

  const { x, y, width, height } = croppedAreaPixels;

  context.drawImage(
    image,
    x, y, width, height,
    0, 0, OUTPUT_WIDTH, OUTPUT_HEIGHT,
  );

  // Siempre JPEG: un PNG de fondo de tarjeta pesa varias veces más sin
  // ganancia visible, y el degradado oscuro ya cubre buena parte de la foto.
  return canvas.toDataURL('image/jpeg', QUALITY);
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
