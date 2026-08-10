import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';

/**
 * Lectura de una tarjeta digital sin sesión.
 *
 * Se consulta la vista `public_cards` y no la tabla `profiles`, y la diferencia
 * es de seguridad, no de comodidad.
 *
 * La clave anónima de Supabase viaja dentro del paquete que descarga el
 * navegador: es pública por diseño. Abrir `profiles` a `anon` con una política
 * `using (true)` —lo más rápido de escribir— dejaría que cualquiera pidiera
 * `select *` sobre la tabla y se llevara el correo y el rol de toda la
 * promotoría, no sólo del asesor cuya tarjeta abrió. La política filtra filas,
 * nunca columnas.
 *
 * La vista expone únicamente lo que la tarjeta dibuja. Lo que no está en ella no
 * se puede pedir, ni sabiendo el identificador ni cambiando la consulta.
 *
 * Si la vista todavía no existe se cae a `profiles`, para que la pantalla
 * funcione antes de aplicar la migración. Es un respaldo temporal y está dicho
 * en el aviso que devuelve.
 */

/**
 * Columnas que la tarjeta necesita. Se piden por nombre, nunca con `*`.
 *
 * Van separadas en dos grupos porque no todas son igual de importantes. Las
 * básicas existen desde el principio; las opcionales llegan con una migración, y
 * hasta que se aplica no están en la base.
 *
 * Sin esa separación, pedir una columna nueva rompía la tarjeta entera: Postgres
 * rechaza la consulta completa por un solo nombre que no reconoce, así que un
 * dato accesorio —el encuadre de la foto— dejaba la página en "no pudimos
 * cargarla" hasta que alguien corriera el guion. Y quien abre un enlace
 * compartido no tiene forma de saber que el problema es una migración pendiente.
 */
const BASE_COLUMNS = 'id, full_name, avatar_url, title, company,'
  + ' specialties, bio, phone, whatsapp';

const OPTIONAL_COLUMNS = ['photo_focus'];

const CARD_COLUMNS = [BASE_COLUMNS, ...OPTIONAL_COLUMNS].join(', ');

/** Traduce una fila a la forma que consumen los componentes de la tarjeta. */
function toCard(row) {
  return {
    id: row.id,
    fullName: row.full_name ?? '',
    avatarUrl: row.avatar_url ?? '',
    title: row.title ?? '',
    company: row.company ?? '',
    specialties: Array.isArray(row.specialties) ? row.specialties : [],
    bio: row.bio ?? '',
    phone: row.phone ?? '',
    whatsapp: row.whatsapp ?? '',
    photoFocus: row.photo_focus ?? '',

    /*
      El correo no se trae. En la tarjeta pública el botón de correo queda
      apagado a propósito: publicar la dirección de la cuenta del asesor en una
      página abierta es regalarla a los recolectores de spam, y el prospecto
      tiene el WhatsApp y el teléfono para escribir.
    */
    email: '',
  };
}

/** ¿El error dice que la vista o una columna no existe? */
function isMissingObject(error) {
  if (!error) return false;
  // 42P01: tabla o vista inexistente. 42703: columna inexistente.
  return error.code === '42P01' || error.code === '42703';
}

/**
 * Trae la tarjeta pública de un asesor.
 *
 * @param {string} advisorId Identificador del perfil.
 * @returns {Promise<{card: object|null, error: object|null}>}
 */
export async function fetchPublicCard(advisorId) {
  if (!isSupabaseConfigured || !supabase) {
    return { card: null, error: { message: 'Supabase no está configurado.' } };
  }
  if (!advisorId) return { card: null, error: { message: 'Falta el identificador.' } };

  const read = (from, columns) => supabase
    .from(from)
    .select(columns)
    .eq('id', advisorId)
    .maybeSingle();

  let { data, error } = await read('public_cards', CARD_COLUMNS);

  /*
    Tres intentos, de lo completo a lo imprescindible. El orden importa: primero
    se prueba la vista sin las columnas opcionales —la vista sigue siendo la
    lectura segura, porque no expone el correo ni el rol—, y sólo si tampoco
    existe se cae a `profiles`.

    Antes había un único respaldo, y pedía las mismas columnas que el intento
    original: si lo que faltaba era una columna nueva, fallaban los dos y la
    tarjeta quedaba inservible. El respaldo tiene que quitar aquello que pudo
    causar el fallo, no repetirlo.
  */
  if (isMissingObject(error)) {
    ({ data, error } = await read('public_cards', BASE_COLUMNS));
  }

  /*
    Último recurso mientras la vista no exista. Se piden las mismas columnas, así
    que aunque `profiles` tenga el correo y el rol, esta consulta no los trae: lo
    que protege aquí es la lista de columnas, y en la vista lo protege además la
    base.
  */
  if (isMissingObject(error)) {
    ({ data, error } = await read('profiles', CARD_COLUMNS));
    if (isMissingObject(error)) {
      ({ data, error } = await read('profiles', BASE_COLUMNS));
    }
  }

  if (error) return { card: null, error };
  if (!data) return { card: null, error: null };

  return { card: toCard(data), error: null };
}
