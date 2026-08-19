import { useState, useEffect, useMemo } from 'react';
import { Trophy, User, BookUser } from 'lucide-react';
import useTypewriter from '../../lib/useTypewriter';
import { writeSafeZone } from '../../data/safeZone';

/** Cuánto tarda cada fundido de esta pantalla (el de la recompensa hacia "Iniciar", y el del overlay completo al presionarlo), en ms — usado tanto en las clases de Tailwind como en los temporizadores que esperan a que termine antes de avanzar. */
const FADE_OUT_MS = 700;
/*
  Cuánto se queda la Recompensa en pantalla —confeti y "+1 Punto"— antes de
  desvanecerse sola y dejar sólo el botón "Iniciar". El valor es el pedido
  exacto de la especificación (4.5s), no un número redondeado a ojo.
*/
const REWARD_AUTO_MS = 4500;
/** Cuántos prospectos pide el Paso 3 (y cuántos slots se dibujan). "Saltar paso" no exige ninguno. */
const PROSPECT_COUNT = 3;
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
  Un solo mensaje, sin subtexto: la versión anterior nombraba la inquietud
  ("dar el primer salto con tus conocidos puede imponer respeto") y luego
  explicaba la regla de oro en un segundo bloque. Se reemplaza por una frase
  más sutil que habla del sistema, no del miedo — sigue siendo la pantalla
  que ve quien declaró "miedo al rechazo", pero ya no se lo recuerda de
  frente.
*/
const STEP2_TEXT = 'El secreto del éxito es el sistema. Te guiaremos paso a paso para que '
  + 'conectar con tu entorno sea una experiencia fluida y sin fricción.';
const STEP3_TEXT = 'Comencemos por tus primeros apoyos. Para desbloquear tu agenda, ingresa '
  + `a ${PROSPECT_COUNT} personas cercanas a ti.`;
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
 * va a guiar el arranque, sin nombrar de frente la inquietud declarada. El
 * botón se enciende al terminar de escribirse, igual que en el Paso 1.
 */
