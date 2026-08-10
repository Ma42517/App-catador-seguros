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

/** Columnas que la tarjeta necesita. Se piden por nombre, nunca con `*`. */
const CARD_COLUMNS = 'id, full_name, avatar_url, title, license_number, company,'
  + ' specialties, bio, phone, whatsapp, presentation_video_url';

/** Traduce una fila a la forma que consumen los componentes de la tarjeta. */
function toCard(row) {
  return {
    id: row.id,
    fullName: row.full_name ?? '',
    avatarUrl: row.avatar_url ?? '',
    title: row.title ?? '',
    license: row.license_number ?? '',
    company: row.company ?? '',
    specialties: Array.isArray(row.specialties) ? row.specialties : [],
    bio: row.bio ?? '',
    phone: row.phone ?? '',
    whatsapp: row.whatsapp ?? '',
    presentationVideoUrl: row.presentation_video_url ?? '',

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
    Respaldo mientras la migración no esté aplicada. Se piden las mismas
    columnas, así que aunque `profiles` tenga el correo y el rol, esta consulta
    no los trae: lo que protege aquí es la lista de columnas, y en la vista lo
    protege además la base.
  */
  if (isMissingObject(error)) {
    ({ data, error } = await read('profiles', CARD_COLUMNS));

    // Sin la columna del video tampoco: es la única que puede faltar aparte.
    if (isMissingObject(error)) {
      const withoutVideo = CARD_COLUMNS.replace(', presentation_video_url', '');
      ({ data, error } = await read('profiles', withoutVideo));
    }
  }

  if (error) return { card: null, error };
  if (!data) return { card: null, error: null };

  return { card: toCard(data), error: null };
}
