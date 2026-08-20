import { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Loader2, Sun, Moon, Sunrise, Sunset, ChevronDown, ArrowLeft } from 'lucide-react';
import useTypewriter, { TypewriterSpeedContext } from '../../lib/useTypewriter';
import { EXPERIENCE_LEVELS } from '../../lib/experienceLevels';
import {
  STRENGTH_OPTIONS, CONCERN_OPTIONS, MARKET_OPTIONS, AVAILABILITY_OPTIONS,
  HOUR_BLOCKS, ALL_DAY_HOURS, formatHour, formatHourLabel,
  MOTIVATION_OPTIONS, EMPTY_ADVISOR_DATA,
  PROFESSIONAL_FOCUS_OPTIONS, PROFESSIONAL_BOTTLENECK_OPTIONS, PORTFOLIO_SIZE_OPTIONS,
  CONSOLIDATED_STRENGTH_OPTIONS, CONSOLIDATED_BOTTLENECK_OPTIONS,
  CONSOLIDATED_PORTFOLIO_OPTIONS, CONSOLIDATED_FOCUS_SPLIT_OPTIONS,
  CONSOLIDATED_MOTIVATION_OPTIONS,
} from '../../lib/advisorOnboarding';
import { saveExperienceLevel, saveAdvisorProfile } from '../../data/profilesRepo';

/** Mínimo de letras para dar por contestado el nombre del Paso 1. */
const MIN_NAME = 2;

/** Un icono por bloque del mapa de horas, sólo decorativo junto al título. */
const BLOCK_ICONS = { dawn: Moon, morning: Sunrise, afternoon: Sun, evening: Sunset };

/**
 * Bloques que se dibujan siempre. "Madrugada" queda fuera a propósito: es
 * poco común que un asesor trabaje entre las 12a y las 5a, así que se
 * esconde detrás de un botón discreto (ver `HourGridStep`) en vez de ocupar
 * espacio de la pantalla que el resto del mapa necesita para caber sin
 * scroll.
 */
const DEFAULT_VISIBLE_BLOCKS = HOUR_BLOCKS.filter((block) => block.key !== 'dawn');
const DAWN_BLOCK = HOUR_BLOCKS.find((block) => block.key === 'dawn');

const CONCERN_TEXT = 'Para que podamos guiarte con precisión, ¿qué es lo que más '
  + 'te inquieta o te impone en esta etapa inicial?';
const MARKET_TEXT = 'Todo gran negocio arranca con un mercado cálido (tus familiares, '
  + 'amigos y conocidos). Si revisas tus contactos hoy, ¿a cuántas personas podrías '
  + 'llamar para platicarles de tu nueva etapa?';

/*
  Rama "Nuevo Profesional" de los Pasos 3 a 5 (fortaleza, inquietud,
  mercado en la rama de siempre): mismo lugar en el recorrido, mismas
  claves en `advisorData`, preguntas y opciones distintas — quien ya
  superó el arranque no necesita que se le pregunte por su "mercado
  cálido", sino por la estructura de lo que ya construyó. `PROFESSIONAL_*`
  vive en `advisorOnboarding.js`; aquí sólo el texto de cada pregunta,
  igual criterio que las constantes `*_TEXT` de la rama "Nuevo Asesor".
*/
const PROFESSIONAL_BOTTLENECK_TEXT = 'Para que tu asistente optimice tus procesos, ¿cuál '
  + 'consideras que es el mayor "cuello de botella" que te impide duplicar tu '
  + 'productividad actual?';
const PORTFOLIO_SIZE_TEXT = 'El verdadero crecimiento está en la retención y la venta '
  + 'cruzada. ¿Aproximadamente cuántos clientes conforman tu cartera activa actualmente?';
const AVAILABILITY_TEXT = 'El éxito requiere constancia. ¿Cómo planeas gestionar tu tiempo?';
const SCHEDULE_TEXT = 'Toca las horas que le dedicarás al negocio. Deja en blanco el resto.';

/*
  Rama "Consolidado" de los Pasos 4 a 9: mismo lugar en el recorrido y
  mismas claves de `advisorData` que las otras dos ramas, pero con un tono
  directivo — habla de proteger una cartera madura y de infraestructura,
  no de arrancar ni de estructurar. A diferencia de las ramas "Nuevo
  Asesor"/"Nuevo Profesional" (que sólo se bifurcan en los Pasos 4 a 6, y
  convergen de vuelta a un único camino en el 7), esta rama se extiende
  hasta el Paso 9 completo: también cambia el texto de disponibilidad
  (Paso 7), el del mapa de horas (Paso 8, sólo el copy, el componente del
  grid queda intacto) y el de la motivación final (Paso 9) — ver
  `isConsolidated` más abajo.
*/
const CONSOLIDATED_STRENGTH_TEXT = (nombre) => `${nombre}, la experiencia es tu mayor activo. `
  + 'En este punto de tu carrera, ¿cuál es tu mayor ventaja competitiva?';
const CONSOLIDATED_BOTTLENECK_TEXT = 'Para que podamos automatizar tu rutina, ¿qué área de '
  + 'tu negocio te consume más tiempo o energía hoy?';
const CONSOLIDATED_PORTFOLIO_TEXT = 'Una cartera madura requiere infraestructura. '
  + '¿Aproximadamente cuántos clientes conforman tu base activa?';
const CONSOLIDATED_AVAILABILITY_TEXT = 'Como profesional consolidado, ¿cómo distribuyes tu '
  + 'enfoque operativo?';
