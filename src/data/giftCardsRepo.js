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

/** Amarra la tarjeta al Google que entró, o confirma si ya es su dueño. */
export function claimGiftCard(cardId) {
  return callRpc('claim_gift_card', { p_card_id: cardId });
}

/** Contenido editable, sólo para el dueño. */
export function fetchMyGiftCard(cardId) {
  return callRpc('my_gift_card', { p_card_id: cardId });
}

/** Guarda los campos de texto de la tarjeta. */
export function saveGiftCard(cardId, patch) {
  return callRpc('save_gift_card', { p_card_id: cardId, p_patch: patch ?? {} });
}

/**
 * Sube la foto a Storage y la registra en la tarjeta, borrando la anterior.
 *
 * El borrado de la foto vieja es lo que protege el espacio: una tarjeta nunca
 * acumula más de una imagen. Si el borrado falla no se interrumpe —la foto nueva
 * ya quedó guardada—, pero se intenta siempre.
 */
export async function uploadGiftCardPhoto(cardId, file) {
  const { url, error, fileName } = await uploadAttachment(file, `gift-cards/${cardId}`);
  if (error || !url) return { data: null, error: error ?? { message: 'No se pudo subir la foto.' } };

  const { data, error: rpcError } = await callRpc('set_gift_card_photo', {
    p_card_id: cardId,
    p_avatar_url: url,
    p_avatar_path: fileName,
  });
  if (rpcError) return { data: null, error: rpcError };

  const previous = data?.previousPath;
  if (previous && previous !== fileName && supabase) {
    await supabase.storage.from(BUCKET).remove([previous]).catch(() => {});
  }

  return { data: { ...data, avatarUrl: url }, error: null };
}

/** Regala una tarjeta más (propagación de un nivel, sin tocar inventario). */
export function propagateGiftCard(cardId, name, whatsapp) {
  return callRpc('propagate_gift_card', {
    p_card_id: cardId,
    p_name: String(name ?? '').trim(),
    p_whatsapp: String(whatsapp ?? '').trim(),
  });
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
