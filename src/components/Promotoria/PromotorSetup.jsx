import { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Zap, BarChart4, ShieldCheck, Dices, Loader2, AlertTriangle, Building2,
} from 'lucide-react';
import useTypewriter, { TypewriterSpeedContext } from '../../lib/useTypewriter';
import { fetchProfile, saveMyCard } from '../../data/profilesRepo';
import { saveMyCode, promoteToAssistant, describeError } from '../../data/promotoriaRepo';
import { generateCode, normalizeCode, isValidCode, explainCode } from '../../data/promotoriaCode';

/** Mínimo de letras para dar por contestado el nombre de la Fase 1. */
const MIN_NAME = 2;
/** Mínimo de letras para el nombre de la promotoría/agencia (Fase 3). */
const MIN_AGENCY_NAME = 2;
/** Cuánto se queda la Fase 4 (éxito) en pantalla antes de avisar a `onComplete`. */
const SUCCESS_AUTO_MS = 3500;
/** Duración del fundido de cada transición entre fases. */
const FADE_MS = 350;

/*
  Mismo mecanismo que ya usan `OnboardingFlow.jsx` y `FirstLoginIntro.jsx`: se
  duplica aquí en vez de importarse de ninguno de los dos porque, aunque el
  gesto es idéntico —tocar la pantalla acelera la máquina de escribir para el
  resto del recorrido—, este es un tercer flujo con su propio ciclo de vida
  (la configuración inicial del promotor, no la del asesor), y no debería
  quedar acoplado a ningún otro por un detalle de ritmo de lectura.
*/
const LocalTypewriterSpeed = TypewriterSpeedContext;

/** Cursor parpadeante, igual criterio de duplicación que el resto del flujo. */
function Caret({ show }) {
  if (!show) return null;
  return <span className="animate-pulse text-indigo-400">|</span>;
}

/**
 * Envuelve cada fase con el mismo fundido cruzado: sale la anterior, entra la
 * siguiente, sin deslizamiento lateral —un cambio de foco en un flujo
 * corporativo se lee mejor como algo que "se disuelve y aparece" que como
 * algo que "se desliza", que tiene más peso de UI consumer/casual.
 */
function Phase({ phaseKey, children }) {
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={phaseKey}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: FADE_MS / 1000 }}
        className="flex w-full flex-col items-center"
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}

/**
 * Fase 1 — El nombre. Única pregunta de texto libre de todo el flujo: cómo se
 * le quiere llamar a quien está configurando su acceso directivo. Nace con el
 * campo y el botón invisibles y sólo los revela al terminar de escribirse la
 * pregunta, mismo criterio que el resto de la app: un control que aparece a
 * mitad de la pregunta invita a contestar algo que todavía no se ha
 * preguntado.
 */
function NameStep({ initialValue, onContinue }) {
  const text = 'Para configurar tu acceso directivo, ¿cómo te gusta que te llamen?';
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
        className="max-w-lg text-2xl font-light leading-relaxed text-slate-100 sm:text-3xl"
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
        <label className="sr-only" htmlFor="promotor-name">Cómo te gusta que te llamen</label>
        <input
          id="promotor-name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Escribe tu nombre"
          autoComplete="given-name"
          enterKeyHint="go"
          className="w-full border-b border-slate-800 bg-transparent pb-2 text-center
                     text-xl text-slate-100 caret-indigo-400 transition-colors
                     placeholder:text-slate-600 focus:border-indigo-500 focus:outline-none"
        />

        <button
          type="submit"
          disabled={!isValid}
          className="mt-8 w-full rounded-full bg-indigo-600 px-8 py-3 text-sm
                     font-semibold text-slate-100 shadow-lg shadow-indigo-600/30
                     transition-all hover:bg-indigo-500 active:scale-95
                     disabled:cursor-not-allowed disabled:bg-white/[0.06]
                     disabled:text-white/25 disabled:shadow-none"
        >
          Comenzar
        </button>
      </div>
    </form>
  );
}

