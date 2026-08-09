import { CalendarDays, TrendingUp, Plus, Menu } from 'lucide-react';

/** Clases compartidas por cada destino de la barra. */
const TAB =
  'flex flex-col items-center gap-1 rounded-2xl px-3 py-1.5 text-zinc-500 transition-all '
  + 'dark:text-zinc-400 hover:text-indigo-600 dark:hover:text-indigo-400 '
  // Pastilla de cristal al pasar el cursor / enfocar, como en iOS.
  + 'hover:bg-white/50 hover:backdrop-blur-xl dark:hover:bg-white/10 '
  + 'focus-visible:text-indigo-600 focus-visible:outline-none focus-visible:bg-white/50 '
  + 'dark:focus-visible:bg-white/10 active:scale-95';

const LABEL = 'text-[10px] font-medium leading-none';

/**
 * Barra de navegación inferior con estética iOS glassmorphism.
 *
 * Es la única navegación de la app y se muestra igual en celular, tableta y
 * escritorio, para que la experiencia sea idéntica en todos los dispositivos.
 * Los destinos se centran con un ancho máximo para que no queden separados en
 * pantallas anchas.
 */
export default function BottomTabBar({ onToday, onProductivity, onAgenda, onAdd, onMore }) {
  // Se calcula en cada render para que el número no se quede congelado si la
  // sesión cruza la medianoche.
  const today = new Date().getDate();

  return (
    <nav
      aria-label="Navegación inferior"
      className="fixed bottom-0 left-0 z-50 w-full border-t
                 border-zinc-200/60 bg-white/60 px-2 pt-3 backdrop-blur-2xl backdrop-saturate-150
                 pb-safe
                 dark:border-white/10 dark:bg-black/50
                 [box-shadow:inset_0_1px_0_0_rgb(255_255_255/0.35)]
                 dark:[box-shadow:inset_0_1px_0_0_rgb(255_255_255/0.08)]"
    >
      {/*
        Los grupos laterales usan flex-1 y el centro un ancho fijo, de modo que
        el botón "+" queda exactamente en el eje central del viewport (el
        contenedor va centrado con mx-auto). Con los cuatro destinos en una
        sola fila, el "+" caería al 62.5% del ancho y dejaría de ser el ancla
        visual de la barra.
      */}
      <div className="mx-auto flex w-full max-w-lg items-center">
        <div className="flex flex-1 items-center justify-around">
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

      {/* Productividad — rendimiento, metas y rachas */}
      <button type="button" onClick={onProductivity} className={TAB}>
        <TrendingUp size={22} strokeWidth={1.8} aria-hidden="true" />
        <span className={LABEL}>Productividad</span>
      </button>
        </div>

      {/* Agregar — ancla central de la barra */}
      <div className="flex w-20 shrink-0 justify-center">
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
        <span className={`${LABEL} mt-1 text-zinc-500 dark:text-zinc-400`}>Agregar</span>
      </button>
      </div>

        <div className="flex flex-1 items-center justify-around">
      {/* Agenda — todo lo agendado, agrupado por fecha */}
      <button type="button" onClick={onAgenda} className={TAB}>
        <CalendarDays size={22} strokeWidth={1.8} aria-hidden="true" />
        <span className={LABEL}>Agenda</span>
      </button>

      {/* Ver más — abre el panel secundario */}
      <button type="button" onClick={onMore} className={TAB}>
        <Menu size={22} strokeWidth={1.8} aria-hidden="true" />
        <span className={LABEL}>Ver más</span>
      </button>
        </div>
      </div>
    </nav>
  );
}
