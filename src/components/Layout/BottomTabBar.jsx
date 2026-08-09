import { CalendarDays, Plus, Menu } from 'lucide-react';

/** Clases compartidas por cada destino de la barra. */
const TAB =
  'flex flex-col items-center gap-1 text-slate-500 transition-colors dark:text-slate-400 '
  + 'hover:text-indigo-600 dark:hover:text-indigo-400 focus-visible:text-indigo-600 '
  + 'focus-visible:outline-none';

const LABEL = 'text-[10px] font-medium leading-none';

/**
 * Barra de navegación inferior con estética iOS glassmorphism.
 *
 * Sólo se muestra en móvil: en md+ la navegación vive en el sidebar, así que
 * dos barras a la vez serían redundantes.
 */
export default function BottomTabBar({ onToday, onCalendar, onAdd, onMore }) {
  // Se calcula en cada render para que el número no se quede congelado si la
  // sesión cruza la medianoche.
  const today = new Date().getDate();

  return (
    <nav
      aria-label="Navegación inferior"
      className="fixed bottom-0 left-0 z-50 flex w-full items-center justify-around border-t
                 border-slate-200/50 bg-white/70 px-2 pt-3 backdrop-blur-xl pb-safe
                 dark:border-white/10 dark:bg-black/70 md:hidden"
    >
      {/* A) Hoy — el día del mes dentro de un cuadro redondeado */}
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

      {/* B) Eventos */}
      <button type="button" onClick={onCalendar} className={TAB}>
        <CalendarDays size={22} strokeWidth={1.8} aria-hidden="true" />
        <span className={LABEL}>Eventos</span>
      </button>

      {/* C) Agregar — acción destacada, flotando sobre la barra */}
      <button
        type="button"
        onClick={onAdd}
        className="flex flex-col items-center transition-transform hover:scale-105
                   focus-visible:outline-none"
      >
        <span
          className="-mt-6 rounded-full bg-indigo-600 p-3 text-white shadow-lg shadow-indigo-500/30"
          aria-hidden="true"
        >
          <Plus size={22} strokeWidth={2.2} />
        </span>
        <span className={`${LABEL} mt-1 text-slate-500 dark:text-slate-400`}>Agregar</span>
      </button>

      {/* D) Ver más — abre el panel secundario */}
      <button type="button" onClick={onMore} className={TAB}>
        <Menu size={22} strokeWidth={1.8} aria-hidden="true" />
        <span className={LABEL}>Ver más</span>
      </button>
    </nav>
  );
}
