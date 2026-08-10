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

/*
  Medidas del hueco del retrato, tomadas del diseño de la tarjeta.

  Se declaran por separado y no como un número suelto para que la proporción se
  pueda comprobar contra el componente: si mañana la tarjeta cambia de ancho o la
  foto deja de ocupar el 60%, el recortador se corrige aquí y sigue coincidiendo.
*/
const FRAME_WIDTH = 320;
const FRAME_HEIGHT = 650;
const PHOTO_SHARE = 0.6;

/**
 * Proporción del recorte: exactamente la del hueco donde vive el retrato.
 *
 * No es la del teléfono entero, sino la de la zona nítida: 320 × 390, es decir
 * 0.8205. Antes valía 9/16 (0.5625), la del teléfono completo, y ahí estaba el
 * problema del encuadre: el recuadro del recortador era mucho más alto y
 * estrecho que el hueco real, así que lo que la persona encuadraba no era lo que
 * después se veía —al pintarse en una zona más cuadrada, se perdían los lados y
 * la cara quedaba descentrada—.
 *
 * Se usa el valor calculado y no 4/5 redondeado: con 0.8 sobraba un 2% de alto
 * que el navegador tenía que recortar por su cuenta, y ese recorte lo decide él,
 * no la persona.
 */
export const CARD_ASPECT = FRAME_WIDTH / (FRAME_HEIGHT * PHOTO_SHARE);

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

/** Convierte la URL de datos del recorte en un archivo listo para subir. */
export async function dataUrlToFile(dataUrl, name = 'foto.jpg') {
  const blob = await (await fetch(dataUrl)).blob();
  return new File([blob], name, { type: 'image/jpeg' });
}

/** Peso aproximado del recorte, para avisar antes de subir algo enorme. */
export function approximateBytes(dataUrl) {
  return Math.round((dataUrl.length - dataUrl.indexOf(',') - 1) * 0.75);
}


// ── Encuadre no destructivo ──────────────────────────────────────────────────

/**
 * Encuadre por omisión: centrado y sin acercamiento.
 *
 * `x` e `y` son porcentajes de `object-position`, así que 50/50 es el centro.
 * Es el punto de partida de cualquier foto nueva.
 */
export const DEFAULT_FOCUS = { x: 50, y: 50, zoom: 1 };

/** Límites del acercamiento en el ajustador. */
export const MIN_ZOOM = 1;
export const MAX_ZOOM = 3;

/**
 * Lee el encuadre guardado, que viaja como texto JSON.
 *
 * Cualquier valor que no se entienda cae al centro en lugar de romper la
 * tarjeta: es un dato de presentación, y una foto centrada siempre es preferible
 * a una pantalla en blanco.
 */
export function parseFocus(raw) {
  if (!raw) return DEFAULT_FOCUS;

  try {
    const value = typeof raw === 'string' ? JSON.parse(raw) : raw;
    const clamp = (n, min, max) => Math.min(max, Math.max(min, Number(n)));

    return {
      x: Number.isFinite(Number(value?.x)) ? clamp(value.x, 0, 100) : 50,
      y: Number.isFinite(Number(value?.y)) ? clamp(value.y, 0, 100) : 50,
      zoom: Number.isFinite(Number(value?.zoom)) ? clamp(value.zoom, MIN_ZOOM, MAX_ZOOM) : 1,
    };
  } catch {
    return DEFAULT_FOCUS;
  }
}

/** Serializa el encuadre para guardarlo. */
export function serializeFocus(focus) {
  const safe = parseFocus(focus);
  // Se redondea a un decimal: más precisión no se distingue a simple vista y
  // alargaría el texto guardado sin ninguna ganancia.
  return JSON.stringify({
    x: Math.round(safe.x * 10) / 10,
    y: Math.round(safe.y * 10) / 10,
    zoom: Math.round(safe.zoom * 100) / 100,
  });
}

/**
 * Estilos con los que se pinta el retrato según su encuadre.
 *
 * El acercamiento va como `scale` y la posición como `objectPosition`, y ninguna
 * de las dos toca los píxeles del archivo: la misma foto se puede recolocar
 * tantas veces como se quiera sin perder nada, porque lo que cambia es cómo se
 * mira, no lo que se guardó.
 *
 * `transformOrigin` sigue al punto elegido para que al acercar la imagen crezca
 * alrededor de lo que interesa —normalmente la cara— y no alrededor del centro
 * geométrico, que la desplazaría fuera del marco.
 */
export function focusStyle(focus) {
  const { x, y, zoom } = parseFocus(focus);
  return {
    objectPosition: `${x}% ${y}%`,
    transform: zoom === 1 ? undefined : `scale(${zoom})`,
    transformOrigin: `${x}% ${y}%`,
  };
}

/** Alto máximo al que se reduce la foto antes de subirla. */
const UPLOAD_MAX_SIDE = 1400;

/**
 * Reduce la foto sin recortarla y la devuelve como URL de datos.
 *
 * Es lo contrario de lo que hacía el recorte previo, y a propósito: al conservar
 * la imagen entera, el encuadre deja de ser una decisión irreversible que se toma
 * antes de subir. Se guarda todo y se elige después qué parte se muestra, tantas
 * veces como haga falta.
 *
 * El lado mayor se limita porque una foto de teléfono actual pesa varios megas y
 * se va a ver en un recuadro de 320 píxeles: subirla intacta gastaría el
 * almacenamiento y haría lenta la tarjeta sin que se note ninguna mejora.
 */
export async function shrinkImageForUpload(dataUrl) {
  const image = await loadImage(dataUrl);

  const scale = Math.min(1, UPLOAD_MAX_SIDE / Math.max(image.width, image.height));
  const width = Math.round(image.width * scale);
  const height = Math.round(image.height * scale);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext('2d');
  if (!context) throw new Error('Este navegador no pudo procesar la imagen.');

  context.drawImage(image, 0, 0, width, height);
  return canvas.toDataURL('image/jpeg', QUALITY);
}
