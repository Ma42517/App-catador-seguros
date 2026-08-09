import { Plus, Target, CalendarClock, Pencil, Trash2, Check } from 'lucide-react';
import {
  percentOf, progressOf, formatAmount, deadlineLabel, daysLeft, isComplete,
} from '../../data/goals';

/**
 * Tarjeta de meta a ancho completo, con la imagen del usuario de fondo.
 *
 * La imagen es decorativa y el texto va encima, así que el velo oscuro no es
 * estética: sin él, una foto clara (una playa, un cielo) deja el título
 * ilegible. Se usa un degradado en vez de una opacidad plana para que la parte
 * de arriba respire y la de abajo, donde vive el texto, quede bien cubierta.
 */
export default function GoalCard({ goal, onRegister, onEdit, onDelete }) {
  const percent = percentOf(goal);
  const current = progressOf(goal);
  const completed = isComplete(goal);
  const left = daysLeft(goal);

  // Sólo urge lo que está por vencer y aún no se logró.
  const urgent = !completed && left !== null && left <= 7;

  return (
    <article
      className="relative w-full overflow-hidden rounded-3xl border border-white/10
                 bg-zinc-900 shadow-lg"
    >
      {/* Fondo */}
      {goal.imageUrl ? (
        <img
          src={goal.imageUrl}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : (
        <div
          className="absolute inset-0 bg-gradient-to-br from-zinc-800 via-amber-950 to-orange-900"
          aria-hidden="true"
        />
      )}

      <div
        className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/80 to-zinc-950/40"
        aria-hidden="true"
      />

      {/* Contenido */}
      <div className="relative p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              {completed && (
                <span
                  className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20
                             px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider
                             text-emerald-300 ring-1 ring-emerald-400/40"
                >
                  <Check size={10} />
                  Cumplida
                </span>
              )}

              <span
                className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5
                            text-[10px] font-bold uppercase tracking-wider ring-1 ${urgent
                  ? 'bg-rose-500/20 text-rose-300 ring-rose-400/40'
                  : 'bg-white/10 text-zinc-300 ring-white/15'}`}
              >
                <CalendarClock size={10} />
                {deadlineLabel(goal)}
              </span>
            </div>

            <h2 className="mt-2 text-xl font-bold leading-tight text-white">
              {goal.title}
            </h2>
          </div>

          {/* Acciones discretas: el protagonista es registrar avance */}
          <div className="flex shrink-0 gap-1">
            <button
              type="button"
              onClick={onEdit}
              aria-label={`Editar ${goal.title}`}
              className="grid h-8 w-8 place-items-center rounded-lg text-white/50
                         transition-colors hover:bg-white/10 hover:text-white"
            >
              <Pencil size={14} />
            </button>
            <button
              type="button"
              onClick={onDelete}
              aria-label={`Eliminar ${goal.title}`}
              className="grid h-8 w-8 place-items-center rounded-lg text-white/50
                         transition-colors hover:bg-rose-500/20 hover:text-rose-300"
            >
              <Trash2 size={14} />
            </button>
          </div>
        </div>

        {goal.strategy && (
          <div className="mt-3 rounded-xl border border-white/10 bg-white/5 p-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-amber-300/90">
              Cómo lo voy a lograr
            </p>
            <p className="mt-1 text-xs leading-relaxed text-zinc-200">{goal.strategy}</p>
          </div>
        )}

        {/* Progreso */}
        <div className="mt-4">
          <div className="mb-1.5 flex items-end justify-between gap-2">
            <p className="text-sm font-semibold text-white">
              {formatAmount(current, goal.metric)}
              <span className="text-zinc-400"> de {formatAmount(goal.target, goal.metric)}</span>
            </p>
            <p className={`text-lg font-bold leading-none ${completed
              ? 'text-emerald-400'
              : 'text-amber-400'}`}
            >
              {Math.round(percent)}%
            </p>
          </div>

          <div
            className="h-2.5 w-full overflow-hidden rounded-full bg-white/15"
            role="progressbar"
            aria-valuenow={Math.round(percent)}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`Avance de ${goal.title}`}
          >
            <div
              className={`h-full rounded-full transition-[width] duration-700 ease-out ${completed
                ? 'bg-gradient-to-r from-emerald-400 to-emerald-300'
                : 'bg-gradient-to-r from-amber-500 to-amber-300'}`}
              style={{ width: `${percent}%` }}
            />
          </div>
        </div>

        <button
          type="button"
          onClick={onRegister}
          className={`mt-4 flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3
                      text-sm font-bold transition-all active:scale-[0.98] ${completed
            ? 'border border-white/15 bg-white/10 text-white hover:bg-white/15'
            : 'bg-amber-500 text-zinc-950 shadow-lg shadow-amber-500/25 hover:bg-amber-400'}`}
        >
          {completed ? <Target size={16} /> : <Plus size={16} />}
          {completed ? 'Seguir sumando' : 'Registrar Avance'}
        </button>
      </div>
    </article>
  );
}
