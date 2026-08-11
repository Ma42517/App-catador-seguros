import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';
import { describeError } from './supabaseError';
import { PROFILE_ROLES } from './profilesRepo';

/**
 * La relación promotor–asesor.
 *
 * Dos columnas nuevas en `profiles`:
 *
 *  - `promotor_id`: a qué promotor pidió unirse. Nulo mientras no pida a nadie.
 *  - `promotoria_status`: `pending`, `approved` o `rejected`.
 *
 * Los nombres van en español porque así los pediste, aunque el resto del esquema
 * esté en inglés (`full_name`, `avatar_url`, `advisor_id` en `leads`). Se
 * respetan tal cual: cambiarlos por mi cuenta te dejaría con un SQL que no
 * coincide con lo que escribiste y con dos convenciones a medias en vez de una.
 *
 * El rol, en cambio, **sí** va en inglés y no es negociable: la base guarda
 * `advisor`. Consultar por `role = 'asesor'` devuelve cero filas siempre y sin
 * error, que es el peor fallo posible —parece que funciona y no hay nada que
 * depurar—.
 */
const TABLE = 'profiles';

export const PROMOTORIA_STATUS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  BLOCKED: 'blocked',
};

/*
  Columnas que se piden. Se enumeran en lugar de usar `*` porque así el error de
  "columna desconocida" apunta a la migración que falta, en vez de traer de más.
*/
const BASE_COLUMNS = 'id, email, full_name, avatar_url, role, created_at,'
  + ' promotor_id, promotoria_status';

/*
  `last_seen` va aparte porque es lo último que se añadió y la base puede no
  tenerla. Si se pidiera junto a las demás, una columna que falta tumbaría la
  consulta entera y el promotor no vería a su equipo por un indicador accesorio.
  Se reintenta sin ella y el equipo aparece igual, sólo sin estado de conexión.
*/
const OPTIONAL_COLUMNS = ['last_seen'];

const COLUMNS = [BASE_COLUMNS, ...OPTIONAL_COLUMNS].join(', ');

/**
 * ¿El fallo es que las columnas nuevas no existen todavía?
 *
 * Postgres lo reporta como `42703` (`undefined_column`). Distinguirlo importa:
 * es el único error de esta pantalla que se arregla corriendo un guion, y
 * mostrarlo como "no se pudo cargar" mandaría a revisar la conexión o los
 * permisos, que son justo lo que no está mal.
 */
function isMissingMigration(error) {
  if (!error) return false;
  if (error.code === '42703') return true;
  const text = String(error.message ?? '');
  return text.includes('promotor_id') || text.includes('promotoria_status');
}

/** ¿Falta sólo la columna de presencia, y no la relación entera? */
function isMissingOptional(error) {
  if (!error) return false;
  const text = String(error.message ?? '');
  return OPTIONAL_COLUMNS.some((column) => text.includes(column));
}

function toAdvisor(row) {
  return {
    id: row.id,
    email: row.email ?? '',
    fullName: row.full_name ?? '',
    avatarUrl: row.avatar_url ?? '',
    role: row.role ?? '',
    createdAt: row.created_at ? new Date(row.created_at).getTime() : null,
    promotorId: row.promotor_id ?? null,
    status: row.promotoria_status ?? null,
    lastSeen: row.last_seen ? new Date(row.last_seen).getTime() : null,
  };
}

/**
 * Los asesores de un promotor, ya separados en pendientes y aprobados.
 *
 * Una sola consulta y el reparto en memoria, en vez de dos viajes a la base: son
 * las mismas filas con distinto valor en una columna, y pedirlas por separado
 * duplica la latencia para ahorrar un `filter` que cuesta nada. Además evita el
 * estado incoherente de que la primera consulta llegue y la segunda falle.
 *
 * `rejected` queda fuera a propósito: un rechazo libera al asesor —se le borra el
 * `promotor_id`— así que no debería aparecer aquí. Si aparece, es una fila que
 * quedó a medias y tampoco pertenece a este equipo.
 */
