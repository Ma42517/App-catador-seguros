import { useState } from 'react';
import { Lock, User, LogIn, ShieldCheck } from 'lucide-react';
import { Button, Field, TextInput } from '../ui';
import { authenticate } from './users';

/**
 * Pantalla de acceso con estilo glassmorphism. No toca los contexts ni el
 * motor financiero: solo valida las credenciales y notifica al padre con
 * los datos del usuario autenticado (incluido su rol).
 */
export default function LoginScreen({ onLoginSuccess }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    const user = authenticate(username, password);

    if (user) {
      setError('');
      onLoginSuccess(user);
    } else {
      setError('Usuario o contraseña incorrectos.');
    }
  };

  return (
    <div className="relative flex min-h-screen w-full max-w-full items-center justify-center overflow-hidden bg-white px-4 py-10 dark:bg-black">
      {/* Iluminación ambiental para reforzar el efecto de cristal */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-[420px] bg-grid-fade"
        aria-hidden="true"
      />

      <div className="animate-rise relative w-full max-w-sm">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-6 shadow-xl shadow-zinc-950/60 backdrop-blur-md sm:p-8">
          {/* Marca */}
          <div className="mb-6 text-center">
            <span
              className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 shadow-lg shadow-indigo-600/30"
              aria-hidden="true"
            >
              <ShieldCheck size={22} className="text-white" />
            </span>
            <h1 className="text-2xl font-black tracking-tight text-zinc-900 dark:text-white">PROSPECTA</h1>
            <p className="mt-1 text-xs tracking-widest text-zinc-500">
              Diagnóstico Financiero 360
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
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
              <p role="alert" className="text-xs font-medium text-rose-400">
                {error}
              </p>
            )}

            <Button type="submit" icon={LogIn} full className="mt-2">
              Iniciar sesión
            </Button>
          </form>
        </div>

        <p className="mt-4 text-center text-[10px] leading-relaxed text-zinc-600">
          Acceso restringido. Tu información se guarda únicamente en este navegador.
        </p>
      </div>
    </div>
  );
}