/*
  Viñetas de la Fase 2 — un objeto plano y no JSX embebido en el componente,
  para que `BENEFITS.map` sea lo único que decide el orden y el stagger no
  tenga que adivinarlo de la estructura del árbol.
*/
const BENEFITS = [
  {
    icon: Zap,
    title: 'Autonomía',
    text: 'Tus asesores reciben su día estructurado automáticamente.',
  },
  {
    icon: BarChart4,
    title: 'Visibilidad',
    text: 'Métricas en tiempo real de prospección y cierres.',
  },
  {
    icon: ShieldCheck,
    title: 'Retención',
    text: 'Identifica focos rojos antes de que tu talento se frustre.',
  },
];

/**
 * Fase 2 — Presentación de ventajas. El texto principal se escribe letra por
 * letra como el resto del flujo; las tres viñetas entran después, en cascada
 * (`staggerChildren`), y el botón de avance sólo se revela cuando la última
 * viñeta ya terminó de aparecer — nadie ve un botón de "Crear mi Promotoría"
 * mientras las ventajas que lo justifican todavía se están dibujando.
 */
function BenefitsStep({ name, onContinue }) {
  const text = `Hola, ${name}. El crecimiento de tu agencia ya no depende de la `
    + 'micro-gestión. Prospecta te dará visibilidad total y autonomía a tu equipo.';
  const { typed, isTyping } = useTypewriter(text);
  const [showBenefits, setShowBenefits] = useState(false);
  const [showCTA, setShowCTA] = useState(false);

  useEffect(() => {
    if (isTyping) return undefined;
    const timer = setTimeout(() => setShowBenefits(true), 350);
    return () => clearTimeout(timer);
  }, [isTyping]);

  useEffect(() => {
    if (!showBenefits) return undefined;
    // 3 viñetas × 180ms de stagger + ~500ms de la animación de la última.
    const timer = setTimeout(() => setShowCTA(true), 1050);
    return () => clearTimeout(timer);
  }, [showBenefits]);

  return (
    <div className="flex w-full flex-col items-center px-6 text-center">
      <p className="sr-only">
        {`${text} ${BENEFITS.map((b) => `${b.title}: ${b.text}`).join(' ')}`}
      </p>

      <p
        className="max-w-lg text-xl font-light leading-snug text-slate-100 sm:text-2xl"
        aria-hidden="true"
      >
        {typed}
        <Caret show={isTyping} />
      </p>

      {showBenefits && (
        <motion.ul
          initial="hidden"
          animate="visible"
          variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.18 } } }}
          className="mt-8 w-full max-w-md space-y-3"
          aria-hidden="true"
        >
          {BENEFITS.map((benefit) => {
            const Icon = benefit.icon;
            return (
              <motion.li
                key={benefit.title}
                variants={{ hidden: { opacity: 0, y: 14 }, visible: { opacity: 1, y: 0 } }}
                transition={{ duration: 0.45, ease: 'easeOut' }}
                className="flex items-start gap-3 rounded-xl border border-slate-800
                           bg-slate-900 px-4 py-3 text-left"
              >
                <span
                  className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-lg
                             border border-indigo-500/25 bg-indigo-500/10 text-indigo-300"
                >
                  <Icon size={16} strokeWidth={1.8} aria-hidden="true" />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-slate-100">
                    {benefit.title}
                  </span>
                  <span className="block text-xs leading-relaxed text-slate-400">
                    {benefit.text}
                  </span>
                </span>
              </motion.li>
            );
          })}
        </motion.ul>
      )}

      <div
        className={`mt-8 w-full max-w-xs transition-opacity duration-700
                    ${showCTA ? 'opacity-100' : 'pointer-events-none opacity-0'}`}
        aria-hidden={!showCTA}
      >
        <button
          type="button"
          onClick={onContinue}
          className="w-full rounded-full bg-indigo-600 px-8 py-3 text-sm font-semibold
                     text-slate-100 shadow-lg shadow-indigo-600/30 transition-all
                     hover:bg-indigo-500 active:scale-95"
        >
          Crear mi Promotoría
        </button>
      </div>
    </div>
  );
}

/**
 * Un campo de la Fase 3: mismo armazón para los tres (etiqueta pequeña en
 * mayúsculas, input grande, ayuda opcional debajo) para que ajustar el
 * espaciado de uno no desalinee a los otros dos.
 */
