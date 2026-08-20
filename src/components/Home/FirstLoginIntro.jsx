import { useState, useEffect, useMemo } from 'react';
import {
  Trophy, User, BookUser, Users, Loader2, CheckCircle2, AlertTriangle, ArrowRight, ListChecks,
  Plus, ChevronRight, Phone,
} from 'lucide-react';
import useTypewriter, { TypewriterSpeedContext } from '../../lib/useTypewriter';
import { writeSafeZone } from '../../data/safeZone';
import { useSession } from '../../context/SessionContext';
import { useEvents, todayKey } from '../../context/EventContext';
import { joinPromotoriaByCode, describeError } from '../../data/promotoriaRepo';
import { normalizeCode, isValidCode, explainCode } from '../../data/promotoriaCode';
import BottomSheet from '../Layout/BottomSheet';

/** Cuánto tarda cada fundido de esta pantalla (el de la recompensa hacia "Iniciar", y el del overlay completo al presionarlo), en ms — usado tanto en las clases de Tailwind como en los temporizadores que esperan a que termine antes de avanzar. */
const FADE_OUT_MS = 700;
/*
  Cuánto se queda la Recompensa en pantalla —confeti y "+1 Punto"— antes de
  desvanecerse sola y dejar sólo el botón "Iniciar". El valor es el pedido
  exacto de la especificación (4.5s), no un número redondeado a ojo.
*/
const REWARD_AUTO_MS = 4500;
/*
  Tamaño de la meta que anuncia el logro tipo consola ("N / 200 · Proyecto
  200"). Es un número fijo del propio logro —el nombre de la campaña de
  arranque, no una medición— y por eso vive separado del conteo real de
  prospectos capturados: el numerador sí es honesto (`capturedCount` en
  `RewardStep`, nunca inventado), el denominador es la meta declarada de
  este logro en particular.
*/
const PROJECT_GOAL = 200;

const STEP1_TEXT_TEMPLATE = (name) => `Hola, ${name}. Todo está configurado y listo para que inicies tu camino.`;

/*
  Mensaje del Paso 2, uno por cada inquietud declarada en el Onboarding
  (`CONCERN_OPTIONS`, `advisorOnboarding.js`) — cada tono responde a la
  preocupación exacta que esa persona nombró, sin repetirla de frente
  (ninguno dice "tienes miedo al rechazo" ni "no sabes organizarte"), igual
  criterio que ya se aplicó al mensaje de "rejection". `DEFAULT` es el
  respaldo si `inquietud` llega vacía o con un valor que no está en el
  mapa (cuenta vieja, sin `advisor_profile_data` migrado) — nunca se deja
  a alguien sin Paso 2 por un dato ausente.
*/
const STEP2_TEXT_BY_CONCERN = {
  rejection: 'El secreto del éxito es el sistema. Te guiaremos paso a paso para que '
    + 'conectar con tu entorno sea una experiencia fluida y natural.',
  technical: 'El secreto de los grandes asesores no es saberlo todo de memoria, es tener '
    + 'las herramientas correctas. Tu asistente está equipado con los guiones, cálculos y '
    + 'estrategias que necesitas. Tú pon la empatía, nosotros ponemos la técnica.',
  organization: 'A partir de hoy, olvídate de pensar qué hacer a continuación. Tu asistente '
    + 'estructurará tu día de forma automática. Te diremos a quién contactar, cuándo darle '
    + 'seguimiento y qué paso sigue. Solo tienes que ejecutar.',
  none: 'Excelente actitud. Sabemos que vienes listo para romperla. Este espacio está '
    + 'diseñado para acelerar tus resultados y escalar tus ventas sin burocracia. Vamos '
    + 'directo a la acción.',
};
const DEFAULT_STEP2_TEXT = STEP2_TEXT_BY_CONCERN.rejection;

/**
 * Texto del Paso 2 según la inquietud declarada — nunca `undefined`: cae al
 * mensaje de "rejection" (el más neutro de los cuatro) si `inquietud` no
 * coincide con ninguna clave conocida.
 */
function step2TextFor(inquietud) {
  return STEP2_TEXT_BY_CONCERN[inquietud] ?? DEFAULT_STEP2_TEXT;
}

/*
  Cuántos slots pide el Paso 3, según el tamaño de mercado declarado
  (`MARKET_OPTIONS`, `advisorOnboarding.js`): a quien apenas tiene un
  mercado cálido pequeño no se le exige la misma lista que a quien ya
  declaró más de 50 contactos — pedirle 5 nombres a alguien con menos de
  20 sería fricción sin sentido, y pedirle sólo 3 a alguien con más de 50
  desaprovecharía la ventaja que esa persona ya tiene. El respaldo
  (`DEFAULT_SLOT_COUNT`) es el mínimo de los tres, no el máximo: un dato
  ausente no debe exigir más de lo que se exigiría con la opción más
  conservadora.
*/
const SLOT_COUNT_BY_MARKET = {
  under_20: 3,
  between_20_50: 4,
  over_50: 5,
};
const DEFAULT_SLOT_COUNT = SLOT_COUNT_BY_MARKET.under_20;

/** Cuántos slots pide el Paso 3 según el mercado declarado — 3 por defecto si `mercado` no coincide con ninguna opción conocida. */
function slotCountFor(mercado) {
  return SLOT_COUNT_BY_MARKET[mercado] ?? DEFAULT_SLOT_COUNT;
}

const step3Text = (slotCount) => 'Comencemos por tus primeros apoyos. Para desbloquear tu '
  + `agenda, ingresa a ${slotCount} personas cercanas a ti.`;

/*
  ── Rama "Nuevo Profesional" con carga administrativa ──

  Quien en el Onboarding marcó el perfil "Nuevo Profesional"
  (`advisorProfileData.perfil === 'new_professional'`) y, como su cuello de
  botella, "Me consume la carga administrativa y el servicio"
  (`advisorProfileData.inquietud === 'admin_overload'`, ver
  `PROFESSIONAL_BOTTLENECK_OPTIONS` en `advisorOnboarding.js`) no necesita
  otros tres prospectos: ya tiene cartera. Lo que le falta es vaciar la
  libreta de pendientes que trae encima, así que el Paso 3 cambia entero de
  propósito — de "consigue tus primeros apoyos" a "descarga tu mente" — sin
  tocar la posición del paso ni el resto del recorrido (Recompensa, Unirse
  a un equipo, Iniciar siguen en el mismo orden para las dos ramas).

  Reutiliza las mismas claves de `advisorData` que ya usa el resto de esta
  pantalla (`inquietud`, `mercado`) en vez de columnas nuevas — mismo
  criterio que ya se aplicó en la ramificación del Onboarding
  (`OnboardingFlow.jsx`): para el perfil profesional, `mercado` no guarda
  un tamaño de mercado sino el tamaño de cartera declarado en el Paso 5
  (`PORTFOLIO_SIZE_OPTIONS`), con sus propias claves (`under_50`,
  `between_50_150`, `over_150`) — no confundir con `SLOT_COUNT_BY_MARKET`
  de arriba, que usa las claves del mercado del "Nuevo Asesor"
  (`under_20`...). Son dos mapas separados a propósito, aunque ambos
  respondan "cuántos slots" a partir de una misma prop (`mercado`): las
  claves de un perfil nunca coinciden con las del otro, así que no hay
  riesgo real de choque, pero conviene un nombre y un mapa distintos para
  que quede claro de un vistazo cuál pertenece a cuál rama.
*/
function isAdminOverloadBranch(perfil, inquietud) {
  return perfil === 'new_professional' && inquietud === 'admin_overload';
}

