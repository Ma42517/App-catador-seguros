import {
  createContext, useContext, useState, useEffect, useCallback, useMemo, useRef,
} from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';
import {
  fetchOrCreateProfile, fetchProfile, describeError,
  PROFILE_ROLES, isApprovedRole, canManage,
} from '../data/profilesRepo';
import { authenticate, isValidRole } from '../components/Auth/users';

/**
 * Identidad de quien está usando la app.
 *
 * Unifica dos orígenes bajo una sola forma para que el resto de la aplicación
 * no tenga que saber de dónde viene la sesión:
 *
 *  - `google`: cuenta real vía Supabase Auth, con su rol en la tabla `profiles`.
 *  - `local`:  usuario y contraseña del directorio de la demo.
 *
 * La forma es siempre `{ key, name, email, role, source }`. `key` es lo que se
 * usa para guardar datos por persona (agenda, metas, bloques de tiempo): para
 * Google es el UUID de la cuenta, no el correo, porque el correo puede cambiar
 * y arrastraría todos los datos guardados con él.
 */
const SessionContext = createContext(null);

const AUTH_KEY = 'isAuthenticated';
const ROLE_KEY = 'userRole';
const USER_KEY = 'userName';

/** Fases posibles mientras se resuelve quién entró. */
export const SESSION_STATUS = {
  LOADING: 'loading',
  ANON: 'anon',
  READY: 'ready',
};

function readLocalIdentity() {
  try {
    if (sessionStorage.getItem(AUTH_KEY) !== 'true') return null;
    const role = sessionStorage.getItem(ROLE_KEY) ?? '';
    const key = sessionStorage.getItem(USER_KEY) ?? '';
    if (!key || !isValidRole(role)) return null;
    return { key, name: key, email: '', role, source: 'local' };
  } catch {
    return null;
  }
}

function writeLocalIdentity(user) {
  try {
    sessionStorage.setItem(AUTH_KEY, 'true');
    sessionStorage.setItem(ROLE_KEY, user.role);
    sessionStorage.setItem(USER_KEY, user.username);
  } catch {
    // Sin sessionStorage la sesión no sobrevive a la recarga: aceptable.
  }
}

function clearLocalIdentity() {
  try {
    sessionStorage.removeItem(AUTH_KEY);
    sessionStorage.removeItem(ROLE_KEY);
    sessionStorage.removeItem(USER_KEY);
  } catch {
    // Ignorado.
  }
}

/**
 * Traduce los errores de OAuth a algo que diga qué hacer.
 *
 * Los mensajes originales vienen en inglés y describen el síntoma, no la causa:
 * "bad_oauth_state" no le dice a nadie que hay que revisar el Site URL del
 * proyecto. Se conserva el texto original al final para no esconder el detalle
 * técnico a quien sí sabe leerlo.
 */
function explainOAuthError(code, description) {
  const original = description.replace(/\+/g, ' ');

  const hints = {
    bad_oauth_state:
      'La vuelta de Google no coincidió con la sesión iniciada. Suele pasar cuando '
      + 'Supabase reenvía a una dirección distinta de la que abrió el acceso: revisa '
      + 'Site URL y Redirect URLs en Authentication > URL Configuration.',
    bad_oauth_callback:
      'Google devolvió una respuesta incompleta. Revisa que el Redirect URI del cliente '
      + 'de Google apunte a /auth/v1/callback de tu proyecto de Supabase.',
    provider_disabled:
      'El acceso con Google no está habilitado en Supabase (Authentication > Providers).',
    validation_failed:
      'Supabase rechazó la dirección de retorno. Agrégala en Redirect URLs.',
  };

  const hint = hints[code];
  if (!hint) return original || `No se pudo completar el acceso (${code || 'error desconocido'}).`;
  return `${hint}${original ? ` · Detalle: ${original}` : ''}`;
}

function identityFromProfile(profile) {
  return {
    key: profile.id,
    name: profile.fullName || profile.email || 'Asesor',
    email: profile.email,
    avatarUrl: profile.avatarUrl,
    role: profile.role,
    source: 'google',
  };
}

