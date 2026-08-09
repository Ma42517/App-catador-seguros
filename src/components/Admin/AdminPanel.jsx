import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Database, Send, Trash2, Loader2, HardDrive, Activity, Pencil, X, Save, RefreshCw,
  Paperclip, FileText, Image as ImageIcon,
} from 'lucide-react';
import FullScreenView from '../Layout/FullScreenView';
import DiagnosticsConsole from './DiagnosticsConsole';
import { CATEGORY_LIST, categoryOf, relativeTime } from '../../data/announcements';
import {
  fetchAnnouncements, publishAnnouncement, updateAnnouncement, deleteAnnouncement,
  pingDatabase, pingStorage, uploadAttachment, usingSupabase, describeError, BUCKET,
} from '../../data/announcementsRepo';
import {
  ACCEPT_ATTACHMENTS, attachmentKind, attachmentName, formatBytes,
} from '../../data/attachments';

const INPUT =
  'w-full rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-900 '
  + 'placeholder:text-zinc-400 transition-colors focus:border-indigo-500 focus:outline-none '
  + 'focus:ring-2 focus:ring-indigo-500 dark:border-zinc-700 dark:bg-zinc-950/60 '
  + 'dark:text-zinc-100 dark:placeholder:text-zinc-600';

const LABEL = 'mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-zinc-500';

const SECTION_TITLE = 'text-sm font-bold text-zinc-900 dark:text-white';

const EMPTY_FORM = { category: CATEGORY_LIST[0].key, title: '', content: '' };

/** Icono según lo que sea el adjunto, para reconocerlo de un vistazo. */
function AttachmentIcon({ url, size = 14 }) {
  const Icon = attachmentKind(url) === 'document' ? FileText : ImageIcon;
  return <Icon size={size} aria-hidden="true" />;
}

/**
 * Selector de adjunto.
 *
 * Muestra tres estados distintos: sin nada, un archivo recién elegido que
 * todavía no sube, y el adjunto que ya vive en la base cuando se está editando.
 * Confundirlos llevaría a creer que un archivo se subió cuando no.
 */
function AttachmentField({ file, existingUrl, onPick, onClear, disabled }) {
  const inputRef = useRef(null);

  const pick = (event) => {
    const chosen = event.target.files?.[0] ?? null;
    onPick(chosen);
  };

  const clear = () => {
    if (inputRef.current) inputRef.current.value = '';
    onClear();
  };

  return (
    <div>
      <span className={LABEL}>Archivo adjunto (opcional)</span>

      <input
        ref={inputRef}
        id="admin-file"
        type="file"
        accept={ACCEPT_ATTACHMENTS}
        onChange={pick}
        disabled={disabled}
        className="block w-full cursor-pointer rounded-xl border border-zinc-200 bg-white
                   text-xs text-zinc-500 transition-colors
                   file:mr-3 file:cursor-pointer file:border-0 file:border-r
                   file:border-zinc-200 file:bg-zinc-100 file:px-3 file:py-2.5
                   file:text-xs file:font-semibold file:text-zinc-700
                   hover:border-zinc-300 disabled:cursor-not-allowed disabled:opacity-60
                   dark:border-zinc-700 dark:bg-zinc-950/60
                   dark:file:border-zinc-700 dark:file:bg-zinc-800 dark:file:text-zinc-200"
      />

      {/* Archivo elegido, aún sin subir */}
      {file && (
        <div className="mt-2 flex items-center gap-2 rounded-xl border border-indigo-500/40
                        bg-indigo-500/5 px-3 py-2"
        >
          <Paperclip size={13} className="shrink-0 text-indigo-400" aria-hidden="true" />
          <p className="min-w-0 flex-1 truncate text-[11px] text-zinc-600 dark:text-zinc-300">
            {file.name} · {formatBytes(file.size)}
          </p>
          <button
            type="button"
            onClick={clear}
            className="shrink-0 rounded-md p-1 text-zinc-400 transition-colors
                       hover:bg-rose-500/10 hover:text-rose-500"
            aria-label="Quitar archivo"
          >
            <X size={12} />
          </button>
        </div>
      )}

      {/* Adjunto que ya está publicado: se conserva si no se elige otro */}
      {!file && existingUrl && (
        <div className="mt-2 flex items-center gap-2 rounded-xl border border-zinc-200
                        bg-zinc-50 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
        >
          <span className="shrink-0 text-zinc-400">
            <AttachmentIcon url={existingUrl} size={13} />
          </span>
          <p className="min-w-0 flex-1 truncate text-[11px] text-zinc-600 dark:text-zinc-300">
            {attachmentName(existingUrl)}
          </p>
          <button
            type="button"
            onClick={onClear}
            className="shrink-0 rounded-md p-1 text-zinc-400 transition-colors
                       hover:bg-rose-500/10 hover:text-rose-500"
            aria-label="Quitar adjunto actual"
          >
            <X size={12} />
          </button>
        </div>
      )}

      <p className="mt-1.5 text-[11px] text-zinc-500">
        {usingSupabase
          ? <>Se sube al bucket <span className="font-mono">{BUCKET}</span>. Las imágenes
            se comparten con la marca de agua del asesor; los documentos, como descarga.</>
          : 'Sin Supabase el archivo se guarda en este navegador, con un tope de 800 KB.'}
      </p>
    </div>
  );
}

