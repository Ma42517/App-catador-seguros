import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';
import { describeError } from './supabaseError';

/**
 * Perfiles de la promotoría: quién entró y qué permiso tiene.
 *
 * Es la tabla que decide el acceso a la app, así que su regla más importante no
 * está aquí sino en la política de RLS: al crear su propia ficha, una persona
 * sólo puede insertarla con `role = 'pending'`. Sin esa condición, cualquiera
 * podría registrarse otorgándose el rol de promotor desde el navegador.
 */
const TABLE = 'profiles';

export const PROFILE_ROLES = {
  PENDING: 'pending',
  ADVISOR: 'advisor',
  PROMOTER: 'promoter',
  ADMIN: 'admin',
};

/** Roles que ya pasaron la revisión del promotor. */
const APPROVED = [PROFILE_ROLES.ADVISOR, PROFILE_ROLES.PROMOTER, PROFILE_ROLES.ADMIN];

export function isApprovedRole(role) {
  return APPROVED.includes(role);
}

/** Quién puede publicar en el muro y abrir el panel de administración. */
export function canManage(role) {
  return role === PROFILE_ROLES.PROMOTER || role === PROFILE_ROLES.ADMIN;
}

export function isAdminRole(role) {
  return role === PROFILE_ROLES.ADMIN;
}

/** Roles que sólo un administrador puede otorgar o quitar. */
const ELEVATED = [PROFILE_ROLES.PROMOTER, PROFILE_ROLES.ADMIN];

/**
 * Decide si quien está mirando puede cambiar el rol de una ficha.
 *
 * Tres reglas, y las tres importan:
 *
 *  - Nadie toca su propia ficha. Un administrador que se degrada por error
 *    dejaría la promotoría sin quien apruebe, sin forma de volver atrás desde
 *    la app.
 *  - Sólo el administrador otorga o retira los roles elevados. Si un promotor
 *    pudiera nombrar promotores, el permiso se propagaría solo.
 *  - Un promotor tampoco puede modificar la ficha de alguien que ya es promotor
 *    o administrador, que es como se evita que degrade al dueño.
 *
 * La misma regla está escrita en las políticas de la base. Esta versión sólo
 * sirve para no mostrar botones que van a fallar: comprobar permisos en la
 * interfaz no protege nada, porque cualquiera puede llamar a la API directo.
 */
export function canChangeRole({ actorRole, actorId, target, nextRole }) {
  if (!target) return false;
  if (target.id === actorId) return false;

  if (isAdminRole(actorRole)) return true;
  if (actorRole !== PROFILE_ROLES.PROMOTER) return false;

  // El promotor sólo mueve fichas no elevadas, y sólo entre roles no elevados.
  if (ELEVATED.includes(target.role)) return false;
  return !ELEVATED.includes(nextRole);
}

/** Etiqueta legible de un rol, para el panel y la ficha del usuario. */
export function roleLabel(role) {
  switch (role) {
    case PROFILE_ROLES.PENDING: return 'En revisión';
    case PROFILE_ROLES.ADVISOR: return 'Asesor';
    case PROFILE_ROLES.PROMOTER: return 'Promotor';
    case PROFILE_ROLES.ADMIN: return 'Administrador';
    default: return 'Sin rol';
  }
}

function fromRow(row) {
  return {
    id: row.id,
    email: row.email ?? '',
    fullName: row.full_name ?? '',
    avatarUrl: row.avatar_url ?? '',
    role: row.role ?? PROFILE_ROLES.PENDING,
    createdAt: row.created_at ? new Date(row.created_at).getTime() : Date.now(),

    // Datos de la tarjeta digital. Se leen con respaldo porque las columnas
    // pueden no existir todavía en una base que no corrió la migración.
    title: row.title ?? '',
    // La columna se llama `license_number` en la base; en la app el campo es
    // `license`. La traducción vive sólo aquí, como el resto del mapeo.
    license: row.license_number ?? '',
    company: row.company ?? '',
    specialties: Array.isArray(row.specialties) ? row.specialties : [],
    bio: row.bio ?? '',
    phone: row.phone ?? '',
    whatsapp: row.whatsapp ?? '',
    presentationVideoUrl: row.presentation_video_url ?? '',
  };
}

/** Columnas de la tarjeta que pueden faltar en una base sin la migración al día. */
const OPTIONAL_COLUMNS = ['presentation_video_url'];

/**
 * ¿El error dice que una columna no existe?
 *
 * Postgres lo reporta como `42703` (`undefined_column`). Se comprueba el código
 * y no el texto del mensaje, que cambia según el idioma del servidor.
 */
function isMissingColumn(error, column) {
  if (!error) return false;
  if (error.code === '42703') return true;
  return String(error.message ?? '').includes(column);
}

/**
 * Guarda la tarjeta digital de la propia cuenta.
 *
 * No incluye `role` a propósito: aunque la base lo protege con un disparador,
 * mandarlo desde el cliente invitaría a manipularlo desde la consola del
 * navegador. Lo que no se envía no se puede falsificar.
 */
