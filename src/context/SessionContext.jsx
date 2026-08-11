import {
  createContext, useContext, useState, useEffect, useCallback, useMemo, useRef,
} from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';
import {
  fetchOrCreateProfile, fetchProfile, describeError,
  PROFILE_ROLES, isApprovedRole, canManage, isAdminRole,
} from '../data/profilesRepo';
import { touchLastSeen } from '../data/presence';

/**
 * Identidad de quien está usando la app.
 *
 * Todas las cuentas viven en Supabase Auth, se entre con Google o con correo y
 * contraseña. No queda ningún directorio de usuarios escrito en el código: uno
 * así viaja dentro del bundle que descarga el navegador, así que cualquiera
 * podría leer las claves, y además se saltaría la revisión de acceso.
 *
 * La forma es `{ key, name, email, role }`. `key` es lo que se usa para guardar
 * datos por persona (agenda, metas, bloques de tiempo) y es el UUID de la
 * cuenta, no el correo: el correo puede cambiar y arrastraría con él todo lo
 * guardado.
 */
const SessionContext = createContext(null);

/** Fases posibles mientras se resuelve quién entró. */
export const SESSION_STATUS = {
  LOADING: 'loading',
  ANON: 'anon',
  READY: 'ready',
};

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

/**
 * Nombre presentable a partir del correo, para cuando la ficha no tiene uno.
 *
 * Quien se registra con correo y contraseña puede no traer nombre, y saludar con
 * "Hola, marco@promotoria.mx" se lee como un error de la app. Del correo se
 * saca la parte local, se parten los separadores y se capitaliza: es una
 * aproximación, pero siempre mejor que una dirección completa en un saludo.
 */