const CONSOLIDATED_SCHEDULE_TEXT = 'Protege tu tiempo. Define los bloques en los que '
  + 'permitirás que el asistente te programe actividades.';
const CONSOLIDATED_SCHEDULE_HINT_TEXT = 'Lo que dejes en blanco, será considerado tu tiempo '
  + 'blindado.';
const CONSOLIDATED_MOTIVATION_TEXT = 'Finalmente, ¿cuál es tu meta principal al integrar '
  + 'esta inteligencia a tu proceso?';
/*
  Aclaración secundaria, no la instrucción principal: por eso vive aparte
  de `SCHEDULE_TEXT` y se dibuja como leyenda pequeña (ver `HourGridStep`)
  en vez de sumarse al párrafo que se escribe con máquina de escribir —ese
  texto ya quedó corto a propósito, y pegarle esta frase se lo volvería a
  alargar.
*/
const SCHEDULE_HINT_TEXT = 'Deja sin marcar lo que ya usas para otra cosa, '
  + 'aunque sea sólo una hora suelta.';
const MOTIVATION_TEXT = 'Finalmente, ¿cuál es tu objetivo principal al desarrollar esta carrera?';
const CONFIRM_TEXT = 'Excelente. Tu perfil ha sido registrado con éxito.';
const SECONDARY_TEXT = 'Estamos analizando tus respuestas para estructurar tu plan de '
  + 'arranque ideal. Te notificaremos en cuanto tu espacio de trabajo esté configurado '
  + 'y listo.';

/**
 * Cursor parpadeante compartido por todos los pasos, para no repetir el
 * mismo `<span>` ocho veces.
 */
function Caret({ show }) {
  if (!show) return null;
  return <span className="animate-pulse text-indigo-400">|</span>;
}

/**
 * Flecha para volver a la pregunta anterior. Vive fija en la esquina
 * superior izquierda de todo el recorrido —no dentro de cada paso— para
 * no repetirla nueve veces ni para que cada paso tenga que saber en qué
 * posición del recorrido está: quien la usa (`OnboardingFlow`) es el único
 * que sabe cuál es el paso anterior.
 *
 * Sólo se dibuja del Paso 2 en adelante y desaparece en la Sala de
 * Análisis (Paso 10, ver `onBack` más abajo): el Paso 1 no tiene nada
 * detrás a donde volver, y el paso final es una vista terminal a
 * propósito (misma nota que ya explica por qué `AnalysisRoomStep` no
 * lleva controles de salida) — permitir "Atrás" ahí dejaría a la persona
 * reabriendo un cuestionario que ya se guardó en la base.
 *
 * `stopPropagation` evita que el toque también dispare el acelerador de la
 * máquina de escribir (el `onClick` del contenedor raíz, ver
 * `OnboardingFlow`): no haría daño que lo hiciera, pero retroceder no
 * debería, de paso, cambiar la velocidad de lectura del paso al que se
 * vuelve.
 */
function BackArrow({ onBack }) {
  return (
    <button
      type="button"
      onClick={(event) => { event.stopPropagation(); onBack(); }}
      aria-label="Regresar a la pregunta anterior"
      /*
        `z-[60]`, por encima de la insignia "Vista previa · Reiniciar"
        (`z-50`, `App.jsx`) que ocupa esta misma esquina sólo en el entorno
        de prueba (`?onboardingPreview=1`): sin esta prioridad, la flecha
        quedaba dibujada pero inalcanzable al tacto en ese entorno —en un
        registro real esta insignia no existe, pero la flecha debe seguir
        respondiendo ahí también, así que se sube en vez de esconderse
        condicionalmente.
      */
      className="fixed left-4 top-4 z-[60] grid h-10 w-10 place-items-center rounded-full
                 text-white/40 transition-colors hover:bg-white/5 hover:text-white/80
                 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/30"
    >
      <ArrowLeft size={20} aria-hidden="true" />
    </button>
  );
}

/**
 * Una opción de una lista de selección: texto flotante y no una tarjeta con
 * borde ni fondo propio, sólo el título y, si lo trae, la frase que lo
 * explica debajo y más chico. El "botón" es el bloque de texto entero —el
 * `<button>` no lleva ningún relleno visual, así que lo único que delata que
 * es tocable es el cursor y el leve resalte de hover—.
 *
 * Sirve tanto para las tres tarjetas del Paso 3 (`{ title, subtitle }`,
 * `EXPERIENCE_LEVELS`) como para las listas de opción simple de los pasos 4
 * a 9 (`{ label }`, `advisorOnboarding.js`): un único componente en vez de
 * uno por cada forma de dato evita que ajustar el hover o el espaciado en
 * un paso deje a los demás desincronizados.
 */
function ChoiceOption({ option, onSelect, disabled }) {
  const title = option.title ?? option.label;

  return (
    <button
      type="button"
      onClick={() => onSelect(option.value)}
      disabled={disabled}
      className="w-full rounded-lg py-3 text-center transition-opacity
                 hover:opacity-80 active:scale-[0.98] disabled:cursor-wait
                 disabled:opacity-40 focus-visible:outline-none
                 focus-visible:ring-1 focus-visible:ring-white/30"
    >
      <p className="text-lg font-semibold text-white">{title}</p>
      {option.subtitle && (
        <p className="mt-1 text-xs leading-relaxed text-zinc-500">{option.subtitle}</p>
      )}
    </button>
  );
}