export async function saveMyCard(userId, card) {
  if (!isSupabaseConfigured || !supabase) {
    return { data: null, error: { message: 'Supabase no está configurado.' } };
  }

  const payload = {
    full_name: card.fullName?.trim() ?? '',
    avatar_url: card.avatarUrl ?? '',
    title: card.title?.trim() ?? '',
    license_number: card.license?.trim() ?? '',
    company: card.company?.trim() ?? '',
    specialties: card.specialties ?? [],
    bio: card.bio?.trim() ?? '',
    phone: card.phone?.trim() ?? '',
    whatsapp: card.whatsapp?.trim() ?? '',
    presentation_video_url: card.presentationVideoUrl?.trim() ?? '',
  };

  const write = (body) => supabase
    .from(TABLE)
    .update(body)
    .eq('id', userId)
    .select()
    .maybeSingle();

  let { data, error } = await write(payload);

  /*
    Si la base todavía no tiene alguna de las columnas nuevas, se reintenta sin
    ellas en lugar de dar el guardado por perdido.

    Sin este reintento, publicar la app antes de correr la migración dejaría al
    asesor sin poder guardar *nada* de su tarjeta: Postgres rechaza el `update`
    completo por una sola columna que no conoce, así que también se perderían el
    nombre y el teléfono. El video es lo accesorio; la ficha es lo que no puede
    dejar de funcionar.
  */
  const missing = OPTIONAL_COLUMNS.filter((column) => isMissingColumn(error, column));
  if (error && missing.length > 0) {
    const fallback = { ...payload };
    missing.forEach((column) => { delete fallback[column]; });
    ({ data, error } = await write(fallback));
  }

  if (error) return { data: null, error };

  if (!data) {
    return {
      data: null,
      error: {
        message: 'La base aceptó la petición pero no guardó nada.',
        code: 'NO_ROWS',
        hint: 'Falta la política que permite editar el propio perfil '
          + '(policy "editar mi perfil" on public.profiles for update).',
      },
    };
  }
  return { data: fromRow(data), error: null };
}

/**
 * Datos que Google entrega sobre la persona.
 *
 * El nombre llega en distintas claves según el proveedor, así que se prueban
 * varias antes de caer al correo: mostrar un UUID donde va un nombre es peor
 * que mostrar el correo.
 */
function identityFrom(user) {
  const meta = user.user_metadata ?? {};
  return {
    email: user.email ?? '',
    fullName: meta.full_name || meta.name || meta.preferred_username || user.email || '',
    avatarUrl: meta.avatar_url || meta.picture || '',
  };
}

/**
 * Devuelve la ficha del usuario y la crea si es su primera entrada.
 *
 * No se usa `upsert`: sobrescribiría el rol en cada inicio de sesión y
 * degradaría a `pending` a alguien ya aprobado. Primero se busca, y sólo si no
 * existe se inserta.
 */
export async function fetchOrCreateProfile(user) {
  if (!isSupabaseConfigured || !supabase) {
    return { data: null, error: { message: 'Supabase no está configurado.' } };
  }

  const { data: existing, error: readError } = await supabase
    .from(TABLE)
    .select('*')
    .eq('id', user.id)
    .maybeSingle();

  if (readError) return { data: null, error: readError };
  if (existing) return { data: fromRow(existing), error: null, created: false };

  const identity = identityFrom(user);
  const { data: inserted, error: insertError } = await supabase
    .from(TABLE)
    .insert([{
      id: user.id,
      email: identity.email,
      full_name: identity.fullName,
      avatar_url: identity.avatarUrl,
      role: PROFILE_ROLES.PENDING,
    }])
    .select()
    .maybeSingle();

  if (insertError) return { data: null, error: insertError };

  // Sin fila devuelta la inserción no ocurrió: casi siempre es la política de
  // RLS que exige `role = 'pending'` o que falta la de INSERT.
  if (!inserted) {
    return {
      data: null,
      error: {
        message: 'La base aceptó la petición pero no creó el perfil.',
        code: 'NO_ROWS',
        hint: 'Revisa la política de INSERT sobre public.profiles.',
      },
    };
  }

  return { data: fromRow(inserted), error: null, created: true };
}

/** Relee la ficha, para cuando la persona quiere comprobar si ya la aprobaron. */
export async function fetchProfile(userId) {
  if (!isSupabaseConfigured || !supabase) {
    return { data: null, error: { message: 'Supabase no está configurado.' } };
  }

  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('id', userId)
    .maybeSingle();

  if (error) return { data: null, error };
  return { data: data ? fromRow(data) : null, error: null };
}

/**
 * Lista de perfiles para el panel del promotor.
 *
 * Depende de una política que deje leer las fichas ajenas a quien administra.
 * Si no está puesta, esto devuelve sólo la propia y el panel lo muestra tal
 * cual: es información honesta, no un error.
 */
export async function listProfiles() {
  if (!isSupabaseConfigured || !supabase) {
    return { data: [], error: { message: 'Supabase no está configurado.' } };
  }

  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .order('created_at', { ascending: false });

  if (error) return { data: [], error };
  return { data: (data ?? []).map(fromRow), error: null };
}

/**
 * Cuántas solicitudes esperan revisión.
 *
 * Pide sólo el conteo con `head: true`: el menú necesita el número para el
 * distintivo, no las fichas, y traerlas sería mover datos que nadie va a leer.
 */
export async function countPendingProfiles() {
  if (!isSupabaseConfigured || !supabase) return { count: 0, error: null };

  const { count, error } = await supabase
    .from(TABLE)
    .select('*', { count: 'exact', head: true })
    .eq('role', PROFILE_ROLES.PENDING);

  if (error) return { count: 0, error };
  return { count: count ?? 0, error: null };
}

/** Cambia el rol de una ficha: es la acción de aprobar o revocar. */
export async function setProfileRole(userId, role) {
  if (!isSupabaseConfigured || !supabase) {
    return { data: null, error: { message: 'Supabase no está configurado.' } };
  }

  const { data, error } = await supabase
    .from(TABLE)
    .update({ role })
    .eq('id', userId)
    .select()
    .maybeSingle();

  if (error) return { data: null, error };

  if (!data) {
    return {
      data: null,
      error: {
        message: 'La base aceptó la petición pero no actualizó ninguna fila.',
        code: 'NO_ROWS',
        hint: 'Falta la política de UPDATE sobre public.profiles para promotores.',
      },
    };
  }
  return { data: fromRow(data), error: null };
}

export { describeError };
