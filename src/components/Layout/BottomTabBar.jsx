import { useState, useEffect } from 'react';
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

/*
  Cuánto tarda el botón en mutar, contado desde que la barra se monta. El
  fundido de cruce en sí (`duration-300` en las clases de abajo) es fijo y
  corto a propósito: no necesita su propia constante porque Tailwind no
  interpola una duración arbitraria en tiempo de ejecución sin un valor
  inline, y 300ms es un fundido de UI estándar que no hace falta parametrizar.
*/
const MUTATION_DELAY_MS = 4000;

/**
 * Botón "Productividad": ancla del Tracker de 25 Puntos. Muta a los 4
 * segundos de que la barra aparece — el ícono de gráfica y la palabra
 * "Productividad" se desvanecen y en su lugar aparece "N/25", con un haz de
 * luz recorriéndolo por dentro (texto transparente sobre un degradado
 * animado, no un borde ni un anillo).
 *
 * Sin bordes circulares, anillos exteriores ni `border-radius` en el efecto:
 * a diferencia del diseño anterior de este botón (LED girando por el borde),
 * aquí el brillo vive *dentro* de los caracteres del número, recortado por
 * `bg-clip-text` — es la misma técnica de `animate-shimmer` que ya usa el
 * cristal de "About Me" en otra parte de la app, reutilizada tal cual.
 */
function ProductivityButton({ onClick, puntosActuales = 0 }) {
  const points = Math.max(0, Math.min(puntosActuales, POINTS_GOAL));
  const metaCumplida = points >= POINTS_GOAL;

  /*
    Arranca mostrando el ícono normal. `mutated` en `false` durante los
    primeros `MUTATION_DELAY_MS`, y sólo entonces empieza la propia
    transición de fundido — dos estados y no uno, porque el pedido distingue
    "cuándo empieza a mutar" (el temporizador) de "qué tan visible está cada
    cara en este instante" (la opacidad), y colapsarlos en un solo booleano
    no deja sitio para el cruce de un fade-out con un fade-in.
  */
  const [mutated, setMutated] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setMutated(true), MUTATION_DELAY_MS);
    return () => clearTimeout(timer);
  }, []);

  /*
    El degradado del shimmer recorre tres paradas: el color base, un tono
    claro en medio y de vuelta al color base. Es lo que hace que el barrido
    se lea como una luz que cruza y no como un color que simplemente cambia
    de tono — con sólo dos paradas, el "haz" nunca se distinguiría del resto
    del número. Naranja mientras no se cumple la meta; verde al llegar a 25,
    mismo criterio binario que ya usaba el diseño anterior de este botón: la
    meta es un umbral, no una escala.
  */
  const shimmerGradient = metaCumplida
    ? 'from-emerald-600 via-lime-300 to-emerald-600'
    : 'from-orange-600 via-yellow-300 to-orange-600';

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`Productividad, ${points} de ${POINTS_GOAL} puntos del día${metaCumplida ? ', meta cumplida' : ''}`}
      className="relative flex-1 rounded-2xl active:scale-95 transition-transform
                 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
    >
      {/*
        Las dos caras ocupan el mismo lugar (`absolute inset-0`, apiladas) en
        vez de una detrás de otra en el flujo normal: así el fundido de una
        no empuja a la otra durante la transición, y el botón no cambia de
        alto ni de ancho al mutar.
      */}
      <span
        aria-hidden={mutated}
        className={`absolute inset-0 flex flex-col items-center justify-center gap-0.5
                    px-1 py-1.5 transition-opacity duration-300
                    ${mutated ? 'pointer-events-none opacity-0' : 'opacity-100'}`}
      >
        <TrendingUp size={22} strokeWidth={1.8} className="text-zinc-600 dark:text-zinc-300" aria-hidden="true" />
        <span className={`${LABEL} text-zinc-600 dark:text-zinc-300`}>Productividad</span>
      </span>

      <span
        aria-hidden={!mutated}
        className={`absolute inset-0 flex flex-col items-center justify-center gap-0.5
                    px-1 py-1.5 transition-opacity duration-300
                    ${mutated ? 'opacity-100' : 'pointer-events-none opacity-0'}`}
      >
        {/*
          El haz de luz: texto transparente sobre un degradado animado de
          fondo, recortado a la forma de los caracteres con `bg-clip-text`.
          `bg-[length:200%_auto]` es lo que le da al degradado más ancho que
          recorrer del que ocupa el texto — sin eso, `animate-shimmer` movería
          un degradado que ya cubre las cuatro cifras enteras y el barrido no
          se vería, porque no habría "sobrante" de color por donde desplazarse.
        */}
        <span
          className={`bg-gradient-to-r ${shimmerGradient} bg-[length:200%_auto]
                      bg-clip-text text-lg font-black leading-none tabular-nums
                      text-transparent animate-shimmer`}
        >
          {points}/{POINTS_GOAL}
        </span>
        <span className={`${LABEL} text-zinc-600 dark:text-zinc-300`}>Productividad</span>
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

          {/* Productividad — ancla del Tracker de 25 Puntos, muta a "N/25" con shimmer */}
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