/** Cuántos slots de tareas pide el Paso 3, según la cartera declarada (Paso 5, perfil profesional). */
const SLOT_COUNT_BY_PORTFOLIO = {
  under_50: 5,
  between_50_150: 8,
  over_150: 10,
};
const DEFAULT_TASK_SLOT_COUNT = SLOT_COUNT_BY_PORTFOLIO.under_50;

/** Cuántos slots de tareas pide el Paso 3 según la cartera declarada — 5 por defecto si `mercado` no coincide con ninguna opción conocida. */
function taskSlotCountFor(mercado) {
  return SLOT_COUNT_BY_PORTFOLIO[mercado] ?? DEFAULT_TASK_SLOT_COUNT;
}

/*
  Regla anti-fricción: aunque se dibujen 5, 8 o 10 slots según la cartera,
  no hace falta llenarlos todos para avanzar — sólo los primeros que la
  persona recuerde de memoria en el momento. Pedir la lista completa
  convertiría un paso pensado para "vaciar la mente rápido" en un
  formulario largo, justo lo que este perfil ya dijo que le sobra.
*/
const MIN_FILLED_TASKS = 3;

const TASK_STEP_TITLE = 'Descarga tu mente';
const TASK_STEP_TEXT = 'Vamos a ganar tus primeros puntos. Vacía esos pendientes que tienes '
  + 'en tu libreta y pásalos a tu nuevo asistente.';
const TASK_STEP_SUBTEXT = 'Agilicemos tu horario. Escribe tus próximas acciones y nosotros '
  + 'nos encargamos de acomodarlas en tu agenda.';

/**
 * Tarea vacía: la forma exacta de cada slot del Paso 3 en la rama de carga
 * administrativa: categoría, nombre, teléfono y hora.
 *
 * `hora` no arranca vacía en la práctica: `TaskCaptureStep` la llena con
 * `defaultTaskTime(index)` al crear cada slot —una sugerencia editable, no
 * una casilla en blanco—, así la persona siempre ve a qué hora quedaría su
 * pendiente en el calendario sin tener que pensarlo, y puede corregirla si
 * ya sabe cuándo es de verdad. `telefono` es opcional: no todas las
 * actividades tienen a alguien a quien llamar (por ejemplo, un trámite
 * interno), así que no bloquea el guardado.
 */
const EMPTY_TASK = { tipo: 'call', descripcion: '', telefono: '', hora: '' };

/** Hora de respaldo si `hora` llega vacía al guardar (no debería pasar: cada slot nace con `defaultTaskTime`). */
const DEFAULT_TASK_HOUR = '09:00';

/*
  Catálogo de acciones agendables — lista corta y cerrada, sin puntos: cada
  entrada es una acción que se agenda, nunca un resultado (por eso ya no
  aparecen "Referido obtenido", "Póliza emitida", "Prospecto nuevo"...,
  esos son resultados de una acción, no la acción en sí — se reportan en
  el flujo posterior, cuando la actividad ya sucedió, no aquí al crearla).

  El orden es el exacto pedido: no es alfabético ni por frecuencia de uso,
  así que no hay que "arreglarlo" ordenándolo de otra forma.
*/
const TASK_TYPE_OPTIONS = [
  { value: 'call', label: 'Llamada' },
  { value: 'message_followup', label: 'Seguimiento' },
  { value: 'appointment', label: 'Cita' },
  { value: 'initial_meeting', label: 'Cita Inicial' },
  { value: 'closing_meeting', label: 'Cita de Cierre' },
  { value: 'policy_paperwork', label: 'Trámite de Póliza' },
  { value: 'collection', label: 'Cobro' },
  { value: 'other', label: 'Otro' },
];

/** Etiqueta legible de una categoría de tarea; respaldo al valor crudo si alguna vez llega uno fuera de la lista (dato viejo o corrupto). */
function taskTypeLabel(value) {
  return TASK_TYPE_OPTIONS.find((option) => option.value === value)?.label ?? value;
}

/*
  Cero puntos por crear la tarea: agendar una acción no es el logro, es
  sólo la promesa de hacerla. El punto de verdad se otorga más adelante,
  en el flujo de resultados, cuando la persona marca qué pasó de verdad
  con esa llamada, cita o trámite — es ahí, y no aquí, donde debería vivir
  el cálculo por resultado el día que exista. `continueTaskCapture`
  (`FirstLoginIntro`) no suma nada por tarea capturada: el único punto que
  otorga esta pantalla es el fijo de bienvenida por terminar el
  Onboarding, igual en las dos ramas.
*/

/**
 * Hora sugerida de la tarea número `index` (0-indexado): 9:00 a. m. y
 * media hora más por cada una, para que las tareas capturadas de golpe no
 * queden todas apiladas a la misma hora en la agenda. Ya no es un campo
 * que la persona vea ni edite en este paso —el slot sólo pide categoría y
 * nombre—, así que sólo sirve para que `continueTaskCapture` reparta las
 * horas al mandarlas a la Agenda real.
 */
function defaultTaskTime(index) {
  const totalMinutes = 9 * 60 + index * 30;
  const hours = Math.floor(totalMinutes / 60) % 24;
  const minutes = totalMinutes % 60;
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(hours)}:${pad(minutes)}`;
}

/** "+ 1 Punto", "+ 2.5 Puntos": entero sin decimales, fracción con uno solo; singular sólo cuando vale exactamente 1. */
function formatPoints(amount) {
  const value = Number.isInteger(amount) ? String(amount) : amount.toFixed(1);
  const label = amount === 1 ? 'Punto' : 'Puntos';
  return `+ ${value} ${label}`;
}

/*
  Aclaración secundaria, no la instrucción principal — mismo criterio que
  `SCHEDULE_HINT_TEXT` en `OnboardingFlow.jsx`: entra con fade-in aparte, sin
  máquina de escribir, para no competir por atención con el texto de arriba.
  Es también la promesa que hace posible pedir un teléfono en este paso sin
  fricción: nadie va a usarlo todavía.
*/
const STEP3_SUBTEXT = 'No haremos nada con ellos hoy ni te pediremos que les llames. Solo '
  + 'estamos preparando el terreno.';

/*
  Paso 5 — Unirse a un equipo de trabajo. Vive después de la recompensa y
  antes de "Iniciar": ya se ganó el punto, así que este paso no condiciona
  nada de eso — es una invitación aparte, con su propia salida ("Saltar por
  ahora"), para quien ya tiene el código de su promotoría a la mano.
*/
const STEP5_TEXT = '¿Ya tienes el código de tu promotoría? Únete a tu equipo de trabajo.';
const STEP5_SUBTEXT = 'Si no lo tienes a la mano, puedes hacerlo después desde tu perfil.';

/*
  Resplandor compartido por los botones de avance (Continuar, Entendido,
  Continuar del Paso 3, Iniciar): sobre el fondo `bg-slate-950`, un botón
  sólo con `shadow-lg` se pierde entre el resto del contraste oscuro de la
  pantalla — el glow es lo que le dice a la vista "aquí es donde se toca"
  sin depender de que el color del botón ya destaque por sí solo. Índigo, y
  no el ámbar de `RewardStep`: ámbar es el color de la recompensa (el punto
  que se gana), índigo es el de la acción que avanza el recorrido —
  colores duplicados confundirían cuál de los dos significa qué. El rgba es
  el mismo `indigo-600` que ya pinta el fondo del botón (`#4f46e5` →
  `rgb(79,70,229)`), sólo con más opacidad en el resplandor del `hover` para
  reforzar la respuesta al tacto.
*/
const GLOW_BUTTON_CLASS = 'shadow-[0_0_15px_rgba(79,70,229,0.6)] '
  + 'hover:shadow-[0_0_25px_rgba(79,70,229,0.8)] transition-shadow duration-300';

