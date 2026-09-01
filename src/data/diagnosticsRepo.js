import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';

function unavailable() {
  return { data: null, error: { message: 'El servicio no está configurado.' } };
}

async function callRpc(name, params) {
  if (!isSupabaseConfigured || !supabase) return unavailable();
  const { data, error } = await supabase.rpc(name, params);
  return { data: data ?? null, error: error ?? null };
}

/** Valida el WhatsApp en servidor antes de exponer respuestas o resultados. */
export function unlockPublicDiagnostic(diagnosticId, whatsapp) {
  if (!diagnosticId) return Promise.resolve({
    data: null,
    error: { message: 'El enlace está incompleto.' },
  });
  return callRpc('unlock_public_diagnostic', {
    p_diagnostic_id: diagnosticId,
    p_whatsapp: String(whatsapp ?? '').trim(),
  });
}

/** Guarda un borrador con control optimista de revisión. */
export function savePublicDiagnosticProgress({
  diagnosticId, whatsapp, responses, revision,
}) {
  return callRpc('save_public_diagnostic_progress', {
    p_diagnostic_id: diagnosticId,
    p_whatsapp: String(whatsapp ?? '').trim(),
    p_responses: responses ?? {},
    p_revision: revision,
  });
}

/** Guarda las respuestas finales y cambia el pase a COMPLETADO atómicamente. */
export function completePublicDiagnostic({
  diagnosticId, whatsapp, responses, results, revision,
}) {
  return callRpc('complete_public_diagnostic', {
    p_diagnostic_id: diagnosticId,
    p_whatsapp: String(whatsapp ?? '').trim(),
    p_responses: responses ?? {},
    p_results: results ?? {},
    p_revision: revision,
  });
}

/** Convierte a un tercero con enlace reenviado en un prospecto del asesor. */
export function capturePublicDiagnosticLead({ diagnosticId, name, whatsapp }) {
  return callRpc('capture_public_diagnostic_lead', {
    p_diagnostic_id: diagnosticId,
    p_name: String(name ?? '').trim(),
    p_whatsapp: String(whatsapp ?? '').trim(),
  });
}
