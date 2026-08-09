import { useState, useEffect, useCallback } from 'react';
import {
  Database, Send, Trash2, Loader2, CheckCircle2, AlertTriangle, HardDrive,
} from 'lucide-react';
import FullScreenView from '../Layout/FullScreenView';
import { CATEGORY_LIST, categoryOf, relativeTime } from '../../data/announcements';
import {
  fetchAnnouncements, publishAnnouncement, deleteAnnouncement, usingSupabase,
} from '../../data/announcementsRepo';

const INPUT =
  'w-full rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-900 '
  + 'placeholder:text-zinc-400 transition-colors focus:border-indigo-500 focus:outline-none '
  + 'focus:ring-2 focus:ring-indigo-500 dark:border-zinc-700 dark:bg-zinc-950/60 '
  + 'dark:text-zinc-100 dark:placeholder:text-zinc-600';

const LABEL = 'mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-zinc-500';

/** Aviso del resultado de la última operación contra la base. */
function StatusBanner({ status }) {
  if (!status) return null;
  const isError = status.type === 'error';
  const Icon = isError ? AlertTriangle : CheckCircle2;
  return (
    <div
      role="status"
      className={`mb-5 flex items-start gap-2.5 rounded-xl border p-3 ${isError
        ? 'border-rose-500/30 bg-rose-500/10'
        : 'border-emerald-500/30 bg-emerald-500/10'}`}
    >
      <Icon
        size={16}
        className={`mt-0.5 shrink-0 ${isError
          ? 'text-rose-600 dark:text-rose-400'
          : 'text-emerald-600 dark:text-emerald-400'}`}
        aria-hidden="true"
      />
      <p className={`text-xs leading-relaxed ${isError
        ? 'text-rose-700 dark:text-rose-300'
        : 'text-emerald-700 dark:text-emerald-300'}`}
      >
        {status.message}
      </p>
    </div>
  );
}

/**
 * Panel de control del promotor: publica comunicados y administra los
 * existentes para probar el ciclo completo contra la base de datos.
 */