/** Colores del confeti — mismo set que ya usa `Celebration.jsx`, para no inventar una paleta nueva sólo para esta pantalla. */
const CONFETTI_COLORS = [
  'bg-amber-400', 'bg-emerald-400', 'bg-indigo-400',
  'bg-rose-400', 'bg-cyan-300', 'bg-violet-400',
];
const CONFETTI_PIECES = 50;

/** Prospecto vacío: la forma exacta de cada slot antes de llenarse, a mano o desde la agenda del teléfono. */
const EMPTY_PROSPECT = { nombre: '', telefono: '' };

/**
 * ¿El navegador soporta el selector nativo de contactos (Contact Picker
 * API)? Sólo Chrome/Edge en Android la implementan hoy — en cualquier otro
 * navegador `navigator.contacts` no existe, y el botón "Elegir desde mi
 * agenda" simplemente no se dibuja (ver `ProspectCaptureStep`): el Slot
 * manual sigue siendo el único camino, no una alternativa degradada.
 */
function isContactPickerSupported() {
  return typeof navigator !== 'undefined' && 'contacts' in navigator
    && typeof window !== 'undefined' && 'ContactsManager' in window;
}

/**
 * Cursor parpadeante compartido por los pasos con máquina de escribir,
 * igual que el de `OnboardingFlow.jsx` — se repite aquí, y no se importa de
 * allá, porque son dos flujos que no comparten ciclo de vida ni deberían
 * acoplarse por un detalle visual tan pequeño.
 */
function Caret({ show }) {
  if (!show) return null;
  return <span className="animate-pulse text-indigo-400">|</span>;
}

/** Paso 1 — Saludo neutral, sin ninguna referencia todavía a la inquietud declarada. */
function GreetingStep({ name, onContinue }) {
  const { typed, isTyping } = useTypewriter(STEP1_TEXT_TEMPLATE(name));

  return (
    <div className="flex flex-col items-center px-6 text-center">
      <p className="sr-only">{STEP1_TEXT_TEMPLATE(name)}</p>
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
        className={`mt-10 rounded-full bg-indigo-600 px-8 py-3 text-sm font-semibold text-white
                    transition-opacity duration-700 hover:bg-indigo-500 active:scale-95
                    ${GLOW_BUTTON_CLASS}
                    ${isTyping ? 'pointer-events-none opacity-0' : 'opacity-100'}`}
      >
        Continuar
      </button>
    </div>
  );
}

/**
 * Paso 2 — Enfoque empoderador, en un solo mensaje: habla del sistema que
 * va a guiar el arranque, sin nombrar de frente la inquietud declarada.
 * `text` ya viene resuelto por `step2TextFor(inquietud)` desde
 * `FirstLoginIntro` — este componente no decide el tono, sólo lo dibuja. El
 * botón se enciende al terminar de escribirse, igual que en el Paso 1.
 */
function EmpowermentStep({ text, onContinue }) {
  const { typed, isTyping } = useTypewriter(text);

  return (
    <div className="flex flex-col items-center px-6 text-center">
      <p className="sr-only">{text}</p>
      <p
        className="max-w-lg text-xl font-light leading-snug text-white sm:text-2xl"
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
        className={`mt-8 rounded-full bg-indigo-600 px-8 py-3 text-sm font-semibold text-white
                    transition-opacity duration-700 hover:bg-indigo-500 active:scale-95
                    ${GLOW_BUTTON_CLASS}
                    ${isTyping ? 'pointer-events-none opacity-0' : 'opacity-100'}`}
      >
        Entendido
      </button>
    </div>
  );
}

/**
 * Un slot del Paso 3: vacío (borde punteado, invita a tocarlo), en edición
 * (dos campos compactos, uno al lado del otro) o lleno (tarjeta sólida con
 * el nombre y, si lo trae, el teléfono debajo en gris). Los tres estados
 * son el mismo componente y no tres — nunca hay que sincronizar por
 * separado "cómo se ve vacío" y "cómo se ve editándose".
 *
 * El cierre de la edición va en el contenedor, no en cada input: un
 * `onBlur` en el campo de teléfono nada más se dispararía también al
 * tabular del nombre al teléfono *dentro del mismo slot*, cerrando la
 * edición a medio llenar. Comprobando `relatedTarget` contra el propio
 * contenedor, sólo se cierra cuando el foco de verdad sale del slot —click
 * afuera, Tab hacia el siguiente, o el botón "Continuar".
 */
function ProspectSlot({ index, value, isEditing, onEdit, onChange }) {
  const isFilled = Boolean(value.nombre.trim());

  if (isEditing) {
    return (
      <div
        className="flex h-14 items-center gap-2 rounded-xl border border-indigo-500/50
                   bg-slate-800/50 px-3"
        onBlur={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget)) onEdit(null);
        }}
      >
        <User size={16} className="shrink-0 text-slate-500" aria-hidden="true" />

        <label className="sr-only" htmlFor={`prospect-name-${index}`}>
          {`Nombre del prospecto ${index + 1}`}
        </label>
        <input
          id={`prospect-name-${index}`}
          autoFocus
          value={value.nombre}
          onChange={(event) => onChange(index, { ...value, nombre: event.target.value })}
          placeholder="Nombre"
          autoComplete="off"
          enterKeyHint="next"
          className="min-w-0 flex-1 bg-transparent text-sm text-white placeholder:text-slate-500
                     focus:outline-none"
        />

        <label className="sr-only" htmlFor={`prospect-phone-${index}`}>
          {`Teléfono del prospecto ${index + 1}`}
        </label>
        <input
          id={`prospect-phone-${index}`}
          value={value.telefono}
          onChange={(event) => onChange(index, { ...value, telefono: event.target.value })}
          placeholder="Teléfono"
          type="tel"
          inputMode="tel"
          autoComplete="off"
          enterKeyHint="done"
          className="w-24 shrink-0 border-l border-slate-700 bg-transparent pl-2 text-sm
                     text-white placeholder:text-slate-500 focus:outline-none"
        />
      </div>
    );
  }

  if (isFilled) {
    return (
      <button
        type="button"
        onClick={() => onEdit(index)}
        className="flex h-14 w-full items-center gap-3 rounded-xl border border-slate-700
                   bg-slate-800/50 px-4 text-left transition-colors hover:border-slate-600"
      >
        <User size={16} className="shrink-0 text-slate-400" aria-hidden="true" />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold text-white">
            {value.nombre}
          </span>
          {value.telefono && (
            <span className="block truncate text-xs text-slate-500">{value.telefono}</span>
          )}
        </span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={() => onEdit(index)}
      className="flex h-14 w-full items-center justify-center gap-2 rounded-xl border-2
                 border-dashed border-slate-700 text-sm text-slate-500 transition-colors
                 hover:border-slate-600 hover:text-slate-400"
    >
      <User size={16} aria-hidden="true" />
      Agregar contacto
    </button>
  );
}

/**
 * Paso 3 — Captura de los primeros prospectos, ahora como 3 "slots" en vez
 * de un formulario apilado: cada uno se llena tocándolo (`ProspectSlot`,
 * edición manual compacta) o de una sola vez con el selector nativo de
 * contactos del teléfono, si el navegador lo soporta.
 *
 * "CONTINUAR" exige al menos un nombre entre los slots; "Saltar paso"
 * no exige nada — es la fuga para quien prefiere no capturar a nadie en
 * este momento, y sigue otorgando el punto igual que si los hubiera
 * llenado (la recompensa es por haber cruzado el paso, no por los datos).
 *
 * `slotCount` ya viene resuelto por `slotCountFor(mercado)` desde
 * `FirstLoginIntro` — este componente no decide cuántos slots dibujar,
 * sólo los dibuja.
 */
