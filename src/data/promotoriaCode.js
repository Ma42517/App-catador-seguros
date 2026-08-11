/**
 * El código de invitación de una promotoría.
 *
 * Forma: `MAC-866-08`. Tres letras del nombre de la promotoría, tres dígitos y
 * dos dígitos. No es un identificador técnico y por eso no es un UUID: se dicta
 * por teléfono, se escribe en un grupo de WhatsApp y se teclea a mano en un
 * celular. Todo lo de aquí existe para que eso no falle.
 */

/*
  Alfabeto de las letras: sólo A–Z sin acentos ni Ñ. El código se dicta en voz
  alta y se teclea en cualquier teléfono, así que una Ñ obligaría a buscar la
  tecla y una tilde produciría dos textos distintos para el mismo código.
*/
const LETTERS = /[^A-Z]/g;

/**
 * Iniciales de la promotoría, tres letras.
 *
 * De "M. Aceves y Consultores" saca MAC: toma la primera letra de cada palabra
 * con contenido y descarta las de enlace —"y", "de", "la"—, que no aportan y
 * gastarían uno de los tres sitios.
 */
export function initialsFrom(name) {
  const skip = new Set(['Y', 'DE', 'DEL', 'LA', 'LAS', 'EL', 'LOS', 'E']);

  const words = String(name ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .split(/[^A-Z]+/)
    .filter((word) => word && !skip.has(word));

  const letters = words.map((word) => word[0]).join('').slice(0, 3);

  /*
    Con menos de tres palabras se completa con las siguientes letras de la
    primera: "Seguros" da SEG y no S, porque un código de una sola letra se
    confunde con cualquier otro al dictarlo.
  */
  if (letters.length === 3) return letters;
  const first = (words[0] ?? '').replace(LETTERS, '');
  return (letters + first.slice(1)).slice(0, 3).padEnd(3, 'X');
}

/** Dígitos aleatorios, en el largo que se pida. */
function digits(count) {
  let out = '';
  for (let i = 0; i < count; i += 1) out += Math.floor(Math.random() * 10);
  return out;
}

/**
 * Genera un código nuevo para una promotoría.
 *
 * Los cinco dígitos dan cien mil combinaciones por cada juego de iniciales. No es
 * criptografía y no pretende serlo: el código no da acceso, sólo dice a qué
 * promotoría se pide entrar, y quien lo use queda igualmente en espera de que el
 * promotor lo apruebe. Adivinarlo no sirve para colarse.
 */
export function generateCode(promotoriaName) {
  return `${initialsFrom(promotoriaName)}-${digits(3)}-${digits(2)}`;
}

/**
 * Normaliza lo que la persona teclea.
 *
 * Acepta `mac86608`, `MAC 866 08` y `mac-866-08`, y los tres devuelven
 * `MAC-866-08`. Es la diferencia entre un código que funciona y uno que "no
 * sirve" porque alguien copió un espacio de más de WhatsApp.
 */
export function normalizeCode(input) {
  const clean = String(input ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');

  if (clean.length < 8) return clean;

  const letters = clean.slice(0, 3);
  const middle = clean.slice(3, 6);
  const tail = clean.slice(6, 8);
  return `${letters}-${middle}-${tail}`;
}

/** ¿Tiene la forma completa de un código? */
export function isValidCode(input) {
  return /^[A-Z]{3}-\d{3}-\d{2}$/.test(normalizeCode(input));
}