function EmpowermentStep({ onContinue }) {
  const { typed, isTyping } = useTypewriter(STEP2_TEXT);

  return (
    <div className="flex flex-col items-center px-6 text-center">
      <p className="sr-only">{STEP2_TEXT}</p>
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
 * "CONTINUAR" exige al menos un nombre entre los tres slots; "Saltar paso"
 * no exige nada — es la fuga para quien prefiere no capturar a nadie en
 * este momento, y sigue otorgando el punto igual que si los hubiera
 * llenado (la recompensa es por haber cruzado el paso, no por los datos).
 */
function ProspectCaptureStep({ onContinue, onSkip }) {
  const { typed, isTyping } = useTypewriter(STEP3_TEXT);
  const [showSubtext, setShowSubtext] = useState(false);
  const [prospects, setProspects] = useState(
    () => Array.from({ length: PROSPECT_COUNT }, () => ({ ...EMPTY_PROSPECT })),
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
   * `PROSPECT_COUNT` elegidos en los slots, en el orden en que la persona
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
        picked.slice(0, PROSPECT_COUNT).forEach((contact, index) => {
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
      <p className="sr-only">{`${STEP3_TEXT} ${STEP3_SUBTEXT}`}</p>
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
 * Paso 4a — La recompensa: confeti, "+1 Punto" y el logro estilo consola
 * ("Achievement Unlocked"). Se monta directo al terminar el Paso 3 —sin
 * esperar ningún toque— y se desvanece sola a los `REWARD_AUTO_MS`,
 * avisando a `onDone` para que el padre revele el botón "Iniciar". El
 * numerador del logro es el conteo real de prospectos capturados (0 si se
 * saltó el paso), nunca un número inventado — sólo el denominador (la meta
 * de "Proyecto 200") es una etiqueta fija del propio logro.
 */
function RewardStep({ capturedCount, onDone }) {
  const [visible, setVisible] = useState(false);

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
          + 1 Punto
        </p>

        <div
          className="mt-6 flex items-center gap-3 rounded-2xl border border-amber-400/30
                     bg-white/[0.04] px-4 py-3 shadow-[0_0_20px_rgba(245,158,11,0.15)]"
        >
          <Trophy size={20} className="shrink-0 text-amber-400" aria-hidden="true" />
          <div className="text-left">
            <p className="text-[10px] font-bold uppercase tracking-widest text-amber-300">
              Logro desbloqueado
            </p>
            <p className="text-sm font-semibold text-white">
              {capturedCount} / {PROJECT_GOAL} · Proyecto {PROJECT_GOAL}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Paso 4b — El botón final. Aparece solo, sin confeti ni texto de logro
 * —esos ya se desvanecieron con `RewardStep`—, con el mismo resplandor del
 * resto de los botones de avance. Al presionarlo arranca el fundido de
 * todo el overlay (`closing`, en `FirstLoginIntro`) y sólo cuando ese
 * fundido termina se avisa al padre (`onComplete`) para sumar el punto de
 * verdad y montar "Hoy" por detrás.
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
      <button
        type="button"
        onClick={onStart}
        className={`rounded-full bg-indigo-600 px-10 py-3.5 text-base font-semibold text-white
                    transition-colors hover:bg-indigo-500 active:scale-95 ${GLOW_BUTTON_CLASS}`}
      >
        Iniciar
      </button>
    </div>
  );
}

/**
 * Introducción de la primera entrada a la app, sólo para quien declaró
 * "El miedo al rechazo o a contactar conocidos" (`inquietud === 'rejection'`,
 * ver `advisorOnboarding.js`) en el Onboarding, y sólo mientras sus puntos
 * sigan en 0 — es `TodayView.jsx` quien decide esas dos condiciones antes de
 * montar este componente, no algo que se compruebe aquí adentro.
 *
 * Cinco momentos en un único estado local (`step`), sin enrutador ni pila
 * de historial: es un recorrido lineal, sin "Atrás".
 *
 *   1. Saludo (`GreetingStep`)
 *   2. Enfoque empoderador (`EmpowermentStep`)
 *   3. Captura de prospectos por slots (`ProspectCaptureStep`) — "Continuar" o "Saltar paso"
 *   4. Recompensa automática (`RewardStep`) — confeti + logro, `REWARD_AUTO_MS`
 *   5. Botón final (`StartStep`) — la persona decide cuándo cruzar
 *
 * `onComplete` se llama cuando termina el fundido de salida de todo el
 * overlay, disparado por el toque en "Iniciar" — no antes, y no por un
 * temporizador: quien llama a este componente (`TodayView`) usa esa señal
 * para sumar el punto de verdad (`useAdvisorPoints`) y sólo entonces monta
 * "Hoy" por detrás.
 */
export default function FirstLoginIntro({ name, username, onComplete }) {
  const [step, setStep] = useState(1);
  const [capturedCount, setCapturedCount] = useState(0);
  const [closing, setClosing] = useState(false);

  const continueCapture = (entries) => {
    writeSafeZone(username, entries);
    setCapturedCount(entries.length);
    setStep(4);
  };

  const skipCapture = () => {
    writeSafeZone(username, []);
    setCapturedCount(0);
    setStep(4);
  };

  const handleStart = () => {
    setClosing(true);
    setTimeout(onComplete, FADE_OUT_MS);
  };

  return (
    <div
      className={`fixed inset-0 z-[95] flex min-h-screen w-full items-center justify-center
                  bg-slate-950 transition-opacity duration-700
                  ${closing ? 'opacity-0' : 'opacity-100'}`}
      role="dialog"
      aria-modal="true"
      aria-label="Bienvenida a tu primer punto"
    >
      {step === 1 && <GreetingStep name={name} onContinue={() => setStep(2)} />}
      {step === 2 && <EmpowermentStep onContinue={() => setStep(3)} />}
      {step === 3 && (
        <ProspectCaptureStep onContinue={continueCapture} onSkip={skipCapture} />
      )}
      {step === 4 && (
        <RewardStep capturedCount={capturedCount} onDone={() => setStep(5)} />
      )}
      {step === 5 && <StartStep onStart={handleStart} />}
    </div>
  );
}
