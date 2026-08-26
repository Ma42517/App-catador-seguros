import { CalendarDays, TrendingUp, Plus, Menu } from 'lucide-react';
import { priorityByKey } from '../Activities/priorities';
import { tapFeedback } from '../../lib/haptics';

/**
 * Destino de la barra: ícono arriba, rótulo debajo.
 *
 * Los cinco rótulos están siempre visibles. Se probó antes esconderlos y
 * mostrar sólo el del destino activo dentro de una píldora, y traía dos
 * problemas: la píldora abierta desbordaba la fila en los teléfonos angostos
 * (un rótulo largo como "Productividad" sumaba ~138px), y los cuatro destinos
 * restantes quedaban reducidos a íconos sin nombre. Apilados —ícono sobre
 * rótulo— los cinco caben cómodos y ninguno pierde su nombre.
 *
 * El estado activo se comunica sólo con color: el índigo de la app frente al
 * gris de los inactivos. Sin píldora ni fondo, porque en una fila de cinco
 * columnas iguales cualquier relleno desalinea la que lo lleva respecto a las
 * demás.
 */
function TabButton({ isActive, label, srLabel, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={isActive ? 'page' : undefined}
      /*
        El nombre accesible vive en el botón y no en el rótulo visible: así
        `srLabel` puede decir más de lo que cabe debajo del ícono — la Agenda
        anuncia cuántos pendientes hay y con qué prioridad.
      */
      aria-label={srLabel ?? label}
      className={`flex min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-xl
                  px-1 py-1.5 transition-colors will-change-transform active:scale-95
                  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400
                  ${isActive
        ? 'text-indigo-400'
        : 'text-zinc-500 hover:text-zinc-300'}`}
    >
      {children}
      <span
        className={`w-full truncate text-center text-[10px] leading-none
                    ${isActive ? 'font-semibold' : 'font-medium'}`}
        aria-hidden="true"
      >
        {label}
      </span>
    </button>
  );
}

/**
 * Barra de navegación inferior.
 *
 * Barra negra pegada al borde inferior, con las esquinas de arriba redondeadas
 * y el "+" de Agregar elevado en el centro.
 *
 * ## El aro del "+" no es decoración
 * El botón sube por encima del borde de la barra (`-mt-7`) y lleva un aro
 * grueso del mismo negro que ella (`ring-4 ring-zinc-950`). Eso es lo que
 * produce el efecto de estar recortado de la propia barra en vez de pegado
 * encima: el aro tapa el borde justo alrededor del círculo. Si el aro tomara
 * cualquier otro color, se leería como un halo.
 *
 * ## El reparto de color
 * La barra es negra (`zinc-950`) y el color queda reservado para tres cosas: el
 * destino activo (índigo), el "+" (el degradado de marca) y la pastilla de
 * aviso de la Agenda (el color de su prioridad). Ninguna introduce tonos
 * nuevos, pero sobre negro se distinguen entre sí y del fondo sin necesitar
 * bordes ni separadores.
 *
 * Se mantiene `pb-6` por el Safe Area del iPhone (home indicator).
 */
