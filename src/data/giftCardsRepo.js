import { supabase, getGiftCardSupabase, isSupabaseConfigured } from '../lib/supabaseClient';
import { uploadAttachment, BUCKET } from './announcementsRepo';
import { normalizeCardData } from './cardData';

/**
 * Normaliza en el sitio la respuesta de un RPC de lectura de tarjeta.
 *
 * Los RPC devuelven { outcome, ...campos }. Cuando la tarjeta llegó bien (OK para
 * el dueño, ACTIVA para la vista pública) se le da forma al cardData con
 * `normalizeCardData` para que el front reciba SIEMPRE las mismas claves con
 * defaults sanos (template, estadoPill, pildoras, contactos, reverso), sin perder
 * el `outcome`. Si no hubo tarjeta (NOT_FOUND, NOT_OWNER…), se devuelve tal cual.
 *
 * El mapeo pildoras<->specialties vive en el backend y en cardData.js: aquí sólo se
 * aplica la normalización. phone/whatsapp siguen siendo columnas propias, por eso
 * viajan en el nivel superior y no dentro de `contactos`.
 */
function withCardData(result) {
  const { data, error } = result;
  if (error || !data || typeof data !== 'object') return result;
  const outcome = data.outcome;
  if (outcome !== 'OK' && outcome !== 'ACTIVA') return result;
  return { data: { ...data, ...normalizeCardData(data) }, error };
}

/**
 * Tarjetas digitales de regalo.
 *
 * El dueño es un cliente que entra con su propio Google; los RPC comparan su
 * `sub` internamente (leído del token, no de un parámetro), así que aquí sólo se
 * llaman las funciones y se pasan datos. La app del asesor y el mundo del cliente
 * comparten Supabase Auth pero nada más: crear/revocar exige sesión de asesor;
 * reclamar/editar exige la sesión de Google del dueño.
 */
function unavailable() {
  return { data: null, error: { message: 'El servicio no está configurado.' } };
}

/** Llamadas con la sesión de la APP: son las del asesor (crear, liberar, revocar). */
async function callRpc(name, params) {
  if (!isSupabaseConfigured || !supabase) return unavailable();
  const { data, error } = await supabase.rpc(name, params);
  return { data: data ?? null, error: error ?? null };
}

/**
 * Llamadas con la sesión del CLIENTE, la del mundo `/mi-tarjeta`.
 *
 * Va por `giftCardSupabase`, que guarda su sesión en otra llave del navegador.
 * De ahí sale la separación: aquí nunca viaja el token del asesor, así que no
 * hay forma de que su cuenta reclame ni edite la tarjeta de nadie.
 */
async function callClientRpc(name, params) {
  const sb = getGiftCardSupabase();
  if (!isSupabaseConfigured || !sb) return unavailable();
  const { data, error } = await sb.rpc(name, params);
  return { data: data ?? null, error: error ?? null };
}

// ─── Público / dueño (Google del cliente) ───────────────────────────────────

/** Lo publicable de una tarjeta activa, sin identidad. */
export async function fetchPublicGiftCard(cardId) {
  return withCardData(await callClientRpc('public_gift_card', { p_card_id: cardId }));
}

/** Confirma si la sesión actual ya es dueña. Si la tarjeta está libre, NEEDS_CODE. */
export function claimGiftCard(cardId) {
  return callClientRpc('claim_gift_card', { p_card_id: cardId });
}

/** Vincula la tarjeta a la cuenta recién creada, validando el código del asesor. */
export function claimGiftCardWithSignup(cardId, code) {
  return callClientRpc('claim_gift_card_with_signup', {
    p_card_id: cardId,
    p_code: String(code ?? '').trim(),
  });
}

/** Contenido editable, para el dueño por Google o por dispositivo autorizado. */
export async function fetchMyGiftCard(cardId, deviceSecret = '') {
  return withCardData(await callClientRpc('my_gift_card', {
    p_card_id: cardId,
    p_device_secret: String(deviceSecret ?? ''),
  }));
}

/**
 * Guarda los campos de la tarjeta.
 *
 * El patch acepta el modelo nuevo del editor:
 *   { fullName, title, company, bio, phone, whatsapp, photoFocus,
 *     template, estadoPill, pildoras, cardExtra: { contactos, reverso } }
 * El RPC hace el mapeo real: pildoras se escribe en la columna specialties (son el
 * mismo dato), phone/whatsapp siguen como columnas propias, y cardExtra se fusiona
 * (merge superficial) en la columna jsonb del mismo nombre. Se usa `toSavePatch`
 * desde el editor para construir este objeto normalizado; aquí no se transforma
 * nada para no cambiar la firma pública ni asumir la forma del patch.
 */
