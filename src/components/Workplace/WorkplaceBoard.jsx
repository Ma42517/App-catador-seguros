import { Download, FileText, Link2 } from 'lucide-react';
import FullScreenView from '../Layout/FullScreenView';

/**
 * Comunicados de la promotoría. El tablero es unidireccional —el asesor lee,
 * no responde—, así que cada entrada es un anuncio con su etiqueta, su fecha y
 * a lo sumo un archivo adjunto.
 */
const ANNOUNCEMENTS = [
  {
    id: 'campana-vida-gmm',
    tag: '📌 IMPORTANTE',
    tagTone: 'text-rose-500 dark:text-rose-400',
    title: 'Nueva Campaña de Vida y Gastos Médicos',
    time: 'Hace 2 horas',
    flyer: '[Flyer de la Campaña]',
    action: { label: 'Descargar Flyer', icon: Download },
  },
  {
    id: 'bases-convencion-2026',
    tag: '📄 BASES',
    tagTone: 'text-blue-600 dark:text-blue-400',
    title: 'Actualización: Bases Convención 2026',
    time: 'Ayer',
    description:
      'Revisa los nuevos lineamientos de primas pagadas para calificar al viaje.',
    action: { label: 'Leer Documento', icon: FileText },
  },
];

/** Campo de vinculación: aún no operativo, se muestra como adelanto. */
function LinkPromoteria() {
  return (
    <div className="mb-6">
      <div
        className="flex items-center gap-3 rounded-xl border border-dashed border-zinc-300
                   bg-zinc-50 px-3 py-2.5 dark:border-zinc-700 dark:bg-zinc-900/60"
      >
        <Link2 size={16} className="shrink-0 text-zinc-400" aria-hidden="true" />
        <input
          type="text"
          disabled
          readOnly
          aria-label="Vincular promotoría con código de invitación"
          placeholder="¿Tienes un código de invitación?"
          className="min-w-0 flex-1 cursor-not-allowed bg-transparent text-sm text-zinc-500
                     placeholder:text-zinc-400 focus:outline-none dark:placeholder:text-zinc-500"
        />
        <span
          className="shrink-0 rounded-full border border-zinc-300 px-2 py-0.5 text-[10px]
                     font-semibold uppercase tracking-wide text-zinc-400
                     dark:border-zinc-700 dark:text-zinc-500"
        >
          Pronto
        </span>
      </div>
      <p className="mt-1.5 px-1 text-[11px] text-zinc-500">
        Vincular Promotoría para recibir sus comunicados.
      </p>
    </div>
  );
}

/** Tarjeta de anuncio. */
function AnnouncementCard({ announcement }) {
  const { tag, tagTone, title, time, flyer, description, action } = announcement;
  const ActionIcon = action?.icon;

  return (
    <article
      className="mb-5 overflow-hidden rounded-2xl border border-zinc-200 bg-white p-5
                 dark:border-zinc-800 dark:bg-zinc-900"
    >
      <p className={`mb-1 text-xs font-bold ${tagTone}`}>{tag}</p>

      <h2 className="text-lg font-semibold leading-snug text-zinc-900 dark:text-white">
        {title}
      </h2>

      <p className="mt-0.5 text-xs text-zinc-500">{time}</p>

      {description && (
        <p className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
          {description}
        </p>
      )}

      {flyer && (
        <div
          className="mt-3 flex h-40 w-full items-center justify-center rounded-lg bg-zinc-100
                     text-sm text-zinc-500 dark:bg-zinc-800"
        >
          {flyer}
        </div>
      )}

      {action && (
        <button
          type="button"
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border
                     border-zinc-200 bg-zinc-50 px-4 py-2.5 text-sm font-semibold text-zinc-700
                     transition-colors hover:bg-zinc-100 active:scale-[0.98]
                     dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200
                     dark:hover:bg-zinc-700/70"
        >
          {ActionIcon && <ActionIcon size={16} />}
          {action.label}
        </button>
      )}
    </article>
  );
}

/** Tablero de anuncios de la promotoría. */
export default function WorkplaceBoard({ isOpen, onClose }) {
  return (
    <FullScreenView isOpen={isOpen} onClose={onClose} title="Workplace">
      <LinkPromoteria />

      {ANNOUNCEMENTS.map((announcement) => (
        <AnnouncementCard key={announcement.id} announcement={announcement} />
      ))}
    </FullScreenView>
  );
}
