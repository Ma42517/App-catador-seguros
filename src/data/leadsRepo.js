import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';

/**
 * Prospectos capturados desde una tarjeta, guardados en Supabase.
 *
 * Hasta ahora los prospectos vivían sólo en el teléfono del asesor
 * (`src/data/leads.js`), y eso bastaba mientras el intercambio ocurría en mano:
 * él prestaba el aparato y los datos se quedaban ahí. Con la tarjeta pública el
 * prospecto la abre desde su propio teléfono, así que lo que escriba tiene que
 * llegar a algún sitio que el asesor pueda leer después.
 *
 * Quien escribe no tiene sesión, de modo que la fila se inserta como anónimo. La
 * política de la base permite exactamente eso y nada más: insertar. Leer los
 * prospectos queda reservado al asesor dueño, comprobando `auth.uid()`. La
 * diferencia no es teórica: con lectura anónima abierta, cualquiera con la clave
 * pública —que viaja en el paquete del navegador— podría descargarse el nombre y
 * el WhatsApp de todos los prospectos de toda la promotoría.
 */
const TABLE = 'leads';

/** ¿El error dice que la tabla no existe? (42P01) */
function isMissingTable(error) {
  return Boolean(error) && error.code === '42P01';
}

/**
 * Guarda un prospecto y lo atribuye al asesor dueño de la tarjeta.
 *
 * @param {string} advisorId Identificador del asesor.
 * @param {{name: string, whatsapp: string}} lead Datos que escribió la persona.
 * @param {string} [source] Desde dónde se capturó, para saber qué canal funciona.
 */
export async function createLead(advisorId, lead, source = 'public_card') {
  if (!isSupabaseConfigured || !supabase) {
    return { data: null, error: { message: 'Supabase no está configurado.' } };
  }
  if (!advisorId) return { data: null, error: { message: 'Falta el asesor.' } };

  const name = String(lead?.name ?? '').trim();
  const whatsapp = String(lead?.whatsapp ?? '').trim();
  const referredByName = String(lead?.referredByName ?? '').trim();
  if (!name) return { data: null, error: { message: 'Falta el nombre.' } };

  const { data, error } = await supabase
    .from(TABLE)
    .insert([{
      advisor_id: advisorId,
      name,
      whatsapp,
      source,
      ...(referredByName && { referred_by_name: referredByName }),
    }])
    /*
      No se pide `select()` de vuelta. La política sólo concede inserción a quien
      no tiene sesión, así que releer la fila fallaría y el error taparía una
      inserción que sí ocurrió: la persona vería un fallo después de haber
      entregado sus datos.
    */
    .then((result) => ({ data: result.data ?? null, error: result.error ?? null }));

  if (isMissingTable(error)) {
    return {
      data: null,
      error: {
        ...error,
        hint: 'Falta la tabla public.leads. Aplica la migración '
          + 'supabase/migrations/20260810_public_cards_and_leads.sql.',
      },
    };
  }

  return { data, error };
}

/**
 * Prospectos del asesor que consulta, los más recientes primero.
 *
 * No se filtra por `advisor_id` en la consulta: la política de la base ya
 * devuelve sólo las filas propias. Filtrar aquí además haría creer que la
 * seguridad la pone el cliente, y quien lea este código después podría quitar
 * el filtro pensando que basta con eso.
 */
export async function listMyLeads() {
  if (!isSupabaseConfigured || !supabase) return { data: [], error: null };

  let result = await supabase
    .from(TABLE)
    .select('id, name, whatsapp, source, referred_by_name, referrer_diagnostic_id, created_at')
    .order('created_at', { ascending: false });

  // Durante un despliegue la UI puede llegar segundos antes que la migración.
  // La lista anterior sigue funcionando y evita ocultar prospectos existentes.
  if (result.error?.code === '42703') {
    result = await supabase
      .from(TABLE)
      .select('id, name, whatsapp, source, created_at')
      .order('created_at', { ascending: false });
  }

  const { data, error } = result;
  if (error) return { data: [], error };

  return {
    data: (data ?? []).map((row) => ({
      id: row.id,
      name: row.name ?? '',
      whatsapp: row.whatsapp ?? '',
      source: row.source ?? '',
      referredByName: row.referred_by_name ?? '',
      referrerDiagnosticId: row.referrer_diagnostic_id ?? null,
      capturedAt: row.created_at ? new Date(row.created_at).getTime() : Date.now(),
    })),
    error: null,
  };
}

const SOURCE_LABELS = {
  public_card: 'Tarjeta digital compartida',
  public_diagnostic: 'Solicitó un pase desde un enlace reenviado',
  diagnostic_referral: 'Referido desde una Radiografía Patrimonial',
  vip_menu: 'Pase VIP creado por ti',
  cita_inicial_referral: 'Referido al cerrar una Cita Inicial',
};

/** Origen legible y, cuando existe, la persona que hizo la recomendación. */
export function leadSourceLabel(lead) {
  const origin = SOURCE_LABELS[lead?.source] || (lead?.storage === 'local'
    ? 'Capturado en este dispositivo'
    : 'Prospecto capturado');
  return lead?.referredByName ? `${origin} · por ${lead.referredByName}` : origin;
}


/** Borra un prospecto propio. La política de la base impide tocar los ajenos. */
export async function deleteLead(id) {
  if (!isSupabaseConfigured || !supabase) {
    return { error: { message: 'Supabase no está configurado.' } };
  }
  const { error } = await supabase.from(TABLE).delete().eq('id', id);
  return { error };
}
