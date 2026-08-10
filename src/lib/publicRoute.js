/**
 * Detección de la ruta pública de una tarjeta.
 *
 * La app no usa un enrutador: navega con estado y con el fragmento de la URL
 * (`#paso`). Meter uno sólo para esta pantalla obligaría a reescribir la
 * navegación entera —secciones, pasos del diagnóstico, vista previa— y a
 * arriesgar todo lo que ya funciona, cuando lo que hace falta es reconocer una
 * única dirección antes de decidir qué se monta.
 *
 * La ruta se lee del `pathname` y no del fragmento por una razón que no es de
 * estilo: lo que va después de `#` no se envía al servidor, así que WhatsApp,
 * Facebook y los buscadores no pueden leerlo. Una tarjeta que se comparte tiene
 * que vivir en una dirección de verdad.
 */

/** Prefijo de la dirección pública: `/p/<id del asesor>`. */
const PREFIX = '/p/';

/**
 * Identificador de perfil. Se exige la forma de un UUID porque es lo que la
 * tabla `profiles` usa como clave, y comprobarlo aquí evita mandar a la base
 * cualquier texto que alguien escriba en la barra de direcciones.
 */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Identificador del asesor si la dirección actual es la de una tarjeta pública.
 *
 * @returns {string|null} El id, o `null` si esta dirección no es una tarjeta.
 */
export function publicCardIdFromPath() {
  if (typeof window === 'undefined') return null;

  const { pathname } = window.location;
  if (!pathname.startsWith(PREFIX)) return null;

  // Se tolera la barra final: al copiar y pegar direcciones se añade sola.
  const raw = pathname.slice(PREFIX.length).replace(/\/+$/, '');

  let id;
  try {
    id = decodeURIComponent(raw);
  } catch {
    return null;
  }

  return UUID.test(id) ? id : null;
}

/** Dirección completa de la tarjeta de un asesor, para compartirla. */
export function publicCardUrl(advisorId) {
  if (typeof window === 'undefined' || !advisorId) return '';
  return `${window.location.origin}${PREFIX}${advisorId}`;
}