export default function BottomTabBar({
  activeSection = 'home',
  onToday, onProductivity, onAgenda, onAdd, onMore,
  agendaCount = 0, agendaPriority = null, revealed = true,
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
      /*
        `transition-opacity duration-1000` es exactamente `revealClass` de
        `AISequence.jsx`, copiado literal y no importado: importar un JSX
        helper de `Home/` dentro de `Layout/` habría invertido la dirección
        de dependencia del árbol (el layout es quien monta las pantallas, no
        al revés). Si esa duración cambia algún día, hay que tocarla en los
        dos sitios — es el precio de no acoplar los dos módulos.
      */
      className={`fixed bottom-0 left-0 right-0 z-50 mx-auto w-full max-w-md
                  transition-opacity duration-1000
                  ${revealed ? 'opacity-100' : 'opacity-0'}`}
      aria-hidden={!revealed}
    >
      {/*
        Pegada al borde inferior y sin márgenes laterales, a diferencia de la
        píldora flotante anterior: así el "+" elevado tiene de dónde sobresalir
        y la barra se lee como el piso de la app.

        `pt-3` deja el hueco por el que asoma el botón central sin que la fila
        de destinos se desplace hacia abajo.
      */}
      <div
        className="rounded-t-[1.75rem] border-t border-white/10 bg-zinc-950 px-2 pb-6 pt-3
                   shadow-[0_-8px_24px_rgba(0,0,0,0.5)] md:pb-4"
      >
        <div className="flex w-full items-end justify-between gap-0.5">
          {/* Hoy — el número del día hace de ícono */}
          <TabButton
            isActive={activeSection === 'home'}
            label="Hoy"
            onClick={withTap(onToday)}
          >
            <span
              className="grid h-[22px] w-[22px] shrink-0 place-items-center rounded-md
                         border border-current text-[11px] font-bold leading-none"
              aria-hidden="true"
            >
              {today}
            </span>
          </TabButton>

          {/* Productividad */}
          <TabButton
            isActive={activeSection === 'productivity'}
            label="Productividad"
            onClick={withTap(onProductivity)}
          >
            <TrendingUp size={22} strokeWidth={1.8} aria-hidden="true" />
          </TabButton>

          {/*
            Agregar — botón central elevado.

            No es un `TabButton`: no navega a una sección (abre el menú de
            agregar), no se marca como activo y no lleva rótulo, para no
            estirar el alto de la barra. Su forma ya lo identifica.
          */}
          <button
            type="button"
            onClick={withTap(onAdd)}
            aria-label="Agregar"
            className="group flex shrink-0 justify-center px-1 focus-visible:outline-none"
          >
            <span
              className="-mt-7 grid h-14 w-14 place-items-center rounded-full
                         bg-gradient-to-br from-blue-500 via-indigo-500 to-violet-600
                         text-white shadow-lg shadow-violet-600/40 ring-4 ring-zinc-950
                         transition-all group-hover:scale-105
                         group-hover:shadow-xl group-hover:shadow-violet-500/50
                         group-active:scale-95"
              aria-hidden="true"
            >
              <Plus size={26} strokeWidth={2.3} />
            </span>
          </button>

          {/* Agenda — con el aviso de lo que queda pendiente hoy */}
          <TabButton
            isActive={activeSection === 'agenda'}
            label="Agenda"
            /*
              La prioridad y el conteo se nombran además de pintarse: quien no
              distingue el verde del rojo, o usa un lector de pantalla, recibe
              lo mismo que comunica la pastilla de color.
            */
            srLabel={hasAgendaAlert
              ? `Agenda, ${agendaCount} ${agendaCount === 1 ? 'actividad pendiente' : 'actividades pendientes'} hoy`
                + `${agendaLevel ? `, prioridad ${agendaLevel.label.toLowerCase()}` : ''}`
              : 'Agenda'}
            onClick={withTap(onAgenda)}
          >
            {/*
              El aviso se ancla al ícono, no al botón: el botón ocupa todo el
              alto de la columna y la pastilla acabaría flotando lejos del
              calendario, sin quedar claro a qué se refiere.
            */}
            <span className="relative" aria-hidden="true">
              <CalendarDays size={22} strokeWidth={1.8} />

              {hasAgendaAlert && (
                /*
                  El aro toma el negro de la barra para que la pastilla se lea
                  recortada sobre ella y no pegada encima del ícono.
                */
                <span
                  className={`absolute -right-2 -top-1.5 grid h-[17px] min-w-[17px]
                              place-items-center rounded-full px-1 text-[9px] font-bold
                              leading-none shadow-sm ring-2 ring-zinc-950 ${agendaTone}`}
                >
                  {agendaBadge}
                </span>
              )}
            </span>
          </TabButton>

          {/*
            "Ver más" abre un menú, no navega a una sección: nunca se marca
            como activo, y por eso no recibe `isActive`.
          */}
          <TabButton isActive={false} label="Ver más" onClick={withTap(onMore)}>
            <Menu size={22} strokeWidth={1.8} aria-hidden="true" />
          </TabButton>
        </div>
      </div>
    </nav>
  );
}
