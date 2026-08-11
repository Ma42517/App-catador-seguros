import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';
import { describeError } from './supabaseError';

/**
 * Alertas de alta prioridad y sus respuestas.
 *
 * Una alerta es un comunicado con `target_section = 'hoy'`: en lugar de esperar en
 * el muro a que alguien entre, aparece en la pantalla de inicio del asesor y **no
 * se va hasta que contesta**. Por eso lleva fecha y hora: la respuesta es una
 * confirmación de asistencia, no un acuse de lectura.
 *
 * Las respuestas viven en su propia tabla y no en una columna del comunicado
 * porque son una por asesor: con veinte asesores hay veinte respuestas para la
 * misma alerta, y eso no cabe en una fila.
 */
const ALERTS = 'announcements';
const RESPONSES = 'alert_responses';

export const ALERT_RESPONSE = { YES: 'yes', NO: 'no' };

/** ¿Falta la tabla o alguna columna de esta función? */
function isMissingStructure(error) {
  if (!error) return false;
  if (error.code === '42703' || error.code === '42P01') return true;
  const text = String(error.message ?? '');
  return ['alert_responses', 'target_section', 'event_date', 'event_time']
    .some((name) => text.includes(name));
}

function toAlert(row) {
  return {
    id: row.id,
    title: row.title ?? '',
    content: row.content ?? '',
    category: row.category ?? 'importante',
    authorName: row.author_name ?? '',
    authorId: row.author_id ?? null,
    eventDate: row.event_date ?? '',
    eventTime: row.event_time ?? '',
    createdAt: row.created_at ? new Date(row.created_at).getTime() : Date.now(),
  };
}

/**
 * Las alertas que este asesor todavía no ha contestado.
 *
 * Se cruzan en dos consultas y no con un `join` porque PostgREST no expresa bien
 * un "no existe" entre tablas sin declarar la relación, y una vista para esto
 * añadiría una migración más. Con dos viajes cortos —las alertas de su promotoría
 * y los ids que ya contestó— el filtro se hace en memoria y el resultado es el
 * mismo.
 *
 * Devuelve `[]` ante cualquier fallo, y eso es deliberado: la pantalla de inicio
 * es lo primero que se ve al abrir la app, y un error de esta consulta no puede
 * dejarla en blanco. Si algo va mal, no hay alertas y se sigue trabajando.
 */
export async function fetchPendingAlerts(promotorId, asesorId) {
  if (!isSupabaseConfigured || !supabase || !promotorId || !asesorId) {
    return { alerts: [], error: null };
  }

  const { data, error } = await supabase
    .from(ALERTS)
    .select('id, title, content, category, author_id, author_name,'
      + ' event_date, event_time, created_at')
    .eq('promotor_id', promotorId)
    .eq('target_section', 'hoy')
    .order('created_at', { ascending: false })
    .limit(20);

  if (error) {
    return { alerts: [], error: isMissingStructure(error) ? null : error };
  }
  if (!data || data.length === 0) return { alerts: [], error: null };

  const { data: answered, error: answeredError } = await supabase
    .from(RESPONSES)
    .select('alert_id')
    .eq('asesor_id', asesorId)
    .in('alert_id', data.map((row) => row.id));

  /*
    Si no se pueden leer las respuestas, no se muestra ninguna alerta.

    Es la decisión prudente: mostrarlas todas significaría volver a preguntar por
    algo que la persona ya contestó, y una alerta que reaparece después de haber
    dicho "sí asistiré" destruye la confianza en el aviso.
  */
  if (answeredError) return { alerts: [], error: null };

  const done = new Set((answered ?? []).map((row) => row.alert_id));
  return { alerts: data.filter((row) => !done.has(row.id)).map(toAlert), error: null };
}

/**
 * Guarda la respuesta de un asesor.
 *
 * La tabla lleva una restricción de unicidad por alerta y asesor, así que un doble
 * toque no crea dos filas. Se trata el choque como éxito: la respuesta ya está
 * guardada, que es lo que la persona quería.
 */
export async function respondToAlert(alertId, asesorId, response) {
  if (!isSupabaseConfigured || !supabase) {
    return { error: { message: 'Supabase no está configurado.' } };
  }

  const { error } = await supabase
    .from(RESPONSES)
    .insert([{ alert_id: alertId, asesor_id: asesorId, response }]);

  if (error) {
    const isDuplicate = error.code === '23505'
      || /duplicate key|already exists/i.test(String(error.message ?? ''));
    if (isDuplicate) return { error: null };
    return { error };
  }
  return { error: null };
}

/** Las alertas que ha enviado una promotoría, para el seguimiento. */
export async function fetchSentAlerts(promotorId) {
  if (!isSupabaseConfigured || !supabase || !promotorId) {
    return { alerts: [], error: null, missingStructure: false };
  }

  const { data, error } = await supabase
    .from(ALERTS)
    .select('id, title, content, category, author_id, author_name,'
      + ' event_date, event_time, created_at')
    .eq('promotor_id', promotorId)
    .eq('target_section', 'hoy')
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) {
    return { alerts: [], error, missingStructure: isMissingStructure(error) };
  }
  return { alerts: (data ?? []).map(toAlert), error: null, missingStructure: false };
}

/**
 * Quién contestó qué a una alerta.
 *
 * Devuelve un mapa `{ [asesorId]: 'yes' | 'no' }` en lugar de la lista de filas.
 * Quien llama tiene el equipo completo y necesita cruzarlo para saber **quién
 * falta**, que es la pregunta que de verdad se hace un promotor antes de una
 * junta; una lista de respuestas sola sólo dice quién sí contestó.
 */
export async function fetchAlertResponses(alertId) {
  if (!isSupabaseConfigured || !supabase || !alertId) {
    return { responses: {}, error: null };
  }

  const { data, error } = await supabase
    .from(RESPONSES)
    .select('asesor_id, response')
    .eq('alert_id', alertId);

  if (error) return { responses: {}, error };

  return {
    responses: (data ?? []).reduce((map, row) => {
      map[row.asesor_id] = row.response;
      return map;
    }, {}),
    error: null,
  };
}

export { describeError };
