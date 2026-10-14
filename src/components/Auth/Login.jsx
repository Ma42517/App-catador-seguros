import { useState, useEffect } from 'react';
import {
  Lock, Mail, User, Loader2, AlertTriangle, MailCheck, Eye, EyeOff, ArrowRight,
} from 'lucide-react';
import { useSession } from '../../context/SessionContext';
import useTypewriter from '../../lib/useTypewriter';
import { readAppTheme, themeFor } from '../../lib/appTheme';
import ExpandiaMark from './ExpandiaMark';

/*
  Frases motivacionales que van rotando bajo el logo, con efecto de escritura.
  Cierran con el eslogan de la marca para enlazar con la identidad. El tono es
  aspiracional a propósito: entrar a la app es el momento de recordar para qué.
*/
const MOTIVATION = [
  'Hoy es un buen día para crecer.',
  'Tu próximo gran cliente te espera.',
  'Tu esfuerzo de hoy, tu libertad de mañana.',
  'Multiplica tus posibilidades.',
];

/** Cuánto se queda una frase ya escrita antes de pasar a la siguiente. */
const PHRASE_HOLD_MS = 2200;

/**
 * Frase que se escribe sola y, al terminar, cede su lugar a la siguiente en bucle.
 * Reutiliza `useTypewriter` (el mismo efecto del onboarding) para no inventar otro.
 */
function RotatingMotivation({ colorClass, accentColor }) {
  const [index, setIndex] = useState(0);
  const phrase = MOTIVATION[index];
  const { typed, isTyping } = useTypewriter(phrase);

  useEffect(() => {
    if (isTyping) return undefined;
    const timer = setTimeout(() => {
      setIndex((i) => (i + 1) % MOTIVATION.length);
    }, PHRASE_HOLD_MS);
    return () => clearTimeout(timer);
  }, [isTyping, index]);

  return (
    <p className={`min-h-[3.5rem] max-w-xs text-center text-xl font-light leading-snug ${colorClass}`}>
      {typed}
      {isTyping && <span style={{ color: accentColor }} className="animate-pulse">|</span>}
    </p>
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
 *
 * Los mensajes originales están en inglés y describen el síntoma. "Email not
 * confirmed" no le dice a nadie que hay un correo esperando en su bandeja.
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
 * Pantalla de acceso, estilo cálido y vivo.
 *
 * Respeta el tema (negro/blanco/crema) que la persona eligió en la bienvenida, con
 * un saludo motivacional que rota bajo el logo. El acceso con correo y contraseña es
 * la vía principal, y Google queda como alternativa. Las dos crean la misma cuenta
 * en Supabase y pasan por la misma revisión de acceso. La lógica de autenticación no
 * cambió con el rediseño: sólo la piel.
 */
export default function Login() {
  const {
    signInWithGoogle, signInWithPassword, signUpWithPassword, googleEnabled, error: sessionError,
  } = useSession();

  // Tema elegido en la bienvenida: el login se pinta igual para no romper la
  // continuidad. Se lee una vez al montar; esta pantalla no lo cambia.
  const t = themeFor(readAppTheme());
  const isDark = t.value === 'dark';

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

  // Clases de campo según el tema. Altos y redondeados, fáciles de tocar.
  const fieldClass = `w-full rounded-2xl border py-4 pl-12 pr-4 text-base outline-none
    transition-all focus:ring-2 ${t.inputBg}`;
  const bg = t.bgStyle ? '' : t.bg;

  return (
    <div
      className={`relative flex min-h-screen w-full flex-col overflow-hidden px-6 py-10 ${bg}`}
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

      <div className="relative mx-auto flex w-full max-w-sm flex-1 flex-col justify-center">
        {/* ── Logo + saludo motivacional rotativo ── */}
        <div className="mb-10 flex flex-col items-center">
          <ExpandiaMark theme={t.value} size="text-5xl" />
          <div className="mt-6">
            <RotatingMotivation colorClass={t.text} accentColor={t.accent} />
          </div>
        </div>

        {/* ── Formulario ── */}
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
            {/* Ojito: ver u ocultar lo escrito, para comprobar sin errores. */}
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
            {isBusy
              ? <Loader2 size={18} className="animate-spin" />
              : null}
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

        {/* ── Google, como alternativa ── */}
        <div className="my-5 flex items-center gap-3" aria-hidden="true">
          <span className={`h-px flex-1 ${isDark ? 'bg-white/15' : 'bg-black/10'}`} />
          <span className={`text-[11px] font-semibold uppercase tracking-wider ${t.faint}`}>o</span>
          <span className={`h-px flex-1 ${isDark ? 'bg-white/15' : 'bg-black/10'}`} />
        </div>

        <button
          type="button"
          onClick={enterWithGoogle}
          disabled={isGoogleBusy}
          className={`flex w-full items-center justify-center gap-2.5 rounded-full border
                      px-4 py-4 text-base font-semibold transition-all active:scale-[0.98]
                      disabled:cursor-wait disabled:opacity-70
                      ${isDark ? 'border-white/15 text-[#F5EFE6] hover:bg-white/5'
                        : 'border-black/10 hover:bg-black/[0.03]'} ${!isDark ? t.text : ''}`}
          style={!isDark ? t.inputStyle : undefined}
        >
          {isGoogleBusy
            ? <Loader2 size={18} className="animate-spin" />
            : <GoogleMark />}
          {isGoogleBusy ? 'Abriendo Google...' : 'Continuar con Google'}
        </button>

        {!googleEnabled && (
          <p
            className="mt-3 flex items-start gap-2 rounded-2xl border border-amber-500/30
                       bg-amber-500/10 p-3 text-sm leading-relaxed text-amber-600"
          >
            <AlertTriangle size={15} className="mt-0.5 shrink-0" aria-hidden="true" />
            Falta configurar Supabase en este entorno, así que todavía no se puede entrar.
          </p>
        )}

        {sessionError && (
          <p
            role="alert"
            className="mt-3 rounded-2xl border border-rose-500/30 bg-rose-500/10 p-3
                       text-sm leading-relaxed text-rose-500"
          >
            {sessionError}
          </p>
        )}

        <p className={`mt-8 text-center text-xs leading-relaxed ${t.faint}`}>
          Un administrador revisará tu solicitud antes de entrar.
        </p>
      </div>
    </div>
  );
}
