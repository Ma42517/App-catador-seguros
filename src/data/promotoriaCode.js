/**
 * El código de invitación de una promotoría.
 *
 * Forma: letras, tres dígitos y dos dígitos. `MAC-866-08` y `PROMO-866-01` son
 * los dos válidos: el prefijo admite de dos a ocho letras porque unas
 * promotorías se reconocen por sus iniciales y otras prefieren una palabra.
 * Antes eran exactamente tres y `PROMO-866-01` se convertía en basura al
 * normalizarlo —se tomaban tres letras y el resto se corría—, que es el tipo de
 * fallo que no avisa: el código entra, se guarda mal y nadie entiende por qué no
 * funciona.
 *
 * No es un identificador técnico y por eso no es un UUID: se dicta por teléfono,
 * se pega en un grupo de WhatsApp y se teclea a mano en un celular. Todo lo de
 * aquí existe para que eso no falle.
 */

/** Largo del prefijo de letras. */
const MIN_LETTERS = 2;
const MAX_LETTERS = 8;

/*
  Sólo A–Z sin acentos ni Ñ. El código se dicta en voz alta y se teclea en
  cualquier teléfono: una Ñ obligaría a buscar la tecla y una tilde produciría dos
  textos distintos para el mismo código.
*/
function cleanUpper(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase();
}

/**
 * Iniciales de la promotoría, hasta tres letras.
 *
 * De "M. Aceves y Consultores" saca MAC: la primera letra de cada palabra con
 * contenido, descartando las de enlace —"y", "de", "la"—, que no aportan y
 * gastarían un sitio.
 */
export function initialsFrom(name) {
  const skip = new Set(['Y', 'DE', 'DEL', 'LA', 'LAS', 'EL', 'LOS', 'E']);

  const words = cleanUpper(name)
    .split(/[^A-Z]+/)
    .filter((word) => word && !skip.has(word));

  const letters = words.map((word) => word[0]).join('').slice(0, 3);
  if (letters.length === 3) return letters;

  /*
    Con menos de tres palabras se completa con las siguientes letras de la
    primera: "Seguros" da SEG y no S, porque un código de una sola letra se
    confunde con cualquier otro al dictarlo.
  */
  const first = (words[0] ?? '').replace(/[^A-Z]/g, '');
  return (letters + first.slice(1)).slice(0, 3).padEnd(3, 'X');
}

/** Dígitos aleatorios, en el largo que se pida. */
function digits(count) {
  let out = '';
  for (let i = 0; i < count; i += 1) out += Math.floor(Math.random() * 10);
  return out;
}

/**
 * Genera un código nuevo.
 *
 * Los cinco dígitos dan cien mil combinaciones por prefijo. No es criptografía y
 * no pretende serlo: el código no da acceso, sólo dice a qué promotoría se pide
 * entrar, y quien lo use queda igualmente esperando aprobación. Adivinarlo no
 * sirve para colarse.
 */
export function generateCode(promotoriaName) {
  return `${initialsFrom(promotoriaName)}-${digits(3)}-${digits(2)}`;
}

/**
 * Normaliza lo que la persona teclea.
 *
 * `promo86601`, `PROMO 866 01` y `promo-866-01` devuelven los tres
 * `PROMO-866-01`. Es la diferencia entre un código que funciona y uno que "no
 * sirve" porque alguien copió un espacio de más de WhatsApp.
 *
 * El corte se hace desde el final y no desde el principio: los cinco dígitos
 * están fijos al final, así que ahí es donde se puede separar sin saber cuántas
 * letras trae el prefijo. Cortando desde delante habría que adivinarlo.
 */
export function normalizeCode(input) {
  const clean = cleanUpper(input).replace(/[^A-Z0-9]/g, '');

  const match = clean.match(/^([A-Z]+)(\d{1,5})$/);
  if (!match) return clean;

  const [, letters, numbers] = match;
  if (numbers.length <= 3) return `${letters}-${numbers}`;
  return `${letters}-${numbers.slice(0, 3)}-${numbers.slice(3)}`;
}

/** La forma completa: letras, tres dígitos y dos dígitos. */
const FULL = new RegExp(`^[A-Z]{${MIN_LETTERS},${MAX_LETTERS}}-\\d{3}-\\d{2}$`);

export function isValidCode(input) {
  return FULL.test(normalizeCode(input));
}

/**
 * Por qué un código no sirve, en palabras.
 *
 * Devuelve `''` cuando es válido. Un "código no válido" a secas obliga a
 * adivinar qué falta —¿sobran letras? ¿faltan dígitos?— y eso se paga en
 * intentos delante de alguien que está esperando para entrar.
 */
export function explainCode(input) {
  const normalized = normalizeCode(input);
  if (FULL.test(normalized)) return '';

  if (!normalized) return 'Escribe el código que te dio tu promotor.';

  const letters = (normalized.match(/^[A-Z]+/) ?? [''])[0];
  const numbers = normalized.replace(/[^0-9]/g, '');

  if (letters.length < MIN_LETTERS) {
    return `El código empieza con al menos ${MIN_LETTERS} letras, como PROMO-866-01.`;
  }
  if (letters.length > MAX_LETTERS) {
    return `El prefijo no puede pasar de ${MAX_LETTERS} letras.`;
  }
  if (numbers.length < 5) {
    return `Faltan dígitos: van 5 al final y llevas ${numbers.length}.`;
  }
  return 'Sobran dígitos: van 5 al final, como PROMO-866-01.';
}
