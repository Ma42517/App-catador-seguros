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

/**
 * ¿Estamos en el mundo de la tarjeta de regalo?
 *
 * Se mira la dirección, no una bandera de React, porque el cliente de abajo se
 * construye al importar el módulo: cuando React decide qué pintar ya es tarde.
 */
const enRutaDeTarjeta = typeof window !== 'undefined'
  && /^\/mi-tarjeta(\/|$)/.test(window.location.pathname);

/*
  Migración suave de la sesión del asesor a la nueva llave dedicada.

  La app pasó de usar la llave por defecto de supabase-js (`sb-<ref>-auth-token`)
  a una propia (`df360-advisor-auth`), para no leer jamás una sesión de cliente
  que haya quedado en la por defecto. Sin esta copia, los asesores con sesión
  abierta aparecerían "deslogueados" tras el cambio (la app miraría una llave
  vacía) y tendrían que entrar de nuevo. Aquí, por única vez, si hay sesión en la
  llave vieja y no en la nueva, se copia —SÓLO si NO es una cuenta de cliente,
  para no arrastrar el mismo cruce que venimos a cerrar—. Fuera de `/mi-tarjeta`,
  donde vive la app del asesor.
*/
function migrateAdvisorSession() {
  if (typeof window === 'undefined' || enRutaDeTarjeta || !supabaseUrl) return;
  try {
    const ref = new URL(supabaseUrl).host.split('.')[0];
    const legacyKey = `sb-${ref}-auth-token`;
    const newKey = 'df360-advisor-auth';
    if (localStorage.getItem(newKey)) return; // Ya migrado o sesión nueva.
    const legacy = localStorage.getItem(legacyKey);
    if (!legacy) return;
    // No arrastrar una sesión de cuenta de cliente (la fuga que se está cerrando).
    const role = JSON.parse(legacy)?.user?.user_metadata?.df360_role;
    if (role === 'client') return;
    localStorage.setItem(newKey, legacy);
  } catch {
    // Cualquier fallo de parseo/almacenamiento: se omite y la persona reingresa.
  }
}
if (isSupabaseConfigured) migrateAdvisorSession();

/**
 * Cliente de la app del asesor.
 *
 * En la ruta de la tarjeta se construye DORMIDO: no lee la sesión guardada, no
 * la refresca y no toca la URL. Así, abrir una tarjeta no despierta nada del
 * mundo asesor —ni su token, ni su refresco en segundo plano— y no puede
 * quedarse con el enlace de confirmación del cliente. Fuera de esa ruta se
 * comporta como siempre.
 *
 * `storageKey` PROPIA y dedicada (`df360-advisor-auth`), no la por defecto de
 * supabase-js (`sb-<ref>-auth-token`). Ésta es la separación REAL y la que cierra
 * la fuga reportada: aunque un token de cuenta de CLIENTE llegara a quedar en la
 * llave por defecto —por un enlace de confirmación que aterrizó fuera de
 * `/mi-tarjeta`—, la app NUNCA lo leería, porque la app sólo mira su propia
 * llave. Antes la app usaba la llave por defecto y por eso podía absorber una
 * sesión de cliente y mostrar su tarjeta/datos como si fueran del asesor.
 */
export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
    auth: enRutaDeTarjeta
      ? {
        storageKey: 'df360-advisor-auth',
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      }
      : {
        storageKey: 'df360-advisor-auth',
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
  })
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
