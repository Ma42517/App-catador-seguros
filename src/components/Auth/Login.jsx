import { useState } from 'react';
import { Lock, User, LogIn, ChevronDown, Loader2, AlertTriangle } from 'lucide-react';
import { Button, Field, TextInput } from '../ui';
import { useSession } from '../../context/SessionContext';

/**
 * Logotipo de Google.
 *
 * Va como SVG en línea y no como imagen remota: el botón de acceso es lo
 * primero que se pinta y no debe depender de que cargue un archivo externo.
 * Los cuatro colores son los de la marca y no se alteran, que es lo que exigen
 * sus normas de uso.
 */
function GoogleMark({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24s.92 7.54 2.56 10.78l7.97-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
  );
}

/** Acceso por usuario y contraseña, plegado bajo el botón principal. */
function LocalAccess({ onSubmit }) {
  const [isOpen, setOpen] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const submit = (event) => {
    event.preventDefault();
    if (!onSubmit(username, password)) setError('Usuario o contraseña incorrectos.');
    else setError('');
  };

  if (!isOpen) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mx-auto mt-5 flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs
                   font-semibold text-zinc-500 transition-colors hover:text-zinc-300"
      >
        Acceso interno de pruebas
        <ChevronDown size={13} />
      </button>
    );
  }

  return (
    <form onSubmit={submit} className="mt-5 space-y-4 border-t border-zinc-800 pt-5">
      <Field label="Usuario">
        <TextInput
          value={username}
          onChange={setUsername}
          placeholder="marco"
          icon={User}
          autoComplete="username"
          autoCapitalize="none"
        />
      </Field>

      <Field label="Contraseña">
        <TextInput
          value={password}
          onChange={setPassword}
          placeholder="••••••••"
          icon={Lock}
          type="password"
          autoComplete="current-password"
        />
      </Field>

      {error && (
        <p role="alert" className="text-xs font-medium text-rose-400">{error}</p>
      )}

      <Button type="submit" icon={LogIn} full>Iniciar sesión</Button>
    </form>
  );
}

/**
 * Pantalla de acceso.
 *
 * Google es la entrada principal y ocupa el lugar destacado. El acceso por
 * usuario y contraseña sigue existiendo pero plegado, porque es el único que
 * funciona mientras Google no esté configurado en el panel de Supabase: sin él,
 * un despliegue sin OAuth dejaría la app inaccesible.
 */
export default function Login() {
  const { signInWithGoogle, signInLocal, googleEnabled, error } = useSession();
  const [isSending, setSending] = useState(false);

  const enterWithGoogle = async () => {
    setSending(true);
    const { error: oauthError } = await signInWithGoogle();
    // Si sale bien, el navegador se va a Google y este componente desaparece;
    // sólo hay que devolver el botón a su estado cuando falla.
    if (oauthError) setSending(false);
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
        <div
          className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-6 shadow-xl
                     shadow-zinc-950/60 backdrop-blur-md sm:p-8"
        >
          <div className="mb-7 text-center">
            <h1 className="text-3xl font-black tracking-tight text-zinc-900 dark:text-white">
              PROSPECTA
            </h1>
            <p className="mt-1.5 text-[11px] tracking-[0.2em] text-zinc-500">
              PLATAFORMA DE LA PROMOTORÍA
            </p>
            <p className="mt-5 text-sm leading-relaxed text-zinc-400">
              Bienvenido. Entra con tu cuenta de Google para solicitar acceso a la
              plataforma de tu promotoría.
            </p>
          </div>

          {/* Botón principal: blanco sobre fondo oscuro, como lo pide Google */}
          <button
            type="button"
            onClick={enterWithGoogle}
            disabled={isSending}
            className="flex w-full items-center justify-center gap-3 rounded-xl bg-white px-4
                       py-3.5 text-base font-semibold text-zinc-800 shadow-lg
                       transition-all hover:bg-zinc-100 active:scale-[0.98]
                       disabled:cursor-wait disabled:opacity-70"
          >
            {isSending
              ? <Loader2 size={20} className="animate-spin" />
              : <GoogleMark />}
            {isSending ? 'Abriendo Google...' : 'Continuar con Google'}
          </button>

          {!googleEnabled && (
            <p
              className="mt-3 flex items-start gap-2 rounded-xl border border-amber-500/30
                         bg-amber-500/10 p-3 text-[11px] leading-relaxed text-amber-300"
            >
              <AlertTriangle size={13} className="mt-0.5 shrink-0" aria-hidden="true" />
              Falta configurar Supabase en este entorno, así que el acceso con Google
              todavía no funciona.
            </p>
          )}

          {error && (
            <p
              role="alert"
              className="mt-3 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3
                         text-[11px] leading-relaxed text-rose-300"
            >
              {error}
            </p>
          )}

          <LocalAccess onSubmit={signInLocal} />
        </div>

        <p className="mt-4 text-center text-[10px] leading-relaxed text-zinc-600">
          Acceso restringido. Un administrador de la promotoría debe aprobar tu
          solicitud antes de que puedas entrar.
        </p>
      </div>
    </div>
  );
}
