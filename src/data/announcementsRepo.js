import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';
import {
  readLocalAnnouncements, addLocalAnnouncement, removeLocalAnnouncement,
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

export async function deleteAnnouncement(id) {
  if (!usingSupabase) {
    removeLocalAnnouncement(id);
    return { error: null, source: 'local' };
  }

  const { error } = await supabase.from(TABLE).delete().eq('id', id);
  return { error, source: 'supabase' };
}