export function SessionProvider({ children }) {
  const [status, setStatus] = useState(SESSION_STATUS.LOADING);
  const [identity, setIdentity] = useState(null);
  const [error, setError] = useState('');

  /**
   * Evita trabajar sobre un componente ya desmontado cuando la respuesta de la
   * red llega tarde.
   *
   * El valor se vuelve a poner en `true` al montar, y eso no es redundante:
   * StrictMode monta, desmonta y vuelve a montar: sin esta línea la limpieza del
   * primer ciclo dejaría el ref en `false` para siempre y todas las respuestas
   * se descartarían, dejando la app clavada en el splash.
   */
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => { alive.current = false; };
  }, []);

  /** Resuelve la identidad a partir de una sesión de Supabase, o del respaldo local. */
  const resolveSession = useCallback(async (session) => {
    if (!session?.user) {
      const local = readLocalIdentity();
      if (!alive.current) return;
      if (local) {
        setIdentity(local);
        setStatus(SESSION_STATUS.READY);
        return;
      }
      setIdentity(null);
      setStatus(SESSION_STATUS.ANON);
      return;
    }

    const { data, error: profileError } = await fetchOrCreateProfile(session.user);
    if (!alive.current) return;

    if (profileError) {
      // La sesión existe pero no se pudo leer su ficha. Se informa en vez de
      // dejar pasar: sin rol confirmado no se sabe qué permiso tiene.
      setError(describeError(profileError));
      setIdentity(null);
      setStatus(SESSION_STATUS.ANON);
      return;
    }

    setError('');
    setIdentity(identityFromProfile(data));
    setStatus(SESSION_STATUS.READY);
  }, []);

  /**
   * Recoge el error que Supabase devuelve en la URL al volver de Google.
   *
   * Sin esto el fallo es mudo: la persona regresa a la pantalla de acceso sin
   * ninguna pista, y la causa más común (el Site URL apuntando a otro sitio) no
   * se puede adivinar desde la interfaz.
   *
   * Se busca en la query y en el fragmento porque el sitio al que se vuelve
   * cambia según el flujo que use el proyecto.
   */
  useEffect(() => {
    const query = new URLSearchParams(window.location.search);
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''));

    const code = query.get('error_code') ?? hash.get('error_code') ?? '';
    const description = query.get('error_description') ?? hash.get('error_description') ?? '';
    if (!code && !description) return;

    setError(explainOAuthError(code, description));

    // Se limpia la URL para que el aviso no reaparezca en cada recarga. Sólo
    // ocurre cuando había error, así que no interfiere con el fragmento que
    // usa el asistente ni con los tokens que lee supabase-js.
    window.history.replaceState(null, '', window.location.pathname);
  }, []);

  useEffect(() => {
    // Sin credenciales de Supabase sólo queda el acceso local.
    if (!isSupabaseConfigured || !supabase) {
      const local = readLocalIdentity();
      setIdentity(local);
      setStatus(local ? SESSION_STATUS.READY : SESSION_STATUS.ANON);
      return undefined;
    }

    supabase.auth.getSession().then(({ data }) => resolveSession(data.session));

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      /*
        El trabajo se aplaza con un timeout de cero a propósito.

        supabase-js ejecuta este callback mientras mantiene tomado su cerrojo
        interno de autenticación; llamar desde dentro a otra función del cliente
        (aquí, la consulta a `profiles`) puede quedarse esperando ese mismo
        cerrojo y colgar la carga de la app. Salir del callback antes de tocar la
        base evita el bloqueo.
      */
      setTimeout(() => resolveSession(session), 0);
    });

    return () => subscription.subscription.unsubscribe();
  }, [resolveSession]);

  const signInWithGoogle = useCallback(async () => {
    if (!isSupabaseConfigured || !supabase) {
      const message = 'Falta configurar Supabase para poder entrar con Google.';
      setError(message);
      return { error: { message } };
    }

    setError('');
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      // Se vuelve al mismo origen desde el que se salió: así funciona igual en
      // desarrollo y en el sitio publicado, sin una URL fija en el código.
      options: { redirectTo: window.location.origin },
    });

    if (oauthError) {
      setError(describeError(oauthError));
      return { error: oauthError };
    }
    return { error: null };
  }, []);

  /** Acceso del directorio local. Devuelve `false` si las credenciales fallan. */
  const signInLocal = useCallback((username, password) => {
    const user = authenticate(username, password);
    if (!user) return false;

    writeLocalIdentity(user);
    setError('');
    setIdentity({
      key: user.username,
      name: user.name || user.username,
      email: '',
      role: user.role,
      source: 'local',
    });
    setStatus(SESSION_STATUS.READY);
    return true;
  }, []);

  const signOut = useCallback(async () => {
    clearLocalIdentity();
    if (isSupabaseConfigured && supabase) await supabase.auth.signOut();
    if (!alive.current) return;
    setIdentity(null);
    setError('');
    setStatus(SESSION_STATUS.ANON);
  }, []);

  /** Relee el rol: lo usa la sala de espera para comprobar si ya la aprobaron. */
  const refreshRole = useCallback(async () => {
    if (identity?.source !== 'google') return { changed: false };

    const { data, error: readError } = await fetchProfile(identity.key);
    if (!alive.current) return { changed: false };

    if (readError) {
      setError(describeError(readError));
      return { changed: false };
    }
    if (!data) return { changed: false };

    const changed = data.role !== identity.role;
    if (changed) setIdentity(identityFromProfile(data));
    return { changed, role: data.role };
  }, [identity]);

  const value = useMemo(() => {
    const role = identity?.role ?? '';
    return {
      status,
      identity,
      error,
      // El directorio local no pasa por revisión: sus roles ya son definitivos.
      isApproved: identity ? (identity.source === 'local' || isApprovedRole(role)) : false,
      isPending: identity?.source === 'google' && role === PROFILE_ROLES.PENDING,
      canManage: identity
        ? (identity.source === 'local' ? role === 'admin' : canManage(role))
        : false,
      googleEnabled: isSupabaseConfigured,
      signInWithGoogle,
      signInLocal,
      signOut,
      refreshRole,
    };
  }, [status, identity, error, signInWithGoogle, signInLocal, signOut, refreshRole]);

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error('useSession debe usarse dentro de <SessionProvider>');
  return ctx;
}