function AgencyField({
  id, label, hint, children,
}) {
  return (
    <div>
      <label
        className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider
                   text-slate-500"
        htmlFor={id}
      >
        {label}
      </label>
      {children}
      {hint && <p className="mt-1.5 text-[11px] leading-relaxed text-slate-500">{hint}</p>}
    </div>
  );
}

/**
 * Fase 3 — Creación de la Promotoría. Tres campos, sin ceremonia: nombre de
 * la agencia, contacto del asistente administrativo (opcional — habilita
 * permisos de gestión sólo si esa persona ya tiene cuenta, igual regla de
 * negocio que ya aplica `AssistantsModal.jsx`) y el código de enlace, que se
 * puede escribir a mano o generar con un toque a partir del nombre de la
 * agencia (`generateCode`, `promotoriaCode.js` — el mismo generador que ya
 * usa `InviteCodeCard.jsx`, no una copia).
 *
 * "Finalizar Configuración" queda deshabilitado hasta que el nombre de la
 * agencia tenga al menos `MIN_AGENCY_NAME` letras y el código tenga la forma
 * válida (letras-000-00): sin agencia no hay qué crear, y un código a medio
 * escribir no sirve para invitar a nadie. El asistente es la única pieza que
 * de verdad es opcional.
 */
function AgencySetupStep({
  initialAgencyName, onSubmit, isBusy, error,
}) {
  const text = 'Dale identidad a tu equipo en Prospecta.';
  const { typed, isTyping } = useTypewriter(text);
  const [agencyName, setAgencyName] = useState(initialAgencyName);
  const [assistant, setAssistant] = useState('');
  const [code, setCode] = useState('');

  const cleanAgency = agencyName.trim();
  const isAgencyValid = cleanAgency.length >= MIN_AGENCY_NAME;
  const isCodeValid = isValidCode(code);
  const canSubmit = isAgencyValid && isCodeValid && !isBusy;

  const rollCode = () => {
    if (!cleanAgency) return;
    setCode(generateCode(cleanAgency));
  };

  const submit = (event) => {
    event.preventDefault();
    if (!canSubmit) return;
    onSubmit({
      agencyName: cleanAgency,
      assistant: assistant.trim(),
      code: normalizeCode(code),
    });
  };

  return (
    <form onSubmit={submit} className="flex w-full flex-col items-center px-6 text-center">
      <p className="sr-only">{text}</p>
      <p
        className="max-w-md text-xl font-light leading-snug text-slate-100 sm:text-2xl"
        aria-hidden="true"
      >
        {typed}
        <Caret show={isTyping} />
      </p>

      <div
        className={`mt-8 w-full max-w-sm space-y-5 text-left transition-opacity duration-700
                    ${isTyping ? 'pointer-events-none opacity-0' : 'opacity-100'}`}
        aria-hidden={isTyping}
      >
        <AgencyField id="agency-name" label="Nombre de tu Promotoría o Agencia">
          <input
            id="agency-name"
            value={agencyName}
            onChange={(event) => setAgencyName(event.target.value)}
            placeholder="Ej. Grupo Elite"
            autoComplete="off"
            className="w-full rounded-xl border border-slate-800 bg-slate-900 px-3.5 py-3
                       text-lg text-slate-100 placeholder:text-slate-600
                       focus:border-indigo-500 focus:outline-none focus:ring-2
                       focus:ring-indigo-500/40"
          />
        </AgencyField>

        <AgencyField
          id="assistant-contact"
          label="Correo o nombre de tu asistente administrativo"
          hint="Opcional. Si escribes un correo ya registrado en Prospecta, le
                habilitamos permisos de gestión de una vez."
        >
          <input
            id="assistant-contact"
            value={assistant}
            onChange={(event) => setAssistant(event.target.value)}
            placeholder="asistente@ejemplo.com"
            autoComplete="off"
            autoCapitalize="none"
            className="w-full rounded-xl border border-slate-800 bg-slate-900 px-3.5 py-3
                       text-base text-slate-100 placeholder:text-slate-600
                       focus:border-indigo-500 focus:outline-none focus:ring-2
                       focus:ring-indigo-500/40"
          />
        </AgencyField>

        <AgencyField
          id="invite-code"
          label="Código de enlace"
          hint="De 2 a 8 letras, tres dígitos y dos dígitos, como ELITE-866-01."
        >
          <div className="flex gap-2">
            <input
              id="invite-code"
              value={code}
              onChange={(event) => setCode(normalizeCode(event.target.value))}
              placeholder="ELITE-2026"
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck="false"
              maxLength={15}
              className="min-w-0 flex-1 rounded-xl border border-slate-800 bg-slate-900 px-3.5
                         py-3 text-center font-mono text-lg tracking-[0.1em] text-slate-100
                         placeholder:text-slate-600 focus:border-indigo-500 focus:outline-none
                         focus:ring-2 focus:ring-indigo-500/40"
            />
            <button
              type="button"
              onClick={rollCode}
              disabled={!cleanAgency}
              title="Generar código a partir del nombre de la agencia"
              aria-label="Generar código automáticamente"
              className="grid shrink-0 place-items-center rounded-xl border border-slate-800
                         bg-slate-900 px-3.5 text-slate-300 transition-colors
                         hover:border-indigo-500/40 hover:text-indigo-300
                         disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Dices size={18} aria-hidden="true" />
            </button>
          </div>
          {code && !isCodeValid && (
            <p className="mt-1.5 text-[11px] leading-relaxed text-amber-400">
              {explainCode(code)}
            </p>
          )}
        </AgencyField>

        {error && (
          <p
            role="alert"
            className="flex items-start gap-2 rounded-xl border border-rose-500/30
                       bg-rose-500/10 p-3 text-[11px] leading-relaxed text-rose-300"
          >
            <AlertTriangle size={13} className="mt-0.5 shrink-0" aria-hidden="true" />
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={!canSubmit}
          className={`flex w-full items-center justify-center gap-2 rounded-full
                     bg-indigo-600 px-8 py-3.5 text-sm font-bold uppercase tracking-wide
                     text-slate-100 transition-all hover:bg-indigo-500 active:scale-95
                     disabled:cursor-not-allowed disabled:bg-white/[0.06]
                     disabled:text-white/25 disabled:shadow-none
                     ${canSubmit ? 'shadow-[0_0_20px_rgba(79,70,229,0.55)] '
    + 'hover:shadow-[0_0_28px_rgba(79,70,229,0.8)]' : ''}`}
        >
          {isBusy && <Loader2 size={15} className="animate-spin" aria-hidden="true" />}
          {isBusy ? 'Configurando...' : 'Finalizar Configuración'}
        </button>
      </div>
    </form>
  );
}

/*
  Piezas de confeti con CSS puro — mismo criterio y misma animación
  (`goal-confetti`, ya definida en `index.css`) que ya usan `Celebration.jsx`
  y `FirstLoginIntro.jsx`: nada de `react-confetti` ni canvas para un efecto
  de unos segundos que ocurre una sola vez en la vida de la cuenta.
  Duplicado a propósito y no importado de ninguno de los dos, mismo criterio
  que `Caret` arriba.
*/
const CONFETTI_COLORS = [
  'bg-amber-400', 'bg-emerald-400', 'bg-indigo-400',
  'bg-rose-400', 'bg-cyan-300', 'bg-violet-400',
];
const CONFETTI_PIECES = 50;

function ConfettiBurst() {
  const [reduceMotion, setReduceMotion] = useState(false);
  const [pieces] = useState(() => Array.from({ length: CONFETTI_PIECES }, (_, index) => ({
    id: index,
    left: Math.random() * 100,
    delay: Math.random() * 900,
    duration: 2200 + Math.random() * 1400,
    drift: (Math.random() - 0.5) * 140,
    size: 6 + Math.random() * 7,
    color: CONFETTI_COLORS[index % CONFETTI_COLORS.length],
    rotation: Math.random() * 360,
  })));

  useEffect(() => {
    const query = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    setReduceMotion(Boolean(query?.matches));
  }, []);

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
 * Fase 4 — Cierre. Pantalla de éxito temporal: confeti, ícono representativo
 * (`Building2`, coherente con el mismo ícono que ya usa `PromotoriaBadge.jsx`
 * para "esta es tu promotoría" — no `Rocket`, para no introducir un segundo
 * vocabulario visual de "agencia" en la app) y el nombre de la agencia recién
 * creada. Se desvanece sola a los `SUCCESS_AUTO_MS` y avisa a `onDone` para
 * que el padre redirija al Dashboard — no hay botón que tocar, porque no hay
 * ninguna decisión que tomar aquí.
 */
function SuccessStep({ name, agencyName, onDone }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const showTimer = setTimeout(() => setVisible(true), 50);
    const doneTimer = setTimeout(onDone, SUCCESS_AUTO_MS);
    return () => {
      clearTimeout(showTimer);
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
        <span
          className="mb-6 grid h-16 w-16 place-items-center rounded-2xl border
                     border-indigo-500/30 bg-indigo-500/10 text-indigo-300"
          aria-hidden="true"
        >
          <Building2 size={28} strokeWidth={1.8} aria-hidden="true" />
        </span>

        <p className="text-2xl font-bold text-slate-100 sm:text-3xl">
          ¡Felicidades, {name}!
        </p>

        <p className="mt-3 max-w-sm text-sm leading-relaxed text-slate-400">
          Tu promotoría <span className="font-semibold text-slate-200">{agencyName}</span>{' '}
          ha sido creada con éxito. Bienvenido a Prospecta.
        </p>
      </div>
    </div>
  );
}

/**
 * Configuración inicial del Promotor (Director de Agencia) al entrar por
 * primera vez a Prospecta: cuatro fases lineales, sin pila de historial ni
 * botón de "Atrás" —a diferencia de `OnboardingFlow.jsx`, éste es un trámite
 * corto y no un cuestionario largo, así que retroceder no aporta nada que
 * arreglar a mitad de camino—.
 *
 *   1. Nombre (`NameStep`) — cómo se le quiere llamar.
 *   2. Ventajas (`BenefitsStep`) — el mensaje directivo y las tres viñetas
 *      con animación en cascada.
 *   3. Creación de la Promotoría (`AgencySetupStep`) — nombre de la agencia,
 *      contacto del asistente (opcional) y código de enlace. Al confirmar,
 *      escribe de verdad en la base:
 *        - `saveMyCard` (nombre + empresa/promotoría en la tarjeta digital,
 *          conservando el resto de la ficha si ya existía una).
 *        - `saveMyCode` (el código de invitación, mismo repositorio que ya
 *          usa `InviteCodeCard.jsx`).
 *        - `promoteToAssistant`, sólo si el contacto escrito parece un
 *          correo: la persona tiene que estar ya registrada en la app para
 *          poder ascenderla (misma regla que `AssistantsModal.jsx`); un
 *          nombre sin arroba se guarda como referencia visual nada más y no
 *          dispara ninguna escritura, porque no hay a quién ascender todavía.
 *   4. Cierre (`SuccessStep`) — confeti y bienvenida, `SUCCESS_AUTO_MS` y
 *      avisa a `onComplete`.
 *
 * `promoterId` es el `id` de la ficha en `profiles` sobre la que se escribe
 * — quien monta este componente (`Gate`/`App.jsx`, para un rol `promoter`
 * recién aprobado sin promotoría propia todavía) es quien decide cuándo
 * corresponde mostrarlo, igual que `TodayView` decide cuándo le toca
 * `FirstLoginIntro` a un asesor.
 */
export default function PromotorSetup({
  promoterId, initialName = '', onComplete,
  /*
    Sólo para `?onboardingPreview=1` (`OnboardingPreview`, `App.jsx`): ahí
    `promoterId` es `'preview-sin-cuenta'`, una clave fija que no es un UUID
    real de Supabase, y las tres escrituras de `submitAgency` (tarjeta,
    código, ascenso de asistente) fallarían de verdad contra la base —a
    diferencia de `OnboardingFlow`, que en ese mismo entorno recibe
    `onProfileSaved={async () => {}}` y nunca llega a intentar guardar nada.
    Con esta bandera en `true`, la Fase 3 valida el formulario igual que
    siempre pero omite las tres llamadas a la base y pasa directo a la Fase
    4: el recorrido se ve idéntico al de una cuenta real, sólo que no deja
    ninguna fila a medio crear en `profiles` por una clave que la base
    jamás podría aceptar.
  */
  skipPersistence = false,
}) {
  const [phase, setPhase] = useState(1);
  const [name, setName] = useState(initialName);
  const [agencyName, setAgencyName] = useState('');
  const [isBusy, setBusy] = useState(false);
  const [error, setError] = useState('');

  /*
    Mismo acelerador de máquina de escribir que el resto del flujo de
    Onboarding: el primer toque en la pantalla activa el modo rápido para el
    resto del recorrido, sin volver a apagarse.
  */
  const [fastTyping, setFastTyping] = useState(false);

  const submitName = (value) => {
    setName(value);
    setPhase(2);
  };

  const submitAgency = async ({ agencyName: newAgencyName, assistant, code }) => {
    setBusy(true);
    setError('');

    if (skipPersistence) {
      setBusy(false);
      setAgencyName(newAgencyName);
      setPhase(4);
      return;
    }

    // 1) Nombre + agencia en la tarjeta digital, conservando el resto de la
    // ficha si ya existía una (evita que este trámite corto borre datos de
    // contacto que la persona hubiera llenado antes por otro camino).
    const { data: existing } = await fetchProfile(promoterId);
    const { error: cardError } = await saveMyCard(promoterId, {
      ...(existing ?? {}),
      fullName: name,
      company: newAgencyName,
    });
    if (cardError) {
      setBusy(false);
      setError(describeError(cardError));
      return;
    }

    // 2) Código de invitación.
    const { error: codeError, taken } = await saveMyCode(promoterId, code);
    if (taken) {
      setBusy(false);
      setError('Ese código ya lo usa otra promotoría. Elige otro o genera uno nuevo.');
      return;
    }
    if (codeError) {
      setBusy(false);
      setError(describeError(codeError));
      return;
    }

    // 3) Asistente administrativo, sólo si el contacto escrito es un correo:
    // ascender exige que esa persona ya tenga cuenta en Prospecta, y sin
    // arroba no hay forma de buscarla. Un nombre sin correo no es un error
    // aquí — sólo significa que todavía no se puede dar de alta.
    if (assistant.includes('@')) {
      const { error: assistantError } = await promoteToAssistant(assistant);
      // No detiene el flujo: la agencia y el código ya quedaron guardados,
      // y el promotor puede volver a intentar el ascenso después desde
      // `AssistantsModal.jsx`. Bloquear el cierre por este paso opcional
      // dejaría creada la promotoría a medias en la pantalla, sin estarlo
      // de verdad en la base.
      if (assistantError) {
        setError(`Tu promotoría quedó creada. No se pudo dar de alta a tu asistente: `
          + `${describeError(assistantError)}`);
      }
    }

    setBusy(false);
    setAgencyName(newAgencyName);
    setPhase(4);
  };

  return (
    <div
      className="flex min-h-screen w-full items-center justify-center bg-slate-950 px-4 py-10"
      onClick={() => setFastTyping(true)}
    >
      <LocalTypewriterSpeed.Provider value={fastTyping ? 2 : 1}>
        {phase === 1 && (
          <Phase phaseKey={1}>
            <NameStep initialValue={name} onContinue={submitName} />
          </Phase>
        )}

        {phase === 2 && (
          <Phase phaseKey={2}>
            <BenefitsStep name={name} onContinue={() => setPhase(3)} />
          </Phase>
        )}

        {phase === 3 && (
          <Phase phaseKey={3}>
            <AgencySetupStep
              initialAgencyName={agencyName}
              onSubmit={submitAgency}
              isBusy={isBusy}
              error={error}
            />
          </Phase>
        )}

        {phase === 4 && (
          <Phase phaseKey={4}>
            <SuccessStep
              name={name}
              agencyName={agencyName}
              onDone={() => onComplete?.(agencyName)}
            />
          </Phase>
        )}
      </LocalTypewriterSpeed.Provider>
    </div>
  );
}
