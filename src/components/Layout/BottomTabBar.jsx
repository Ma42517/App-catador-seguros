import { CalendarDays, TrendingUp, Plus, Menu } from 'lucide-react';
import { priorityByKey } from '../Activities/priorities';
import { tapFeedback } from '../../lib/haptics';

/**
 * Destino de la barra, en sus dos estados.
 *
 * ## Activo: píldora clara con ícono y rótulo
 * Es lo que resuelve el problema que tenía esta barra: no marcaba de ninguna
 * forma dónde estabas parado. Los cinco destinos se dibujaban idénticos en
 * las tres secciones, así que la barra informaba a dónde puedes ir pero
 * nunca dónde estás.
 *
 * ## Inactivo: sólo el ícono
 * El rótulo desaparece de los inactivos y queda para lectores de pantalla
 * (`sr-only`). Es lo que le da aire a la barra: con cinco rótulos
 * permanentes, la fila era un muro de texto de 10px y el destino activo no
 * podía destacar por contraste. El rótulo reaparece justo donde aporta —en
 * el que estás usando— y el resto se sostiene en su ícono, que es el
 * lenguaje que la barra ya usaba.
 */
function TabButton({ isActive, label, srLabel, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={isActive ? 'page' : undefined}
      /*
        El nombre accesible vive siempre aquí, en el botón, y no en el texto
        visible. Así no depende de si el rótulo se está dibujando —el
        inactivo no lo dibuja, y el activo lo esconde en pantallas
        angostas—, y deja que `srLabel` diga más de lo que cabe en la
        píldora: la Agenda anuncia cuántos pendientes hay y con qué
        prioridad, algo que como texto visible desbordaría la barra.
      */
      aria-label={srLabel ?? label}
      className={`flex shrink-0 items-center justify-center gap-1.5 rounded-full
                  transition-all will-change-transform active:scale-95
                  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400
                  ${isActive
        /*
          El destino activo toma el degradado de marca de la app —los mismos
          azul, índigo y violeta del botón "+"—, no un color nuevo. Sobre el
          negro de la barra es lo único que tiene color saturado además del
          "+", así que el estado activo se reconoce de un vistazo sin
          necesitar bordes ni subrayados.
        */
        ? 'bg-gradient-to-r from-blue-500 via-indigo-500 to-violet-600 px-3.5 py-2 '
          + 'text-white shadow-lg shadow-indigo-600/30'
        : 'px-2.5 py-2 text-zinc-500 hover:text-zinc-300'}`}
    >
      {children}
      {/*
        El rótulo visible sólo existe en el destino activo, y se esconde por
        debajo de 360px de ancho.

        Con los cinco destinos, el "+" elevado y la píldora abierta, un
        rótulo largo ("Productividad") suma unos 138px y la fila se pasaba
        del contenedor en los teléfonos más angostos (iPhone SE y
        similares). Se oculta en vez de recortarlo con puntos suspensivos:
        "Productivi…" no informa más que el propio ícono, y ahí el estado
        activo se sigue leyendo perfectamente por el fondo blanco. De 360px
        en adelante —la gran mayoría de los teléfonos— aparece completo.

        Va `aria-hidden` porque el nombre accesible ya lo da el `aria-label`
        del botón: sin esto, un lector de pantalla diría el nombre dos veces.
      */}
      {isActive && (
        <span
          className="hidden text-[11px] font-semibold leading-none min-[360px]:inline"
          aria-hidden="true"
        >
          {label}
        </span>
      )}
    </button>
  );
}

