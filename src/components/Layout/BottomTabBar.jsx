import { CalendarDays, TrendingUp, Plus, Menu } from 'lucide-react';

/** Clases compartidas por cada destino de la barra. */
const TAB =
  'flex-1 flex flex-col items-center justify-center gap-0.5 rounded-2xl px-1 py-1.5 text-zinc-600 transition-all will-change-transform '
  + 'dark:text-zinc-300 hover:text-indigo-600 dark:hover:text-indigo-400 '
  + 'hover:bg-white/50 dark:hover:bg-white/10 '
  + 'focus-visible:text-indigo-600 focus-visible:outline-none focus-visible:bg-white/50 '
  + 'dark:focus-visible:bg-white/10 active:scale-95';

const LABEL = 'text-[10px] font-medium leading-none';

/**
 * Barra de navegación inferior optimizada para iOS.
 * - Usa backdrop-blur-md (no xl/2xl) para evitar saturar la GPU.
 * - pb-6 respeta el Safe Area del iPhone (home indicator).
 * - Cada botón usa flex-1 para distribuirse uniformemente.
 */
export default function BottomTabBar({ onToday, onProductivity, onAgenda, onAdd, onMore }) {
  const today = new Date().getDate();

  return (
    <nav
      aria-label="Navegación inferior"
      className="fixed bottom-0 left-0 right-0 z-50 w-full max-w-md mx-auto px-2 pt-2 pb-6 md:pb-4"
    >
      <div
        className="w-full rounded-[1.75rem] border border-zinc-200/70
                   bg-white/80 px-2 py-2 shadow-lg
                   backdrop-blur-md backdrop-saturate-150
                   dark:border-white/10 dark:bg-zinc-950/90 dark:shadow-black/40"
      >
        <div className="flex w-full items-center justify-between">
          {/* Hoy */}
          <button type="button" onClick={onToday} className={TAB}>
            <span
              className="grid h-6 w-6 place-items-center rounded-md border border-current
                         text-[11px] font-bold leading-none"
              aria-hidden="true"
            >
              {today}
            </span>
            <span className={LABEL}>Hoy</span>
          </button>

          {/* Productividad */}
          <button type="button" onClick={onProductivity} className={TAB}>
            <TrendingUp size={22} strokeWidth={1.8} aria-hidden="true" />
            <span className={LABEL}>Productividad</span>
          </button>

          {/* Agregar — botón central destacado */}
          <div className="flex-1 flex justify-center">
            <button
              type="button"
              onClick={onAdd}
              className="group flex flex-col items-center transition-transform will-change-transform hover:scale-105
                         focus-visible:outline-none"
            >
              <span
                className="-mt-5 rounded-full bg-gradient-to-br from-blue-500 via-indigo-500
                           to-violet-600 p-3 text-white shadow-lg shadow-violet-600/40
                           ring-1 ring-white/20 transition-shadow
                           group-hover:shadow-xl group-hover:shadow-violet-500/50"
                aria-hidden="true"
              >
                <Plus size={22} strokeWidth={2.3} />
              </span>
              <span className={`${LABEL} mt-1 text-zinc-600 dark:text-zinc-300`}>Agregar</span>
            </button>
          </div>

          {/* Agenda */}
          <button type="button" onClick={onAgenda} className={TAB}>
            <CalendarDays size={22} strokeWidth={1.8} aria-hidden="true" />
            <span className={LABEL}>Agenda</span>
          </button>

          {/* Ver más */}
          <button type="button" onClick={onMore} className={TAB}>
            <Menu size={22} strokeWidth={1.8} aria-hidden="true" />
            <span className={LABEL}>Ver más</span>
          </button>
        </div>
      </div>
    </nav>
  );
}
