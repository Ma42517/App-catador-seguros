import { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Loader2, Sun, Moon, Sunrise, Sunset, ChevronDown, ArrowLeft } from 'lucide-react';
import useTypewriter, { TypewriterSpeedContext } from '../../lib/useTypewriter';
import { EXPERIENCE_LEVELS } from '../../lib/experienceLevels';
import {
  STRENGTH_OPTIONS, CONCERN_OPTIONS, MARKET_OPTIONS, AVAILABILITY_OPTIONS,
  formatHourLabel,
  MOTIVATION_OPTIONS, EMPTY_ADVISOR_DATA,
  PROFESSIONAL_FOCUS_OPTIONS, PROFESSIONAL_BOTTLENECK_OPTIONS, PORTFOLIO_SIZE_OPTIONS,
  CONSOLIDATED_STRENGTH_OPTIONS, CONSOLIDATED_BOTTLENECK_OPTIONS,
  CONSOLIDATED_PORTFOLIO_OPTIONS, CONSOLIDATED_FOCUS_SPLIT_OPTIONS,
  CONSOLIDATED_MOTIVATION_OPTIONS,
} from '../../lib/advisorOnboarding';
import { saveExperienceLevel, saveAdvisorProfile } from '../../data/profilesRepo';
import { readAppTheme, themeFor } from '../../lib/appTheme';
import ThemeSwitch from './ThemeSwitch';

/*
  Paleta del onboarding por tema. Se inyecta como variables CSS en el contenedor
  raíz y los pasos la heredan por cascada —sin pasar props por ocho componentes—.
  `text` es el color del texto principal; `soft`/`faint` son el mismo tono a menor
  presencia (subtítulos, celdas apagadas); `border` las líneas divisorias; `cell`
  el fondo de las celdas libres del mapa de horas. En oscuro todo es blanco con
  alfa (como estaba); en claro/crema, el tinte oscuro del tema.
*/
const OB_PALETTE = {
  dark: {
    text: '#f8fafc', soft: 'rgba(248,250,252,0.55)', faint: 'rgba(248,250,252,0.3)',
    border: 'rgba(255,255,255,0.12)', cell: 'rgba(255,255,255,0.05)',
    cellText: 'rgba(255,255,255,0.35)',
    // Acento ámbar legible sobre fondo oscuro: amarillo claro.
    amber: '#fcd34d',
  },
  light: {
    text: '#0f172a', soft: 'rgba(15,23,42,0.6)', faint: 'rgba(15,23,42,0.4)',
    border: 'rgba(15,23,42,0.12)', cell: 'rgba(15,23,42,0.05)',
    cellText: 'rgba(15,23,42,0.45)',
    // Sobre fondo claro el amarillo no contrasta: se usa un ámbar oscuro.
    amber: '#b45309',
  },
  cream: {
    text: '#0B1A30', soft: 'rgba(11,26,48,0.6)', faint: 'rgba(11,26,48,0.4)',
    border: 'rgba(11,26,48,0.14)', cell: 'rgba(11,26,48,0.05)',
    cellText: 'rgba(11,26,48,0.45)',
    // Mismo criterio que el claro: ámbar oscuro, legible sobre el beige.
    amber: '#b45309',
  },
};

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
/*
  Bloques SÓLO para el mapa de horas rediseñado (accesibilidad): seis horas por
  fila exactas, para que ninguna celda caiga huérfana a un segundo renglón (antes
  Tarde tenía 7 y la 6ª quedaba sola). NO sustituye a `HOUR_BLOCKS` de
  `advisorOnboarding.js` —ésa define la agrupación estándar del día para el resto
  de la app—; aquí sólo cambia cómo se DIBUJA la grilla. La hora sigue siendo un
  número 0-23 y lo que se guarda es idéntico: no se toca ninguna lógica.
    Mañana 6–11 · Tarde 12–17 · Noche 18–23 · (Madrugada 0–5, opcional).
*/
const GRID_BLOCKS = [
  { key: 'morning', label: 'Mañana', verb: 'la mañana', hours: [6, 7, 8, 9, 10, 11] },
  { key: 'afternoon', label: 'Tarde', verb: 'la tarde', hours: [12, 13, 14, 15, 16, 17] },
  { key: 'evening', label: 'Noche', verb: 'la noche', hours: [18, 19, 20, 21, 22, 23] },
];
const GRID_DAWN_BLOCK = {
  key: 'dawn', label: 'Madrugada', verb: 'la madrugada', hours: [0, 1, 2, 3, 4, 5],
};