export async function listMyAdvisors(promotorId) {
  if (!isSupabaseConfigured || !supabase) {
    return {
      pending: [], approved: [], blocked: [],
      error: { message: 'Supabase no está configurado.' },
      missingMigration: false,
    };
  }
  if (!promotorId) {
    return { pending: [], approved: [], blocked: [], error: null, missingMigration: false };
  }

  /*
    No se filtra por rol, y ahí estaba el fallo que dejaba las solicitudes
    invisibles.

    Quien se registra queda con rol `pending` hasta que alguien lo aprueba, así
    que al usar el código de una promotoría su ficha todavía no dice `advisor`.
    Con el filtro puesto, la solicitud no aparecía en ninguna parte: ni en el panel
    del promotor —porque el rol no calzaba— ni en ningún otro sitio donde el
    promotor pudiera verla.

    Basta con `promotor_id`: si esa ficha apunta a este promotor, es asunto suyo
    sea cual sea su rol. Y es lo correcto además de lo práctico, porque la
    aprobación del promotor es justo lo que convierte a un pendiente en asesor.
  */
  const ask = (columns) => supabase
    .from(TABLE)
    .select(columns)
    .eq('promotor_id', promotorId)
    .order('created_at', { ascending: false });

  let { data, error } = await ask(COLUMNS);

  // Sin la columna de presencia se vuelve a pedir sin ella: el equipo importa
  // más que el indicador.
  if (error && isMissingOptional(error)) {
    ({ data, error } = await ask(BASE_COLUMNS));
  }

  if (error) {
    return {
      pending: [], approved: [], blocked: [], error,
      missingMigration: isMissingMigration(error),
    };
  }

  const rows = (data ?? []).map(toAdvisor);
  return {
    pending: rows.filter((r) => r.status === PROMOTORIA_STATUS.PENDING),
    approved: rows.filter((r) => r.status === PROMOTORIA_STATUS.APPROVED),
    blocked: rows.filter((r) => r.status === PROMOTORIA_STATUS.BLOCKED),
    error: null,
    missingMigration: false,
  };
}

/**
 * Escribe el estado de una solicitud.
 *
 * `select()` detrás del `update` no es adorno: sin él Postgres responde
 * "correcto" aunque la política de RLS no haya tocado ninguna fila, y la
 * pantalla diría "aprobado" sobre alguien que sigue esperando.
 */
async function writeStatus(advisorId, patch) {
  if (!isSupabaseConfigured || !supabase) {
    return { data: null, error: { message: 'Supabase no está configurado.' } };
  }

  const { data, error } = await supabase
    .from(TABLE)
    .update(patch)
    .eq('id', advisorId)
    .select(BASE_COLUMNS)
    .maybeSingle();

  if (error) return { data: null, error };

  if (!data) {
    return {
      data: null,
      error: {
        message: 'La base aceptó la petición pero no actualizó ninguna fila.',
        code: 'NO_ROWS',
        hint: 'Falta la política de UPDATE que permite al promotor gestionar a '
          + 'sus asesores (policy "promotores gestionan su equipo").',
      },
    };
  }
  return { data: toAdvisor(data), error: null };
}

/**
 * Acepta al asesor en el equipo.
 *
 * Si su rol todavía es `pending`, la misma acción lo asciende a `advisor`. Es lo
 * que hace que la aprobación del promotor sirva de algo: sin esto, alguien
 * aceptado en el equipo seguiría sin poder entrar a la app, esperando además la
 * aprobación del administrador general —dos filas de espera para un solo trámite,
 * y ninguna de las dos visible para la otra—.
 *
 * El promotor puede cambiar ese rol porque el disparador de la base se lo permite
 * (`protect_profile_role` sólo detiene a quien no administra ni promueve), y el
 * ascenso va de `pending` a `advisor` y nada más: no hay forma de nombrar
 * promotores desde aquí.
 */
export function approveAdvisor(advisorId, currentRole) {
  const patch = { promotoria_status: PROMOTORIA_STATUS.APPROVED };
  if (currentRole === PROFILE_ROLES.PENDING) patch.role = PROFILE_ROLES.ADVISOR;
  return writeStatus(advisorId, patch);
}

/**
 * Bloquea a alguien: queda fuera del equipo y no puede volver a solicitar.
 *
 * Se diferencia de rechazar en que conserva el `promotor_id`. Ésa es la pieza que
 * hace el bloqueo efectivo: al liberar la ficha, la persona podría volver a
 * escribir el código al minuto siguiente y la solicitud reaparecería una y otra
 * vez. Manteniendo el vínculo con estado `blocked`, la función de unirse
 * encuentra que ya pertenece —bloqueada— y no la deja repetir.
 */
export function blockAdvisor(advisorId) {
  return writeStatus(advisorId, { promotoria_status: PROMOTORIA_STATUS.BLOCKED });
}

/** Levanta el bloqueo y devuelve la ficha a la cola de solicitudes. */
export function unblockAdvisor(advisorId) {
  return writeStatus(advisorId, { promotoria_status: PROMOTORIA_STATUS.PENDING });
}

