import { useState } from 'react';
import { Send, Loader2, Check, Megaphone } from 'lucide-react';
import AttachmentInput from '../ui/AttachmentInput';
import { CATEGORY_LIST } from '../../data/announcements';
import {
  uploadAttachment, publishAnnouncement, describeError, usingSupabase,
} from '../../data/announcementsRepo';
import { useSession } from '../../context/SessionContext';

const INPUT =
  'w-full rounded-xl border border-zinc-800 bg-zinc-950/60 px-3 py-2.5 text-sm '
  + 'text-zinc-100 placeholder:text-zinc-600 transition-colors focus:border-indigo-500 '
  + 'focus:outline-none focus:ring-2 focus:ring-indigo-500';

const LABEL = 'mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-zinc-500';

/**
 * Redacción de comunicados, dentro del panel del promotor.
 *
 * Vive aquí y no en el muro porque son dos oficios distintos: el muro es donde se
 * lee —y el promotor entra a comprobar cómo le quedó— y este panel es donde se
 * gestiona la promotoría. Tener el formulario en el muro obligaba a abrir la
 * pantalla de lectura para escribir, y a esconderlo con una condición de rol en
 * medio del feed.
 *
 * El archivo se sube antes de crear el comunicado, no después. Si la subida falla,
 * el error se ve con el formulario intacto y sin haber creado un comunicado que
 * apunte a un archivo que no existe.
 */
export default function PostComposer({ onPublished }) {
  const { identity } = useSession();

  const [category, setCategory] = useState(CATEGORY_LIST[0].key);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [file, setFile] = useState(null);
  const [error, setError] = useState('');
  const [isUploading, setUploading] = useState(false);
  const [isSaving, setSaving] = useState(false);
  const [isDone, setDone] = useState(false);

  const reset = () => {
    setCategory(CATEGORY_LIST[0].key);
    setTitle('');
    setContent('');
    setFile(null);
    setError('');
    setDone(false);
  };

  const submit = async (event) => {
    event.preventDefault();

    if (!title.trim()) {
      setError('El comunicado necesita un título.');
      return;
    }

    setSaving(true);
    let fileUrl = '';

    if (file) {
      setUploading(true);
      const upload = await uploadAttachment(file);
      setUploading(false);

      if (upload.error) {
        setSaving(false);
        setError(describeError(upload.error));
        return;
      }
      fileUrl = upload.url;
    }

    const { error: publishError } = await publishAnnouncement({
      category,
      title: title.trim(),
      content: content.trim(),
      fileUrl,
      /*
        El comunicado queda sellado con el id del promotor que lo escribe. Es lo
        que hace que sus asesores lo vean y los de otra promotoría no.
      */
      promotorId: identity?.key ?? '',
    });

    setSaving(false);

    if (publishError) {
      setError(describeError(publishError));
      return;
    }

    setDone(true);
    onPublished?.();
  };

  const busy = isSaving || isUploading;

  if (isDone) {
    return (
      <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/[0.07] p-6 text-center">
        <span
          className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-xl border
                     border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
          aria-hidden="true"
        >
          <Check size={22} strokeWidth={2.2} />
        </span>

        <p className="text-sm font-bold text-white">Comunicado publicado</p>
        <p className="mx-auto mt-1.5 max-w-sm text-xs leading-relaxed text-zinc-400">
          Ya aparece en el muro de tus asesores aprobados. Puedes verlo como lo ven
          ellos desde Productividad → Workplace.
        </p>

        <button
          type="button"
          onClick={reset}
          className="mt-4 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs
                     font-semibold text-zinc-300 transition-colors hover:bg-white/10"
        >
          Publicar otro
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="rounded-2xl border border-white/10 bg-[#1a1a1a] p-4">
      <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest
                    text-indigo-400"
      >
        <Megaphone size={13} aria-hidden="true" />
        Nuevo comunicado
      </p>
      <p className="mt-1.5 text-[11px] leading-relaxed text-zinc-500">
        Lo verán en su muro todos tus asesores aprobados, y sólo ellos.
      </p>

      <div className="mb-4 mt-4">
        <span className={LABEL}>Etiqueta</span>
        <div role="radiogroup" aria-label="Etiqueta del comunicado" className="flex flex-wrap gap-2">
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
                  ? 'border-indigo-500 bg-indigo-500/10 text-indigo-300'
                  : 'border-zinc-700 text-zinc-500 hover:border-zinc-600'}`}
              >
                {option.short}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mb-4">
        <label className={LABEL} htmlFor="post-title">Título</label>
        <input
          id="post-title"
          className={INPUT}
          value={title}
          onChange={(e) => { setTitle(e.target.value); setError(''); }}
          placeholder="Ej. Nueva campaña de Vida"
          autoComplete="off"
        />
      </div>

      <div className="mb-4">
        <label className={LABEL} htmlFor="post-content">Descripción</label>
        <textarea
          id="post-content"
          rows={4}
          className={`${INPUT} resize-none`}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Detalles que el asesor debe conocer..."
        />
      </div>

      <div className="mb-5">
        <AttachmentInput
          id="post-file"
          label="Foto o documento (opcional)"
          file={file}
          onPick={(chosen) => { setFile(chosen); setError(''); }}
          onClear={() => setFile(null)}
          disabled={busy}
          hint={usingSupabase
            ? 'La foto se comparte con la marca de agua del asesor; los documentos, como descarga.'
            : 'Sin Supabase el archivo se guarda en este navegador, con un tope de 800 KB.'}
        />
      </div>

      {error && (
        <p role="alert" className="mb-4 text-xs font-medium text-rose-400">{error}</p>
      )}

      <button
        type="submit"
        disabled={busy}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600
                   px-4 py-3 text-sm font-bold text-white shadow-lg shadow-indigo-600/30
                   transition-colors hover:bg-indigo-500 active:scale-[0.98]
                   disabled:cursor-wait disabled:opacity-60 focus-visible:outline-none
                   focus-visible:ring-2 focus-visible:ring-indigo-400"
      >
        {busy
          ? <Loader2 size={16} className="animate-spin" aria-hidden="true" />
          : <Send size={16} aria-hidden="true" />}
        {isUploading ? 'Subiendo archivo…' : (isSaving ? 'Publicando…' : 'Publicar al equipo')}
      </button>
    </form>
  );
}
