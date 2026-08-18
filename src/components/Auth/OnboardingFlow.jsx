import { useState, useEffect } from 'react';
import { Loader2, Sun, Moon, Sunrise, Sunset, ChevronDown } from 'lucide-react';
import useTypewriter from '../../lib/useTypewriter';
import { EXPERIENCE_LEVELS } from '../../lib/experienceLevels';
import {
  STRENGTH_OPTIONS, CONCERN_OPTIONS, MARKET_OPTIONS, AVAILABILITY_OPTIONS,
  HOUR_BLOCKS, ALL_DAY_HOURS, formatHour, formatHourLabel,
  MOTIVATION_OPTIONS, EMPTY_ADVISOR_DATA,
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
  + 'llamarles cómodamente para platicarles de tu nueva etapa?';
const AVAILABILITY_TEXT = 'El éxito requiere constancia. ¿Cómo planeas gestionar tu tiempo?';
const SCHEDULE_TEXT = 'Toca las horas que le dedicarás al negocio. Deja en blanco el resto.';
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
 */
function HourGridStep({ initialHours, onContinue }) {
  const { typed, isTyping } = useTypewriter(SCHEDULE_TEXT);
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
      <p className="sr-only">{`${SCHEDULE_TEXT} ${SCHEDULE_HINT_TEXT}`}</p>
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
        {SCHEDULE_HINT_TEXT}
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
 */
function AnalysisRoomStep() {
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
export default function OnboardingFlow({ userId, onProfileSaved }) {
  const [step, setStep] = useState(1);
  const [busyValue, setBusyValue] = useState(null);

  /*
    La radiografía completa del recorrido. Vive en un solo objeto —y no en
    ocho variables sueltas— porque así es como se guarda al final (ver
    `saveAdvisorProfile`): mantenerla ya con esa forma evita traducirla en el
    último paso.
  */
  const [advisorData, setAdvisorData] = useState(EMPTY_ADVISOR_DATA);

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
    <div className="flex min-h-screen w-full items-center justify-center bg-slate-950 px-4 py-10">
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

      {step === 4 && (
        <ChoiceStep
          text={`${advisorData.nombre}, el autoconocimiento es tu mejor herramienta. `
            + 'Al arrancar este negocio, ¿cuál consideras que es tu mayor ventaja?'}
          options={STRENGTH_OPTIONS}
          onSelect={chooseStrength}
        />
      )}

      {step === 5 && (
        <ChoiceStep text={CONCERN_TEXT} options={CONCERN_OPTIONS} onSelect={chooseConcern} />
      )}

      {step === 6 && (
        <ChoiceStep text={MARKET_TEXT} options={MARKET_OPTIONS} onSelect={chooseMarket} />
      )}

      {step === 7 && (
        <ChoiceStep
          text={AVAILABILITY_TEXT}
          options={AVAILABILITY_OPTIONS}
          onSelect={chooseAvailability}
        />
      )}

      {step === 8 && (
        <HourGridStep initialHours={advisorData.horario} onContinue={submitSchedule} />
      )}

      {step === 9 && (
        <ChoiceStep
          text={MOTIVATION_TEXT}
          options={MOTIVATION_OPTIONS}
          onSelect={finish}
          busyValue={busyValue}
        />
      )}

      {step === 10 && <AnalysisRoomStep />}
    </div>
  );
}