function ProspectCaptureStep({ slotCount, onContinue, onSkip }) {
  const { typed, isTyping } = useTypewriter(step3Text(slotCount));
  const [showSubtext, setShowSubtext] = useState(false);
  const [prospects, setProspects] = useState(
    () => Array.from({ length: slotCount }, () => ({ ...EMPTY_PROSPECT })),
  );
  const [editingIndex, setEditingIndex] = useState(null);

  // Se calcula una sola vez: el soporte del navegador no cambia mientras
  // esta pantalla está montada.
  const [contactPickerSupported] = useState(isContactPickerSupported);

  useEffect(() => {
    if (isTyping) return undefined;
    const timer = setTimeout(() => setShowSubtext(true), 300);
    return () => clearTimeout(timer);
  }, [isTyping]);

  const updateProspect = (index, next) => {
    setProspects((current) => current.map((p, i) => (i === index ? next : p)));
  };

  /**
   * Abre el selector nativo de contactos y coloca los primeros
   * `slotCount` elegidos en los slots, en el orden en que la persona
   * los seleccionó. Cada contacto puede traer varios teléfonos o ninguno
   * nombre —se toma el primero de cada arreglo, con respaldo a cadena
   * vacía— porque el slot ya sabe mostrarse "lleno" con sólo el nombre.
   *
   * Cancelar el selector, o negar el permiso, lanza `AbortError`/`NotAllowedError`
   * — se ignora en silencio, igual que cancelar cualquier diálogo nativo del
   * sistema: no es un error de la app, es la persona decidiendo no elegir a
   * nadie por ahora.
   */
  const handleOpenContacts = async () => {
    try {
      const picked = await navigator.contacts.select(['name', 'tel'], { multiple: true });
      if (!picked.length) return;

      setProspects((current) => {
        const next = [...current];
        picked.slice(0, slotCount).forEach((contact, index) => {
          next[index] = {
            nombre: contact.name?.[0] ?? '',
            telefono: contact.tel?.[0] ?? '',
          };
        });
        return next;
      });
      setEditingIndex(null);
    } catch {
      // Selector cancelado o permiso negado: no hay nada que capturar.
    }
  };

  const cleanEntries = prospects
    .map((p) => ({ nombre: p.nombre.trim(), telefono: p.telefono.trim() }))
    .filter((p) => p.nombre);
  const isValid = cleanEntries.length > 0;

  return (
    <div className="flex w-full flex-col items-center px-6 text-center">
      <p className="sr-only">{`${step3Text(slotCount)} ${STEP3_SUBTEXT}`}</p>
      <p
        className="max-w-md text-lg leading-snug text-white sm:text-xl"
        aria-hidden="true"
      >
        {typed}
        <Caret show={isTyping} />
      </p>

      <p
        className={`mt-2 max-w-sm text-[11px] leading-snug text-white/40
                    transition-opacity duration-700
                    ${showSubtext ? 'opacity-100' : 'opacity-0'}`}
        aria-hidden="true"
      >
        {STEP3_SUBTEXT}
      </p>

      <div
        className={`mt-6 w-full max-w-md transition-opacity duration-700
                    ${showSubtext ? 'opacity-100' : 'pointer-events-none opacity-0'}`}
        aria-hidden={!showSubtext}
      >
        <div className="space-y-3">
          {prospects.map((value, index) => (
            <ProspectSlot
              key={index}
              index={index}
              value={value}
              isEditing={editingIndex === index}
              onEdit={setEditingIndex}
              onChange={updateProspect}
            />
          ))}
        </div>

        {/*
          Sólo se dibuja donde el navegador de verdad puede abrir el
          selector nativo — en el resto, el slot manual sigue siendo el
          único camino, no un botón que promete algo que va a fallar.
        */}
        {contactPickerSupported && (
          <button
            type="button"
            onClick={handleOpenContacts}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-full
                       border border-slate-700 py-2.5 text-xs font-semibold text-slate-300
                       transition-colors hover:border-slate-600 hover:text-white"
          >
            <BookUser size={14} aria-hidden="true" />
            Elegir desde mi agenda
          </button>
        )}

        <button
          type="button"
          onClick={() => onContinue(cleanEntries)}
          disabled={!isValid}
          className={`mt-5 w-full rounded-full bg-indigo-600 px-8 py-3 text-sm font-semibold
                     uppercase tracking-wide text-white transition-all hover:bg-indigo-500
                     active:scale-95 disabled:cursor-not-allowed disabled:bg-white/[0.06]
                     disabled:text-white/25 disabled:shadow-none
                     ${isValid ? GLOW_BUTTON_CLASS : ''}`}
        >
          Continuar
        </button>

        <button
          type="button"
          onClick={() => onSkip()}
          className="mt-4 block w-full text-sm text-slate-500 transition-colors hover:text-white"
        >
          Saltar paso
        </button>
      </div>
    </div>
  );
}

/**
 * Una fila del Paso 3 en la rama de carga administrativa: vacía (borde
 * punteado, invita a tocarla) o llena (tarjeta sólida con el nombre, la
 * hora, la categoría y, si lo trae, el teléfono) — mismo criterio de dos
 * estados que `ProspectSlot`.
 */
