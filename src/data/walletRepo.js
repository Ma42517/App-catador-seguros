import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';

/**
 * Monedero y ranking del asesor.
 *
 * Todo pasa por RPC con SECURITY DEFINER: el navegador nunca escribe saldos ni
 * puntos directamente. `record_points_earned` acuña (ranking + monedas) de forma
 * idempotente, `spend_coins` descuenta de forma atómica, y las lecturas devuelven
 * resúmenes ya calculados sin exponer la forma de las tablas.
 */
function unavailable() {
  return { data: null, error: { message: 'El servicio no está configurado.' } };
}

async function callRpc(name, params) {
  if (!isSupabaseConfigured || !supabase) return unavailable();
  const { data, error } = await supabase.rpc(name, params);
  return { data: data ?? null, error: error ?? null };
}

/**
 * Registra puntos ganados: suma al ranking (general y mensual) y acuña monedas.
 *
 * `reason` y `reference` forman la llave de idempotencia: la misma acción con la
 * misma referencia no se acuña dos veces aunque el cliente reintente.
 */
export function recordPointsEarned({ points, reason, reference }) {
  return callRpc('record_points_earned', {
    p_points: Math.trunc(Number(points) || 0),
    p_reason: String(reason ?? 'gamification'),
    p_reference: reference ? String(reference) : null,
  });
}

/** Descuenta monedas del saldo. No toca el ranking. */
export function spendCoins({ amount, reason, reference }) {
  return callRpc('spend_coins', {
    p_amount: Math.trunc(Number(amount) || 0),
    p_reason: String(reason ?? 'compra'),
    p_reference: reference ? String(reference) : null,
  });
}

/** Saldo, monedas del mes y totales de ranking del asesor en sesión. */
export function fetchWalletSummary() {
  return callRpc('my_wallet_summary', {});
}

/**
 * Ranking de la promotoría.
 * @param {'month'|'lifetime'} scope Competencia mensual o escalera de todo el tiempo.
 */
export function fetchPromotoriaRanking(scope = 'month', limit = 20) {
  return callRpc('promotoria_ranking', {
    p_scope: scope === 'lifetime' ? 'lifetime' : 'month',
    p_limit: Math.trunc(Number(limit) || 20),
  });
}
