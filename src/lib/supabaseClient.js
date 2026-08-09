import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

/**
 * Indica si hay credenciales configuradas.
 *
 * `createClient` lanza si recibe una URL vacía, y al ocurrir durante el import
 * tumbaría toda la app con pantalla en blanco antes de renderizar nada. Por eso
 * el cliente sólo se construye cuando ambas variables existen, y el resto del
 * código consulta esta bandera para caer al almacenamiento local.
 */
export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

/**
 * Sólo el host del proyecto, para mostrarlo en el diagnóstico.
 *
 * Nunca se expone la llave: identificar el proyecto ayuda a detectar que se
 * está apuntando al entorno equivocado, y para eso basta el host.
 */
export const supabaseHost = (() => {
  if (!supabaseUrl) return '';
  try {
    return new URL(supabaseUrl).host;
  } catch {
    return supabaseUrl;
  }
})();