function TaskSlot({ index, value, onOpen }) {
  const isFilled = Boolean(value.descripcion.trim());

  if (isFilled) {
    return (
      <button
        type="button"
        onClick={() => onOpen(index)}
        className="flex h-14 w-full items-center gap-3 rounded-xl border border-slate-700
                   bg-slate-800/50 px-4 text-left transition-colors hover:border-slate-600"
      >
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold text-white">
            {value.descripcion}
          </span>
          <span className="block truncate text-xs text-slate-500">
            {value.hora || DEFAULT_TASK_HOUR} · {taskTypeLabel(value.tipo)}
            {value.telefono && ` · ${value.telefono}`}
          </span>
        </span>
        <ChevronRight size={16} className="shrink-0 text-slate-500" aria-hidden="true" />
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={() => onOpen(index)}
      className="flex h-14 w-full items-center justify-center gap-2 rounded-xl border-2
                 border-dashed border-slate-700 text-sm text-slate-500 transition-colors
                 hover:border-slate-600 hover:text-slate-400"
    >
      <Plus size={16} aria-hidden="true" />
      Agregar actividad
    </button>
  );
}

/**
 * Hoja de edición de una tarea: "Tipo de Acción" (`TASK_TYPE_OPTIONS`, sin
 * ningún texto de puntos junto a él — agendar no otorga nada por sí
 * misma, el resultado real se reporta en otro flujo), nombre del cliente
 * o prospecto, teléfono y hora.
 *
 * `hora` viaja hasta la Agenda real como el horario exacto de esa
 * actividad —no la hora escalonada y genérica que traía cada slot al
 * nacer, ver `defaultTaskTime`—, y `telefono` es lo que en el futuro deja
 * que un recordatorio de esta tarea ofrezca "Llamar" o "Mandar WhatsApp"
 * en vez de sólo notificar que existe.
 *
 * Trabaja sobre un borrador local (`draft`) y no sobre `value` directo:
 * "Cancelar" debe dejar el slot exactamente como estaba, y confirmar cada
 * tecleo contra el estado del padre habría hecho imposible deshacerlo.
 */
function TaskEditorSheet({ isOpen, initialValue, onSave, onClose }) {
  const [draft, setDraft] = useState(initialValue);

  // Cada apertura arranca desde el valor real del slot, no desde lo que
  // haya quedado de una edición cancelada la vez anterior.
  useEffect(() => {
    if (isOpen) setDraft(initialValue);
  }, [isOpen, initialValue]);

  const canSave = Boolean(draft.descripcion.trim());

  const handleSave = () => {
    onSave({
      ...draft,
      descripcion: draft.descripcion.trim(),
      telefono: draft.telefono.trim(),
      hora: draft.hora || DEFAULT_TASK_HOUR,
    });
  };

  return (
    /*
      `zIndexClass="z-[100]"`: esta hoja se abre por encima del overlay de
      `FirstLoginIntro` (`z-[95]`), no de la app normal — con el `z-[60]`
      por omisión de `BottomSheet`, la hoja se dibujaría detrás de ese
      overlay y "Guardar" quedaría inalcanzable al tacto aunque se viera en
      pantalla (mismo patrón que ya resuelve `LeadCaptureModal.jsx` para su
      propio caso de anidamiento).
    */
    <BottomSheet
      isOpen={isOpen}
      onClose={onClose}
      label="Nueva actividad"
      zIndexClass="z-[100]"
    >
      <h2 className="mb-5 text-lg font-bold text-white">Nueva actividad</h2>

      <div className="flex flex-col gap-4 pb-2">
        <div>
          <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider
                             text-slate-500" htmlFor="task-sheet-type"
          >
            Tipo de Acción
          </label>
          <select
            id="task-sheet-type"
            value={draft.tipo}
            onChange={(event) => setDraft((current) => (
              { ...current, tipo: event.target.value }
            ))}
            className="w-full rounded-xl border border-slate-700 bg-slate-800/60 px-3 py-2.5
                       text-sm text-white focus:border-indigo-500 focus:outline-none"
          >
            {TASK_TYPE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider
                             text-slate-500" htmlFor="task-sheet-name"
          >
            Nombre del cliente o prospecto
          </label>
          <input
            id="task-sheet-name"
            value={draft.descripcion}
            onChange={(event) => setDraft((current) => (
              { ...current, descripcion: event.target.value }
            ))}
            placeholder="Ej. Laura Gómez"
            autoComplete="off"
            className="w-full rounded-xl border border-slate-700 bg-slate-800/60 px-3 py-2.5
                       text-sm text-white placeholder:text-slate-500 focus:border-indigo-500
                       focus:outline-none"
          />
        </div>

        {/*
          La hora: llega pre-llenada con `defaultTaskTime(index)` desde
          `TaskCaptureStep` (una sugerencia, no una casilla en blanco), y
          aquí se puede corregir a la hora real del pendiente — es lo que
          hace que la Agenda muestre la hora en que la persona de verdad
          tiene esa actividad, y no una hora escalonada sin sentido.
        */}
        <div>
          <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider
                             text-slate-500" htmlFor="task-sheet-time"
          >
            Hora
          </label>
          <input
            id="task-sheet-time"
            value={draft.hora}
            onChange={(event) => setDraft((current) => (
              { ...current, hora: event.target.value }
            ))}
            type="time"
            className="w-full rounded-xl border border-slate-700 bg-slate-800/60 px-3 py-2.5
                       text-sm text-white [color-scheme:dark] focus:border-indigo-500
                       focus:outline-none"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider
                             text-slate-500" htmlFor="task-sheet-phone"
          >
            Teléfono
          </label>
          <div className="flex items-center gap-2 rounded-xl border border-slate-700
                          bg-slate-800/60 px-3"
          >
            <Phone size={15} className="shrink-0 text-slate-500" aria-hidden="true" />
            <input
              id="task-sheet-phone"
              value={draft.telefono}
              onChange={(event) => setDraft((current) => (
                { ...current, telefono: event.target.value }
              ))}
              placeholder="10 dígitos"
              type="tel"
              inputMode="tel"
              autoComplete="off"
              className="min-w-0 flex-1 bg-transparent py-2.5 text-sm text-white
                         placeholder:text-slate-500 focus:outline-none"
            />
          </div>
        </div>

        <button
          type="button"
          onClick={handleSave}
          disabled={!canSave}
          className={`mt-1 w-full rounded-full bg-indigo-600 px-8 py-3 text-sm font-semibold
                     text-white transition-all hover:bg-indigo-500 active:scale-95
                     disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-white/30
                     ${canSave ? GLOW_BUTTON_CLASS : ''}`}
        >
          Guardar
        </button>
      </div>
    </BottomSheet>
  );
}

/**
 * Paso 3 en la rama de carga administrativa — "Descarga tu mente": en vez
 * de capturar prospectos, la persona vacía sus pendientes en `slotCount`
 * filas (`taskSlotCountFor(mercado)`, según la cartera declarada en el
 * Onboarding). Cada fila se llena abriendo `TaskEditorSheet` (categoría,
 * nombre, teléfono y hora) — agendar la acción no otorga puntos por sí
 * sola (el punto de esta introducción se otorga en
 * `continueTaskCapture`/`skipTaskCapture`, siempre fijo en 1, sin
 * depender de cuántas tareas se hayan capturado aquí).
 *
 * Cada slot arranca ya con una hora sugerida (`defaultTaskTime(index)`,
 * escalonada de media hora en media hora desde las 9:00) para que la
 * Agenda nunca reciba un pendiente sin horario — la persona puede
 * corregirla en `TaskEditorSheet` si ya sabe cuándo es de verdad, pero
 * nunca la deja vacía sin darse cuenta.
 *
 * "CONTINUAR" exige llenar al menos `MIN_FILLED_TASKS` de las filas, no
 * todas — regla anti-fricción de la especificación: quien tiene 10 slots
 * pero sólo recuerda 3 pendientes de memoria en este momento no debe
 * quedarse atorado inventando los siete que faltan.
 *
 * `onContinue` recibe las tareas limpias (descripción no vacía) para que
 * `FirstLoginIntro` las mande a la Agenda real, siempre con prioridad
 * máxima (ver `continueTaskCapture`).
 */
function TaskCaptureStep({ slotCount, onContinue, onSkip }) {
  const { typed, isTyping } = useTypewriter(TASK_STEP_TEXT);
  const [showSubtext, setShowSubtext] = useState(false);
  const [tasks, setTasks] = useState(
    () => Array.from({ length: slotCount }, (_, index) => (
      { ...EMPTY_TASK, hora: defaultTaskTime(index) }
    )),
  );
  const [openIndex, setOpenIndex] = useState(null);

  useEffect(() => {
    if (isTyping) return undefined;
    const timer = setTimeout(() => setShowSubtext(true), 300);
    return () => clearTimeout(timer);
  }, [isTyping]);

  const saveTask = (next) => {
    setTasks((current) => current.map((t, i) => (i === openIndex ? next : t)));
    setOpenIndex(null);
  };

  const cleanEntries = tasks
    .map((t) => ({
      tipo: t.tipo,
      descripcion: t.descripcion.trim(),
      telefono: t.telefono.trim(),
      hora: t.hora || DEFAULT_TASK_HOUR,
    }))
    .filter((t) => t.descripcion);
  const isValid = cleanEntries.length >= MIN_FILLED_TASKS;

  return (
    <div className="flex w-full flex-col items-center px-6 text-center">
      <p className="sr-only">{`${TASK_STEP_TITLE}. ${TASK_STEP_TEXT} ${TASK_STEP_SUBTEXT}`}</p>

      <p
        className="text-xs font-bold uppercase tracking-widest text-indigo-400"
        aria-hidden="true"
      >
        {TASK_STEP_TITLE}
      </p>

      <p
        className="mt-2 max-w-md text-lg leading-snug text-white sm:text-xl"
        aria-hidden="true"
      >
        {typed}
        <Caret show={isTyping} />
      </p>

      <p
        className={`mt-2 max-w-sm text-[11px] leading-snug text-white/40
                    transition-opacity duration-700
                    ${showSubtext ? 'opacity-100' : 'opacity-0'}`}
        aria-hidden="true"
      >
        {TASK_STEP_SUBTEXT}
      </p>

      <div
        className={`mt-6 w-full max-w-md transition-opacity duration-700
                    ${showSubtext ? 'opacity-100' : 'pointer-events-none opacity-0'}`}
        aria-hidden={!showSubtext}
      >
        <div className="max-h-[46vh] space-y-3 overflow-y-auto pr-1">
          {tasks.map((value, index) => (
            <TaskSlot key={index} index={index} value={value} onOpen={setOpenIndex} />
          ))}
        </div>

        <p className="mt-3 text-[11px] text-slate-500">
          {cleanEntries.length} / {MIN_FILLED_TASKS} pendientes mínimos para continuar
        </p>

        <button
          type="button"
          onClick={() => onContinue(cleanEntries)}
          disabled={!isValid}
          className={`mt-3 w-full rounded-full bg-indigo-600 px-8 py-3 text-sm font-semibold
                     uppercase tracking-wide text-white transition-all hover:bg-indigo-500
                     active:scale-95 disabled:cursor-not-allowed disabled:bg-white/[0.06]
                     disabled:text-white/25 disabled:shadow-none
                     ${isValid ? GLOW_BUTTON_CLASS : ''}`}
        >
          Continuar
        </button>

        <button
          type="button"
          onClick={() => onSkip()}
          className="mt-4 block w-full text-sm text-slate-500 transition-colors hover:text-white"
        >
          Saltar paso
        </button>
      </div>

      <TaskEditorSheet
        isOpen={openIndex !== null}
        initialValue={openIndex !== null ? tasks[openIndex] : EMPTY_TASK}
        onSave={saveTask}
        onClose={() => setOpenIndex(null)}
      />
    </div>
  );
}

/**
 * Piezas de confeti con CSS puro, mismo criterio que ya usa
 * `Celebration.jsx` (metas cumplidas): nada de `react-confetti` ni canvas
 * para un efecto de unos segundos que en esta pantalla ocurre una sola vez
 * en la vida de la cuenta. Reutiliza la misma animación `goal-confetti` ya
 * definida en `index.css` en vez de declarar una segunda igual con otro
 * nombre.
 */
function ConfettiBurst() {
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    const query = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    setReduceMotion(Boolean(query?.matches));
  }, []);

  // Sorteado una sola vez por aparición: recalcular en cada render haría
  // saltar las piezas a mitad de la caída.
  const pieces = useMemo(() => Array.from({ length: CONFETTI_PIECES }, (_, index) => ({
    id: index,
    left: Math.random() * 100,
    delay: Math.random() * 900,
    duration: 2200 + Math.random() * 1400,
    drift: (Math.random() - 0.5) * 140,
    size: 6 + Math.random() * 7,
    color: CONFETTI_COLORS[index % CONFETTI_COLORS.length],
    rotation: Math.random() * 360,
  })), []);

  if (reduceMotion) return null;

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      {pieces.map((piece) => (
        <span
          key={piece.id}
          className={`absolute top-0 rounded-[2px] ${piece.color}`}
          style={{
            left: `${piece.left}%`,
            width: `${piece.size}px`,
            height: `${piece.size * 1.6}px`,
            animation: `goal-confetti ${piece.duration}ms linear ${piece.delay}ms forwards`,
            '--drift': `${piece.drift}px`,
            '--spin': `${piece.rotation + 540}deg`,
          }}
        />
      ))}
    </div>
  );
}