/**
 * Pregunta con máquina de escribir seguida de una lista de opciones que
 * avanza sola al tocarse: elegir ya es responder, así que no hace falta un
 * segundo toque en "Continuar" para confirmar lo que se acaba de tocar.
 *
 * `busyValue` sólo lo usa el Paso 9 (la única elección de esta pantalla que
 * dispara una escritura real a la base): marca qué opción se está
 * guardando, para que un segundo toque en otra mientras la primera guarda no
 * deje dos escrituras compitiendo por la misma fila.
 */
function ChoiceStep({ text, options, onSelect, busyValue = null }) {
  const { typed, isTyping } = useTypewriter(text);
  const disabled = Boolean(busyValue);

  return (
    <div className="flex w-full flex-col items-center px-6 text-center">
      <p className="sr-only">{text}</p>
      <p
        className="max-w-md text-xl font-light leading-snug text-white sm:text-2xl"
        aria-hidden="true"
      >
        {typed}
        <Caret show={isTyping} />
      </p>

      <div
        className={`mt-10 w-full max-w-sm transition-opacity duration-700
                    ${isTyping ? 'pointer-events-none opacity-0' : 'opacity-100'}`}
        aria-hidden={isTyping}
      >
        <div className="flex flex-col divide-y divide-white/10">
          {options.map((option) => (
            <ChoiceOption
              key={String(option.value)}
              option={option}
              onSelect={onSelect}
              disabled={disabled}
            />
          ))}
        </div>

        {busyValue && (
          <p className="mt-4 flex items-center justify-center gap-1.5 text-xs text-zinc-500">
            <Loader2 size={13} className="animate-spin" aria-hidden="true" />
            Guardando...
          </p>
        )}
      </div>
    </div>
  );
}

/**
 * Paso 1 — Bautizo rápido. La única pregunta de texto libre de todo el
 * recorrido, y la primera cosa que ve la persona: cómo se le quiere llamar.
 *
 * Va antes de la bienvenida (que vive en el Paso 2, ya con el nombre
 * puesto) a propósito: es lo que permite personalizar "Bienvenido,
 * [Nombre]" desde ese segundo mensaje, en vez de sólo desde la selección
 * de etapa que sigue en el Paso 3.
 *
 * El campo y el botón nacen montados y sólo se encienden con opacidad al
 * terminar de escribirse el texto, igual que en el resto de los pasos: un
 * control que aparece a mitad de la pregunta invita a contestar algo que
 * todavía no se ha preguntado.
 */
function NameStep({ initialValue, onContinue }) {
  const text = 'Hola. Para comenzar, ¿cómo te gusta que te llamen?';
  const { typed, isTyping } = useTypewriter(text);
  const [name, setName] = useState(initialValue);
  const cleanName = name.trim();
  const isValid = cleanName.length >= MIN_NAME;

  const submit = (event) => {
    event.preventDefault();
    if (!isValid) return;
    onContinue(cleanName);
  };

  return (
    <form onSubmit={submit} className="flex w-full flex-col items-center px-6 text-center">
      <p className="sr-only">{text}</p>
      <p
        className="max-w-lg text-2xl font-light leading-relaxed text-white sm:text-3xl"
        aria-hidden="true"
      >
        {typed}
        <Caret show={isTyping} />
      </p>

      <div
        className={`mt-10 w-full max-w-xs transition-opacity duration-700
                    ${isTyping ? 'pointer-events-none opacity-0' : 'opacity-100'}`}
        aria-hidden={isTyping}
      >
        <label className="sr-only" htmlFor="advisor-name">Cómo te gusta que te llamen</label>
        <input
          id="advisor-name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Escribe tu nombre"
          autoComplete="given-name"
          enterKeyHint="go"
          className="w-full border-b border-white/20 bg-transparent pb-2 text-center
                     text-xl text-white caret-indigo-400 transition-colors
                     placeholder:text-white/25 focus:border-indigo-500 focus:outline-none"
        />

        <button
          type="submit"
          disabled={!isValid}
          className="mt-8 w-full rounded-full bg-indigo-600 px-8 py-3 text-sm
                     font-semibold text-white shadow-lg shadow-indigo-600/30
                     transition-all hover:bg-indigo-500 active:scale-95
                     disabled:cursor-not-allowed disabled:bg-white/[0.06]
                     disabled:text-white/25 disabled:shadow-none"
        >
          Continuar
        </button>
      </div>
    </form>
  );
}

/**
 * Paso 2 — Bienvenida. Un solo mensaje, sin ninguna pregunta todavía: sólo
 * el propósito de la app, ya con el nombre puesto, y un "Continuar" para
 * pasar a la primera pregunta (la etapa profesional, en el Paso 3).
 *
 * Separado a propósito de la selección de etapa —antes vivían juntos en un
 * mismo paso— porque son dos momentos distintos: uno es un mensaje que se
 * lee, el otro es una pregunta que se contesta. Fundirlos apuraba la
 * lectura del mensaje con las tres tarjetas ya asomando debajo.
 *
 * El botón es texto flotante, igual que las opciones de selección de más
 * abajo: nada de píldora con fondo ni borde, sólo la palabra "Continuar" y
 * el leve resalte de hover como pista de que es tocable.
 */