export default function AdminPanel({ isOpen, onClose }) {
  const [category, setCategory] = useState(CATEGORY_LIST[0].key);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [imageUrl, setImageUrl] = useState('');

  const [list, setList] = useState([]);
  const [isLoading, setLoading] = useState(false);
  const [isSaving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [status, setStatus] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await fetchAnnouncements();
    setLoading(false);
    if (error) {
      setStatus({ type: 'error', message: `No se pudieron leer los comunicados: ${error.message}` });
      return;
    }
    setList(data);
  }, []);

  useEffect(() => {
    if (isOpen) {
      setStatus(null);
      load();
    }
  }, [isOpen, load]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) {
      setStatus({ type: 'error', message: 'El comunicado necesita un título.' });
      return;
    }

    setSaving(true);
    const { error } = await publishAnnouncement({
      title: title.trim(),
      category,
      content: content.trim(),
      imageUrl: imageUrl.trim(),
    });
    setSaving(false);

    if (error) {
      setStatus({ type: 'error', message: `Error al publicar: ${error.message}` });
      return;
    }

    setStatus({
      type: 'ok',
      message: usingSupabase
        ? 'Comunicado publicado en Supabase.'
        : 'Comunicado guardado localmente (Supabase no está configurado).',
    });
    setTitle('');
    setContent('');
    setImageUrl('');
    load();
  };

  const handleDelete = async (id) => {
    setDeletingId(id);
    const { error } = await deleteAnnouncement(id);
    setDeletingId(null);
    if (error) {
      setStatus({ type: 'error', message: `Error al eliminar: ${error.message}` });
      return;
    }
    setStatus({ type: 'ok', message: 'Comunicado eliminado.' });
    load();
  };

  return (
    <FullScreenView
      isOpen={isOpen}
      onClose={onClose}
      title="Panel de Control"
      label="Panel de administración"
    >
      <div className="mb-5">
        <h2 className="text-lg font-bold leading-snug text-zinc-900 dark:text-white">
          Panel de Control y Pruebas · Promotor
        </h2>

        {/* Queda explícito de dónde salen los datos, para no depurar a ciegas */}
        <p className="mt-1.5 flex items-center gap-1.5 text-[11px] font-semibold text-zinc-500">
          {usingSupabase
            ? <><Database size={12} /> Conectado a Supabase</>
            : <><HardDrive size={12} /> Modo local · sin credenciales de Supabase</>}
        </p>
      </div>

      <StatusBanner status={status} />

      <form onSubmit={handleSubmit} className="mb-8">
        <div className="mb-4">
          <span className={LABEL}>Categoría</span>
          <div role="radiogroup" aria-label="Categoría" className="flex flex-wrap gap-2">
            {CATEGORY_LIST.map((option) => {
              const active = category === option.key;
              return (
                <button
                  key={option.key}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => setCategory(option.key)}
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
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ej. Nueva campaña de Vida"
            autoComplete="off"
          />
        </div>

        <div className="mb-4">
          <label className={LABEL} htmlFor="admin-content">Contenido</label>
          <textarea
            id="admin-content"
            rows={3}
            className={`${INPUT} resize-none`}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Detalles que el asesor debe conocer..."
          />
        </div>

        <div className="mb-5">
          <label className={LABEL} htmlFor="admin-image">URL de Imagen (opcional)</label>
          <input
            id="admin-image"
            className={INPUT}
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            placeholder="https://..."
            inputMode="url"
            autoComplete="off"
          />
          <p className="mt-1.5 text-[11px] text-zinc-500">
            Con imagen, el asesor podrá compartir el flyer con su marca de agua.
          </p>
        </div>

        <button
          type="submit"
          disabled={isSaving}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600
                     px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-600/30
                     transition-all hover:bg-indigo-500 active:scale-[0.98]
                     disabled:cursor-wait disabled:opacity-60"
        >
          {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
          {isSaving ? 'Publicando...' : 'Publicar en Supabase'}
        </button>
      </form>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-bold text-zinc-900 dark:text-white">
            Comunicados actuales
          </h3>
          <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
            {isLoading ? 'Cargando...' : `${list.length} ${list.length === 1 ? 'registro' : 'registros'}`}
          </span>
        </div>

        {!isLoading && list.length === 0 && (
          <p className="rounded-xl border border-dashed border-zinc-300 py-8 text-center text-xs
                        text-zinc-500 dark:border-zinc-700">
            Sin comunicados. Publica el primero desde el formulario.
          </p>
        )}

        <ul className="flex flex-col gap-2">
          {list.map((item) => (
            <li
              key={item.id}
              className="flex items-center gap-3 rounded-xl border border-zinc-200 bg-white p-3
                         dark:border-zinc-800 dark:bg-zinc-900"
            >
              <div className="min-w-0 flex-1">
                <p className={`text-[10px] font-bold ${categoryOf(item.category).tone}`}>
                  {categoryOf(item.category).label}
                </p>
                <p className="truncate text-sm font-semibold text-zinc-900 dark:text-white">
                  {item.title}
                </p>
                <p className="mt-0.5 text-[11px] text-zinc-500">
                  {relativeTime(item.createdAt)}
                  {item.imageUrl ? ' · con imagen' : ''}
                </p>
              </div>

              <button
                type="button"
                onClick={() => handleDelete(item.id)}
                disabled={deletingId === item.id}
                aria-label={`Eliminar ${item.title}`}
                className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-zinc-400
                           transition-colors hover:bg-rose-500/10 hover:text-rose-500
                           disabled:cursor-wait"
              >
                {deletingId === item.id
                  ? <Loader2 size={14} className="animate-spin" />
                  : <Trash2 size={14} />}
              </button>
            </li>
          ))}
        </ul>
      </section>
    </FullScreenView>
  );
}