function friendlyNameFrom(email) {
  const local = String(email ?? '').split('@')[0];
  if (!local) return '';
  return local
    .split(/[._-]+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function identityFromProfile(profile) {
  return {
    key: profile.id,
    /*
      El nombre sale de la tarjeta digital (`full_name` de `profiles`): es el que
      la persona eligió para presentarse, y es con el que la app debe llamarla.
      El correo sólo alimenta un respaldo aproximado.
    */
    name: profile.fullName || friendlyNameFrom(profile.email) || 'Asesor',
    email: profile.email,
    avatarUrl: profile.avatarUrl,
    role: profile.role,

    /*
      Pertenencia a una promotoría. Viaja en la identidad porque la sala de
      espera se dibuja en pantallas que no consultan la base: sin esto tendrían
      que pedir el perfil cada una por su cuenta, y el bloqueo aparecería con un
      parpadeo después de haber mostrado el contenido.
    */
    promotorId: profile.promotorId ?? null,
    promotoriaStatus: profile.promotoriaStatus ?? null,
    promotoriaCode: profile.promotoriaCode ?? '',
    company: profile.company ?? '',
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
      if (!alive.current) return;
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
    // Sin credenciales de Supabase no hay forma de entrar: se deja el estado en
    // anónimo y la pantalla de acceso lo explica.
    if (!isSupabaseConfigured || !supabase) {
      setIdentity(null);
      setStatus(SESSION_STATUS.ANON);
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

  /**
   * Acceso interno con correo y contraseña.
   *
   * Devuelve `{ error }` en vez de un booleano porque los fallos aquí son
   * distinguibles y accionables: una contraseña equivocada no se arregla igual
   * que un correo sin confirmar, y el formulario necesita poder decir cuál es.
   */
  const signInWithPassword = useCallback(async (email, password) => {
    if (!isSupabaseConfigured || !supabase) {
      const message = 'Falta configurar Supabase en este entorno.';
      setError(message);
      return { error: { message } };
    }

    setError('');
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });

    if (signInError) return { error: signInError };
    // El resto lo resuelve `onAuthStateChange`, que ya consulta el perfil.
    return { error: null };
  }, []);

  /**
   * Alta de una cuenta nueva.
   *
   * El nombre viaja en los metadatos del usuario para que la ficha de `profiles`
   * nazca con un nombre legible: sin él, el panel mostraría sólo el correo.
   *
   * `needsConfirmation` avisa de que Supabase creó la cuenta pero exige abrir el
   * enlace del correo antes de poder entrar. Sin distinguir ese caso, la
   * persona vería "cuenta creada" y luego un fallo al iniciar sesión, sin
   * entender por qué.
   */
  const signUpWithPassword = useCallback(async (email, password, fullName) => {
    if (!isSupabaseConfigured || !supabase) {
      const message = 'Falta configurar Supabase en este entorno.';
      setError(message);
      return { error: { message } };
    }

    setError('');
    const { data, error: signUpError } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password,
      options: {
        data: { full_name: fullName.trim() },
        emailRedirectTo: window.location.origin,
      },
    });

    if (signUpError) return { error: signUpError };

    return {
      error: null,
      needsConfirmation: Boolean(data.user && !data.session),
    };
  }, []);

  const signOut = useCallback(async () => {
    if (isSupabaseConfigured && supabase) await supabase.auth.signOut();
    if (!alive.current) return;
    setIdentity(null);
    setError('');
    setStatus(SESSION_STATUS.ANON);
  }, []);

  /**
   * Relee la ficha y reconstruye la identidad.
   *
   * Hace falta al guardar la tarjeta digital: el nombre con el que la app saluda
   * sale de ahí, y sin releer seguiría mostrando el anterior hasta recargar.
   */
  const refreshIdentity = useCallback(async () => {
    if (!identity?.key) return;
    const { data } = await fetchProfile(identity.key);
    if (!alive.current || !data) return;
    setIdentity(identityFromProfile(data));
  }, [identity]);

  /** Relee el rol: lo usa la sala de espera para comprobar si ya la aprobaron. */
  const refreshRole = useCallback(async () => {
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

  /*
    Latido de presencia.

    Marca `last_seen` al entrar y cada cinco minutos mientras la pestaña esté a la
    vista. La condición de visibilidad importa: sin ella, una pestaña olvidada en
    segundo plano seguiría reportando actividad durante días y el promotor vería
    "en línea" a alguien que dejó el teléfono en un cajón.

    Al volver a la vista se fuerza un envío, porque es justo cuando la persona
    retoma la app y el dato viejo ya no describe nada.
  */
  useEffect(() => {
    const userId = identity?.key;
    if (status !== SESSION_STATUS.READY || !userId) return undefined;

    touchLastSeen(userId, { force: true });

    const beat = setInterval(() => {
      if (document.visibilityState === 'visible') touchLastSeen(userId);
    }, 5 * 60 * 1000);

    const onVisible = () => {
      if (document.visibilityState === 'visible') touchLastSeen(userId, { force: true });
    };
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      clearInterval(beat);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [status, identity?.key]);

  const value = useMemo(() => {
    const role = identity?.role ?? '';
    return {
      status,
      identity,
      error,
      // El directorio local no pasa por revisión: sus roles ya son definitivos.
      isApproved: isApprovedRole(role),
      isPending: Boolean(identity) && role === PROFILE_ROLES.PENDING,
      canManage: canManage(role),
      // El administrador reparte los roles elevados y ve las herramientas
      // internas de desarrollo.
      isAdmin: isAdminRole(role),
      role,

      /*
        `null` cuando no pertenece a ninguna promotoría —o cuando la migración
        todavía no corrió—, y en los dos casos significa lo mismo para la app: no
        hay nada que esperar, así que nada se bloquea. Sólo `'pending'` bloquea.
      */
      promotoriaStatus: identity?.promotoriaStatus ?? null,
      isAwaitingPromotoria: (identity?.promotoriaStatus ?? null) === 'pending',
      promotorId: identity?.promotorId ?? null,
      /*
        Sin promotor y sin solicitud en curso: es el asesor que todavía no ha
        usado ningún código. Se calcula aquí para que las pantallas no tengan que
        combinar dos campos y arriesgarse a interpretarlos distinto.
      */
      needsPromotoria: !identity?.promotorId
        && (identity?.promotoriaStatus ?? null) === null,
      googleEnabled: isSupabaseConfigured,
      signInWithGoogle,
      signInWithPassword,
      signUpWithPassword,
      signOut,
      refreshRole,
      refreshIdentity,
    };
  }, [
    status, identity, error,
    signInWithGoogle, signInWithPassword, signUpWithPassword, signOut, refreshRole,
    refreshIdentity,
  ]);

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error('useSession debe usarse dentro de <SessionProvider>');
  return ctx;
}
