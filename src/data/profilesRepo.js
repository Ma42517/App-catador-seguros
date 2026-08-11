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

/**
 * Decide si quien está mirando puede cambiar el rol de una ficha.
 *
 * Dos reglas:
 *
 *  - Sólo el administrador. Los promotores ya no aprueban a nadie ni mueven
 *    rangos: el permiso de repartir permisos se propaga solo si se comparte, y
 *    un promotor que puede nombrar promotores multiplica en un toque a quien
 *    manda en la promotoría.
 *  - Nadie toca su propia ficha. Un administrador que se degrada por error
 *    dejaría la promotoría sin quien apruebe, sin forma de volver atrás desde la
 *    app.
 *
 * La misma regla está escrita en las políticas de la base. Esta versión sólo
 * sirve para no mostrar botones que van a fallar: comprobar permisos en la
 * interfaz no protege nada, porque cualquiera puede llamar a la API directo.
 */
export function canChangeRole({ actorRole, actorId, target }) {
  if (!target) return false;
  if (target.id === actorId) return false;
  return isAdminRole(actorRole);
}

/**
 * Decide si quien está mirando puede borrar una ficha.
 *
 * Es más estricto que cambiar el rol, y a propósito: **sólo el administrador**.
 * Un promotor puede aprobar y revocar asesores porque eso se deshace en un
 * toque, pero borrar no se deshace y además se lleva por delante los prospectos
 * que esa persona capturó —`leads.advisor_id` está declarado con `on delete
 * cascade`—. Repartir ese poder entre varios promotores es demasiada superficie
 * para una acción que nadie puede revertir.
 *
 * Y nunca sobre la propia ficha: un administrador que se borra a sí mismo se
 * queda fuera de su propia promotoría sin nadie que pueda readmitirlo.
 *
 * Igual que `canChangeRole`, esto sólo evita dibujar un botón que va a fallar.
 * Lo que de verdad protege es la política de RLS: cualquiera puede llamar a la
 * API sin pasar por esta pantalla.
 */
export function canDeleteProfile({ actorRole, actorId, target }) {
  if (!target) return false;
  if (target.id === actorId) return false;
  return isAdminRole(actorRole);
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
    company: row.company ?? '',
    specialties: Array.isArray(row.specialties) ? row.specialties : [],
    bio: row.bio ?? '',
    phone: row.phone ?? '',
    whatsapp: row.whatsapp ?? '',
    photoFocus: row.photo_focus ?? '',
    videoUrl: row.video_url ?? '',
  };
}

/**
 * Columnas de la tarjeta que pueden faltar en una base sin la migración al día.
 *
 * Sin este mecanismo, Postgres rechaza el `update` completo por una sola columna
 * desconocida: al añadir un campo nuevo y publicar antes de correr la migración,
 * el asesor no podría guardar *nada* de su tarjeta —ni el nombre ni el teléfono—
 * por un dato accesorio.
 */
const OPTIONAL_COLUMNS = ['photo_focus', 'video_url'];

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
    company: card.company?.trim() ?? '',
    specialties: card.specialties ?? [],
    bio: card.bio?.trim() ?? '',
    phone: card.phone?.trim() ?? '',
    whatsapp: card.whatsapp?.trim() ?? '',
    photo_focus: card.photoFocus ?? '',
    video_url: card.videoUrl?.trim() ?? '',
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

/**
 * Borra la ficha de un usuario.
 *
 * Lo que esto borra y lo que no, porque la diferencia importa:
 *
 *  - **Sí** borra la fila de `profiles`: su tarjeta digital, su rol y —por el
 *    `on delete cascade` de `leads.advisor_id`— los prospectos que capturó.
 *  - **No** borra su cuenta de acceso. Vive en `auth.users`, y esa tabla sólo se
 *    toca con la llave de servicio, que jamás puede viajar en el navegador:
 *    quien la tuviera podría leer y borrar toda la base desde la consola.
 *
 * La consecuencia práctica hay que tenerla presente: si esa persona vuelve a
 * iniciar sesión, la app le crea una ficha nueva en `pending` y reaparece en
 * esta lista esperando aprobación. Para el caso real —sacar a alguien de la
 * promotoría— es el comportamiento correcto: pierde el acceso y todo lo suyo, y
 * volver a entrar exige que un administrador lo apruebe otra vez.
 *
 * Para que la cuenta desaparezca del todo hace falta una función en el servidor
 * (Edge Function de Supabase) que use la llave de servicio.
 */
export async function deleteProfile(userId) {
  if (!isSupabaseConfigured || !supabase) {
    return { data: null, error: { message: 'Supabase no está configurado.' } };
  }

  /*
    `select()` después del `delete` no es adorno: sin él, Postgres responde
    "correcto" aunque la política de RLS no haya dejado borrar ninguna fila, y el
    panel diría "eliminado" sobre alguien que sigue ahí. Con la fila devuelta se
    distingue un borrado real de un permiso que falta.
  */
  const { data, error } = await supabase
    .from(TABLE)
    .delete()
    .eq('id', userId)
    .select()
    .maybeSingle();

  if (error) return { data: null, error };

  if (!data) {
    return {
      data: null,
      error: {
        message: 'La base aceptó la petición pero no borró ninguna fila.',
        code: 'NO_ROWS',
        hint: 'Falta la política de DELETE sobre public.profiles para administradores '
          + '(policy "administradores borran fichas").',
      },
    };
  }
  return { data: fromRow(data), error: null };
}

export { describeError };
