import { useState } from 'react';
import { Megaphone, Loader2, Check, AlertTriangle } from 'lucide-react';
import { publishAnnouncement, describeError } from '../../data/announcementsRepo';

/**
 * Aviso rápido para todo el equipo.
 *
 * Publica en el mismo muro del Workplace que ya leen los asesores, en lugar de
 * inventar un canal aparte. Es lo que hace que el aviso llegue de verdad: un
 * segundo tablón obligaría a los asesores a revisar dos sitios, y el que se
 * consulta a diario ya existe.
 *
 * Se queda en un solo campo largo y un título. Un formulario con categoría,
 * adjunto y programación es el que ya tiene el Workplace para un comunicado
 * cuidado; esto es para lo urgente, y pedir cinco datos para avisar de algo
 * urgente es la forma más segura de que nadie lo use.
 */
export default function AlertPublisher({ onPublished }) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isBusy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [isDone, setDone] = useState(false);

  const submit = async (event) => {
    event.preventDefault();

    if (!title.trim()) {
      setError('El aviso necesita un título.');
      return;
    }

    setBusy(true);
    setError('');

    /*
      Categoría fija `importante`: es la que el muro pinta en rojo. Dejarla
      elegible convertiría una alerta en un comunicado más, que es exactamente lo
      que este atajo evita.
    */
    const { error: publishError } = await publishAnnouncement({
      title: title.trim(),
      category: 'importante',
      content: content.trim(),
      fileUrl: '',
    });

    setBusy(false);

    if (publishError) {
      setError(describeError(publishError));
      return;
    }

    setTitle('');
    setContent('');
    setDone(true);
    onPublished?.();
  };

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

        <p className="text-sm font-bold text-white">Aviso publicado</p>
        <p className="mx-auto mt-1.5 max-w-sm text-xs leading-relaxed text-zinc-400">
          Ya aparece en el muro del Workplace de todo tu equipo, marcado como
          importante.
        </p>

        <button
          type="button"
          onClick={() => setDone(false)}
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
                    text-rose-400"
      >
        <Megaphone size={13} aria-hidden="true" />
        Aviso para todo el equipo
      </p>

      <p className="mt-1.5 text-[11px] leading-relaxed text-zinc-500">
        Se publica en el muro del Workplace marcado como importante. Lo verán todos
        tus asesores aprobados.
      </p>

      <label
        className="mb-1.5 mt-4 block text-[11px] font-medium uppercase tracking-wide text-zinc-400"
        htmlFor="alert-title"
      >
        Título
      </label>
      <input
        id="alert-title"
        value={title}
        onChange={(e) => { setTitle(e.target.value); setError(''); }}
        placeholder="Junta extraordinaria el viernes"
        maxLength={120}
        className="w-full rounded-xl border border-zinc-800 bg-zinc-950/60 px-3 py-2.5 text-sm
                   text-zinc-100 placeholder:text-zinc-600 focus:border-indigo-500
                   focus:outline-none focus:ring-2 focus:ring-indigo-500"
      />

      <label
        className="mb-1.5 mt-3 block text-[11px] font-medium uppercase tracking-wide text-zinc-400"
        htmlFor="alert-content"
      >
        Detalle
        <span className="ml-1 normal-case text-zinc-600">(opcional)</span>
      </label>
      <textarea
        id="alert-content"
        value={content}
        onChange={(e) => setContent(e.target.value)}
        rows={4}
        placeholder="A las 9:00 en la sala. Traigan sus números de la semana."
        className="w-full resize-none rounded-xl border border-zinc-800 bg-zinc-950/60 px-3 py-2.5
                   text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-indigo-500
                   focus:outline-none focus:ring-2 focus:ring-indigo-500"
      />

      {error && (
        <p
          role="alert"
          className="mt-2.5 flex items-start gap-2 rounded-xl border border-rose-500/30
                     bg-rose-500/10 p-3 text-[11px] leading-relaxed text-rose-300"
        >
          <AlertTriangle size={13} className="mt-0.5 shrink-0" aria-hidden="true" />
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={isBusy}
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-rose-600
                   px-4 py-3 text-sm font-bold text-white shadow-lg shadow-rose-600/25
                   transition-colors hover:bg-rose-500 active:scale-[0.98]
                   disabled:cursor-wait disabled:opacity-60 focus-visible:outline-none
                   focus-visible:ring-2 focus-visible:ring-rose-400"
      >
        {isBusy
          ? <Loader2 size={14} className="animate-spin" aria-hidden="true" />
          : <Megaphone size={14} aria-hidden="true" />}
        {isBusy ? 'Publicando…' : 'Publicar alerta'}
      </button>
    </form>
  );
}
