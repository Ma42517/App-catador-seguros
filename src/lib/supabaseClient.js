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
 * Cliente aparte para el mundo del cliente final (`/mi-tarjeta`).
 *
 * La raíz del problema que cierra: los dos mundos compartían el MISMO almacén de
 * sesión del navegador. Si el asesor tenía su sesión abierta y desde ahí se
 * abría el enlace de la tarjeta, la página heredaba esa sesión: mostraba su
 * correo y la tarjeta se activaba en la cuenta equivocada. Al revés también
 * ensuciaba: la cuenta de cliente aparecía en la app del asesor.
 *
 * Con `storageKey` propio cada mundo guarda su sesión en su propia llave, así
 * que la página de la tarjeta simplemente NO VE la sesión de la app —no hay nada
 * que heredar—, y la del cliente no se cuela al otro lado. Es la separación real,
 * no un remiendo: no depende de detectar de quién era la sesión.
 *
 * Se construye PEREZOSAMENTE, y esto no es un detalle: `App.jsx` importa la
 * página de la tarjeta siempre, así que crear el cliente en el import metía un
 * segundo lector de sesiones en toda la app del asesor. Con `detectSessionInUrl`
 * los dos leían la URL al volver de Google y se peleaban el código de acceso: si
 * ganaba el de la tarjeta, la app se quedaba sin sesión y mandaba al asesor al
 * onboarding. Ahora sólo existe cuando el mundo de la tarjeta lo pide, y NO toca
 * la URL: el enlace de confirmación se procesa a mano en `GiftCardPage`.
 */
let giftCardClient = null;

export function getGiftCardSupabase() {
  if (!isSupabaseConfigured) return null;
  if (!giftCardClient) {
    giftCardClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        storageKey: 'df360-giftcard-auth',
        persistSession: true,
        autoRefreshToken: true,
        // Jamás leer la URL: es lo que rompía el regreso de Google en la app.
        detectSessionInUrl: false,
        flowType: 'pkce',
      },
    });
  }
  return giftCardClient;
}

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
