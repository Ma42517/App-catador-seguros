import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Lock, Mail, User, Loader2, AlertTriangle, MailCheck, Eye, EyeOff, ArrowRight, ArrowLeft,
} from 'lucide-react';
import { useSession } from '../../context/SessionContext';
import useTypewriter from '../../lib/useTypewriter';
import { readAppTheme, themeFor } from '../../lib/appTheme';
import ExpandiaMark from './ExpandiaMark';

/*
  Frases motivacionales que se van APILANDO en cascada bajo el logo: cada una se
  escribe, sube y queda difuminada arriba mientras entra la siguiente. Cierran con
  el eslogan de la marca. Es el mismo lenguaje de la bienvenida, para que el acceso
  se sienta de una pieza.
*/
const MOTIVATION = [
  'Hoy es un buen día para crecer.',
  'Tu próximo gran cliente te espera.',
  'Tu esfuerzo de hoy, tu libertad de mañana.',
  'Multiplica tus posibilidades.',
];

/** Cuánto se queda una frase ya escrita antes de que entre la siguiente. */
const PHRASE_HOLD_MS = 1600;

/** Cuántas frases se ven apiladas a la vez (la viva + las difuminadas de arriba). */
const STACK = 3;

/**
 * Hilo motivacional en cascada. Escribe una frase, la empuja hacia arriba
 * (difuminada) y entra la siguiente, en bucle. Reutiliza `useTypewriter`.
 */
/**
 * La frase viva: se escribe letra por letra y, ya completa, espera un momento y
 * avisa que es hora de que entre la siguiente.
 */
function TypedPhrase({ text, onDone, accentColor }) {
  const { typed, isTyping } = useTypewriter(text);

  useEffect(() => {
    if (isTyping) return undefined;
    const timer = setTimeout(onDone, PHRASE_HOLD_MS);
    return () => clearTimeout(timer);
  }, [isTyping, onDone]);

  return (
    <>
      {typed}
      {isTyping && <span style={{ color: accentColor }} className="animate-pulse not-italic">|</span>}
    </>
  );
}

/*
  Cómo se ve cada renglón según qué tan atrás quedó (0 = la viva, abajo). Se anima
  con opacidad, desenfoque y escala —no cambiando el tamaño de letra—, así el paso de
  un nivel al otro es una transición continua y no un brinco.
*/
const DEPTH_LOOK = [
  { opacity: 1, filter: 'blur(0px)', scale: 1 },
  { opacity: 0.45, filter: 'blur(0.6px)', scale: 0.9 },
  { opacity: 0.18, filter: 'blur(1.6px)', scale: 0.82 },
];

/**
 * Hilo motivacional en cascada, de una sola pasada.
 *
 * Recorre las frases en orden y SE DETIENE en la última ("Multiplica tus
 * posibilidades."), que se queda fija como cierre —no vuelve a empezar el ciclo—.
 * Cada frase lleva su propio id: la más vieja sale por arriba DESVANECIÉNDOSE —se
 * difumina, se apaga y sube— en lugar de borrarse de golpe, y las del medio se
 * recorren con `layout` para que todo se mueva en bloque, suave.
 */
function MotivationCascade({ colorClass, accentColor, onComplete }) {
  const [lines, setLines] = useState([{ id: 0, text: MOTIVATION[0] }]);

  const advance = useCallback(() => {
    setLines((prev) => {
      const lastId = prev[prev.length - 1].id;
      const nextId = lastId + 1;
      /*
        La última frase de la cascada es la ANTERIOR al eslogan: al terminarla se
        avisa (onComplete) para que la pantalla pase al cierre —logo + eslogan
        centrados—, en vez de escribir aquí "Multiplica tus posibilidades". Ese
        eslogan vive en el cierre, no en la cascada.
      */
      if (nextId >= MOTIVATION.length - 1) {
        onComplete?.();
        return prev;
      }
      return [...prev, { id: nextId, text: MOTIVATION[nextId] }].slice(-STACK);
    });
  }, [onComplete]);

  return (
    <div className="flex h-[7.5rem] flex-col items-center justify-end gap-2 overflow-visible">
      <AnimatePresence initial={false} mode="popLayout">
        {lines.map((line, i) => {
          const depth = lines.length - 1 - i;
          const isLive = depth === 0;
          return (
            <motion.p
              key={line.id}
              layout
              initial={{ opacity: 0, y: 18, filter: 'blur(4px)', scale: 1 }}
              animate={{ ...DEPTH_LOOK[depth], y: 0 }}
              exit={{
                opacity: 0, y: -22, filter: 'blur(6px)', scale: 0.78,
                transition: { duration: 0.7, ease: 'easeOut' },
              }}
              transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
              style={{ transformOrigin: 'center' }}
              className={`whitespace-nowrap text-center font-display text-[1.05rem] italic
                          leading-snug sm:text-2xl ${colorClass}`}
            >
              {isLive
                ? <TypedPhrase text={line.text} onDone={advance} accentColor={accentColor} />
                : line.text}
            </motion.p>
          );
        })}
      </AnimatePresence>
    </div>
  );
}