function WelcomeStep({ name, onContinue }) {
  const text = `Bienvenido, ${name}. Nuestro objetivo es simple: que todos los días te `
    + 'vayas a dormir sabiendo que tu negocio creció.';
  const { typed, isTyping } = useTypewriter(text);

  return (
    <div className="flex flex-col items-center px-6 text-center">
      <p className="sr-only">{text}</p>
      <p
        className="max-w-lg text-2xl font-light leading-relaxed text-white sm:text-3xl"
        aria-hidden="true"
      >
        {typed}
        <Caret show={isTyping} />
      </p>

      <button
        type="button"
        onClick={onContinue}
        aria-hidden={isTyping}
        tabIndex={isTyping ? -1 : 0}
        className={`mt-10 text-base font-semibold text-white transition-opacity
                    duration-700 hover:opacity-70 active:scale-95
                    ${isTyping ? 'pointer-events-none opacity-0' : 'opacity-100'}`}
      >
        Continuar
      </button>
    </div>
  );
}

/**
 * Una hora del mapa: una celda pequeña que alterna entre libre y ocupada
 * con un toque. No lleva ningún texto además del número —ni "libre" ni
 * "ocupada"— porque con hasta 24 celdas en pantalla cualquier palabra de
 * más las volvería ilegibles; el color es toda la explicación que necesita
 * una grilla de este tamaño. El número por sí solo ("7", sin "a"/"p") no es
 * ambiguo porque cada celda ya vive bajo el título de su bloque —Mañana,
 * Tarde...—, que es quien distingue las 7 de la mañana de las 7 de la
 * noche.
 */
function HourCell({ hour, isSelected, onToggle }) {
  return (
    <button
      type="button"
      onClick={() => onToggle(hour)}
      aria-pressed={isSelected}
      aria-label={`${formatHourLabel(hour)}: ${isSelected ? 'disponible' : 'ocupado'}`}
      className={`flex h-9 w-9 items-center justify-center rounded-lg text-sm
                 font-semibold transition-all active:scale-90 ${
        isSelected
          ? 'bg-amber-500 text-slate-950 shadow-[0_0_8px_rgba(245,158,11,0.5)]'
          : 'bg-white/[0.04] text-white/30 hover:bg-white/[0.08] hover:text-white/50'
      }`}
    >
      {formatHour(hour)}
    </button>
  );
}

/**
 * Un bloque del mapa (Mañana, Tarde, Noche y, si se despliega, Madrugada):
 * su título con icono, un atajo para marcar o vaciar todas sus horas de
 * golpe, y la fila de celdas. El grid de seis columnas es fijo para los
 * cuatro bloques —da igual que Tarde tenga siete horas y Noche cinco (ver
 * `HOUR_BLOCKS`)—, así que la última fila de Tarde se completa con una sola
 * celda y la de Noche queda con la sexta columna vacía, el mismo efecto de
 * un calendario cuya última semana no llena la cuadrícula entera.
 *
 * El atajo por bloque existe porque tocar varias celdas una por una para
 * decir "toda la tarde libre" es fricción que un asesor con la agenda
 * simple no debería pagar — y sigue permitiendo que alguien con esa misma
 * tarde libre, salvo la hora de la comida, toque el atajo y luego
 * destoque sólo esa celda, en vez de tener que armar el bloque hora por
 * hora desde cero.
 */
function HourBlockRow({ block, selectedHours, onToggleHour, onToggleBlock }) {
  const Icon = BLOCK_ICONS[block.key];
  const selectedCount = block.hours.filter((h) => selectedHours.includes(h)).length;
  const allSelected = selectedCount === block.hours.length;

  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-xs font-semibold uppercase
                         tracking-wider text-white/40"
        >
          <Icon size={12} aria-hidden="true" />
          {block.label}
        </span>

        <button
          type="button"
          onClick={() => onToggleBlock(block.hours, !allSelected)}
          className="text-[11px] font-semibold text-indigo-400 transition-colors
                     hover:text-indigo-300"
        >
          {allSelected ? 'Vaciar' : 'Todo libre'}
        </button>
      </div>

      <div className="grid grid-cols-6 gap-1.5">
        {block.hours.map((hour) => (
          <HourCell
            key={hour}
            hour={hour}
            isSelected={selectedHours.includes(hour)}
            onToggle={onToggleHour}
          />
        ))}
      </div>
    </div>
  );
}

/**
 * Paso 8 — Mapa de horas. Un cuadro de 24 celdas, una por hora, agrupadas
 * en bloques sólo para que se lean como jornada.
 *
 * Pensado para caber entero en una pantalla sin scroll: instrucción de una
 * sola línea, espaciado reducido entre secciones (`space-y-3`), celdas de
 * `h-9 w-9` y el bloque de Madrugada escondido por defecto (ver
 * `DEFAULT_VISIBLE_BLOCKS`) — es la sección menos usada, y la única forma
 * de que Mañana, Tarde y Noche quepan sin apretar demasiado las celdas es
 * no dibujar un cuarto bloque que casi nadie despliega.
 *
 * `selected` vive en el propio paso y no en `advisorData` directamente
 * (a diferencia del resto de los pasos, que escriben en cada toque):
 * marcar una hora no es "responder y avanzar" como elegir una tarjeta —es
 * un lienzo que se sigue tocando muchas veces antes de estar conforme—,
 * así que hace falta un botón "Continuar" explícito, y por eso este es el
 * único paso de opción (fuera del nombre) que no avanza solo.
 *
 * `text`/`hintText` son opcionales, con respaldo a los textos de la rama
 * "Nuevo Asesor"/"Nuevo Profesional" (`SCHEDULE_TEXT`,
 * `SCHEDULE_HINT_TEXT`): la rama "Consolidado" pasa su propio copy
 * (`CONSOLIDATED_SCHEDULE_TEXT`, `CONSOLIDATED_SCHEDULE_HINT_TEXT`) sin
 * tocar nada del componente del grid — sólo cambia lo que se lee arriba,
 * el mapa de 24 horas sigue siendo exactamente el mismo para las tres
 * ramas.
 */