/**
 * Barra de navegación inferior.
 *
 * Píldora negra con el destino activo resaltado en el degradado de marca, y
 * el "+" de Agregar elevado en el centro.
 *
 * ## El reparto de color
 * La barra es negra (`zinc-950`, el mismo negro que ya usaba, ahora opaco) y
 * el color queda reservado para tres cosas: el destino activo, el "+" y la
 * pastilla de aviso de la Agenda. Ninguna introduce tonos nuevos —el
 * degradado azul/índigo/violeta y los colores de prioridad ya existían en la
 * app—, pero sobre negro respiran: se distinguen entre sí y del fondo sin
 * necesitar bordes ni separadores.
 *
 * Antes se probó con la barra entera en degradado y el activo en blanco. Se
 * descartó por dos problemas concretos: el "+" (que también es degradado)
 * corría el riesgo de fundirse con el fondo, y la pastilla de prioridad de
 * la Agenda no tenía un tono al que igualar su aro para recortarse.
 *
 * ## Por qué el "+" sigue elevado
 * Es el elemento con más identidad de la app y el único acceso a "Agregar".
 * Se separa por relieve además de por color: sube por encima del borde
 * (`-mt-5`) y lleva su propio resplandor violeta.
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
      className={`fixed bottom-0 left-0 right-0 z-50 w-full max-w-md mx-auto px-2 pt-2 pb-6
                  md:pb-4 transition-opacity duration-1000
                  ${revealed ? 'opacity-100' : 'opacity-0'}`}
      aria-hidden={!revealed}
    >
      {/*
        Barra negra sólida. `zinc-950` es el mismo negro que la barra ya usaba
        (`dark:bg-zinc-950/90`), sólo que ahora sin transparencia ni
        `backdrop-blur`: al ser opaca, nada del contenido que pasa por debajo
        se alcanza a ver mientras se hace scroll.

        El negro es además lo que deja respirar a los tres elementos de color
        de la barra —la píldora del destino activo, el "+" y la pastilla de
        aviso de la Agenda—: sobre un fondo de degradado, el "+" corría el
        riesgo de fundirse con él, y la pastilla de prioridad no tenía un
        tono al que igualar su aro.
      */}
      <div
        className="w-full rounded-full bg-zinc-950 px-2 py-2 shadow-lg shadow-black/50
                   ring-1 ring-white/10"
      >
        <div className="flex w-full items-center justify-between gap-1">
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

          {/* Agregar — botón central destacado, siempre elevado */}
          <button
            type="button"
            onClick={withTap(onAdd)}
            aria-label="Agregar"
            className="group flex shrink-0 flex-col items-center transition-transform
                       will-change-transform hover:scale-105 focus-visible:outline-none"
          >
            {/*
              Sobre el negro, la sombra vuelve a ser un resplandor violeta y
              no una sombra oscura: es lo que hace que el botón parezca
              encendido en vez de recortado. El aro se queda tenue —el
              contraste ya lo da el propio degradado contra el fondo—; a más
              opacidad se leía como un halo blanco alrededor.
            */}
            <span
              className="-mt-5 rounded-full bg-gradient-to-br from-blue-500 via-indigo-500
                         to-violet-600 p-3 text-white shadow-lg shadow-violet-600/40
                         ring-1 ring-white/15 transition-shadow
                         group-hover:shadow-xl group-hover:shadow-violet-500/50"
              aria-hidden="true"
            >
              <Plus size={22} strokeWidth={2.3} />
            </span>
          </button>

          {/* Agenda — con el aviso de lo que queda pendiente hoy */}
          <TabButton
            isActive={activeSection === 'agenda'}
            label="Agenda"
            /*
              La prioridad y el conteo se nombran además de pintarse: quien
              no distingue el verde del rojo, o usa un lector de pantalla,
              recibe lo mismo que comunica la pastilla de color.
            */
            srLabel={hasAgendaAlert
              ? `Agenda, ${agendaCount} ${agendaCount === 1 ? 'actividad pendiente' : 'actividades pendientes'} hoy`
                + `${agendaLevel ? `, prioridad ${agendaLevel.label.toLowerCase()}` : ''}`
              : 'Agenda'}
            onClick={withTap(onAgenda)}
          >
            {/*
              El aviso se ancla al ícono, no al botón: el botón ocupa todo el
              alto de la barra y la pastilla acabaría flotando lejos del
              calendario, sin quedar claro a qué se refiere.
            */}
            <span className="relative" aria-hidden="true">
              <CalendarDays size={22} strokeWidth={1.8} />

              {hasAgendaAlert && (
                /*
                  El aro toma el negro de la barra para que la pastilla se lea
                  recortada sobre ella y no pegada encima del ícono. Cuando la
                  Agenda es el destino activo queda sobre el degradado, donde
                  el mismo aro oscuro sigue separándola igual de bien.
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
