import { useState, useEffect } from 'react';
import { Flame } from 'lucide-react';

/**
 * Cifras del tablero.
 *
 * Hoy son valores de ejemplo, concentrados aquí a propósito: cuando se
 * conecten al motor real (eventos cerrados, citas ANF del mes, rachas), sólo
 * cambia este objeto y el resto del componente queda igual.
 */
const STATS = {
  moneyOnTable: '$45,000 MXN',
  moneyCaption: 'En comisiones pausadas. 5 prospectos en etapa de cierre.',
  goals: [
    { key: 'anf', label: 'Citas ANF', current: 8, target: 10, fill: 'bg-indigo-500' },
    { key: 'bono', label: 'Bono Promotoría', percent: 65, fill: 'bg-amber-500' },
  ],
  streakDays: 4,
};

/** Barra de progreso gruesa, estilo anillo de actividad de Apple Fitness. */
function ProgressBar({ label, value, percent, fill, animated }) {
  return (
    <div className="mb-4 last:mb-0">
      <div className="mb-2 flex items-baseline justify-between">
        <span className="text-sm font-medium text-zinc-700 dark:text-zinc-200">{label}</span>
        <span className="text-sm font-bold tabular-nums text-zinc-900 dark:text-white">
          {value}
        </span>
      </div>

      <div
        className="h-4 w-full overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800"
        role="progressbar"
        aria-label={label}
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className={`h-full rounded-full transition-all duration-1000 ease-out ${fill}`}
          // Arranca en 0 y crece al montar: el progreso se siente ganado.
          style={{ width: animated ? `${percent}%` : '0%' }}
        />
      </div>
    </div>
  );
}

/** Pantalla de rendimiento del asesor, con tres bloques de gamificación. */
export default function ProductivityDashboard() {
  const [animated, setAnimated] = useState(false);

  useEffect(() => {
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduce) {
      setAnimated(true);
      return undefined;
    }
    // Un frame de margen para que la transición parta de 0%.
    const raf = requestAnimationFrame(() => setAnimated(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div className="mx-auto max-w-2xl px-4 pt-8">
      <h1 className="mb-6 text-2xl font-bold tracking-tight text-zinc-900 md:text-3xl dark:text-white">
        Tu Rendimiento
      </h1>

      {/* Bloque 1 — Dinero en la Mesa */}
      <section
        className="mb-6 rounded-2xl border border-emerald-500/30 bg-white p-5
                   shadow-[0_0_15px_rgba(16,185,129,0.15)] dark:bg-zinc-900"
      >
        <h2 className="text-sm font-semibold text-zinc-600 dark:text-zinc-300">
          Dinero en la Mesa
        </h2>
        <p className="mt-1 text-3xl font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
          {STATS.moneyOnTable}
        </p>
        <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
          {STATS.moneyCaption}
        </p>
      </section>

      {/* Bloque 2 — Metas del Mes */}
      <section>
        <h2 className="mb-3 text-lg font-semibold text-zinc-900 dark:text-white">
          Metas del Mes
        </h2>

        <div className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
          {STATS.goals.map((goal) => {
            const percent = goal.target
              ? Math.round((goal.current / goal.target) * 100)
              : goal.percent;
            const value = goal.target ? `${goal.current}/${goal.target}` : `${goal.percent}%`;
            return (
              <ProgressBar
                key={goal.key}
                label={goal.label}
                value={value}
                percent={percent}
                fill={goal.fill}
                animated={animated}
              />
            );
          })}
        </div>
      </section>

      {/* Bloque 3 — Racha */}
      <section
        className="mt-6 flex items-center gap-4 rounded-xl border border-zinc-200 bg-zinc-50 p-4
                   dark:border-zinc-700 dark:bg-zinc-800/50"
      >
        <span
          className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-orange-500/10
                     text-orange-500 dark:text-orange-400"
          aria-hidden="true"
        >
          <Flame size={24} />
        </span>

        <div className="min-w-0">
          <p className="text-sm font-medium text-zinc-600 dark:text-zinc-300">
            Racha de Prospección
          </p>
          <p className="text-2xl font-bold tabular-nums text-zinc-900 dark:text-white">
            {STATS.streakDays} Días
          </p>
          <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">
            ¡No rompas la cadena hoy!
          </p>
        </div>
      </section>
    </div>
  );
}