/** Estados posibles del diagnóstico, con su semáforo. */
const HEALTH = {
  idle: { dot: 'bg-zinc-400', label: 'Sin verificar', tone: 'text-zinc-500' },
  checking: { dot: 'bg-amber-400 animate-pulse', label: 'Verificando...', tone: 'text-amber-500' },
  ok: { dot: 'bg-emerald-500', label: 'Conectado', tone: 'text-emerald-600 dark:text-emerald-400' },
  error: { dot: 'bg-rose-500', label: 'Desconectado', tone: 'text-rose-600 dark:text-rose-400' },
  local: { dot: 'bg-amber-500', label: 'Modo local', tone: 'text-amber-600 dark:text-amber-400' },
};

/** Semáforo de estado con el detalle de la última verificación. */
function HealthCard({ status, host, latencyMs, rows, onCheck, isChecking }) {
  const health = HEALTH[status] ?? HEALTH.idle;

  return (
    <div className="mb-3 rounded-xl border border-zinc-200 bg-white p-4
                    dark:border-zinc-800 dark:bg-zinc-900"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${health.dot}`} aria-hidden="true" />
            <p className={`text-sm font-bold ${health.tone}`}>{health.label}</p>
          </div>

          <p className="mt-1 flex items-center gap-1.5 truncate text-[11px] text-zinc-500">
            {usingSupabase
              ? <><Database size={11} className="shrink-0" /> {host || 'Supabase'}</>
              : <><HardDrive size={11} className="shrink-0" /> localStorage del navegador</>}
          </p>
        </div>

        <button
          type="button"
          onClick={onCheck}
          disabled={isChecking}
          className="flex shrink-0 items-center gap-1.5 rounded-xl border border-zinc-300 px-3 py-2
                     text-xs font-semibold text-zinc-700 transition-colors hover:bg-zinc-100
                     active:scale-95 disabled:cursor-wait disabled:opacity-60
                     dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
        >
          {isChecking
            ? <Loader2 size={13} className="animate-spin" />
            : <Activity size={13} />}
          Verificar conexión
        </button>
      </div>

      {/* Métricas de la última verificación: sólo cuando ya hay una. */}
      {status !== 'idle' && status !== 'checking' && (
        <dl className="mt-3 grid grid-cols-2 gap-2 border-t border-zinc-200 pt-3
                       dark:border-zinc-800"
        >
          <div>
            <dt className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
              Latencia
            </dt>
            <dd className="text-sm font-semibold text-zinc-900 dark:text-white">
              {latencyMs === null ? '—' : `${latencyMs} ms`}
            </dd>
          </div>
          <div>
            <dt className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
              Filas en la tabla
            </dt>
            <dd className="text-sm font-semibold text-zinc-900 dark:text-white">
              {rows === null ? '—' : rows}
            </dd>
          </div>
        </dl>
      )}
    </div>
  );
}

