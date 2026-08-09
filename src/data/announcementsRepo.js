import { supabase, isSupabaseConfigured, supabaseHost } from '../lib/supabaseClient';
import {
  readLocalAnnouncements, addLocalAnnouncement, removeLocalAnnouncement,
  updateLocalAnnouncement,
} from './announcements';
import { storageFileName, MAX_LOCAL_FILE_BYTES, formatBytes } from './attachments';
import { describeError } from './supabaseError';

/**
 * Acceso a los comunicados, con una sola puerta para toda la app.
 *
 * Si hay credenciales de Supabase, la base es la fuente de verdad. Si no, se
 * usa el almacenamiento local: así la app sigue siendo demostrable sin
 * configurar nada, y conectar Supabase no obliga a tocar los componentes.
 */
export const usingSupabase = isSupabaseConfigured;

const TABLE = 'announcements';

/** Bucket de Storage donde viven los flyers y documentos de la promotoría. */
export const BUCKET = 'workplace-files';

/**
 * Sube un archivo y devuelve su URL pública.
 *
 * Sin Supabase el archivo se guarda como URL de datos dentro de localStorage.
 * Es un respaldo con tope de tamaño a propósito: sirve para probar el muro sin
 * credenciales, no para almacenar de verdad.
 */
export async function uploadAttachment(file) {
  if (!file) return { url: '', error: null, source: 'none' };

  const fileName = storageFileName(file.name);

  if (!usingSupabase) {
    if (file.size > MAX_LOCAL_FILE_BYTES) {
      return {
        url: '',
        source: 'local',
        error: {
          message: `El archivo pesa ${formatBytes(file.size)} y sin Supabase el tope es `
            + `${formatBytes(MAX_LOCAL_FILE_BYTES)}.`,
          code: 'LOCAL_TOO_LARGE',
          hint: 'Configura VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY para subir archivos reales.',
        },
      };
    }

    const url = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(reader.error ?? new Error('No se pudo leer el archivo.'));
      reader.readAsDataURL(file);
    }).catch((error) => ({ error }));

    if (typeof url !== 'string') {
      return { url: '', error: url.error, source: 'local' };
    }
    return { url, error: null, source: 'local', fileName };
  }

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(fileName, file, { cacheControl: '3600', upsert: false });

  if (uploadError) {
    // El error de Storage no trae `hint`, así que se añade la causa más común:
    // el bucket inexistente y la política de subida son casi siempre el motivo.
    return {
      url: '',
      source: 'supabase',
      error: {
        message: uploadError.message,
        code: uploadError.statusCode ?? uploadError.name ?? 'STORAGE',
        hint: `Revisa que el bucket "${BUCKET}" exista, sea público y tenga política de INSERT.`,
      },
    };
  }

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(fileName);

  if (!data?.publicUrl) {
    return {
      url: '',
      source: 'supabase',
      error: {
        message: 'El archivo subió pero no se pudo obtener su URL pública.',
        code: 'NO_PUBLIC_URL',
        hint: `Marca el bucket "${BUCKET}" como público en Storage.`,
      },
    };
  }

  return { url: data.publicUrl, error: null, source: 'supabase', fileName };
}

// `describeError` vive en su propio módulo porque también lo usan los perfiles.
// Se reexporta para no obligar a cambiar los componentes que ya lo importaban
// desde aquí.
export { describeError };

/**
 * Convierte una fila de Supabase a la forma que usan los componentes.
 *
 * La columna sigue llamándose `image_url` aunque ahora también guarde
 * documentos: renombrarla obligaría a una migración en la base del usuario y no
 * cambiaría nada de comportamiento. En el código de la app el campo sí se llama
 * `fileUrl`, que es lo que de verdad contiene, y la traducción entre ambos
 * nombres vive únicamente aquí.
 */
function fromRow(row) {
  return {
    id: row.id,
    category: row.category ?? 'importante',
    title: row.title ?? '',
    content: row.content ?? '',
    fileUrl: row.image_url ?? '',
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

export async function publishAnnouncement({ title, category, content, fileUrl }) {
  if (!usingSupabase) {
    const created = addLocalAnnouncement({ title, category, content, fileUrl });
    return {
      data: created,
      error: created ? null : new Error('El comunicado necesita un título.'),
      source: 'local',
    };
  }

  // Se mandan los nombres de columna tal cual existen en la tabla.
  const { data, error } = await supabase
    .from(TABLE)
    .insert([{ title, category, content, image_url: fileUrl || null }])
    .select();

  if (error) return { data: null, error, source: 'supabase' };
  return { data: data?.[0] ? fromRow(data[0]) : null, error: null, source: 'supabase' };
}

export async function updateAnnouncement(id, { title, category, content, fileUrl }) {
  if (!usingSupabase) {
    const updated = updateLocalAnnouncement(id, { title, category, content, fileUrl });
    return {
      data: updated,
      error: updated ? null : new Error('No se encontró el comunicado o falta el título.'),
      source: 'local',
    };
  }

  const { data, error } = await supabase
    .from(TABLE)
    .update({ title, category, content, image_url: fileUrl || null })
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
 * Comprueba el bucket de Storage.
 *
 * Se reporta aparte del semáforo principal: la app funciona perfectamente sin
 * bucket, sólo no podrá adjuntar archivos. Mezclarlo con el estado de la tabla
 * haría ver como caída una conexión que está sana.
 *
 * OJO con el método: `list()` devuelve un arreglo vacío y sin error incluso para
 * buckets que no existen, así que usarlo daría un "todo bien" permanente. Se
 * consulta el bucket en sí, que sí distingue los casos. Aun así el resultado es
 * indicativo: con la anon key, un bucket privado puede responder igual que uno
 * inexistente, y la prueba definitiva es intentar subir.
 */
export async function pingStorage() {
  if (!usingSupabase) {
    return {
      ok: false,
      detail: 'Sin Supabase: los adjuntos se guardan en este navegador.',
    };
  }

  const { data, error } = await supabase.storage.getBucket(BUCKET);

  if (error || !data) {
    return {
      ok: false,
      detail: `Bucket "${BUCKET}" no confirmado (${error?.message ?? 'sin respuesta'}). `
        + 'Si ya lo creaste, puede ser que la anon key no tenga permiso de consultarlo; '
        + 'la prueba real es subir un archivo.',
    };
  }

  return {
    ok: true,
    detail: `Bucket "${BUCKET}" encontrado · ${data.public ? 'público' : 'PRIVADO, las URLs no abrirán'}.`,
  };
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