/**
 * Logotipo de Google. SVG en línea, no imagen remota: el acceso es lo primero que
 * se pinta y no debe depender de que cargue un archivo externo.
 */
function GoogleMark({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24s.92 7.54 2.56 10.78l7.97-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
  );
}

/**
 * Traduce los fallos de Supabase Auth a instrucciones en español.
 */
function explain(error) {
  const raw = error?.message ?? '';

  if (/Invalid login credentials/i.test(raw)) {
    return 'Correo o contraseña incorrectos.';
  }
  if (/Email not confirmed/i.test(raw)) {
    return 'Tu cuenta existe pero falta confirmar el correo. Busca el mensaje de '
      + 'Supabase en tu bandeja (revisa también el correo no deseado).';
  }
  if (/User already registered/i.test(raw)) {
    return 'Ya existe una cuenta con ese correo. Usa "Ya tengo cuenta" para entrar.';
  }
  if (/Password should be at least/i.test(raw)) {
    return 'La contraseña debe tener al menos 6 caracteres.';
  }
  if (/Signups not allowed/i.test(raw)) {
    return 'El registro está cerrado en este proyecto. Pídele a tu administrador '
      + 'que cree tu cuenta.';
  }

  const wait = raw.match(/after (\d+) seconds?/i);
  if (wait) {
    return `Demasiados intentos seguidos. Espera ${wait[1]} segundos y vuelve a intentar.`;
  }

  return raw || 'No se pudo completar el acceso.';
}

/**
 * Pantalla de acceso, estilo cálido y vivo (inspirado en el patrón de Sesame).
 *
 * Arranca LIMPIA: logo, frases motivacionales en cascada y dos botones —correo y
 * Google—. El formulario de correo/contraseña no se muestra hasta pulsar "Continuar
 * con correo"; Google se dispara al pulsar su botón. Así la primera impresión es
 * aire y motivación, no un formulario. Respeta el tema elegido en la bienvenida.
 *
 * La lógica de autenticación no cambió con el rediseño: sólo la piel y el momento en
 * que aparece cada cosa.
 */
