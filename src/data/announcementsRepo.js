import { supabase, isSupabaseConfigured, supabaseHost } from '../lib/supabaseClient';
import {
  readLocalAnnouncements, addLocalAnnouncement, removeLocalAnnouncement,
  updateLocalAnnouncement,
} from './announcements';

/**
 * Acceso a los comunicados, con una sola puerta para toda la app.
 *
 * Si hay credenciales de Supabase, la base es la fuente de verdad. Si no, se
 * usa el almacenamiento local: así la app sigue siendo demostrable sin
 * configurar nada, y conectar Supabase no obliga a tocar los componentes.
 */
export const usingSupabase = isSupabaseConfigured;

const TABLE = 'announcements';

/**
 * Convierte un error de Supabase en un mensaje que se pueda leer en pantalla.
 *
 * Los errores de Postgres traen `hint` con la instrucción exacta para
 * arreglarlos (por ejemplo el GRANT que falta). Descartarlo obligaría a abrir
 * la consola del navegador para saber qué pasó, así que se muestra completo.
 */
export function describeError(error) {
  if (!error) return '';
  const parts = [error.message || 'Error desconocido'];
  if (error.code) parts.push(`(código ${error.code})`);
  if (error.hint) parts.push(`· Solución: ${error.hint}`);
  return parts.join(' ');
}

/** Convierte una fila de Supabase a la forma que usan los componentes. */
function fromRow(row) {
  return {
    id: row.id,
    category: row.category ?? 'importante',
    title: row.title ?? '',
    content: row.content ?? '',
    imageUrl: row.image_url ?? '',
    createdAt: row.created_at ? new Date(row.created_at).getTime() : Date.now(),
  };
}

/**
 * Devuelve `{ data, error, source }`. El error se entrega en vez de lanzarse
 * para que la interfaz decida qué mostrar.
 */
export async function fetchAnnouncements() {
  if (!usingSupabase) {
    return { data: readLocalAnnouncements(), error: null, source: 'local' };
  }

  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .order('created_at', { ascending: false });

  if (error) return { data: [], error, source: 'supabase' };
  return { data: (data ?? []).map(fromRow), error: null, source: 'supabase' };
}

export async function publishAnnouncement({ title, category, content, imageUrl }) {
  if (!usingSupabase) {
    const created = addLocalAnnouncement({ title, category, content, imageUrl });
    return {
      data: created,
      error: created ? null : new Error('El comunicado necesita un título.'),
      source: 'local',
    };
  }

  // Se mandan los nombres de columna tal cual existen en la tabla.
  const { data, error } = await supabase
    .from(TABLE)
    .insert([{ title, category, content, image_url: imageUrl || null }])
    .select();

  if (error) return { data: null, error, source: 'supabase' };
  return { data: data?.[0] ? fromRow(data[0]) : null, error: null, source: 'supabase' };
}

export async function updateAnnouncement(id, { title, category, content, imageUrl }) {
  if (!usingSupabase) {
    const updated = updateLocalAnnouncement(id, { title, category, content, imageUrl });
    return {
      data: updated,
      error: updated ? null : new Error('No se encontró el comunicado o falta el título.'),
      source: 'local',
    };
  }

  const { data, error } = await supabase
    .from(TABLE)
    .update({ title, category, content, image_url: imageUrl || null })
    .eq('id', id)
    .select();

  if (error) return { data: null, error, source: 'supabase' };

  // Sin filas devueltas la actualización no ocurrió: suele ser una política de
  // RLS que permite la petición pero no deja tocar la fila.
  if (!data?.length) {
    return {
      data: null,
      error: { message: 'La base aceptó la petición pero no actualizó ninguna fila.', code: 'NO_ROWS', hint: 'Revisa la política de UPDATE en row level security.' },
      source: 'supabase',
    };
  }
  return { data: fromRow(data[0]), error: null, source: 'supabase' };
}

export async function deleteAnnouncement(id) {
  if (!usingSupabase) {
    removeLocalAnnouncement(id);
    return { error: null, source: 'local' };
  }

  const { error } = await supabase.from(TABLE).delete().eq('id', id);
  return { error, source: 'supabase' };
}

/**
 * Comprueba que la tabla responda de verdad, midiendo cuánto tarda.
 *
 * Pide el conteo con `head: true` para no traer filas: interesa saber si hay
 * permiso y latencia, no el contenido. Devuelve el detalle en `steps` para que
 * la consola de diagnóstico muestre qué se probó y con qué resultado.
 */
export async function pingDatabase() {
  const startedAt = performance.now();

  if (!usingSupabase) {
    return {
      ok: false,
      configured: false,
      host: '',
      count: readLocalAnnouncements().length,
      latencyMs: Math.round(performance.now() - startedAt),
      error: null,
      steps: [
        { label: 'Variables de entorno', ok: false, detail: 'Faltan VITE_SUPABASE_URL o VITE_SUPABASE_ANON_KEY' },
        { label: 'Origen de los datos', ok: true, detail: 'localStorage del navegador' },
      ],
    };
  }

  const { count, error } = await supabase
    .from(TABLE)
    .select('*', { count: 'exact', head: true });

  const latencyMs = Math.round(performance.now() - startedAt);

  return {
    ok: !error,
    configured: true,
    host: supabaseHost,
    count: count ?? 0,
    latencyMs,
    error,
    steps: [
      { label: 'Variables de entorno', ok: true, detail: supabaseHost },
      {
        label: `Lectura de la tabla "${TABLE}"`,
        ok: !error,
        detail: error ? describeError(error) : `${count ?? 0} fila(s) · ${latencyMs} ms`,
      },
    ],
  };
}