/**
 * Paso 4a — La recompensa: confeti, el total de puntos ganados y el logro
 * estilo consola ("Achievement Unlocked"). Se monta directo al terminar el
 * Paso 3 —sin esperar ningún toque— y se desvanece sola a los
 * `REWARD_AUTO_MS`, avisando a `onDone` para que el padre revele el botón
 * "Iniciar".
 *
 * Dos logros posibles, uno por rama del Paso 3 (`achievement`, resuelto
 * por `FirstLoginIntro` según `isAdminOverloadBranch`, no aquí adentro):
 *
 *  - Prospectos ("Proyecto 200"): el numerador es el conteo real de
 *    prospectos capturados (0 si se saltó el paso), nunca un número
 *    inventado — sólo el denominador es una etiqueta fija del logro.
 *  - Tareas ("Agenda Optimizada"): no hay meta que perseguir, así que el
 *    logro no muestra fracción, sólo el nombre — el número que sí importa
 *    en esta rama (cuántas tareas se capturaron) ya se lee en el propio
 *    "+ N Puntos" de arriba.
 */
const PROSPECT_ACHIEVEMENT = {
  icon: Trophy,
  label: (count) => `${count} / ${PROJECT_GOAL} · Proyecto ${PROJECT_GOAL}`,
};
const TASK_ACHIEVEMENT = {
  icon: ListChecks,
  label: () => 'Agenda Optimizada',
};

