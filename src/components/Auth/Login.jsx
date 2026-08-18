import { useState } from 'react';
import {
  Lock, Mail, User, LogIn, UserPlus, Loader2, AlertTriangle, MailCheck,
} from 'lucide-react';
import { useSession } from '../../context/SessionContext';
import TextScaleControl from '../ui/TextScaleControl';

const INPUT =
  'w-full rounded-xl border border-zinc-700 bg-zinc-950/60 py-3 pl-10 pr-3 text-sm '
  + 'text-zinc-100 transition-colors placeholder:text-zinc-600 focus:border-indigo-500 '
  + 'focus:outline-none focus:ring-2 focus:ring-indigo-500';

const LABEL = 'mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-zinc-500';

/** Campo con icono a la izquierda. */
function IconField({ id, label, icon: Icon, ...props }) {
  return (
    <div>
      <label className={LABEL} htmlFor={id}>{label}</label>
      <div className="relative">
        <Icon
          size={16}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500"
          aria-hidden="true"
        />
        <input id={id} className={INPUT} {...props} />
      </div>
    </div>
  );
}

/**
 * Logotipo de Google.
 *
 * Va como SVG en línea y no como imagen remota: el acceso es lo primero que se
 * pinta y no debe depender de que cargue un archivo externo.
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
 * Traduce los fallos de Supabase Auth a instrucciones.
 *
 * Los mensajes originales están en inglés y describen el síntoma. "Email not
 * confirmed" no le dice a nadie que hay un correo esperando en su bandeja, ni
 * que el administrador puede evitar ese paso desde el panel.
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

  // Supabase limita los intentos seguidos y responde con los segundos que
  // faltan. Sin traducirlo, la persona lee un texto en inglés y no entiende que
  // sólo tiene que esperar.
  const wait = raw.match(/after (\d+) seconds?/i);
  if (wait) {
    return `Demasiados intentos seguidos. Espera ${wait[1]} segundos y vuelve a intentar.`;
  }

  return raw || 'No se pudo completar el acceso.';
}

/**
 * Pantalla de acceso.
 *
 * El acceso interno con correo y contraseña es la vía principal, y Google queda
 * como alternativa. Las dos crean la misma cuenta en Supabase y pasan por la
 * misma revisión de acceso: no hay ninguna puerta que se salte la aprobación.
 */
