import { Flame, Clock } from 'lucide-react';
import { formatDuration } from '../../data/timeBlocks';

/** Objetivo de referencia del día, para que la barra tenga contra qué llenarse. */
const DAILY_TARGET_MINUTES = 120;

/**
 * Historial del día: bloques cerrados y minutos enfocados.
 *
 * Es el cierre de jornada. A las seis de la tarde, ver "4 bloques · 2 h 30 min
 * enfocado" es la prueba de que el día valió, y eso pesa más que cualquier
 * animación. Por eso los números van grandes y la barra apenas acompaña.
 *
 * En cero no se oculta: se invita a empezar. Un espacio vacío no explica nada.
 */
export default function TodayFocus({ blocks, minutes }) {
  const percent = Math.min(100, (minutes / DAILY_TARGET_MINUTES) * 100);
  const hasWork = blocks > 0;

  return (
    <div
      className={`mt-3 rounded-2xl border p-3.5 transition-colors ${hasWork
        ? 'border-orange-500/30 bg-orange-500/5'
        : 'border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950/40'}`}
    >
      <div className="flex items-center gap-2.5">
        {/*
          El fuego pasa de gris a naranja al cerrar el primer bloque: el color
          marca el logro sin necesidad de leer el número.
        */}
        <Flame
          size={20}
          className={`shrink-0 transition-colors duration-500 ${hasWork
            ? 'text-orange-500'
            : 'text-zinc-300 dark:text-zinc-600'}`}
          aria-hidden="true"
        />

        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">
            Historial de hoy
          </p>
          <p className="text-base font-bold leading-tight text-zinc-900 dark:text-white">
            {hasWork
              ? `${blocks} ${blocks === 1 ? 'bloque' : 'bloques'}`
              : 'Sin bloques todavía'}
            {hasWork && (
              <span className="font-semibold text-zinc-500">
                {' · '}{formatDuration(minutes)} enfocados
              </span>
            )}
          </p>
        </div>

        {hasWork && (
          <span
            className="flex shrink-0 items-center gap-1 rounded-full bg-orange-500/15 px-2.5
                       py-1 text-sm font-bold text-orange-600 dark:text-orange-300"
          >
            <Clock size={12} aria-hidden="true" />
            {blocks}
          </span>
        )}
      </div>

      <div
        className="mt-2.5 h-2 w-full overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800"
        role="progressbar"
        aria-valuenow={Math.round(percent)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`Enfoque del día: ${minutes} de ${DAILY_TARGET_MINUTES} minutos`}
      >
        <div
          className="h-full rounded-full bg-gradient-to-r from-orange-500 to-amber-400
                     transition-[width] duration-700 ease-out"
          style={{ width: `${percent}%` }}
        />
      </div>

      <p className="mt-1.5 text-[10px] text-zinc-500">
        {hasWork
          ? `Meta del día: ${formatDuration(DAILY_TARGET_MINUTES)} de enfoque`
          : `Cierra tu primer bloque y empieza a sumar. Meta del día: ${formatDuration(DAILY_TARGET_MINUTES)}.`}
      </p>
    </div>
  );
}
