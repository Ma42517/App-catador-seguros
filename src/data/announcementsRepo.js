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
export async function uploadAttachment(file, folder = '', client = null) {
  if (!file) return { url: '', error: null, source: 'none' };

  /*
    `client` permite subir con OTRA sesión que la de la app. Lo usa la tarjeta de
    regalo: su mundo tiene cliente propio para no compartir sesión con el asesor,
    y la foto tiene que subirse con la sesión de quien la está editando.
  */
  const sb = client ?? supabase;

  // La carpeta separa lo que es de la promotoría de lo que es de cada persona
  // dentro del mismo bucket, que ya tiene las políticas puestas.
  const fileName = folder
    ? `${folder.replace(/\/+$/, '')}/${storageFileName(file.name)}`
    : storageFileName(file.name);

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

  const { error: uploadError } = await sb.storage
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

  const { data } = sb.storage.from(BUCKET).getPublicUrl(fileName);

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

    /*
      Quién lo escribió. El nombre se guarda junto al comunicado en lugar de
      buscarse en `profiles` al leer, y no es por ahorrar una consulta: RLS no deja
      al asesor leer fichas ajenas, así que un `join` devolvería vacío justo para
      quien tiene que ver el nombre.

      Que quede congelado es correcto aquí: "publicado por" es un hecho de cuando
      se publicó. Si esa persona cambia su nombre después, el comunicado sigue
      diciendo quién lo firmó ese día.
    */
    authorId: row.author_id ?? null,
    authorName: row.author_name ?? '',

    /*
      Dónde va el comunicado. `workspace` es el muro y `hoy` la notificación que
      aparece en la pantalla de inicio del asesor hasta que contesta.

      Las filas viejas no traen nada, y ausencia se lee como muro: es donde
      estaban antes de que existiera la alternativa, y darles por destino "hoy"
      resucitaría comunicados de meses atrás en la pantalla de inicio de todos.
    */
    targetSection: row.target_section || 'workspace',
    eventDate: row.event_date ?? '',
    eventTime: row.event_time ?? '',
  };
}

/**
 * Devuelve `{ data, error, source }`. El error se entrega en vez de lanzarse
 * para que la interfaz decida qué mostrar.
 */
/**
 * ¿El error dice que falta la columna del dueño?
 *
 * Postgres lo reporta como `42703`. Se comprueba el código y no el texto, que
 * cambia con el idioma del servidor.
 */
function isMissingOwner(error) {
  if (!error) return false;
  if (error.code === '42703') return true;
  const text = String(error.message ?? '');
  return ['promotor_id', 'author_id', 'author_name',
    'target_section', 'event_date', 'event_time'].some((c) => text.includes(c));
}

/**
 * Los comunicados que le corresponden a quien mira.
 *
 * `promotorId` es el dueño del muro: el propio promotor cuando publica y consulta
 * lo suyo, o el promotor al que pertenece el asesor. Sin ese filtro, la tabla es
 * un tablón único para toda la app: en cuanto hay dos promotorías, cada asesor lee
 * los comunicados de la otra —campañas, bases, cifras— y nadie se da cuenta porque
 * la pantalla se ve normal.
 *
 * Se aceptan también las filas sin dueño (`promotor_id is null`). Son las que se
 * publicaron antes de que existiera la columna, y descartarlas haría desaparecer
 * de golpe todo lo que ya estaba escrito. Al asignarles dueño con el guion de
 * `.env.example`, dejan de aparecer donde no deben.
 */
export async function fetchAnnouncements(promotorId = '') {
  if (!usingSupabase) {
    return { data: readLocalAnnouncements(), error: null, source: 'local' };
  }

  const ask = (filtered) => {
    let query = supabase.from(TABLE).select('*');
    if (filtered && promotorId) {
      query = query.or(`promotor_id.eq.${promotorId},promotor_id.is.null`);
      /*
        Las notificaciones de inicio no se repiten en el muro. Se eligió una cosa o
        la otra al publicar, y verlas en los dos sitios haría dudar de si son dos
        avisos distintos —y de si hay que contestar dos veces—.

        `is.null` entra porque las filas anteriores a esta columna son de muro.
      */
      query = query.or('target_section.is.null,target_section.eq.workspace');
    }
    return query.order('created_at', { ascending: false });
  };

  let { data, error } = await ask(true);

  /*
    Sin la columna todavía, se pide sin filtrar en lugar de dejar el muro en un
    error. Es el mismo criterio que con las demás migraciones pendientes: el
    contenido importa más que el reparto, y el reparto llega al correr el guion.
  */
  if (error && isMissingOwner(error)) {
    ({ data, error } = await ask(false));
  }

  if (error) return { data: [], error, source: 'supabase' };
  return { data: (data ?? []).map(fromRow), error: null, source: 'supabase' };
}