function HourGridStep({
  initialHours, onContinue, text = SCHEDULE_TEXT, hintText = SCHEDULE_HINT_TEXT,
}) {
  const { typed, isTyping } = useTypewriter(text);
  const [selected, setSelected] = useState(initialHours);

  /*
    Se abre sola si ya trae alguna hora de madrugada marcada (por ejemplo,
    al volver con "Atrás" desde el Paso 9): ocultar un bloque que ya tiene
    una respuesta dentro escondería esa respuesta, no sólo la sección.
  */
  const [showDawn, setShowDawn] = useState(
    () => DAWN_BLOCK.hours.some((h) => initialHours.includes(h)),
  );

  const toggleHour = (hour) => {
    setSelected((current) => (
      current.includes(hour) ? current.filter((h) => h !== hour) : [...current, hour]
    ));
  };

  const toggleBlock = (hours, makeSelected) => {
    setSelected((current) => {
      const withoutBlock = current.filter((h) => !hours.includes(h));
      return makeSelected ? [...withoutBlock, ...hours] : withoutBlock;
    });
  };

  const toggleAllDay = () => {
    setSelected((current) => (
      current.length === ALL_DAY_HOURS.length ? [] : [...ALL_DAY_HOURS]
    ));
  };

  const isFreelanceAllDay = selected.length === ALL_DAY_HOURS.length;

  return (
    <div className="flex h-screen w-full flex-col items-center justify-center px-6 text-center">
      <p className="sr-only">{`${text} ${hintText}`}</p>
      <p
        className="max-w-sm text-lg leading-snug text-white"
        aria-hidden="true"
      >
        {typed}
        <Caret show={isTyping} />
      </p>

      {/*
        Leyenda pequeña, no una segunda oración del mismo tamaño: aclara el
        caso de la hora suelta (la de comer, por ejemplo) sin competir con
        la instrucción principal por la atención de quien recién empieza a
        tocar el mapa.
      */}
      <p
        className={`mt-1.5 max-w-xs text-[11px] leading-snug text-white/40
                    transition-opacity duration-700
                    ${isTyping ? 'opacity-0' : 'opacity-100'}`}
        aria-hidden="true"
      >
        {hintText}
      </p>

      <div
        className={`mt-4 w-full max-w-sm space-y-3 transition-opacity duration-700
                    ${isTyping ? 'pointer-events-none opacity-0' : 'opacity-100'}`}
        aria-hidden={isTyping}
      >
        {/*
          Atajo para quien de verdad tiene el día entero libre (el caso del
          freelance del pedido): marca las 24 horas de una vez, y el propio
          mapa que se enciende abajo es lo que le permite, en el siguiente
          toque, vaciar sólo la hora de la comida sin perder el resto.
        */}
        <button
          type="button"
          onClick={toggleAllDay}
          className={`w-full rounded-lg border px-4 py-1.5 text-xs font-semibold
                     transition-colors ${
            isFreelanceAllDay
              ? 'border-amber-500/40 bg-amber-500/10 text-amber-300'
              : 'border-white/15 text-white/50 hover:border-white/30 hover:text-white'
          }`}
        >
          {isFreelanceAllDay ? 'Todo el día está marcado libre' : 'Tengo todo el día libre'}
        </button>

        <div className="space-y-3 text-left">
          {DEFAULT_VISIBLE_BLOCKS.map((block) => (
            <HourBlockRow
              key={block.key}
              block={block}
              selectedHours={selected}
              onToggleHour={toggleHour}
              onToggleBlock={toggleBlock}
            />
          ))}

          {/*
            Madrugada, escondida detrás de un botón fantasma: es la franja
            menos común (ver la nota junto a `DEFAULT_VISIBLE_BLOCKS`), así
            que sólo ocupa espacio en pantalla si alguien la pide.
          */}
          {showDawn ? (
            <HourBlockRow
              block={DAWN_BLOCK}
              selectedHours={selected}
              onToggleHour={toggleHour}
              onToggleBlock={toggleBlock}
            />
          ) : (
            <button
              type="button"
              onClick={() => setShowDawn(true)}
              className="flex items-center gap-1 text-xs text-slate-500
                         transition-colors hover:text-slate-300"
            >
              <ChevronDown size={12} aria-hidden="true" />
              Mostrar horario de madrugada
            </button>
          )}
        </div>

        <p className="text-xs text-zinc-500">
          {selected.length === 0
            ? 'Todavía no marcas ninguna hora.'
            : `${selected.length} ${selected.length === 1 ? 'hora libre' : 'horas libres'} marcadas.`}
        </p>

        <button
          type="button"
          onClick={() => onContinue(selected)}
          disabled={selected.length === 0}
          className="w-full rounded-full bg-indigo-600 px-8 py-3 text-sm
                     font-semibold text-white shadow-lg shadow-indigo-600/30
                     transition-all hover:bg-indigo-500 active:scale-95
                     disabled:cursor-not-allowed disabled:bg-white/[0.06]
                     disabled:text-white/25 disabled:shadow-none"
        >
          Continuar
        </button>
      </div>
    </div>
  );
}

