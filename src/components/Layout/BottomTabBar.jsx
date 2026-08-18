import { CalendarDays, TrendingUp, Plus, Menu } from 'lucide-react';
import { priorityByKey } from '../Activities/priorities';
import { tapFeedback } from '../../lib/haptics';

/** Meta del Tracker de 25 Puntos. Mismo umbral que usaba PointsPill.jsx. */
const POINTS_GOAL = 25;

/** Clases compartidas por cada destino de la barra. */
const TAB =
  'flex-1 flex flex-col items-center justify-center gap-0.5 rounded-2xl px-1 py-1.5 text-zinc-600 transition-all will-change-transform '
  + 'dark:text-zinc-300 hover:text-indigo-600 dark:hover:text-indigo-400 '
  + 'hover:bg-white/50 dark:hover:bg-white/10 '
  + 'focus-visible:text-indigo-600 focus-visible:outline-none focus-visible:bg-white/50 '
  + 'dark:focus-visible:bg-white/10 active:scale-95';

const LABEL = 'text-[10px] font-medium leading-none';

/**
 * Botón "Productividad": ancla del Tracker de 25 Puntos, con un efecto de luz
 * LED recorriendo el borde (estilo circuito). Reemplaza el ícono simple que
 * tenía antes — la píldora "N/25" que vivía junto a la fecha en `TodayView`
 * se aloja aquí, en el único destino de la barra donde de verdad se mide la
 * productividad del día.
 *
 * Estructura de tres capas, todas dentro de un `relative overflow-hidden`:
 *   1. La luz giratoria — un `div` más grande que el botón, con degradado
 *      cónico y `animate-spin`, apenas visible en el arco iluminado.
 *   2. La máscara — un `div` interior con `inset-[2px]` y el fondo oscuro
 *      normal del menú, que tapa el centro del degradado y sólo deja ver el
 *      borde. Sin esta capa, el botón entero se vería del color del LED.
 *   3. El contenido — ícono, número y etiqueta, en `relative z-10` para
 *      quedar por encima de la máscara.
 *
 * El degradado cónico no puede animarse con una transición CSS (no hay un
 * valor intermedio razonable entre dos gradientes con ángulos de corte
 * distintos), así que el giro es responsabilidad de `animate-spin` sobre el
 * elemento completo — es el propio contenedor el que gira, no el gradiente
 * dentro de un contenedor fijo.
 */
function ProductivityButton({ onClick, puntosActuales = 0 }) {
  const points = Math.max(0, Math.min(puntosActuales, POINTS_GOAL));
  const metaCumplida = points >= POINTS_GOAL;

  /*
    Naranja mientras no se cumple la meta, verde al llegar a 25 — el mismo
    criterio binario que ya usaba `PointsPill.jsx`: la meta es un umbral, no
    una escala, y un tercer color intermedio diluiría el momento exacto en
    que se cumple.
  */
  const ledGradient = metaCumplida
    ? 'bg-[conic-gradient(from_0deg,transparent_0_340deg,rgba(34,197,94,1)_360deg)]'
    : 'bg-[conic-gradient(from_0deg,transparent_0_340deg,rgba(249,115,22,1)_360deg)]';

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`Productividad, ${points} de ${POINTS_GOAL} puntos del día${metaCumplida ? ', meta cumplida' : ''}`}
      className="relative flex-1 overflow-hidden rounded-2xl active:scale-95 transition-transform
                 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
    >
      {/*
        La luz giratoria. `inset-[-50%]` la hace más grande que el botón a
        propósito: un degradado cónico gira sobre su propio centro, y si el
        elemento midiera lo mismo que el botón, las esquinas —más lejos del
        centro que los bordes— quedarían fuera del arco iluminado en ciertos
        ángulos de giro. Sobredimensionado, el arco cubre el borde completo
        en cualquier posición del giro.
      */}
      <span
        aria-hidden="true"
        className={`absolute inset-[-50%] animate-spin ${ledGradient}`}
        style={{ animationDuration: '3s' }}
      />

      {/* La máscara: tapa el centro del degradado y deja sólo el borde iluminado. */}
      <span
        aria-hidden="true"
        className="absolute inset-[2px] rounded-2xl bg-white dark:bg-zinc-950"
      />

      {/* Contenido, por encima de la máscara. */}
      <span className="relative z-10 flex flex-col items-center justify-center gap-0.5 px-1 py-1.5">
        <TrendingUp size={22} strokeWidth={1.8} className="text-zinc-600 dark:text-zinc-300" aria-hidden="true" />
        <span className={`${LABEL} text-zinc-600 dark:text-zinc-300`}>Productividad</span>
        {/*
          El número de puntos, discreto, junto al ícono. `tabular-nums` evita
          que la anchura del botón respire cada vez que el número cambia de
          dígitos.
        */}
        <span
          className={`text-[9px] font-bold leading-none tabular-nums ${
            metaCumplida ? 'text-emerald-500 dark:text-emerald-400' : 'text-orange-500 dark:text-orange-400'
          }`}
        >
          {points}/{POINTS_GOAL}
        </span>
      </span>
    </button>
  );
}

