import { Target } from 'lucide-react';

/** Sección de metas y estadísticas del asesor. Aún por construir. */
export default function GoalsDashboard() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="text-2xl font-bold tracking-tight text-zinc-900 md:text-3xl dark:text-white">
        Metas
      </h1>

      <div className="mt-10 text-center">
        <span
          className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-xl border
                     border-zinc-200 bg-white text-zinc-400
                     dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-500"
          aria-hidden="true"
        >
          <Target size={22} />
        </span>
        <p className="text-sm text-zinc-500">
          Sección de Metas y Estadísticas en construcción.
        </p>
      </div>
    </div>
  );
}