export default function Login() {
  const {
    signInWithGoogle, signInWithPassword, signUpWithPassword, googleEnabled, error: sessionError,
  } = useSession();

  const t = themeFor(readAppTheme());
  const isDark = t.value === 'dark';

  /*
    `revealed` = ya terminó la intro (la cascada de frases) y se mostró el cierre:
    logo + eslogan al centro y los botones de acceso. Mientras es false, sólo corren
    las frases, sin logo ni botones —es la "obertura"—.
  */
  const [revealed, setRevealed] = useState(false);

  // 'choice' = pantalla limpia con los dos botones. 'email' = formulario revelado.
  const [view, setView] = useState('choice');
  const [mode, setMode] = useState('signIn');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [isBusy, setBusy] = useState(false);
  const [isGoogleBusy, setGoogleBusy] = useState(false);

  const isSignUp = mode === 'signUp';

  const switchMode = () => {
    setMode(isSignUp ? 'signIn' : 'signUp');
    setError('');
    setNotice('');
  };

  const backToChoice = () => {
    setView('choice');
    setError('');
    setNotice('');
  };

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    setNotice('');

    if (!email.trim() || !password) {
      setError('Escribe tu correo y tu contraseña.');
      return;
    }
    if (isSignUp && !fullName.trim()) {
      setError('Escribe tu nombre completo.');
      return;
    }

    setBusy(true);
    const result = isSignUp
      ? await signUpWithPassword(email, password, fullName)
      : await signInWithPassword(email, password);
    setBusy(false);

    if (result.error) {
      setError(explain(result.error));
      return;
    }

    if (isSignUp) {
      setNotice(result.needsConfirmation
        ? 'Cuenta creada. Abre el enlace que te enviamos por correo para activarla '
          + 'y luego vuelve aquí a iniciar sesión.'
        : 'Cuenta creada. Un administrador debe aprobar tu acceso.');
      setPassword('');
      setMode('signIn');
    }
    // Al iniciar sesión con éxito, la app cambia de pantalla sola.
  };

  const enterWithGoogle = async () => {
    setGoogleBusy(true);
    const { error: oauthError } = await signInWithGoogle();
    // Si sale bien, el navegador se va a Google y este componente desaparece.
    if (oauthError) setGoogleBusy(false);
  };

  const fieldClass = `w-full rounded-2xl border py-4 pl-12 pr-4 text-base outline-none
    transition-all focus:ring-2 ${t.inputBg}`;
  const bg = t.bgStyle ? '' : t.bg;

  // Botón de proveedor (correo/Google): píldora clara con borde, estilo Sesame.
  const providerBtn = `flex w-full items-center justify-center gap-2.5 rounded-full border
    px-4 py-4 text-base font-semibold transition-all active:scale-[0.98]
    disabled:cursor-wait disabled:opacity-70
    ${isDark ? 'border-white/15 text-[#F5EFE6] hover:bg-white/5' : 'border-black/10 hover:bg-black/[0.03]'}
    ${!isDark ? t.text : ''}`;

  return (
    <div
      className={`relative flex min-h-screen w-full flex-col overflow-hidden px-6 py-8 ${bg}`}
      style={t.bgStyle}
    >
      {/* Resplandor con el acento del tema, muy suave, para dar vida al fondo. */}
      <div
        className="pointer-events-none absolute left-1/2 top-24 h-56 w-72 -translate-x-1/2
                   rounded-full blur-3xl"
        style={{
          background: `radial-gradient(circle, ${t.accent}33, transparent 70%)`,
          opacity: isDark ? 1 : 0.4,
        }}
        aria-hidden="true"
      />

      {/*
        La zona superior (obertura/cierre: cascada o logo+eslogan) sólo se muestra
        en la pantalla de elección. Al abrir el formulario de correo se oculta: así
        el formulario puede centrarse arriba y el teclado no tapa "crear cuenta".
      */}
      {view === 'choice' && !revealed && (
        <motion.div
          key="overture"
          exit={{ opacity: 0 }}
          className="relative mx-auto flex w-full max-w-sm flex-1 flex-col items-center justify-center"
        >
          <MotivationCascade
            colorClass={t.text}
            accentColor={t.accent}
            onComplete={() => setRevealed(true)}
          />
        </motion.div>
      )}

      {view === 'choice' && revealed && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="relative mx-auto flex w-full max-w-sm flex-1 flex-col items-center justify-center"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          >
            <ExpandiaMark theme={t.value} size="text-5xl sm:text-6xl" />
          </motion.div>
          <motion.p
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.5 }}
            className={`mt-4 text-center font-display text-xl italic sm:text-2xl ${t.text}`}
          >
            Multiplica tus posibilidades.
          </motion.p>
        </motion.div>
      )}

      {/*
        ── Parte inferior ──
        En "choice": los botones viven abajo (`justify-end`).
        En "email": el formulario se centra arriba (`justify-center` + logo compacto),
        para que al abrir el teclado todo —incluido "crear cuenta"— quede por encima.
      */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.5 }}
        className={`relative mx-auto flex w-full max-w-sm flex-col overflow-y-auto
                    ${view === 'email' ? 'flex-1 justify-center py-6' : 'justify-end pb-2'}`}
      >
        <AnimatePresence mode="wait">
          {view === 'choice' ? (
            <motion.div
              key="choice"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.35 }}
              className="space-y-3"
            >
              <button
                type="button"
                onClick={() => { setView('email'); setError(''); setNotice(''); }}
                style={{ backgroundColor: t.accent }}
                className="flex w-full items-center justify-center gap-2 rounded-full px-4 py-4
                           text-base font-bold text-[#0B1A30] shadow-lg transition-all
                           hover:brightness-105 active:scale-[0.98]"
              >
                <Mail size={18} />
                Continuar con correo
              </button>

              <button
                type="button"
                onClick={enterWithGoogle}
                disabled={isGoogleBusy}
                className={providerBtn}
                style={!isDark ? t.inputStyle : undefined}
              >
                {isGoogleBusy ? <Loader2 size={18} className="animate-spin" /> : <GoogleMark />}
                {isGoogleBusy ? 'Abriendo Google...' : 'Continuar con Google'}
              </button>

              {!googleEnabled && (
                <p
                  className="flex items-start gap-2 rounded-2xl border border-amber-500/30
                             bg-amber-500/10 p-3 text-sm leading-relaxed text-amber-600"
                >
                  <AlertTriangle size={15} className="mt-0.5 shrink-0" aria-hidden="true" />
                  Falta configurar Supabase en este entorno, así que todavía no se puede entrar.
                </p>
              )}

              <p className={`pt-3 text-center text-xs leading-relaxed ${t.faint}`}>
                Un administrador revisará tu solicitud antes de entrar.
              </p>
            </motion.div>
          ) : (
            <motion.div
              key="email"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              transition={{ duration: 0.35 }}
            >
              {/* Volver a los dos botones. */}
              <button
                type="button"
                onClick={backToChoice}
                className={`mb-4 flex items-center gap-1.5 text-sm font-semibold
                            transition-opacity hover:opacity-70 ${t.muted}`}
              >
                <ArrowLeft size={16} />
                Volver
              </button>

              {/* Logo compacto: la zona superior grande se ocultó para dejar sitio
                  al teclado, así que la marca se mantiene aquí, en pequeño. */}
              <div className="mb-5 flex justify-center">
                <ExpandiaMark theme={t.value} size="text-3xl" />
              </div>

              <form onSubmit={submit} className="space-y-3.5">
                {isSignUp && (
                  <div className="relative">
                    <User
                      size={18}
                      className={`pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 ${t.faint}`}
                      aria-hidden="true"
                    />
                    <input
                      id="login-name"
                      className={fieldClass}
                      style={t.inputStyle}
                      value={fullName}
                      onChange={(e) => { setFullName(e.target.value); setError(''); }}
                      placeholder="Tu nombre completo"
                      autoComplete="name"
                      aria-label="Tu nombre completo"
                    />
                  </div>
                )}

                <div className="relative">
                  <Mail
                    size={18}
                    className={`pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 ${t.faint}`}
                    aria-hidden="true"
                  />
                  <input
                    id="login-email"
                    className={fieldClass}
                    style={t.inputStyle}
                    type="email"
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); setError(''); }}
                    placeholder="Tu correo"
                    autoComplete="email"
                    autoCapitalize="none"
                    inputMode="email"
                    aria-label="Tu correo"
                    // eslint-disable-next-line jsx-a11y/no-autofocus
                    autoFocus
                  />
                </div>

                <div className="relative">
                  <Lock
                    size={18}
                    className={`pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 ${t.faint}`}
                    aria-hidden="true"
                  />
                  <input
                    id="login-password"
                    className={`${fieldClass} pr-12`}
                    style={t.inputStyle}
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); setError(''); }}
                    placeholder="Tu contraseña"
                    autoComplete={isSignUp ? 'new-password' : 'current-password'}
                    aria-label="Tu contraseña"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
                    className={`absolute right-3 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center
                                rounded-full transition-colors hover:bg-black/5 ${t.muted}`}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>

                {error && (
                  <p
                    role="alert"
                    className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-3
                               text-sm leading-relaxed text-rose-500"
                  >
                    {error}
                  </p>
                )}

                {notice && (
                  <p
                    role="status"
                    className="flex items-start gap-2 rounded-2xl border border-emerald-500/30
                               bg-emerald-500/10 p-3 text-sm leading-relaxed text-emerald-600"
                  >
                    <MailCheck size={15} className="mt-0.5 shrink-0" aria-hidden="true" />
                    {notice}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={isBusy}
                  style={{ backgroundColor: t.accent }}
                  className="flex w-full items-center justify-center gap-2 rounded-full px-4 py-4
                             text-base font-bold text-[#0B1A30] shadow-lg transition-all
                             hover:brightness-105 active:scale-[0.98] disabled:cursor-wait
                             disabled:opacity-70"
                >
                  {isBusy && <Loader2 size={18} className="animate-spin" />}
                  {isBusy
                    ? (isSignUp ? 'Creando tu cuenta...' : 'Entrando...')
                    : (isSignUp ? 'Crear mi cuenta' : 'Entrar')}
                  {!isBusy && <ArrowRight size={18} />}
                </button>
              </form>

              <button
                type="button"
                onClick={switchMode}
                className={`mx-auto mt-4 block rounded-lg px-3 py-2 text-sm font-semibold
                            transition-opacity hover:opacity-70 ${t.muted}`}
              >
                {isSignUp ? 'Ya tengo cuenta' : 'Soy nuevo, quiero crear mi cuenta'}
              </button>

              {sessionError && (
                <p
                  role="alert"
                  className="mt-3 rounded-2xl border border-rose-500/30 bg-rose-500/10 p-3
                             text-sm leading-relaxed text-rose-500"
                >
                  {sessionError}
                </p>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