/**
 * Paso final — Sala de Análisis. Vista terminal: sin botón de salida ni de
 * revisar, a propósito (ver la nota junto a `OnboardingFlow` más abajo).
 *
 * Cuenta la misma clase de historia que el Paso 3 de la promotoría
 * (`PromotoriaWaitingRoom.jsx`) con una puesta en escena distinta: aquí no
 * hay "administrador revisando" — el guardado ya ocurrió al completar el
 * Paso 9 — sino "estamos analizando tus respuestas", que es honesto con lo
 * que de verdad pasa: la aprobación de acceso y el análisis del perfil son
 * dos procesos distintos que corren en paralelo, y esta pantalla sólo
 * habla del segundo.
 *
 * El texto secundario no se escribe letra por letra —el pedido lo dice de
 * forma explícita ("aparece después con fade-in")— así que aquí sí se usa
 * un fundido de opacidad simple, gobernado por el mismo `isTyping` del
 * mensaje principal: cuando el texto de arriba termina de escribirse, el de
 * abajo entra.
 *
 * `onSimulateApproval` sólo lo pasa `OnboardingPreview` (`App.jsx`, entorno
 * de `?onboardingPreview=1`): en un registro real esta prop no existe, y el
 * botón no se dibuja — la vista terminal se queda exactamente como es en
 * producción, sin nada que la distinga de antes de este cambio. Cuando sí
 * existe, aparece tras el fundido del subtexto (no antes: sería un control
 * asomando a mitad de una vista que se anuncia como terminal) y deja ver,
 * de un vistazo, qué vería este mismo asesor en el instante justo después
 * de que lo aprueban.
 */
function AnalysisRoomStep({ onSimulateApproval }) {
  const { typed, isTyping } = useTypewriter(CONFIRM_TEXT);

  return (
    <div className="flex flex-col items-center px-6 text-center">
      <span
        className="mb-6 grid h-16 w-16 place-items-center rounded-2xl border
                   border-indigo-500/30 bg-indigo-500/10 text-indigo-300"
        aria-hidden="true"
      >
        <Loader2 size={28} className="animate-spin" aria-hidden="true" />
      </span>

      <p className="sr-only">{`${CONFIRM_TEXT} ${SECONDARY_TEXT}`}</p>

      <p
        className="max-w-md text-xl font-light leading-snug text-white sm:text-2xl"
        aria-hidden="true"
      >
        {typed}
        <Caret show={isTyping} />
      </p>

      <p
        className={`mt-4 max-w-sm text-sm leading-relaxed text-zinc-400
                    transition-opacity duration-1000 ${isTyping ? 'opacity-0' : 'opacity-100'}`}
        aria-hidden={isTyping}
      >
        {SECONDARY_TEXT}
      </p>

      {onSimulateApproval && (
        <button
          type="button"
          onClick={onSimulateApproval}
          className={`mt-8 rounded-full border border-amber-500/30 bg-amber-500/10
                     px-5 py-2 text-xs font-semibold text-amber-300
                     transition-opacity duration-1000 hover:bg-amber-500/20
                     ${isTyping ? 'opacity-0' : 'opacity-100'}`}
        >
          Simular aprobación · Continuar a la app
        </button>
      )}
    </div>
  );
}

/**
 * Flujo de bienvenida para un registro nuevo: un mensaje de bienvenida y
 * ocho preguntas que levantan la radiografía del asesor, terminando en la
 * Sala de Análisis.
 *
 * El Paso 1 pide el nombre y el Paso 2 sólo da la bienvenida con él ya
 * puesto —sin pregunta todavía—: son dos momentos distintos (uno se lee,
 * el otro se contesta) y por eso viven en pasos separados, aunque antes
 * compartieran uno con la primera pregunta (etapa profesional, Paso 3).
 *
 * Los Pasos 4 a 9 se ramifican según la etapa elegida en el Paso 3: quien
 * marca "Nuevo Profesional" (`isProfessional`) o "Consolidado"
 * (`isConsolidated`) contesta un cuestionario distinto de quien marca
 * "Nuevo Asesor" — misma posición en el recorrido, mismas claves de
 * `advisorData`, preguntas y opciones distintas (ver `PROFESSIONAL_*` y
 * `CONSOLIDATED_*` en `advisorOnboarding.js`). "Nuevo Profesional" sólo se
 * ramifica en los Pasos 4 a 6 y converge de vuelta a un único camino en el
 * 7 (disponibilidad, horario, motor); "Consolidado" en cambio conserva su
 * propio tono directivo hasta el Paso 9 completo, incluido el copy del
 * mapa de horas (Paso 8) — el componente del grid en sí no cambia, sólo el
 * texto que lo introduce. La Sala de Análisis (Paso 10) es un único camino
 * para las tres ramas.
 *
 * Sólo se le muestra a quien todavía no eligió su etapa profesional
 * (`identity.experienceLevel` vacío) — es `Gate`, en `App.jsx`, quien decide
 * si monta esto o `PendingApproval` directamente, comparando esa misma
 * columna. Esa columna, y la radiografía completa en `advisorProfileData`
 * (ver `saveAdvisorProfile` en `profilesRepo.js`), sólo se escriben una vez,
 * al completar el Paso 9 — no en cada paso— para que abandonar el
 * cuestionario a la mitad no deje ni una elección a medias en la base ni a
 * la persona atrapada en la Sala de Análisis sin haber terminado de
 * contestar: si vuelve a entrar antes de terminar, `experience_level` sigue
 * vacía y le toca el recorrido completo desde el Paso 1, igual que la
 * primera vez.
 *
 * El paso final de este componente y `PendingApproval.jsx` cuentan
 * historias distintas con puestas en escena propias (uno anuncia que el
 * perfil ya se analizó, el otro que la cuenta sigue esperando aprobación) —
 * son intencionalmente dos vistas separadas, no una condicionada dentro de
 * la otra, porque el paso final de este flujo es el cierre de una animación
 * y no debe cargar los controles de "revisar de nuevo" que sí tienen
 * sentido en una vista a la que se puede volver muchas veces.
 */