export function saveGiftCard(cardId, patch, deviceSecret = '') {
  return callClientRpc('save_gift_card', {
    p_card_id: cardId,
    p_patch: patch ?? {},
    p_device_secret: String(deviceSecret ?? ''),
  });
}

/** Emite la clave de 15 minutos. Sólo el asesor la ve. */
export function issueGiftCardAccessCode(cardId) {
  return callRpc('issue_gift_card_access_code', { p_card_id: cardId });
}

/** Entra con número + clave. El servidor devuelve el secreto del dispositivo. */
export function claimGiftCardWithCode(cardId, phone, code) {
  return callClientRpc('claim_gift_card_with_code', {
    p_card_id: cardId,
    p_phone: String(phone ?? '').trim(),
    p_code: String(code ?? '').trim(),
  });
}

/** Abre la tarjeta con el dispositivo ya autorizado, sin pedir nada. */
export function openGiftCardWithDevice(cardId, deviceSecret) {
  return callClientRpc('open_gift_card_with_device', {
    p_card_id: cardId,
    p_device_secret: String(deviceSecret ?? ''),
  });
}

/**
 * Sube la foto a Storage y la registra en la tarjeta, borrando la anterior.
 *
 * El borrado de la foto vieja es lo que protege el espacio: una tarjeta nunca
 * acumula más de una imagen. Si el borrado falla no se interrumpe —la foto nueva
 * ya quedó guardada—, pero se intenta siempre.
 */
export async function uploadGiftCardPhoto(cardId, file, deviceSecret = '') {
  // Se sube con la sesión del cliente, no con la de la app: son mundos separados.
  const { url, error, fileName } = await uploadAttachment(
    file, `gift-cards/${cardId}`, getGiftCardSupabase(),
  );
  if (error || !url) return { data: null, error: error ?? { message: 'No se pudo subir la foto.' } };

  const { data, error: rpcError } = await callClientRpc('set_gift_card_photo', {
    p_card_id: cardId,
    p_avatar_url: url,
    p_avatar_path: fileName,
    p_device_secret: String(deviceSecret ?? ''),
  });
  if (rpcError) return { data: null, error: rpcError };

  const previous = data?.previousPath;
  const clientSb = getGiftCardSupabase();
  if (previous && previous !== fileName && clientSb) {
    await clientSb.storage.from(BUCKET).remove([previous]).catch(() => {});
  }

  return { data: { ...data, avatarUrl: url }, error: null };
}

/** Todas las tarjetas que le pertenecen a la cuenta de cliente que entró. */
export function fetchMyGiftCards() {
  return callClientRpc('my_gift_cards', {});
}

// ─── Lado del asesor ─────────────────────────────────────────────────────────

/** Crea la tarjeta de regalo consumiendo del inventario (o emergencia). */
export function createGiftCardForLead(leadId, useEmergency = false) {
  return callRpc('create_gift_card_for_lead', {
    p_lead_id: leadId,
    p_use_emergency: Boolean(useEmergency),
  });
}

/** Revoca la tarjeta y borra su foto de Storage. */
export async function revokeGiftCard(cardId) {
  const { data, error } = await callRpc('revoke_gift_card', { p_card_id: cardId });
  if (!error && data?.avatarPath && supabase) {
    await supabase.storage.from(BUCKET).remove([data.avatarPath]).catch(() => {});
  }
  return { data, error };
}

/**
 * Tarjetas que el asesor le regaló a un prospecto, activadas incluidas.
 *
 * `create_gift_card_for_lead` ignora las que ya tienen dueño, así que sin esta
 * consulta una tarjeta vinculada a la cuenta equivocada quedaría inalcanzable.
 */
export function fetchAdvisorGiftCardsForLead(leadId) {
  return callRpc('advisor_gift_cards_for_lead', { p_lead_id: leadId });
}

/**
 * Suelta al dueño conservando el contenido de la tarjeta.
 *
 * Para cuando la activó una cuenta equivocada: la persona correcta se registra
 * con un código nuevo y encuentra su nombre y su foto tal como los dejó. No se
 * borra nada de Storage, justamente porque la foto se queda.
 */
export function releaseGiftCard(cardId) {
  return callRpc('release_gift_card', { p_card_id: cardId });
}

/** Suelta al dueño y deja la tarjeta lista para reclamarse de nuevo. */
export async function resetGiftCard(cardId) {
  const { data, error } = await callRpc('reset_gift_card', { p_card_id: cardId });
  if (!error && data?.avatarPath && supabase) {
    await supabase.storage.from(BUCKET).remove([data.avatarPath]).catch(() => {});
  }
  return { data, error };
}
