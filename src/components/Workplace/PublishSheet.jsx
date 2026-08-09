import { useState, useEffect } from 'react';
import { Send } from 'lucide-react';
import BottomSheet from '../Layout/BottomSheet';
import { CATEGORY_LIST } from '../../data/announcements';

const INPUT =
  'w-full rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-900 '
  + 'placeholder:text-zinc-400 transition-colors focus:border-indigo-500 focus:outline-none '
  + 'focus:ring-2 focus:ring-indigo-500 dark:border-zinc-700 dark:bg-zinc-950/60 '
  + 'dark:text-zinc-100 dark:placeholder:text-zinc-600';

const LABEL = 'mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-zinc-500';

/** Redacción de un comunicado. Sólo alcanzable con permisos de promotor. */
export default function PublishSheet({ isOpen, onClose, onPublish }) {
  const [category, setCategory] = useState(CATEGORY_LIST[0].key);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    setCategory(CATEGORY_LIST[0].key);
    setTitle('');
    setContent('');
    setError('');
  }, [isOpen]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('El comunicado necesita un título.');
      return;
    }
    onPublish({ category, title, content });
    onClose();
  };

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} label="Publicar comunicado">
      <h2 className="mb-5 text-lg font-bold text-zinc-900 dark:text-white">
        Nuevo Comunicado
      </h2>

      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <span className={LABEL}>Etiqueta</span>
          <div role="radiogroup" aria-label="Etiqueta del comunicado" className="flex gap-2">
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
                  {option.short}
                </button>
              );
            })}
          </div>
        </div>

        <div className="mb-4">
          <label className={LABEL} htmlFor="ann-title">Título</label>
          <input
            id="ann-title"
            className={INPUT}
            value={title}
            onChange={(e) => { setTitle(e.target.value); setError(''); }}
            placeholder="Ej. Nueva campaña de Vida"
            autoComplete="off"
          />
        </div>

        <div className="mb-4">
          <label className={LABEL} htmlFor="ann-desc">Descripción</label>
          <textarea
            id="ann-desc"
            rows={3}
            className={`${INPUT} resize-none`}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Detalles que el asesor debe conocer..."
          />
        </div>

        {error && (
          <p role="alert" className="mb-4 text-xs font-medium text-rose-500">{error}</p>
        )}

        <button
          type="submit"
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600
                     px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-600/30
                     transition-all hover:bg-indigo-500 active:scale-[0.98]"
        >
          <Send size={16} />
          Publicar al equipo
        </button>
      </form>
    </BottomSheet>
  );
}