/**
 * Rechaza la solicitud y libera al asesor.
 *
 * Se limpian las dos columnas —`promotor_id` a nulo y el estado a nulo— y no se
 * deja `rejected` guardado. La razón es práctica: con el rechazo grabado, esa
 * persona quedaría marcada para siempre y no podría solicitar entrar a otra
 * promotoría, ni volver a intentarlo con la misma si fue un malentendido. Un
 * rechazo aquí significa "no es de mi equipo", no "esta persona no sirve".
 */
export function rejectAdvisor(advisorId) {
  return writeStatus(advisorId, { promotor_id: null, promotoria_status: null });
}

export { describeError };



// ── Código de invitación ─────────────────────────────────────────────────────

/**
 * Guarda el código del promotor en su propia ficha.
 *
 * Devuelve `taken: true` cuando el código ya es de otra promotoría. Postgres lo
 * reporta como `23505` (violación de unicidad) y quien llama vuelve a intentar
 * con otro: el código lleva dígitos al azar, así que un choque se resuelve
 * generando de nuevo, no molestando a la persona.
 */
export async function saveMyCode(promoterId, code) {
  if (!isSupabaseConfigured || !supabase) {
    return { error: { message: 'Supabase no está configurado.' }, taken: false };
  }

  const { error } = await supabase
    .from(TABLE)
    .update({ promotoria_code: code })
    .eq('id', promoterId);

  if (error) {
    const isDuplicate = error.code === '23505'
      || /duplicate key|already exists/i.test(String(error.message ?? ''));
    return { error, taken: isDuplicate, missingMigration: isMissingMigration(error) };
  }
  return { error: null, taken: false };
}

/**
 * Cambia de promotoría usando un código.
 *
 * Va por una función de la base (`join_promotoria`) y no por un `select` seguido
 * de un `update`, y la razón es de seguridad y no de estilo: para buscar al
 * promotor por su código, el asesor necesitaría permiso de lectura sobre fichas
 * ajenas, y con ese permiso podría listar los correos de toda la promotoría desde
 * la consola del navegador. La función corre con los privilegios de la base,
 * recibe sólo el código y devuelve sólo el nombre: no hay forma de usarla para
 * enumerar a nadie.
 *
 * Deja al asesor en `pending`. El código dice a qué puerta se llama, no la abre.
 */
export async function joinPromotoriaByCode(code) {
  if (!isSupabaseConfigured || !supabase) {
    return { data: null, error: { message: 'Supabase no está configurado.' } };
  }

  const { data, error } = await supabase.rpc('join_promotoria', { p_code: code });

  if (error) {
    const raw = String(error.message ?? '');

    if (/CODIGO_NO_EXISTE/.test(raw)) {
      return {
        data: null,
        error: { message: 'Ese código no corresponde a ninguna promotoría. Revísalo con tu promotor.' },
      };
    }
    if (/ES_TU_PROPIO_CODIGO/.test(raw)) {
      return { data: null, error: { message: 'Ése es tu propio código.' } };
    }
    if (/BLOQUEADO/.test(raw)) {
      return {
        data: null,
        error: { message: 'Esa promotoría bloqueó tu acceso. Habla directamente con el promotor.' },
      };
    }
    if (/function .*join_promotoria.* does not exist|PGRST202/i.test(raw) || error.code === 'PGRST202') {
      return {
        data: null,
        error: {
          message: 'Falta preparar la base: la función join_promotoria no existe todavía.',
          code: 'NO_FUNCTION',
        },
      };
    }
    return { data: null, error };
  }

  // La función devuelve una tabla de una fila; Supabase la entrega como arreglo.
  const row = Array.isArray(data) ? data[0] : data;
  return { data: { promotoria: row?.promotoria ?? '' }, error: null };
}



/**
 * Sale de la promotoría: cancela la solicitud o abandona el equipo.
 *
 * El asesor limpia sus propias dos columnas, cosa que la política "editar mi
 * perfil" ya le permite. No hace falta una función especial ni el permiso del
 * promotor: entrar exige que otro te acepte, pero salir no debería exigirle nada
 * a nadie —una solicitud enviada por error, o a la promotoría equivocada, dejaría
 * a esa persona atrapada esperando una respuesta que no quiere—.
 *
 * El disparador de la base sigue impidiendo lo único peligroso: ponerse
 * `approved` por su cuenta. Limpiar no está restringido.
 */
export async function leavePromotoria(advisorId) {
  return writeStatus(advisorId, { promotor_id: null, promotoria_status: null });
}