export default function OnboardingFlow({ userId, onProfileSaved, onSimulateApproval }) {
  const [step, setStep] = useState(1);
  const [busyValue, setBusyValue] = useState(null);

  /*
    Tocar en cualquier parte de la pantalla acelera un 50% la máquina de
    escribir (ver `TypewriterSpeedContext`, `useTypewriter.js`): el primer
    toque enciende el modo rápido para el resto del recorrido, sin volver a
    apagarse. No se reinicia por paso porque el objetivo es "deja de
    esperar tanto" de aquí en adelante, no "acelera esta frase y vuelve a
    la normalidad en la siguiente".
  */
  const [fastTyping, setFastTyping] = useState(false);

  /*
    La radiografía completa del recorrido. Vive en un solo objeto —y no en
    ocho variables sueltas— porque así es como se guarda al final (ver
    `saveAdvisorProfile`): mantenerla ya con esa forma evita traducirla en el
    último paso.
  */
  const [advisorData, setAdvisorData] = useState(EMPTY_ADVISOR_DATA);

  /*
    Ramificación de los Pasos 4 a 6: `'new_professional'` es el `value`
    exacto de la tarjeta "Nuevo Profesional" en `EXPERIENCE_LEVELS`
    (`experienceLevels.js`) — comparado tal cual, sin traducir, porque es
    el mismo texto que ya se guarda en `advisorData.perfil` y en la
    columna `experience_level` de la base.
  */
  const isProfessional = advisorData.perfil === 'new_professional';

  /*
    Ramificación de los Pasos 4 a 9: `'established'` es el `value` exacto
    de la tarjeta "Consolidado" en `EXPERIENCE_LEVELS`
    (`experienceLevels.js`) — mismo criterio que `isProfessional`, sin
    traducir el valor guardado. A diferencia de `isProfessional` (que sólo
    ramifica los Pasos 4 a 6, y converge de vuelta a un único camino en el
    7), esta rama se extiende hasta el Paso 9 completo.
  */
  const isConsolidated = advisorData.perfil === 'established';

  // Evita seguir aceptando toques o navegación si el componente se
  // desmontara a media escritura (cambio de sesión, por ejemplo).
  const [alive, setAlive] = useState(true);
  useEffect(() => () => setAlive(false), []);

  const answer = (field) => (value) => {
    setAdvisorData((current) => ({ ...current, [field]: value }));
  };

  const submitName = (value) => {
    setAdvisorData((current) => ({ ...current, nombre: value }));
    setStep(2);
  };

  const chooseProfile = (value) => {
    answer('perfil')(value);
    setStep(4);
  };

  const chooseStrength = (value) => {
    answer('fortaleza')(value);
    setStep(5);
  };

  const chooseConcern = (value) => {
    answer('inquietud')(value);
    setStep(6);
  };

  const chooseMarket = (value) => {
    answer('mercado')(value);
    setStep(7);
  };

  const chooseAvailability = (value) => {
    answer('disponibilidad')(value);
    setStep(8);
  };

  const submitSchedule = (hours) => {
    answer('horario')(hours);
    setStep(9);
  };

  /**
   * Retrocede una pregunta. No hace falta ramificar por `isProfessional`
   * aquí: los Pasos 4 a 6 comparten el mismo número de paso entre los dos
   * perfiles (ver la nota junto a esa ramificación, más abajo), así que
   * "un paso atrás" siempre es `step - 1`, sin importar qué cuestionario
   * esté contestando la persona en ese momento.
   *
   * Nunca se guarda nada al volver —ni se borra la respuesta que ya se
   * había dado—: `advisorData` conserva el valor elegido la primera vez,
   * así que si la persona vuelve a avanzar sin cambiar nada, encuentra la
   * misma opción marcada donde la había dejado.
   */
  const goBack = () => setStep((current) => Math.max(1, current - 1));

  /**
   * Cierra el cuestionario: guarda la radiografía completa y la etapa
   * profesional, y sólo entonces avanza a la Sala de Análisis.
   *
   * Se guarda con el objeto armado en el momento (`{ ...advisorData, motor
   * }`) y no con `advisorData` del cierre de esta función: `setAdvisorData`
   * es asíncrono, así que leerlo aquí todavía traería la radiografía sin la
   * última respuesta.
   */
  const finish = async (motor) => {
    const finalData = { ...advisorData, motor };
    setBusyValue(motor);
    await Promise.all([
      saveExperienceLevel(userId, finalData.perfil),
      saveAdvisorProfile(userId, finalData),
    ]);
    if (!alive) return;
    setAdvisorData(finalData);
    // Se refresca la identidad de la sesión aunque el guardado haya fallado
    // en silencio (columna todavía no migrada): no hay nada que reintentar
    // desde aquí, y bloquear el avance dejaría a la persona varada en este
    // paso para siempre por un detalle de infraestructura que no le compete.
    await onProfileSaved?.();
    if (!alive) return;
    setBusyValue(null);
    setStep(10);
  };

  return (
    <div
      className="flex min-h-screen w-full items-center justify-center bg-slate-950 px-4 py-10"
      onClick={() => setFastTyping(true)}
    >
      {/*
        Del Paso 2 al 9: el Paso 1 no tiene pregunta anterior a la que
        volver, y el Paso 10 (Sala de Análisis) es una vista terminal —ver
        la nota junto a `BackArrow`.
      */}
      {step > 1 && step < 10 && <BackArrow onBack={goBack} />}

      <TypewriterSpeedContext.Provider value={fastTyping ? 2 : 1}>
      {step === 1 && <NameStep initialValue={advisorData.nombre} onContinue={submitName} />}

      {step === 2 && (
        <WelcomeStep name={advisorData.nombre} onContinue={() => setStep(3)} />
      )}

      {step === 3 && (
        <ChoiceStep
          text="Para adaptar tu experiencia, cuéntanos en qué etapa te encuentras:"
          options={EXPERIENCE_LEVELS}
          onSelect={chooseProfile}
        />
      )}

      {/*
        Pasos 4 a 6: mismo lugar en el recorrido y mismas claves de
        `advisorData` (`fortaleza`, `inquietud`, `mercado`) para los dos
        perfiles, pero la pregunta y las opciones cambian según lo elegido
        en el Paso 3 (`isProfessional`). Después del Paso 6 ambas ramas
        convergen de vuelta a un único camino (disponibilidad, horario,
        motor, Sala de Análisis) — no hay bifurcación más allá de aquí.
      */}
      <AnimatePresence mode="wait">
      <motion.div
        key={step}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.35 }}
        className="flex w-full flex-col items-center"
      >

      {step === 4 && (
        isConsolidated ? (
          <ChoiceStep
            text={CONSOLIDATED_STRENGTH_TEXT(advisorData.nombre)}
            options={CONSOLIDATED_STRENGTH_OPTIONS}
            onSelect={chooseStrength}
          />
        ) : isProfessional ? (
          <ChoiceStep
            text={`${advisorData.nombre}, ya superaste la curva de aprendizaje. Para llevar `
              + 'tu negocio al siguiente nivel, ¿en qué área necesitas construir más '
              + 'estructura hoy?'}
            options={PROFESSIONAL_FOCUS_OPTIONS}
            onSelect={chooseStrength}
          />
        ) : (
          <ChoiceStep
            text={`${advisorData.nombre}, el autoconocimiento es tu mejor herramienta. `
              + 'Al arrancar este negocio, ¿cuál consideras que es tu mayor ventaja?'}
            options={STRENGTH_OPTIONS}
            onSelect={chooseStrength}
          />
        )
      )}

      {step === 5 && (
        isConsolidated ? (
          <ChoiceStep
            text={CONSOLIDATED_BOTTLENECK_TEXT}
            options={CONSOLIDATED_BOTTLENECK_OPTIONS}
            onSelect={chooseConcern}
          />
        ) : isProfessional ? (
          <ChoiceStep
            text={PROFESSIONAL_BOTTLENECK_TEXT}
            options={PROFESSIONAL_BOTTLENECK_OPTIONS}
            onSelect={chooseConcern}
          />
        ) : (
          <ChoiceStep text={CONCERN_TEXT} options={CONCERN_OPTIONS} onSelect={chooseConcern} />
        )
      )}

      {step === 6 && (
        isConsolidated ? (
          <ChoiceStep
            text={CONSOLIDATED_PORTFOLIO_TEXT}
            options={CONSOLIDATED_PORTFOLIO_OPTIONS}
            onSelect={chooseMarket}
          />
        ) : isProfessional ? (
          <ChoiceStep
            text={PORTFOLIO_SIZE_TEXT}
            options={PORTFOLIO_SIZE_OPTIONS}
            onSelect={chooseMarket}
          />
        ) : (
          <ChoiceStep text={MARKET_TEXT} options={MARKET_OPTIONS} onSelect={chooseMarket} />
        )
      )}

      {step === 7 && (
        isConsolidated ? (
          <ChoiceStep
            text={CONSOLIDATED_AVAILABILITY_TEXT}
            options={CONSOLIDATED_FOCUS_SPLIT_OPTIONS}
            onSelect={chooseAvailability}
          />
        ) : (
          <ChoiceStep
            text={AVAILABILITY_TEXT}
            options={AVAILABILITY_OPTIONS}
            onSelect={chooseAvailability}
          />
        )
      )}

      {step === 8 && (
        isConsolidated ? (
          <HourGridStep
            initialHours={advisorData.horario}
            onContinue={submitSchedule}
            text={CONSOLIDATED_SCHEDULE_TEXT}
            hintText={CONSOLIDATED_SCHEDULE_HINT_TEXT}
          />
        ) : (
          <HourGridStep initialHours={advisorData.horario} onContinue={submitSchedule} />
        )
      )}

      {step === 9 && (
        isConsolidated ? (
          <ChoiceStep
            text={CONSOLIDATED_MOTIVATION_TEXT}
            options={CONSOLIDATED_MOTIVATION_OPTIONS}
            onSelect={finish}
            busyValue={busyValue}
          />
        ) : (
          <ChoiceStep
            text={MOTIVATION_TEXT}
            options={MOTIVATION_OPTIONS}
            onSelect={finish}
            busyValue={busyValue}
          />
        )
      )}

      {step === 10 && (
        <AnalysisRoomStep
          onSimulateApproval={
            onSimulateApproval ? () => onSimulateApproval(advisorData) : undefined
          }
        />
      )}
      </motion.div>
      </AnimatePresence>
      </TypewriterSpeedContext.Provider>
    </div>
  );
}
