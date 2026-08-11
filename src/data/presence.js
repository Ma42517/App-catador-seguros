import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';

/**
 * Última vez que se vio a alguien.
 *
 * Escribe `profiles.last_seen`. Es lo que permite al promotor distinguir a quien
 * está trabajando de quien no ha abierto la app en días, y no se puede sacar de
 * `auth.users.last_sign_in_at`: esa tabla sólo se lee con la llave de servicio, y
 * además marca el inicio de sesión —que en un móvil ocurre una vez y no se repite
 * en semanas—, no la actividad real.
 */

/** Cada cuánto se vuelve a escribir, como mínimo. */
const MIN_INTERVAL_MS = 5 * 60 * 1000;

/*
  Momento del último envío, en memoria. No va en `localStorage` a propósito: al
  abrir la app queremos que se registre la visita aunque se haya cerrado hace un
  minuto, porque "entró" es justo el dato que interesa.
*/
let lastWrite = 0;

/**
 * Marca al usuario como visto ahora mismo.
 *
 * Se limita a una escritura cada cinco minutos. Sin ese freno, cada toque en la
 * app dispararía una petición: sobre una cuota gratuita eso son miles de
 * escrituras al día para un dato cuya precisión útil se mide en minutos.
 *
 * Los fallos se ignoran en silencio a propósito. Si la columna no existe todavía
 * o la conexión falla, lo único que se pierde es un indicador accesorio: avisar
 * al asesor de que "no se pudo registrar tu presencia" sería alarmarlo por algo
 * que no le afecta ni puede arreglar.
 */
export async function touchLastSeen(userId, { force = false } = {}) {
  if (!isSupabaseConfigured || !supabase || !userId) return;

  const now = Date.now();
  if (!force && now - lastWrite < MIN_INTERVAL_MS) return;
  lastWrite = now;

  try {
    await supabase
      .from('profiles')
      .update({ last_seen: new Date(now).toISOString() })
      .eq('id', userId);
  } catch {
    /* Dato accesorio: no se avisa de su fallo. */
  }
}

/** Cuántos minutos se consideran "en línea". */
export const ONLINE_WINDOW_MINUTES = 15;

/**
 * ¿Está en línea?
 *
 * `null` cuando no hay dato —la columna sin migrar, o alguien que nunca ha
 * abierto la app desde que existe—. Se distingue de `false` porque no es lo
 * mismo: "desconectado" afirma algo, y sin dato no se puede afirmar nada.
 */
export function isOnline(lastSeen) {
  if (!lastSeen) return null;
  return Date.now() - lastSeen < ONLINE_WINDOW_MINUTES * 60 * 1000;
}
