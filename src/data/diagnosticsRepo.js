import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';

function unavailable() {
  return { data: null, error: { message: 'El servicio no está configurado.' } };
}

async function callRpc(name, params) {
  if (!isSupabaseConfigured || !supabase) return unavailable();
  const { data, error } = await supabase.rpc(name, params);
  return { data: data ?? null, error: error ?? null };
}

// ─── Lado del asesor, con sesión ────────────────────────────────────────────

/** Crea el pase sólo cuando el asesor lo decide; después devuelve siempre el mismo UUID. */
export function getOrCreateDiagnosticForLead(leadId) {
  if (!leadId) return Promise.resolve({
    data: null,
    error: { message: 'Falta el prospecto.' },
  });
  return callRpc('get_or_create_diagnostic_for_lead', { p_lead_id: leadId });
}

/**
 * Emite el código de verificación de seis dígitos.
 *
 * Es el ÚNICO punto donde el código existe en claro fuera de la base, y sólo lo
 * recibe la sesión del asesor dueño. El navegador del cliente nunca lo ve: allá
 * sólo se manda un candidato para que el servidor lo compare contra su hash.
 */
export function issueDiagnosticAccessCode(diagnosticId) {
  return callRpc('issue_diagnostic_access_code', { p_diagnostic_id: diagnosticId });
}

/** Cuántos dispositivos tiene autorizados el pase. Nunca devuelve hashes. */
export function diagnosticDeviceSummary(diagnosticId) {
  return callRpc('diagnostic_device_summary', { p_diagnostic_id: diagnosticId });
}

/** Expulsa todos los dispositivos y anula el código vigente. */
export function revokeDiagnosticDevices(diagnosticId) {
  return callRpc('revoke_diagnostic_devices', { p_diagnostic_id: diagnosticId });
}

// ─── Lado público, sin sesión ───────────────────────────────────────────────

/** Abre el pase con la llave del dispositivo. Sin llave devuelve CODE_REQUIRED. */
export function openPublicDiagnostic(diagnosticId, deviceSecret) {
  if (!diagnosticId) return Promise.resolve({
    data: null,
    error: { message: 'El enlace está incompleto.' },
  });
  return callRpc('open_public_diagnostic', {
    p_diagnostic_id: diagnosticId,
    p_device_secret: String(deviceSecret ?? ''),
  });
}

/** Canjea el código por la llave de este dispositivo. El servidor genera la llave. */
export function claimPublicDiagnosticDevice(diagnosticId, code) {
  return callRpc('claim_public_diagnostic_device', {
    p_diagnostic_id: diagnosticId,
    p_code: String(code ?? '').trim(),
  });
}

/** Guarda un borrador con control optimista de revisión. */
export function savePublicDiagnosticProgress({
  diagnosticId, deviceSecret, responses, revision,
}) {
  return callRpc('save_public_diagnostic_progress', {
    p_diagnostic_id: diagnosticId,
    p_device_secret: String(deviceSecret ?? ''),
    p_responses: responses ?? {},
    p_revision: revision,
  });
}

/** Guarda las respuestas finales y cambia el pase a COMPLETADO atómicamente. */
export function completePublicDiagnostic({
  diagnosticId, deviceSecret, responses, results, revision,
}) {
  return callRpc('complete_public_diagnostic', {
    p_diagnostic_id: diagnosticId,
    p_device_secret: String(deviceSecret ?? ''),
    p_responses: responses ?? {},
    p_results: results ?? {},
    p_revision: revision,
  });
}

/** Guarda los referidos del dueño en la cuenta del asesor. */
export function capturePublicDiagnosticReferrals({ diagnosticId, deviceSecret, referrals }) {
  return callRpc('capture_public_diagnostic_referrals', {
    p_diagnostic_id: diagnosticId,
    p_device_secret: String(deviceSecret ?? ''),
    p_referrals: (referrals ?? []).map((referral) => ({
      name: String(referral?.name ?? '').trim(),
      whatsapp: String(referral?.whatsapp ?? referral?.phone ?? '').trim(),
    })),
  });
}

/** Registra a quien recibió un enlace ajeno y quiere su propio análisis. */
export function capturePublicDiagnosticLead({ diagnosticId, name, whatsapp }) {
  return callRpc('capture_public_diagnostic_lead', {
    p_diagnostic_id: diagnosticId,
    p_name: String(name ?? '').trim(),
    p_whatsapp: String(whatsapp ?? '').trim(),
  });
}
