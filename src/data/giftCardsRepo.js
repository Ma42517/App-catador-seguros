import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';
import { uploadAttachment, BUCKET } from './announcementsRepo';

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

async function callRpc(name, params) {
  if (!isSupabaseConfigured || !supabase) return unavailable();
  const { data, error } = await supabase.rpc(name, params);
  return { data: data ?? null, error: error ?? null };
}

// ─── Público / dueño (Google del cliente) ───────────────────────────────────

/** Lo publicable de una tarjeta activa, sin identidad. */
export function fetchPublicGiftCard(cardId) {
  return callRpc('public_gift_card', { p_card_id: cardId });
}

/** Confirma si la sesión actual ya es dueña. Si la tarjeta está libre, NEEDS_CODE. */
export function claimGiftCard(cardId) {
  return callRpc('claim_gift_card', { p_card_id: cardId });
}

/** Vincula la tarjeta a la cuenta recién creada, validando el código del asesor. */
export function claimGiftCardWithSignup(cardId, code) {
  return callRpc('claim_gift_card_with_signup', {
    p_card_id: cardId,
    p_code: String(code ?? '').trim(),
  });
}

/** Contenido editable, para el dueño por Google o por dispositivo autorizado. */
export function fetchMyGiftCard(cardId, deviceSecret = '') {
  return callRpc('my_gift_card', {
    p_card_id: cardId,
    p_device_secret: String(deviceSecret ?? ''),
  });
}

/** Guarda los campos de texto de la tarjeta. */
export function saveGiftCard(cardId, patch, deviceSecret = '') {
  return callRpc('save_gift_card', {
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
  return callRpc('claim_gift_card_with_code', {
    p_card_id: cardId,
    p_phone: String(phone ?? '').trim(),
    p_code: String(code ?? '').trim(),
  });
}

/** Abre la tarjeta con el dispositivo ya autorizado, sin pedir nada. */
export function openGiftCardWithDevice(cardId, deviceSecret) {
  return callRpc('open_gift_card_with_device', {
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
  const { url, error, fileName } = await uploadAttachment(file, `gift-cards/${cardId}`);
  if (error || !url) return { data: null, error: error ?? { message: 'No se pudo subir la foto.' } };

  const { data, error: rpcError } = await callRpc('set_gift_card_photo', {
    p_card_id: cardId,
    p_avatar_url: url,
    p_avatar_path: fileName,
    p_device_secret: String(deviceSecret ?? ''),
  });
  if (rpcError) return { data: null, error: rpcError };

  const previous = data?.previousPath;
  if (previous && previous !== fileName && supabase) {
    await supabase.storage.from(BUCKET).remove([previous]).catch(() => {});
  }

  return { data: { ...data, avatarUrl: url }, error: null };
}

/** Todas las tarjetas que le pertenecen al Google que entró. */
export function fetchMyGiftCards() {
  return callRpc('my_gift_cards', {});
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

/** Suelta al dueño y deja la tarjeta lista para reclamarse de nuevo. */
export async function resetGiftCard(cardId) {
  const { data, error } = await callRpc('reset_gift_card', { p_card_id: cardId });
  if (!error && data?.avatarPath && supabase) {
    await supabase.storage.from(BUCKET).remove([data.avatarPath]).catch(() => {});
  }
  return { data, error };
}
