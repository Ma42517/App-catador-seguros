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
    /*
      La barra flota en lugar de pegarse al borde: separada del fondo, el
      desenfoque tiene contenido a ambos lados y el cristal se lee como cristal.
      El contenedor exterior no intercepta toques para no robar el área que
      queda a los lados de la pastilla.
    */
    <nav
      aria-label="Navegación inferior"
      className="pointer-events-none fixed inset-x-0 bottom-0 z-50 px-3 pb-safe"
    >
      <div
        className="pointer-events-auto mx-auto mb-2 w-full max-w-lg rounded-[1.75rem] border
                   border-zinc-200/70 bg-white/70 px-2 pt-3 pb-2 shadow-2xl shadow-zinc-950/10
                   backdrop-blur-2xl backdrop-saturate-150
                   dark:border-white/10 dark:bg-zinc-950/60 dark:shadow-black/40
                   [box-shadow:inset_0_1px_0_0_rgb(255_255_255/0.4)]
                   dark:[box-shadow:inset_0_1px_0_0_rgb(255_255_255/0.09)]"
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
        className="group flex flex-col items-center transition-transform hover:scale-105
                   focus-visible:outline-none"
      >
        {/*
          Ancla de acción: es el único elemento con color saturado de toda la
          barra, y por eso destaca sin necesitar tamaño extra.
        */}
        <span
          className="-mt-7 rounded-full bg-gradient-to-br from-blue-500 via-indigo-500
                     to-violet-600 p-3.5 text-white shadow-lg shadow-violet-600/45
                     ring-1 ring-white/20 transition-shadow
                     group-hover:shadow-xl group-hover:shadow-violet-500/60"
          aria-hidden="true"
        >
          <Plus size={23} strokeWidth={2.3} />
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
      </div>
    </nav>
  );
}