/**
 * Barra de navegación inferior optimizada para iOS.
 * - Usa backdrop-blur-md (no xl/2xl) para evitar saturar la GPU.
 * - pb-6 respeta el Safe Area del iPhone (home indicator).
 * - Cada botón usa flex-1 para distribuirse uniformemente.
 */
export default function BottomTabBar({
  onToday, onProductivity, onAgenda, onAdd, onMore,
  agendaCount = 0, agendaPriority = null, puntosActuales = 0,
}) {
  const today = new Date().getDate();

  // Más de nueve pendientes en un día ya no se leen como una cuenta, sino como
  // "muchos": el número exacto deja de aportar y ensancharía la pastilla.
  const hasAgendaAlert = agendaCount > 0;
  const agendaBadge = agendaCount > 9 ? '9+' : String(agendaCount);

  /*
    El color lo pone la prioridad más alta del día, con el mismo verde, ámbar y
    rojo que el resto de la app usa para esos niveles: el aviso y la actividad
    que lo provoca se reconocen como la misma cosa. Si la prioridad no llega o
    no se reconoce, se cae al índigo neutro de la interfaz antes que a un color
    de urgencia que no corresponda.
  */
  const agendaLevel = priorityByKey(agendaPriority);
  const agendaTone = agendaLevel?.badge
    ?? 'bg-indigo-500 text-white shadow-indigo-500/40 dark:bg-indigo-400 dark:text-zinc-950';

  /**
   * Envuelve el manejador de un destino con el golpe al tacto.
   *
   * Va aquí, en la barra, y no dentro de cada `onNavigate` de la app: cambiar
   * de sección es lo mismo si se llega por la barra o por otro camino, pero la
   * respuesta física pertenece al botón que se tocó. Además, el golpe se
   * dispara antes de navegar, porque la sección destino puede desmontar esta
   * barra y el evento se perdería.
   */
  const withTap = (handler) => () => {
    tapFeedback();
    handler();
  };

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
          <button type="button" onClick={withTap(onToday)} className={TAB}>
            <span
              className="grid h-6 w-6 place-items-center rounded-md border border-current
                         text-[11px] font-bold leading-none"
              aria-hidden="true"
            >
              {today}
            </span>
            <span className={LABEL}>Hoy</span>
          </button>

          {/* Productividad — ancla del Tracker de 25 Puntos, con LED giratorio */}
          <ProductivityButton onClick={withTap(onProductivity)} puntosActuales={puntosActuales} />

          {/* Agregar — botón central destacado */}
          <div className="flex-1 flex justify-center">
            <button
              type="button"
              onClick={withTap(onAdd)}
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

          {/* Agenda — con el aviso de lo que queda pendiente hoy */}
          <button
            type="button"
            onClick={withTap(onAgenda)}
            className={TAB}
            /*
              La prioridad se nombra además de pintarse: quien no distingue el
              verde del rojo, o usa un lector de pantalla, recibe lo mismo que
              comunica el color.
            */
            aria-label={hasAgendaAlert
              ? `Agenda, ${agendaCount} ${agendaCount === 1 ? 'actividad pendiente' : 'actividades pendientes'} hoy`
                + `${agendaLevel ? `, prioridad ${agendaLevel.label.toLowerCase()}` : ''}`
              : 'Agenda'}
          >
            {/*
              El aviso se ancla al icono, no al botón: el botón ocupa todo el
              alto de la barra y la pastilla acabaría flotando lejos del
              calendario, sin quedar claro a qué se refiere.
            */}
            <span className="relative" aria-hidden="true">
              <CalendarDays size={22} strokeWidth={1.8} />

              {hasAgendaAlert && (
                /*
                  El `ring` toma el color de fondo de la barra para que la
                  pastilla se lea recortada sobre ella y no pegada encima del
                  icono. El relleno lo trae `agendaTone`, según la prioridad
                  más alta que haya hoy.
                */
                <span
                  className={`absolute -right-2 -top-1.5 grid h-[17px] min-w-[17px]
                              place-items-center rounded-full px-1 text-[9px] font-bold
                              leading-none shadow-sm ring-2 ring-white
                              dark:ring-zinc-950 ${agendaTone}`}
                >
                  {agendaBadge}
                </span>
              )}
            </span>

            <span className={LABEL}>Agenda</span>
          </button>

          {/* Ver más */}
          <button type="button" onClick={withTap(onMore)} className={TAB}>
            <Menu size={22} strokeWidth={1.8} aria-hidden="true" />
            <span className={LABEL}>Ver más</span>
          </button>
        </div>
      </div>
    </nav>
  );
}