/** Fila del gestor: categoría, título, antigüedad y las dos acciones de prueba. */
function ManagerRow({ item, isEditing, isDeleting, onEdit, onDelete }) {
  const category = categoryOf(item.category);

  return (
    <li
      className={`flex items-center gap-3 rounded-xl border p-3 transition-colors
        ${isEditing
          ? 'border-indigo-500 bg-indigo-500/5'
          : 'border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900'}`}
    >
      <div className="min-w-0 flex-1">
        <p className={`text-[10px] font-bold ${category.tone}`}>{category.label}</p>
        <p className="truncate text-sm font-semibold text-zinc-900 dark:text-white">
          {item.title}
        </p>
        <p className="mt-0.5 flex items-center gap-1 truncate font-mono text-[10px] text-zinc-500">
          id {String(item.id).slice(0, 8)} · {relativeTime(item.createdAt)}
          {item.fileUrl && (
            <>
              <span aria-hidden="true">·</span>
              <AttachmentIcon url={item.fileUrl} size={11} />
              <span className="truncate">{attachmentName(item.fileUrl)}</span>
            </>
          )}
        </p>
      </div>

      <button
        type="button"
        onClick={onEdit}
        aria-label={`Editar ${item.title}`}
        className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-zinc-400
                   transition-colors hover:bg-indigo-500/10 hover:text-indigo-500"
      >
        <Pencil size={14} />
      </button>

      <button
        type="button"
        onClick={onDelete}
        disabled={isDeleting}
        aria-label={`Eliminar ${item.title}`}
        className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-zinc-400
                   transition-colors hover:bg-rose-500/10 hover:text-rose-500
                   disabled:cursor-wait"
      >
        {isDeleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
      </button>
    </li>
  );
}

/**
 * Centro de control y diagnóstico de la promotoría.
 *
 * Tres bloques en orden de dependencia: primero si la base responde, luego
 * escribir en ella, y al final administrar lo escrito. Cada operación deja
 * rastro en la consola, así que cuando algo falla se ve *qué* falló y no sólo
 * *que* falló.
 */
export default function AdminPanel({ isOpen, onClose }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState(null);
  const [formError, setFormError] = useState('');

  // El adjunto se maneja en dos piezas: el archivo por subir y la URL que ya
  // está guardada. Al editar hay que poder conservar la segunda sin tocar nada.
  const [file, setFile] = useState(null);
  const [existingFileUrl, setExistingFileUrl] = useState('');
  const [isUploading, setUploading] = useState(false);

  const [list, setList] = useState([]);
  const [isLoading, setLoading] = useState(false);
  const [isSaving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const [health, setHealth] = useState('idle');
  const [latencyMs, setLatency] = useState(null);
  const [rows, setRows] = useState(null);
  const [host, setHost] = useState('');

  const [lines, setLines] = useState([]);
  const lineId = useRef(0);

  /** Agrega una línea a la consola con su hora local. */
  const log = useCallback((level, text) => {
    lineId.current += 1;
    const time = new Date().toLocaleTimeString('es-MX', { hour12: false });
    setLines((prev) => [...prev, { id: lineId.current, level, text, time }]);
  }, []);

  const clearConsole = useCallback(() => setLines([]), []);

  const setField = (key) => (event) => {
    setForm((prev) => ({ ...prev, [key]: event.target.value }));
    setFormError('');
  };

  /** Verificación de conexión: reporta cada paso por separado. */
  const runPing = useCallback(async () => {
    setHealth('checking');
    // La flecha va como ASCII: dentro de la consola monoespaciada, "→" puede
    // caer en el glifo faltante igual que las palomitas.
    log('cmd', usingSupabase
      ? 'ping -> supabase.from("announcements").select(count)'
      : 'ping -> almacenamiento local');

    const result = await pingDatabase();
    setLatency(result.latencyMs);
    setRows(result.count);
    setHost(result.host);

    result.steps.forEach((step) => {
      log(step.ok ? 'ok' : 'error', `${step.label}: ${step.detail}`);
    });

    if (!result.configured) {
      setHealth('local');
      log('warn', 'Sin credenciales: los cambios no salen de este navegador.');
      return;
    }
    setHealth(result.ok ? 'ok' : 'error');

    // El bucket se reporta aparte: la tabla puede estar perfecta y los adjuntos
    // no, y son dos problemas con arreglos distintos.
    const storage = await pingStorage();
    log(storage.ok ? 'ok' : 'warn', storage.detail);
  }, [log]);

  const load = useCallback(async () => {
    setLoading(true);
    log('cmd', 'select * from announcements order by created_at desc');
    const { data, error } = await fetchAnnouncements();
    setLoading(false);

    if (error) {
      log('error', describeError(error));
      return;
    }
    setList(data);
    log('ok', `${data.length} comunicado(s) recuperado(s).`);
  }, [log]);

  // Al abrir se verifica y se lee: el panel arranca mostrando la realidad.
  useEffect(() => {
    if (!isOpen) return;
    log('info', usingSupabase
      ? 'Panel abierto · destino: Supabase'
      : 'Panel abierto · destino: almacenamiento local');
    runPing();
    load();
  }, [isOpen, log, runPing, load]);

  const resetForm = useCallback(() => {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setFormError('');
    setFile(null);
    setExistingFileUrl('');
  }, []);

  const startEdit = useCallback((item) => {
    setEditingId(item.id);
    setForm({
      category: item.category,
      title: item.title,
      content: item.content ?? '',
    });
    setFile(null);
    setExistingFileUrl(item.fileUrl ?? '');
    setFormError('');
    log('info', `Editando id ${String(item.id).slice(0, 8)} · "${item.title}"`);
  }, [log]);

  const handleSubmit = async (event) => {
    event.preventDefault();

    const title = form.title.trim();
    if (!title) {
      setFormError('El comunicado necesita un título.');
      log('warn', 'Envío detenido: falta el título.');
      return;
    }

    setSaving(true);

    // El archivo sube primero: si falla, no se escribe una fila que apunte a
    // un adjunto que no existe.
    let fileUrl = existingFileUrl;

    if (file) {
      setUploading(true);
      log('cmd', `storage.from("${BUCKET}").upload("${file.name}") · ${formatBytes(file.size)}`);
      const upload = await uploadAttachment(file);
      setUploading(false);

      if (upload.error) {
        setSaving(false);
        log('error', describeError(upload.error));
        return;
      }
      fileUrl = upload.url;
      log('ok', `Archivo subido${upload.fileName ? ` como ${upload.fileName}` : ''}.`);
    }

    const payload = {
      title,
      category: form.category,
      content: form.content.trim(),
      fileUrl,
    };

    const isEdit = editingId !== null;
    // Se nombran las columnas reales de la tabla, no las claves de JavaScript:
    // una consola de diagnóstico que miente sobre el esquema no sirve de nada.
    log('cmd', isEdit
      ? `update announcements set title, category, content, image_url where id = ${String(editingId).slice(0, 8)}`
      : 'insert into announcements (title, category, content, image_url)');

    const { error } = isEdit
      ? await updateAnnouncement(editingId, payload)
      : await publishAnnouncement(payload);
    setSaving(false);

    if (error) {
      log('error', describeError(error));
      return;
    }

    log('ok', isEdit
      ? `Comunicado actualizado${usingSupabase ? ' en Supabase' : ' localmente'}.`
      : `Comunicado publicado${usingSupabase ? ' en Supabase' : ' localmente'}.`);
    resetForm();
    load();
    runPing();
  };

  const handleDelete = async (item) => {
    setDeletingId(item.id);
    log('cmd', `delete from announcements where id = ${String(item.id).slice(0, 8)}`);
    const { error } = await deleteAnnouncement(item.id);
    setDeletingId(null);

    if (error) {
      log('error', describeError(error));
      return;
    }
    log('ok', `Eliminado: "${item.title}"`);
    if (editingId === item.id) resetForm();
    load();
    runPing();
  };

  const isEditing = editingId !== null;
  const isChecking = health === 'checking';

  return (
    <FullScreenView
      isOpen={isOpen}
      onClose={onClose}
      title="Panel de Control"
      label="Panel de administración"
    >
      <h2 className="mb-4 text-lg font-bold leading-snug text-zinc-900 dark:text-white">
        Panel de Control y Pruebas · Promotor
      </h2>

      {/* ── 1. Diagnóstico ─────────────────────────────────────────────── */}
      <section className="mb-8">
        <h3 className={`mb-3 ${SECTION_TITLE}`}>Diagnóstico de la base</h3>

        <HealthCard
          status={health}
          host={host}
          latencyMs={latencyMs}
          rows={rows}
          onCheck={runPing}
          isChecking={isChecking}
        />

        <DiagnosticsConsole lines={lines} onClear={clearConsole} />
      </section>

      {/* ── 2. Pruebas CRUD ────────────────────────────────────────────── */}
      <section className="mb-8">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h3 className={SECTION_TITLE}>
            {isEditing ? 'Editar comunicado' : 'Publicar comunicado'}
          </h3>

          {isEditing && (
            <button
              type="button"
              onClick={() => { resetForm(); log('info', 'Edición cancelada.'); }}
              className="flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-semibold
                         text-zinc-500 transition-colors hover:text-rose-500"
            >
              <X size={12} />
              Cancelar
            </button>
          )}
        </div>

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <span className={LABEL}>Categoría</span>
            <div role="radiogroup" aria-label="Categoría" className="flex flex-wrap gap-2">
              {CATEGORY_LIST.map((option) => {
                const active = form.category === option.key;
                return (
                  <button
                    key={option.key}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => setForm((prev) => ({ ...prev, category: option.key }))}
                    className={`rounded-full border px-3 py-1.5 text-xs font-semibold
                                transition-all active:scale-95 ${active
                      ? 'border-indigo-500 bg-indigo-500/10 text-indigo-600 dark:text-indigo-300'
                      : 'border-zinc-200 text-zinc-500 dark:border-zinc-700'}`}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mb-4">
            <label className={LABEL} htmlFor="admin-title">Título</label>
            <input
              id="admin-title"
              className={INPUT}
              value={form.title}
              onChange={setField('title')}
              placeholder="Ej. Nueva campaña de Vida"
              autoComplete="off"
              aria-invalid={Boolean(formError)}
            />
            {formError && (
              <p role="alert" className="mt-1.5 text-[11px] font-medium text-rose-500">
                {formError}
              </p>
            )}
          </div>

          <div className="mb-4">
            <label className={LABEL} htmlFor="admin-content">Contenido</label>
            <textarea
              id="admin-content"
              rows={3}
              className={`${INPUT} resize-none`}
              value={form.content}
              onChange={setField('content')}
              placeholder="Detalles que el asesor debe conocer..."
            />
          </div>

          <div className="mb-5">
            <AttachmentField
              file={file}
              existingUrl={existingFileUrl}
              onPick={(chosen) => { setFile(chosen); setFormError(''); }}
              onClear={() => { setFile(null); setExistingFileUrl(''); }}
              disabled={isSaving}
            />
          </div>

          <button
            type="submit"
            disabled={isSaving}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600
                       px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-600/30
                       transition-all hover:bg-indigo-500 active:scale-[0.98]
                       disabled:cursor-wait disabled:opacity-60"
          >
            {isSaving
              ? <Loader2 size={16} className="animate-spin" />
              : (isEditing ? <Save size={16} /> : <Send size={16} />)}

            {/* Subir y guardar son dos esperas distintas: la del archivo puede
                tardar mucho más y conviene que se nombre por separado. */}
            {isUploading
              ? 'Subiendo archivo...'
              : (isSaving
                ? 'Guardando...'
                : (isEditing
                  ? 'Guardar cambios'
                  : `Publicar en ${usingSupabase ? 'Supabase' : 'local'}`))}
          </button>
        </form>
      </section>

      {/* ── 3. Gestor del Workplace ────────────────────────────────────── */}
      <section>
        <div className="mb-3 flex items-center justify-between gap-2">
          <h3 className={SECTION_TITLE}>Gestor del Workplace</h3>

          <button
            type="button"
            onClick={load}
            disabled={isLoading}
            className="flex items-center gap-1.5 rounded-lg px-2 py-1 text-[11px] font-semibold
                       uppercase tracking-wider text-zinc-500 transition-colors
                       hover:text-indigo-500 disabled:cursor-wait"
          >
            {isLoading
              ? <Loader2 size={12} className="animate-spin" />
              : <RefreshCw size={12} />}
            {isLoading ? 'Cargando' : `${list.length} en la base`}
          </button>
        </div>

        {!isLoading && list.length === 0 && (
          <p className="rounded-xl border border-dashed border-zinc-300 py-8 text-center text-xs
                        text-zinc-500 dark:border-zinc-700"
          >
            Sin comunicados. Publica el primero desde el formulario.
          </p>
        )}

        <ul className="flex flex-col gap-2">
          {list.map((item) => (
            <ManagerRow
              key={item.id}
              item={item}
              isEditing={editingId === item.id}
              isDeleting={deletingId === item.id}
              onEdit={() => startEdit(item)}
              onDelete={() => handleDelete(item)}
            />
          ))}
        </ul>
      </section>
    </FullScreenView>
  );
}
