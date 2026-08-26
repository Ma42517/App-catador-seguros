import { CalendarDays, TrendingUp, Plus, Menu } from 'lucide-react';
import { priorityByKey } from '../Activities/priorities';
import { tapFeedback } from '../../lib/haptics';

/*
  ── Geometría del recorte ──

  Las tres medidas están relacionadas y por eso viven juntas: cambiar una sin
  las otras rompe el encaje del botón en el hueco.

  `NOTCH_RADIUS` es el radio del semicírculo que se le quita al borde superior
  de la barra; `FAB_SIZE` el diámetro del botón. La diferencia entre el radio
  del hueco y el del botón (34 − 28) es el aire de 6px que queda alrededor:
  sin ese margen el botón se vería encajado a presión, y con mucho más el
  hueco dejaría de leerse como hecho a su medida.
*/
const NOTCH_RADIUS = 34;
const FAB_SIZE = 56;

/**
 * Recorte cóncavo del borde superior de la barra.
 *
 * Se resuelve con una máscara radial y no con SVG ni con el truco de
 * pseudo-elementos y `box-shadow`, por tres razones concretas:
 *
 *  1. **No se deforma.** Un SVG que abarque el ancho de la barra necesita
 *     `preserveAspectRatio="none"` para estirarse, y eso deforma la curva en
 *     vertical: el hueco se vuelve una elipse y el botón, que es un círculo
 *     perfecto, deja de encajar. La alternativa —partir el fondo en tres
 *     piezas con la del centro de ancho fijo— funciona, pero son tres
 *     elementos que mantener alineados para dibujar un solo borde.
 *  2. **Es un círculo de verdad.** La máscara describe una circunferencia
 *     real, así que el hueco y el botón comparten geometría exacta.
 *  3. **No se pixela.** El degradado de 33px a 34px es la banda de
 *     suavizado; el navegador la compone en la GPU, y al no ser un mapa de
 *     bits no hay resolución que se quede corta en una pantalla densa.
 *
 * `WebkitMaskImage` va junto a la propiedad estándar por Safari, que todavía
 * la necesita con prefijo en varias versiones en uso.
 */
const NOTCH_MASK = {
  WebkitMaskImage: `radial-gradient(circle ${NOTCH_RADIUS}px at 50% 0px, `
    + `rgba(0,0,0,0) ${NOTCH_RADIUS - 1}px, rgb(0,0,0) ${NOTCH_RADIUS}px)`,
  maskImage: `radial-gradient(circle ${NOTCH_RADIUS}px at 50% 0px, `
    + `rgba(0,0,0,0) ${NOTCH_RADIUS - 1}px, rgb(0,0,0) ${NOTCH_RADIUS}px)`,
};

/**
 * Destino de la barra: ícono arriba, rótulo debajo.
 *
 * Los cuatro rótulos están siempre visibles. Se probó antes mostrar sólo el
 * del destino activo dentro de una píldora, y traía dos problemas: la píldora
 * desbordaba la fila en los teléfonos angostos, y los otros destinos quedaban
 * reducidos a íconos sin nombre.
 *
 * El estado activo se comunica sólo con color —el índigo de la app frente al
 * gris de los inactivos—, sin fondo ni píldora: en una fila de columnas
 * iguales, cualquier relleno desalinea la que lo lleva respecto a las demás.
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
        : 'text-neutral-500 hover:text-neutral-300'}`}
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
 * Barra de navegación inferior con recorte cóncavo central.
 *
 * La barra es negra y pegada al borde inferior, con las esquinas de arriba
 * redondeadas y un hueco semicircular en el centro del borde superior donde
 * descansa el botón de Agregar.
 *
 * ## Tres capas apiladas, y el orden importa
 *
 *  1. **El fondo** (`absolute inset-0`), que es lo único enmascarado. Sólo él
 *     lleva el recorte, así que ni los íconos ni el botón corren riesgo de que
 *     la máscara les coma un borde.
 *  2. **El botón**, hermano del fondo y no hijo. Es lo que le permite tener su
 *     propio resplandor: una sombra dentro del elemento enmascarado se
 *     recortaría con él y desaparecería, porque una máscara afecta a todo lo
 *     que el elemento pinta, sombras incluidas.
 *  3. **La fila de destinos**, con un hueco fijo en medio (`NOTCH_GAP`) más
 *     ancho que el recorte, para que ningún ícono quede debajo del botón ni
 *     aplastado contra él.
 *
 * ## El reparto de color
 * Negro puro para la barra; el color queda reservado para tres cosas: el
 * destino activo (índigo), el botón (el degradado de marca) y la pastilla de
 * aviso de la Agenda (el color de su prioridad).
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
        `relative` sin recorte propio: es el marco de referencia de las tres
        capas y debe dejar que el botón sobresalga por arriba. Si llevara
        `overflow-hidden` para redondear las esquinas, le cortaría la mitad
        superior al botón — el redondeo va en la capa de fondo, que es la
        única que lo necesita.
      */}
      <div className="relative">
        {/* ── Capa 1: el fondo negro con el recorte ── */}
        <div
          className="absolute inset-0 rounded-t-[1.75rem] bg-black"
          style={NOTCH_MASK}
          aria-hidden="true"
        />

        {/* ── Capa 2: el botón de Agregar, encajado en el hueco ── */}
        <button
          type="button"
          onClick={withTap(onAdd)}
          aria-label="Agregar"
          /*
            Centrado en el borde superior de la barra: `top-0` con
            `-translate-y-1/2` deja la mitad del botón por encima y la otra
            dentro del hueco, que es lo que produce la sensación de que
            descansa en él en vez de flotar por delante.
          */
          className="group absolute left-1/2 top-0 z-10 -translate-x-1/2 -translate-y-1/2
                     rounded-full focus-visible:outline-none focus-visible:ring-2
                     focus-visible:ring-indigo-400 focus-visible:ring-offset-2
                     focus-visible:ring-offset-black"
          style={{ width: FAB_SIZE, height: FAB_SIZE }}
        >
          {/*
            El resplandor va desplazado hacia abajo (`0_10px_28px`) y no
            centrado: al estar el botón medio fuera de la barra, una sombra
            centrada se derramaría sobre el contenido de la pantalla; hacia
            abajo cae sobre el negro de la barra, donde se lee como luz
            propia del botón.
          */}
          <span
            className="grid h-full w-full place-items-center rounded-full bg-gradient-to-br
                       from-indigo-500 via-indigo-500 to-violet-600 text-white
                       shadow-[0_10px_28px_rgba(124,58,237,0.55)] transition-transform
                       group-hover:scale-105 group-active:scale-95"
            aria-hidden="true"
          >
            <Plus size={26} strokeWidth={2.4} />
          </span>
        </button>

        {/* ── Capa 3: los destinos, dos a cada lado del hueco ── */}
        <div className="relative flex w-full items-end justify-between gap-0.5 px-2 pb-6
                        pt-3 md:pb-4"
        >
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
            Hueco del botón. Es un espaciador y no un destino más: mide algo
            más que el diámetro del recorte para que los íconos vecinos no
            queden pegados al botón ni por debajo de él.
          */}
          <span
            className="shrink-0"
            style={{ width: NOTCH_RADIUS * 2 + 12 }}
            aria-hidden="true"
          />

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
                              leading-none shadow-sm ring-2 ring-black ${agendaTone}`}
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