export async function publishAnnouncement({
  title, category, content, fileUrl, promotorId = '', authorId = '', authorName = '',
  targetSection = 'workspace', eventDate = '', eventTime = '',
}) {
  if (!usingSupabase) {
    const created = addLocalAnnouncement({ title, category, content, fileUrl });
    return {
      data: created,
      error: created ? null : new Error('El comunicado necesita un título.'),
      source: 'local',
    };
  }

  // Se mandan los nombres de columna tal cual existen en la tabla.
  const row = { title, category, content, image_url: fileUrl || null };

  /*
    El dueño se sella al publicar. Es lo que permite repartir el muro después: sin
    esta marca, un comunicado no pertenece a nadie y no hay forma de saber a qué
    equipo iba dirigido.
  */
  if (promotorId) row.promotor_id = promotorId;

  /*
    El autor va aparte del dueño del muro, y esa separación es la que permite que
    varios promotores publiquen en la misma promotoría: `promotor_id` dice en qué
    muro aparece y `author_id` quién lo firmó. Confundirlos obligaría a elegir
    entre repartir bien los muros o saber quién escribió.
  */
  if (authorId) row.author_id = authorId;
  if (authorName) row.author_name = authorName;

  row.target_section = targetSection;

  /*
    La fecha y la hora sólo viajan si la notificación las lleva. Mandar cadenas
    vacías a columnas `date` y `time` es un error de tipo en Postgres, no un valor
    nulo: `''` no es una fecha.
  */
  if (targetSection === 'hoy') {
    if (eventDate) row.event_date = eventDate;
    if (eventTime) row.event_time = eventTime;
  }

  let { data, error } = await supabase.from(TABLE).insert([row]).select();

  /*
    Si la columna no existe todavía, se publica sin ella. Perder el comunicado que
    alguien acaba de escribir por una migración pendiente sería el peor de los
    intercambios: se guarda, y al correr el guion se le asigna dueño.
  */
  if (error && isMissingOwner(error)) {
    const {
      promotor_id: _owner, author_id: _authorId, author_name: _authorName,
      target_section: _target, event_date: _date, event_time: _time, ...fallback
    } = row;
    ({ data, error } = await supabase.from(TABLE).insert([fallback]).select());
  }

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
 * Comprueba el bucket de Storage con una sonda de sólo lectura.
 *
 * Se reporta aparte del semáforo principal: la app funciona sin bucket, sólo no
 * podrá adjuntar archivos. Mezclarlo con el estado de la tabla haría ver como
 * caída una conexión que está sana.
 *
 * El método importa, y los dos obvios fallan:
 *
 *  - `list()` devuelve un arreglo vacío y sin error para buckets inexistentes:
 *    diría "todo bien" siempre.
 *  - `getBucket()` consulta la tabla de buckets, que la llave pública no puede
 *    leer: decía "no existe" incluso con las subidas funcionando.
 *
 * Se pide entonces por la ruta pública un objeto que a propósito no existe. La
 * respuesta distingue los dos casos sin escribir nada: si el error es del objeto
 * (`NoSuchKey`) el bucket está ahí y sirve contenido público; si es del bucket
 * (`NoSuchBucket`) no está o no es público.
 */
const PROBE_OBJECT = '__sonda-de-diagnostico__.txt';

export async function pingStorage() {
  if (!usingSupabase) {
    return {
      ok: false,
      detail: 'Sin Supabase: los adjuntos se guardan en este navegador.',
    };
  }

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(PROBE_OBJECT);

  try {
    const response = await fetch(data.publicUrl, { cache: 'no-store' });
    const body = await response.text();

    // El objeto no existe, pero el bucket contestó: es la señal de que está bien.
    if (response.ok || /NoSuchKey|Object not found/i.test(body)) {
      return { ok: true, detail: `Bucket "${BUCKET}" disponible y público.` };
    }

    if (/NoSuchBucket|Bucket not found/i.test(body)) {
      return {
        ok: false,
        detail: `Bucket "${BUCKET}" no existe o no es público. Créalo en Storage `
          + 'y marca la casilla "Public bucket".',
      };
    }

    return {
      ok: false,
      detail: `Storage respondió algo inesperado (${response.status}): ${body.slice(0, 120)}`,
    };
  } catch (error) {
    return {
      ok: false,
      detail: `No se pudo consultar Storage: ${error.message}`,
    };
  }
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