export default function Login() {
  const {
    signInWithGoogle, signInWithPassword, signUpWithPassword, googleEnabled, error: sessionError,
  } = useSession();

  const [mode, setMode] = useState('signIn');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
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

  return (
    <div
      className="relative flex min-h-screen w-full max-w-full items-center justify-center
                 overflow-hidden bg-white px-4 py-10 dark:bg-black"
    >
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-[420px] bg-grid-fade"
        aria-hidden="true"
      />

      <div className="animate-rise relative w-full max-w-sm">
        {/*
          Antes de entrar, no después: quien no lee bien el formulario que
          tiene delante necesita poder arreglarlo primero, no encontrar el
          ajuste ya adentro de una cuenta a la que no puede llegar. Va fuera
          de la tarjeta y centrado, para que sea lo primero que se note al
          abrir la pantalla y no un detalle escondido en una esquina.
        */}
        <div className="mb-4 flex justify-center">
          <TextScaleControl />
        </div>

        <div
          className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-6 shadow-xl
                     shadow-zinc-950/60 backdrop-blur-md sm:p-8"
        >
          <div className="mb-6 text-center">
            <h1 className="text-3xl font-black tracking-tight text-zinc-900 dark:text-white">
              PROSPECTA
            </h1>
            <p className="mt-1.5 text-[11px] tracking-[0.2em] text-zinc-500">
              PLATAFORMA DE LA PROMOTORÍA
            </p>
          </div>

          <h2 className="mb-4 text-center text-sm font-bold text-zinc-300">
            {isSignUp ? 'Crear cuenta' : 'Acceso interno'}
          </h2>

          <form onSubmit={submit} className="space-y-4">
            {isSignUp && (
              <IconField
                id="login-name"
                label="Nombre completo"
                icon={User}
                value={fullName}
                onChange={(e) => { setFullName(e.target.value); setError(''); }}
                placeholder="Marco Antonio Ramírez"
                autoComplete="name"
              />
            )}

            <IconField
              id="login-email"
              label="Correo"
              icon={Mail}
              type="email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setError(''); }}
              placeholder="asesor@promotoria.mx"
              autoComplete="email"
              autoCapitalize="none"
              inputMode="email"
            />

            <IconField
              id="login-password"
              label="Contraseña"
              icon={Lock}
              type="password"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError(''); }}
              placeholder="••••••••"
              autoComplete={isSignUp ? 'new-password' : 'current-password'}
            />

            {error && (
              <p
                role="alert"
                className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3
                           text-[11px] leading-relaxed text-rose-300"
              >
                {error}
              </p>
            )}

            {notice && (
              <p
                role="status"
                className="flex items-start gap-2 rounded-xl border border-emerald-500/30
                           bg-emerald-500/10 p-3 text-[11px] leading-relaxed text-emerald-300"
              >
                <MailCheck size={13} className="mt-0.5 shrink-0" aria-hidden="true" />
                {notice}
              </p>
            )}

            <button
              type="submit"
              disabled={isBusy}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600
                         px-4 py-3.5 text-base font-semibold text-white shadow-lg
                         shadow-indigo-600/30 transition-all hover:bg-indigo-500
                         active:scale-[0.98] disabled:cursor-wait disabled:opacity-70"
            >
              {isBusy
                ? <Loader2 size={17} className="animate-spin" />
                : (isSignUp ? <UserPlus size={17} /> : <LogIn size={17} />)}
              {isBusy
                ? (isSignUp ? 'Creando cuenta...' : 'Entrando...')
                : (isSignUp ? 'Crear cuenta' : 'Entrar')}
            </button>
          </form>

          <button
            type="button"
            onClick={switchMode}
            className="mx-auto mt-3 block rounded-lg px-3 py-2 text-xs font-semibold
                       text-zinc-500 transition-colors hover:text-indigo-400"
          >
            {isSignUp ? 'Ya tengo cuenta' : 'No tengo cuenta, quiero registrarme'}
          </button>

          {/* Google, como alternativa */}
          <div className="my-5 flex items-center gap-3" aria-hidden="true">
            <span className="h-px flex-1 bg-zinc-800" />
            <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-600">
              o
            </span>
            <span className="h-px flex-1 bg-zinc-800" />
          </div>

          <button
            type="button"
            onClick={enterWithGoogle}
            disabled={isGoogleBusy}
            className="flex w-full items-center justify-center gap-2.5 rounded-xl border
                       border-zinc-700 bg-transparent px-4 py-3 text-sm font-semibold
                       text-zinc-200 transition-colors hover:bg-white/5
                       active:scale-[0.98] disabled:cursor-wait disabled:opacity-70"
          >
            {isGoogleBusy
              ? <Loader2 size={18} className="animate-spin" />
              : <GoogleMark />}
            {isGoogleBusy ? 'Abriendo Google...' : 'Continuar con Google'}
          </button>

          {!googleEnabled && (
            <p
              className="mt-3 flex items-start gap-2 rounded-xl border border-amber-500/30
                         bg-amber-500/10 p-3 text-[11px] leading-relaxed text-amber-300"
            >
              <AlertTriangle size={13} className="mt-0.5 shrink-0" aria-hidden="true" />
              Falta configurar Supabase en este entorno, así que todavía no se puede entrar.
            </p>
          )}

          {sessionError && (
            <p
              role="alert"
              className="mt-3 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3
                         text-[11px] leading-relaxed text-rose-300"
            >
              {sessionError}
            </p>
          )}
        </div>

        <p className="mt-4 text-center text-[10px] leading-relaxed text-zinc-600">
          Acceso restringido. Un administrador de la promotoría debe aprobar tu
          solicitud antes de que puedas entrar.
        </p>
      </div>
    </div>
  );
}
