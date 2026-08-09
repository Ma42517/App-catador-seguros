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
  };
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