/*
  Horarios rápidos (presets): un toque marca todo el rango. Si el rango ya está
  seleccionado exactamente, un segundo toque lo vacía (toggle). Las horas que
  componen cada preset son el contrato con el pedido; el resto del mapa sigue
  editable hora por hora después.
*/
const SCHEDULE_PRESETS = [
  { key: 'full', label: 'Mañana y Tarde', hint: '9 am a 7 pm', hours: [9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19] },
  { key: 'morning', label: 'Solo Mañanas', hint: '9 am a 2 pm', hours: [9, 10, 11, 12, 13, 14] },
  { key: 'afternoon', label: 'Solo Tardes', hint: '3 pm a 8 pm', hours: [15, 16, 17, 18, 19, 20] },
];

/** La hora con su número grande y el am/pm, para la celda accesible. */
function hourParts(hour) {
  const num = hour % 12 === 0 ? 12 : hour % 12;
  const period = hour < 12 ? 'am' : 'pm';
  return { num: String(num), period };
}

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
                 text-[color:var(--ob-faint)] transition-colors hover:bg-[var(--ob-cell)] hover:text-[color:var(--ob-soft)]
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
      <p className="text-lg font-semibold text-[color:var(--ob-text)]">{title}</p>
      {option.subtitle && (
        <p className="mt-1 text-xs leading-relaxed text-[color:var(--ob-faint)]">{option.subtitle}</p>
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
        className="max-w-md text-xl font-light leading-snug text-[color:var(--ob-text)] sm:text-2xl"
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
        <div className="flex flex-col divide-y divide-[color:var(--ob-border)]">
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
          <p className="mt-4 flex items-center justify-center gap-1.5 text-xs text-[color:var(--ob-faint)]">
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
        className="max-w-lg text-2xl font-light leading-relaxed text-[color:var(--ob-text)] sm:text-3xl"
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
          className="w-full border-b border-[color:var(--ob-border)] bg-transparent pb-2 text-center
                     text-xl text-[color:var(--ob-text)] caret-indigo-400 transition-colors
                     placeholder:text-[color:var(--ob-faint)] focus:border-indigo-500 focus:outline-none"
        />

        <button
          type="submit"
          disabled={!isValid}
          className="mt-8 w-full rounded-full bg-[var(--ob-accent)] px-8 py-3 text-sm
                     font-semibold text-[color:var(--ob-on-accent)] shadow-lg
                     transition-all hover:brightness-105 active:scale-95
                     disabled:cursor-not-allowed disabled:bg-[var(--ob-cell)]
                     disabled:text-[color:var(--ob-faint)] disabled:shadow-none"
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
        className="max-w-lg text-2xl font-light leading-relaxed text-[color:var(--ob-text)] sm:text-3xl"
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
        className={`mt-10 text-base font-semibold text-[color:var(--ob-text)] transition-opacity
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
  const { num, period } = hourParts(hour);
  return (
    <button
      type="button"
      onClick={() => onToggle(hour)}
      aria-pressed={isSelected}
      aria-label={`${formatHourLabel(hour)}: ${isSelected ? 'disponible' : 'ocupado'}`}
      /*
        Celda accesible: número grande + "am/pm" debajo (para que un adulto mayor
        vea que es una HORA, no un día del calendario), alto mínimo cómodo (52px) y
        borde SIEMPRE visible —también sin seleccionar— para que se note que es un
        botón tocable sobre el fondo. Seleccionada: acento del tema con texto de
        alto contraste.
      */
      className={`flex min-h-[52px] flex-col items-center justify-center rounded-xl border
                 leading-none transition-all active:scale-95 ${
        isSelected
          ? 'border-[var(--ob-accent)] bg-[var(--ob-accent)] text-[color:var(--ob-on-accent)] shadow-md'
          : 'border-[color:var(--ob-border)] bg-[var(--ob-cell)] text-[color:var(--ob-text)] hover:border-[var(--ob-accent)]'
      }`}
    >
      <span className="text-base font-bold">{num}</span>
      <span className={`mt-0.5 text-[10px] font-semibold uppercase tracking-wide ${
        isSelected ? 'opacity-90' : 'text-[color:var(--ob-soft)]'
      }`}
      >
        {period}
      </span>
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
      <div className="mb-2 flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-sm font-bold uppercase
                         tracking-wide text-[color:var(--ob-text)]"
        >
          <Icon size={14} aria-hidden="true" />
          {block.label}
        </span>

        {/*
          Pastilla clara en vez del ambiguo "Todo libre": dice qué hace. Marca
          todo el bloque, o lo quita si ya está completo. Usa el acento del tema
          para leerse como una acción, no como texto apagado.
        */}
        <button
          type="button"
          onClick={() => onToggleBlock(block.hours, !allSelected)}
          className="rounded-full border border-[color:var(--ob-border)] px-2.5 py-1
                     text-[11px] font-semibold text-[color:var(--ob-text)]
                     transition-colors hover:border-[var(--ob-accent)]"
        >
          {allSelected ? 'Quitar bloque' : `Marcar toda ${block.verb}`}
        </button>
      </div>

      <div className="grid grid-cols-6 gap-2">
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

/** ¿El conjunto de horas seleccionadas coincide EXACTO con las de un preset? */
function presetMatches(presetHours, selected) {
  if (presetHours.length !== selected.length) return false;
  return presetHours.every((h) => selected.includes(h));
}

/** Botón de horario rápido (preset): etiqueta grande + rango en pequeño. */
function PresetButton({ preset, active, onToggle }) {
  return (
    <button
      type="button"
      onClick={() => onToggle(preset)}
      aria-pressed={active}
      className={`flex min-h-[56px] flex-col items-center justify-center rounded-xl border
                 px-2 py-2 text-center leading-tight transition-all active:scale-95 ${
        active
          ? 'border-[var(--ob-accent)] bg-[var(--ob-accent)] text-[color:var(--ob-on-accent)] shadow-md'
          : 'border-[color:var(--ob-border)] bg-[var(--ob-cell)] text-[color:var(--ob-text)] hover:border-[var(--ob-accent)]'
      }`}
    >
      <span className="text-[13px] font-bold">{preset.label}</span>
      <span className={`mt-0.5 text-[11px] font-medium ${
        active ? 'opacity-90' : 'text-[color:var(--ob-soft)]'
      }`}
      >
        {preset.hint}
      </span>
    </button>
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
    () => GRID_DAWN_BLOCK.hours.some((h) => initialHours.includes(h)),
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

  /*
    Toca un preset: si ya está puesto EXACTO lo vacía, si no, aplica su rango.
    Reemplaza las horas por las del preset (no las suma) para que "Solo Mañanas"
    signifique de verdad sólo esas, no las de antes más éstas.
  */
  const applyPreset = (preset) => {
    setSelected((current) => (
      presetMatches(preset.hours, current) ? [] : [...preset.hours]
    ));
  };

  const hasHours = selected.length > 0;

  return (
    <div className="flex min-h-screen w-full flex-col items-center justify-center px-6 py-8 text-center">
      <p className="sr-only">{`${text} ${hintText}`}</p>

      {/* Encabezado claro, de alto contraste. */}
      <h2
        className="max-w-sm text-2xl font-bold leading-snug text-[color:var(--ob-text)]"
        aria-hidden="true"
      >
        {typed}
        <Caret show={isTyping} />
      </h2>

      <p
        className={`mt-2 max-w-sm text-[15px] leading-snug text-[color:var(--ob-soft)]
                    transition-opacity duration-700
                    ${isTyping ? 'opacity-0' : 'opacity-100'}`}
        aria-hidden="true"
      >
        Elige un horario rápido arriba o toca las horas exactas abajo.
      </p>

      <div
        className={`mt-5 w-full max-w-md space-y-5 transition-opacity duration-700
                    ${isTyping ? 'pointer-events-none opacity-0' : 'opacity-100'}`}
        aria-hidden={isTyping}
      >
        {/* ── Horarios rápidos (presets) ── */}
        <div className="grid grid-cols-3 gap-2">
          {SCHEDULE_PRESETS.map((preset) => (
            <PresetButton
              key={preset.key}
              preset={preset}
              active={presetMatches(preset.hours, selected)}
              onToggle={applyPreset}
            />
          ))}
        </div>

        {/* ── Cuadrícula de horas, 6 por fila, siempre visible ── */}
        <div className="space-y-4 text-left">
          {GRID_BLOCKS.map((block) => (
            <HourBlockRow
              key={block.key}
              block={block}
              selectedHours={selected}
              onToggleHour={toggleHour}
              onToggleBlock={toggleBlock}
            />
          ))}

          {/*
            Madrugada, opcional detrás de un botón: la franja menos común, sólo
            ocupa espacio si alguien la pide. Mismo comportamiento que antes.
          */}
          {showDawn ? (
            <HourBlockRow
              block={GRID_DAWN_BLOCK}
              selectedHours={selected}
              onToggleHour={toggleHour}
              onToggleBlock={toggleBlock}
            />
          ) : (
            <button
              type="button"
              onClick={() => setShowDawn(true)}
              className="flex items-center gap-1 text-sm font-medium text-[color:var(--ob-soft)]
                         transition-colors hover:text-[color:var(--ob-text)]"
            >
              <ChevronDown size={14} aria-hidden="true" />
              Mostrar horario de madrugada
            </button>
          )}
        </div>

        {/* Contador de alto contraste. */}
        <p className={`text-[15px] font-semibold ${
          hasHours ? 'text-[color:var(--ob-text)]' : 'text-[color:var(--ob-soft)]'
        }`}
        >
          {hasHours
            ? `✅ Has seleccionado ${selected.length} ${selected.length === 1 ? 'hora' : 'horas'} para tu negocio.`
            : 'Toca al menos una hora para continuar.'}
        </p>

        <button
          type="button"
          onClick={() => onContinue(selected)}
          disabled={!hasHours}
          className="w-full rounded-full bg-[var(--ob-accent)] px-8 py-4 text-base
                     font-bold text-[color:var(--ob-on-accent)] shadow-lg
                     transition-all hover:brightness-105 active:scale-95
                     disabled:cursor-not-allowed disabled:bg-[var(--ob-cell)]
                     disabled:text-[color:var(--ob-faint)] disabled:shadow-none"
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
        className="max-w-md text-xl font-light leading-snug text-[color:var(--ob-text)] sm:text-2xl"
        aria-hidden="true"
      >
        {typed}
        <Caret show={isTyping} />
      </p>

      <p
        className={`mt-4 max-w-sm text-sm leading-relaxed text-[color:var(--ob-soft)]
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
                     px-5 py-2 text-xs font-semibold text-[color:var(--ob-amber)]
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
export default function OnboardingFlow({
  userId, onProfileSaved, onSimulateApproval, onExit,
}) {
  const [step, setStep] = useState(1);
  const [busyValue, setBusyValue] = useState(null);

  /*
    Tema elegido en la bienvenida: pinta el fondo y, vía variables CSS, el texto.
    Vive en estado (no sólo lectura) para que el conmutador flotante lo cambie en el
    acto, sin recargar.
  */
  const [themeValue, setThemeValue] = useState(readAppTheme);
  const theme = themeFor(themeValue);
  const pal = OB_PALETTE[theme.value] ?? OB_PALETTE.dark;

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

  /*
    Pantalla fija: se bloquea el scroll del documento mientras el onboarding está
    montado, para que no se pueda arrastrar arriba/abajo. El contenedor conserva un
    scroll interno de respaldo por si un paso largo (el mapa de 24 horas) no cabe en un
    teléfono chico. Se restaura al salir.
  */
  useEffect(() => {
    const { body, documentElement: html } = document;
    const prev = { body: body.style.overflow, html: html.style.overflow };
    body.style.overflow = 'hidden';
    html.style.overflow = 'hidden';
    return () => {
      body.style.overflow = prev.body;
      html.style.overflow = prev.html;
    };
  }, []);

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
      /* Pantalla fija al viewport, con scroll interno de respaldo para pasos largos. */
      className={`relative flex h-[100dvh] w-full items-center justify-center overflow-y-auto
                  px-4 py-10 ${theme.bgStyle ? '' : theme.bg}`}
      style={{
        ...(theme.bgStyle ?? {}),
        // Variables heredadas por todos los pasos (texto, bordes, celdas del mapa).
        '--ob-text': pal.text,
        '--ob-soft': pal.soft,
        '--ob-faint': pal.faint,
        '--ob-border': pal.border,
        '--ob-cell': pal.cell,
        '--ob-cell-text': pal.cellText,
        '--ob-amber': pal.amber,
        '--ob-accent': theme.accent,
        '--ob-on-accent': theme.onAccent,
      }}
      onClick={() => setFastTyping(true)}
    >
      {/*
        Conmutador de tema, flotante en la esquina inferior. Esquina distinta a la
        flecha "Atrás" (arriba izq.) y a "¿No es tu cuenta?" (arriba der.) para no
        encimarse. `stopPropagation`: tocarlo no debe, de paso, acelerar la máquina
        de escribir (el onClick del contenedor raíz).
      */}
      <div
        className="fixed bottom-5 left-1/2 z-[60] -translate-x-1/2"
        onClick={(e) => e.stopPropagation()}
      >
        <ThemeSwitch value={themeValue} onChange={setThemeValue} />
      </div>

      {/*
        Del Paso 2 al 9: el Paso 1 no tiene pregunta anterior a la que
        volver, y el Paso 10 (Sala de Análisis) es una vista terminal —ver
        la nota junto a `BackArrow`.
      */}
      {step > 1 && step < 10 && <BackArrow onBack={goBack} />}

      {/*
        Salida por si esta no es la cuenta correcta. Va discreta y sólo en el
        primer paso: antes no existía, y entrar con la cuenta equivocada dejaba
        a la persona encerrada en el cuestionario sin manera de cerrar sesión.
      */}
      {step === 1 && onExit && (
        <button
          type="button"
          onClick={onExit}
          className="absolute right-4 top-5 z-20 text-[11px] font-light text-[color:var(--ob-faint)]
                     underline-offset-2 hover:text-[color:var(--ob-soft)] hover:underline"
        >
          ¿No es tu cuenta? Salir
        </button>
      )}

      <TypewriterSpeedContext.Provider value={fastTyping ? 2 : 1}>
      {/*
        TODOS los pasos —incluidos el 1 al 3— viven dentro del mismo
        `<motion.div>`, y nunca como hermanos sueltos de él.

        Antes los Pasos 1 a 3 se dibujaban fuera de este contenedor, y el
        `<motion.div>` de abajo (`className="flex w-full flex-col
        items-center"`, con `w-full`) igual se montaba vacío junto a ellos
        —`AnimatePresence`/`motion.div` no dejan de existir sólo porque no
        haya nada que mostrar en su interior para el paso actual—. El
        padre de los dos es `flex` en fila (`justify-center`, sin
        `flex-col`), así que dos hijos pidiendo cada uno el 100% del ancho
        se repartían el espacio a la mitad: el contenido real quedaba
        comprimido en la mitad izquierda de la pantalla, con un hueco vacío
        idéntico a la derecha —el "se me fue la pantalla toda la
        izquierda" del reporte—. Con un único hijo compartido por los diez
        pasos, nunca hay un segundo elemento con quien repartir ese ancho.
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