function RewardStep({ capturedCount, pointsEarned, achievement, onDone }) {
  const [visible, setVisible] = useState(false);
  const AchievementIcon = achievement.icon;

  useEffect(() => {
    const showTimer = setTimeout(() => setVisible(true), 50);
    const hideTimer = setTimeout(() => setVisible(false), REWARD_AUTO_MS);
    const doneTimer = setTimeout(onDone, REWARD_AUTO_MS + FADE_OUT_MS);

    return () => {
      clearTimeout(showTimer);
      clearTimeout(hideTimer);
      clearTimeout(doneTimer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="relative flex w-full flex-col items-center justify-center px-6 text-center">
      <ConfettiBurst />

      <div
        className={`relative flex flex-col items-center transition-opacity duration-700
                    ${visible ? 'opacity-100' : 'opacity-0'}`}
      >
        <p
          className="text-3xl font-bold text-amber-400 drop-shadow-[0_0_12px_rgba(245,158,11,0.5)]
                     sm:text-4xl"
        >
          {formatPoints(pointsEarned)}
        </p>

        <div
          className="mt-6 flex items-center gap-3 rounded-2xl border border-amber-400/30
                     bg-white/[0.04] px-4 py-3 shadow-[0_0_20px_rgba(245,158,11,0.15)]"
        >
          <AchievementIcon size={20} className="shrink-0 text-amber-400" aria-hidden="true" />
          <div className="text-left">
            <p className="text-[10px] font-bold uppercase tracking-widest text-amber-300">
              Logro desbloqueado
            </p>
            <p className="text-sm font-semibold text-white">
              {achievement.label(capturedCount)}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Paso 5 — Unirse a un equipo de trabajo, justo antes de "Iniciar".
 *
 * Reutiliza la misma escritura real que ya usan `JoinPromotoria.jsx` y
 * `AccessBar.jsx` (`joinPromotoriaByCode`, con el mismo formato y mensajes
 * de `promotoriaCode.js`) — no una copia simplificada: el código que se
 * teclea aquí deja a la persona en `pending` de la misma promotoría, tal
 * cual como si lo hubiera hecho desde el panel de "Ver más" más adelante.
 *
 * "Saltar por ahora" existe porque unirse a un equipo no es parte de la
 * condición que hace aparecer esta introducción —a diferencia de la
 * captura de prospectos, aquí no hay ningún punto en juego—: quien no
 * tiene el código a la mano sigue su camino sin perder nada, y puede
 * hacerlo después desde su perfil.
 */
function JoinTeamStep({ onContinue }) {
  const { refreshIdentity } = useSession();
  const [code, setCode] = useState('');
  const [isBusy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [joined, setJoined] = useState('');

  const submit = async (event) => {
    event.preventDefault();
    setError('');

    const normalized = normalizeCode(code);
    if (!isValidCode(normalized)) {
      setError(explainCode(code));
      return;
    }

    setBusy(true);
    const { data, error: joinError } = await joinPromotoriaByCode(normalized);
    setBusy(false);

    if (joinError) {
      setError(describeError(joinError));
      return;
    }

    setJoined(data?.promotoria || 'tu promotoría');
    // Se relee la identidad ahora, no al presionar "Iniciar" más abajo: así
    // "Hoy" ya sabe que hay una promotoría en espera desde el primer
    // instante en que aparece, en vez de un segundo después.
    await refreshIdentity?.();
  };

  if (joined) {
    return (
      <div className="flex flex-col items-center px-6 text-center">
        <span
          className="mb-4 grid h-14 w-14 place-items-center rounded-2xl border
                     border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
          aria-hidden="true"
        >
          <CheckCircle2 size={24} strokeWidth={1.8} aria-hidden="true" />
        </span>

        <p className="text-lg font-semibold text-white">Solicitud enviada</p>
        <p className="mt-2 max-w-sm text-sm leading-relaxed text-slate-400">
          Pediste unirte a <span className="font-semibold text-slate-200">{joined}</span>.
          Falta que tu promotor apruebe tu acceso.
        </p>

        <button
          type="button"
          onClick={onContinue}
          className={`mt-8 rounded-full bg-indigo-600 px-8 py-3 text-sm font-semibold
                     text-white transition-colors hover:bg-indigo-500 active:scale-95
                     ${GLOW_BUTTON_CLASS}`}
        >
          Continuar
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="flex w-full flex-col items-center px-6 text-center">
      <span
        className="mb-4 grid h-14 w-14 place-items-center rounded-2xl border
                   border-indigo-500/30 bg-indigo-500/10 text-indigo-300"
        aria-hidden="true"
      >
        <Users size={24} strokeWidth={1.8} aria-hidden="true" />
      </span>

      <p className="max-w-sm text-lg leading-snug text-white sm:text-xl">{STEP5_TEXT}</p>
      <p className="mt-2 max-w-xs text-[11px] leading-snug text-white/40">{STEP5_SUBTEXT}</p>

      <div className="mt-6 w-full max-w-xs">
        <label className="sr-only" htmlFor="join-team-code">Código de promotoría</label>
        <input
          id="join-team-code"
          value={code}
          onChange={(event) => { setCode(normalizeCode(event.target.value)); setError(''); }}
          placeholder="PROMO-866-01"
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck="false"
          maxLength={15}
          className="w-full rounded-xl border border-slate-700 bg-transparent px-3 py-3
                     text-center font-mono text-lg tracking-[0.15em] text-white
                     placeholder:text-slate-600 transition-colors focus:border-indigo-500
                     focus:outline-none"
        />

        {error && (
          <p
            role="alert"
            className="mt-2.5 flex items-start gap-2 rounded-xl border border-rose-500/30
                       bg-rose-500/10 p-3 text-left text-[11px] leading-relaxed text-rose-300"
          >
            <AlertTriangle size={13} className="mt-0.5 shrink-0" aria-hidden="true" />
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={isBusy}
          className={`mt-4 flex w-full items-center justify-center gap-2 rounded-full
                     bg-indigo-600 px-8 py-3 text-sm font-semibold text-white
                     transition-all hover:bg-indigo-500 active:scale-95
                     disabled:cursor-wait disabled:opacity-70 ${GLOW_BUTTON_CLASS}`}
        >
          {isBusy && <Loader2 size={14} className="animate-spin" aria-hidden="true" />}
          {isBusy ? 'Enviando…' : 'Unirme al equipo'}
        </button>

        <button
          type="button"
          onClick={onContinue}
          className="mt-4 block w-full text-sm text-slate-500 transition-colors hover:text-white"
        >
          Hacerlo después
        </button>
      </div>
    </form>
  );
}

/**
 * Paso 6 — El botón final, con estética de CTA de app nativa premium en
 * vez del botón flotante genérico que compartía forma con el resto de
 * botones de avance del recorrido (`GLOW_BUTTON_CLASS`, índigo, angosto).
 * Éste es deliberadamente distinto: ancho (`w-[85%] max-w-sm`), en ámbar
 * —el mismo color que ya usa `RewardStep` para "+1 Punto", así el último
 * gesto de la introducción se siente como continuación de la recompensa,
 * no como un botón de avance más— y con un texto de ancla arriba
 * ("Tu entorno de trabajo está listo.") para que la pantalla no se lea
 * como un botón perdido en el centro de un fondo negro.
 *
 * Aparece solo, sin confeti ni texto de logro —esos ya se desvanecieron
 * con `RewardStep`—. Al presionarlo arranca el fundido de todo el overlay
 * (`closing`, en `FirstLoginIntro`) y sólo cuando ese fundido termina se
 * avisa al padre (`onComplete`) para sumar el punto de verdad y montar
 * "Hoy" por detrás.
 */
function StartStep({ onStart }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), 50);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div
      className={`flex flex-col items-center px-6 text-center transition-opacity duration-700
                  ${visible ? 'opacity-100' : 'opacity-0'}`}
    >
      <p className="mb-6 text-sm text-slate-400">Tu entorno de trabajo está listo.</p>

      <button
        type="button"
        onClick={onStart}
        className="flex w-[85%] max-w-sm items-center justify-center gap-3 rounded-xl
                   border border-amber-400/50 bg-amber-500 py-4 text-lg font-bold
                   tracking-wide text-slate-950 shadow-[0_0_30px_rgba(245,158,11,0.3)]
                   transition-all hover:bg-amber-400 active:scale-95"
      >
        INICIAR
        <ArrowRight size={20} aria-hidden="true" />
      </button>
    </div>
  );
}

/**
 * Introducción de la primera entrada a la app. Se muestra sólo para quien
 * declaró alguna inquietud en el Onboarding (ver `advisorOnboarding.js`) y
 * sólo mientras sus puntos sigan en 0 — es `TodayView.jsx` quien decide esa
 * condición antes de montar este componente, no algo que se compruebe aquí
 * adentro. `inquietud`, `mercado` y `perfil` sí se usan aquí, para calibrar
 * el tono del Paso 2 y qué se captura y cuánto en el Paso 3.
 *
 * Seis momentos en un único estado local (`step`), sin enrutador ni pila
 * de historial: es un recorrido lineal, sin "Atrás".
 *
 *   1. Saludo (`GreetingStep`)
 *   2. Enfoque empoderador (`EmpowermentStep`) — texto según `inquietud`
 *   3. Captura por slots — dos variantes posibles, decididas por
 *      `isAdminOverloadBranch(perfil, inquietud)`:
 *        - Prospectos (`ProspectCaptureStep`), cantidad según `mercado`.
 *        - Tareas/pendientes (`TaskCaptureStep`, perfil "Nuevo
 *          Profesional" con cuello de botella "carga administrativa"),
 *          cantidad de slots según la cartera (`mercado`, reutilizada como
 *          `PORTFOLIO_SIZE_OPTIONS` para este perfil), mínimo
 *          `MIN_FILLED_TASKS` llenos para continuar.
 *      Ambas ofrecen "Continuar" o "Saltar paso".
 *   4. Recompensa automática (`RewardStep`) — confeti + logro,
 *      `REWARD_AUTO_MS`. El logro cambia según la rama ("Proyecto 200" o
 *      "Agenda Optimizada"), pero el punto es siempre "+1 Punto", igual en
 *      las dos ramas y sin importar si se llenó, se saltó o se agendaron
 *      varias tareas: es el premio de bienvenida por completar el
 *      Onboarding, no un cálculo sobre lo capturado en el Paso 3 (agendar
 *      una acción no otorga puntos por sí sola: el resultado real se
 *      reporta después, en otro flujo).
 *   5. Unirse a un equipo de trabajo (`JoinTeamStep`) — código real de
 *      promotoría, o "Hacerlo después"
 *   6. Botón final (`StartStep`) — la persona decide cuándo cruzar
 *
 * `onComplete(pointsEarned)` se llama cuando termina el fundido de salida
 * de todo el overlay, disparado por el toque en "Iniciar" — no antes, y no
 * por un temporizador: quien llama a este componente (`TodayView`) usa esa
 * señal para sumar el punto de verdad (`useAdvisorPoints`) y sólo entonces
 * monta "Hoy" por detrás. `pointsEarned` es siempre `1`: si alguna rama lo
 * dejara en `0`, `TodayView` seguiría viendo `effectivePoints === 0` y
 * volvería a montar esta introducción en cada apertura, sin que la persona
 * pudiera salir nunca de la pantalla de bienvenida.
 */
export default function FirstLoginIntro({
  name, username, inquietud, mercado, perfil, onComplete,
}) {
  const [step, setStep] = useState(1);
  const [capturedCount, setCapturedCount] = useState(0);
  const [pointsEarned, setPointsEarned] = useState(1);
  const [closing, setClosing] = useState(false);
  const { addEvent } = useEvents();

  /*
    Tocar en cualquier parte de la pantalla acelera un 50% la máquina de
    escribir (ver `TypewriterSpeedContext`, `useTypewriter.js`): el primer
    toque enciende el modo rápido para el resto del recorrido, sin volver a
    apagarse. Mismo mecanismo que ya usa `OnboardingFlow.jsx` (la parte
    pre-aprobación) — se repite aquí, y no se comparte un estado entre los
    dos, porque son dos componentes con ciclos de vida distintos.
  */
  const [fastTyping, setFastTyping] = useState(false);

  // Resueltos una sola vez: ni la inquietud, ni el mercado ni el perfil
  // cambian mientras esta pantalla está montada.
  const [step2Text] = useState(() => step2TextFor(inquietud));
  const [isTaskBranch] = useState(() => isAdminOverloadBranch(perfil, inquietud));
  const [slotCount] = useState(() => (
    isTaskBranch ? taskSlotCountFor(mercado) : slotCountFor(mercado)
  ));

  const continueProspectCapture = (entries) => {
    writeSafeZone(username, entries);
    setCapturedCount(entries.length);
    setPointsEarned(1);
    setStep(4);
  };

  const skipProspectCapture = () => {
    writeSafeZone(username, []);
    setCapturedCount(0);
    setPointsEarned(1);
    setStep(4);
  };

  /*
    Cada tarea válida se manda de una vez a la Agenda real
    (`useEvents().addEvent`, el mismo contrato que ya usa
    `ActivityForm.jsx`): así, al abrir "Hoy" por primera vez, la lista ya
    aparece con los pendientes que la persona acaba de vaciar de su
    libreta — la promesa exacta de `TASK_STEP_SUBTEXT` ("nosotros nos
    encargamos de acomodarlas en tu agenda"). Todas quedan programadas para
    hoy, a la hora que cada una trae capturada (`entry.hora`, editada en
    `TaskEditorSheet` — ya no la hora escalonada y genérica de
    `defaultTaskTime` que traía cada slot al nacer). `telefono` viaja hasta
    el evento real de la Agenda —no sólo hasta el título— porque es el
    dato que en el futuro va a permitir que un aviso de esta actividad
    ofrezca "Llamar" o "Mandar WhatsApp" en vez de sólo notificar que
    existe: este paso no pregunta fecha a propósito (ver `TaskCaptureStep`),
    pero la hora y el teléfono sí se preguntan.

    La prioridad SIEMPRE es "máxima", no `DEFAULT_PRIORITY` ("importante")
    como el resto de la app: esto no es una actividad cualquiera capturada
    sin pensar mucho, es lo que la propia persona eligió vaciar de su
    libreta al arrancar — el pendiente más urgente que trae encima, y el
    primero que su asistente debe mostrarle. Tratarlo igual que cualquier
    otra tarea del día a día le restaría el peso que tiene.

    `pointsEarned` siempre queda en `1`, sea cual sea el número de tareas
    agendadas: agendar no otorga puntos por sí solo, así que este "+1
    Punto" es el mismo premio de bienvenida por completar el Onboarding
    que ya recibe la rama de prospectos, no una suma de lo capturado aquí.
    Antes se calculaba con `taskPointsFor(entries)` sumando el valor de
    cada tarea —y como cada tarea vale 0, siempre daba 0—, dejando a quien
    terminaba esta rama sin el punto de bienvenida y, por lo tanto, sin
    que `TodayView` dejara de mostrar esta pantalla la próxima vez que
    abriera la app (pantalla negra repetida: ver `skipTaskCapture`, mismo
    arreglo).
  */
  const continueTaskCapture = (entries) => {
    entries.forEach((entry) => {
      addEvent({
        type: 'actividad',
        title: `${taskTypeLabel(entry.tipo)}: ${entry.descripcion}`,
        date: todayKey(),
        time: entry.hora,
        priority: 'maxima',
        telefono: entry.telefono,
      });
    });
    setCapturedCount(entries.length);
    setPointsEarned(1);
    setStep(4);
  };

  /*
    "Saltar paso" tampoco debe dejar a la persona sin el punto de
    bienvenida: es la fuga para quien no quiere agendar nada ahora mismo,
    igual que `skipProspectCapture` en la otra rama —y esa rama sí otorga
    su punto al saltar—. Antes esta función lo dejaba en `0` a propósito
    (ver el comentario de `continueTaskCapture`), y ese `0` es justo lo que
    causaba que la introducción se quedara "atorada": `TodayView` vuelve a
    montar `FirstLoginIntro` desde el Paso 1 en cada apertura mientras los
    puntos sigan en 0, así que quien saltaba este paso veía la pantalla
    negra del Paso 1 una y otra vez sin ninguna forma de salir de ahí.
  */
  const skipTaskCapture = () => {
    setCapturedCount(0);
    setPointsEarned(1);
    setStep(4);
  };

  const handleStart = () => {
    setClosing(true);
    setTimeout(() => onComplete(pointsEarned), FADE_OUT_MS);
  };

  return (
    <div
      className={`fixed inset-0 z-[95] flex min-h-screen w-full items-center justify-center
                  bg-slate-950 transition-opacity duration-700
                  ${closing ? 'opacity-0' : 'opacity-100'}`}
      role="dialog"
      aria-modal="true"
      aria-label="Bienvenida a tu primer punto"
      onClick={() => setFastTyping(true)}
    >
      <TypewriterSpeedContext.Provider value={fastTyping ? 2 : 1}>
        {step === 1 && <GreetingStep name={name} onContinue={() => setStep(2)} />}
        {step === 2 && <EmpowermentStep text={step2Text} onContinue={() => setStep(3)} />}
        {step === 3 && (
          isTaskBranch ? (
            <TaskCaptureStep
              slotCount={slotCount}
              onContinue={continueTaskCapture}
              onSkip={skipTaskCapture}
            />
          ) : (
            <ProspectCaptureStep
              slotCount={slotCount}
              onContinue={continueProspectCapture}
              onSkip={skipProspectCapture}
            />
          )
        )}
        {step === 4 && (
          <RewardStep
            capturedCount={capturedCount}
            pointsEarned={pointsEarned}
            achievement={isTaskBranch ? TASK_ACHIEVEMENT : PROSPECT_ACHIEVEMENT}
            onDone={() => setStep(5)}
          />
        )}
        {step === 5 && <JoinTeamStep onContinue={() => setStep(6)} />}
        {step === 6 && <StartStep onStart={handleStart} />}
      </TypewriterSpeedContext.Provider>
    </div>
  );
}
