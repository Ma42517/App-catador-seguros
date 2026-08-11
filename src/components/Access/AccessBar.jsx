import { useState } from 'react';
import { KeyRound, Lock, Check, ShieldCheck, Unlink, BadgeCheck } from 'lucide-react';
import { useAccess } from '../../context/AccessContext';

const BUTTON =
  'shrink-0 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white '
  + 'transition-colors hover:bg-indigo-500 active:scale-95 focus-visible:outline-none '
  + 'focus-visible:ring-2 focus-visible:ring-indigo-500';

/**
 * Barra de acceso a la promotoría, en la cabecera del tablero.
 *
 * Crece por pasos: primero el código y, sólo si ese código concede permisos de
 * publicación, aparece la contraseña de administrador. El asesor común nunca ve
 * un campo que no le corresponde.
 *
 * Al quedar vinculada se contrae a una línea de estado, para dejar de ocupar
 * espacio en algo que ya se resolvió.
 */
export default function AccessBar({ onNotify }) {
  const {
    isLinked, isLinkedByCode, isPromoter, promoteria, accessCode,
    validateAccessCode, linkAccess, verifyPromoterPassword, unlinkAccess,
  } = useAccess();

  /*
    Quien tiene acceso por su rol puede pedir el formulario a mano. No se le
    muestra por omisión porque un código no le añade nada —ya entra—, pero
    esconderlo del todo le quitaría la única forma de vincularse a otra
    promotoría para revisarla.
  */
  const [showForm, setShowForm] = useState(false);

  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [needsPassword, setNeedsPassword] = useState(false);
  const [error, setError] = useState('');

  // El campo de contraseña aparece al reconocer un código de promotor, sin
  // esperar a que se envíe el formulario.
  const handleCodeChange = (value) => {
    setCode(value);
    setError('');
    setNeedsPassword(validateAccessCode(value).requiresPassword);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const result = validateAccessCode(code);

    if (!result.valid) {
      setError('Código no válido, verifica con tu promotor.');
      return;
    }

    if (result.requiresPassword) {
      if (!password.trim()) {
        setError('Ingresa la contraseña de administrador.');
        return;
      }
      if (!verifyPromoterPassword(password, code)) {
        setError('Contraseña de administrador incorrecta.');
        return;
      }
      setError('');
      onNotify?.('Modo Promotor habilitado');
      return;
    }

    linkAccess(code);
    setError('');
    onNotify?.('¡Promotoría vinculada con éxito!');
  };

  const release = () => {
    unlinkAccess();
    setCode('');
    setPassword('');
    setNeedsPassword(false);
    setError('');
    setShowForm(false);
    onNotify?.('Código desvinculado');
  };

  /*
    Acceso por el rol de la cuenta, sin código de por medio.

    Se dice con esas palabras y sin botón de desvincular: no hay nada que soltar,
    y ofrecerlo era exactamente el fallo —se pulsaba y no ocurría nada visible—.
  */
  if (isLinked && !isLinkedByCode && !showForm) {
    return (
      <div
        className="mb-6 flex items-center gap-3 rounded-2xl border border-zinc-200 bg-zinc-100
                   px-4 py-3 dark:border-zinc-700/80 dark:bg-zinc-900"
      >
        <BadgeCheck
          size={17}
          className="shrink-0 text-indigo-500 dark:text-indigo-400"
          aria-hidden="true"
        />

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-zinc-900 dark:text-white">
            Acceso por tu rol de cuenta
          </p>
          <p className="text-[11px] text-zinc-500">
            No necesitas código: tu rol ya te deja
            {isPromoter ? ' publicar en el muro' : ' leer el muro'}
            .
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowForm(true)}
          className="shrink-0 rounded-lg px-2 py-1 text-[11px] font-semibold text-zinc-500
                     underline-offset-2 transition-colors hover:text-indigo-500 hover:underline"
        >
          Usar un código
        </button>
      </div>
    );
  }

  /** Estado vinculado por código: una línea con la opción de soltarlo. */
  if (isLinkedByCode) {
    return (
      <div
        className="mb-6 flex items-center gap-3 rounded-2xl border border-zinc-200 bg-zinc-100
                   px-4 py-3 dark:border-zinc-700/80 dark:bg-zinc-900"
      >
        <ShieldCheck
          size={17}
          className={`shrink-0 ${isPromoter
            ? 'text-indigo-500 dark:text-indigo-400'
            : 'text-emerald-600 dark:text-emerald-400'}`}
          aria-hidden="true"
        />

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-zinc-900 dark:text-white">
            Vinculado a {promoteria || accessCode}
          </p>
          <p className="text-[11px] text-zinc-500">
            {isPromoter ? 'Modo Promotor · puedes publicar' : 'Acceso de Asesor · sólo lectura'}
          </p>
        </div>

        {/*
          Dice "Desvincular" y no "Cambiar código": lo que hace es soltar el
          vínculo, y con el rótulo anterior nadie encontraba cómo salir —se leía
          como un paso previo a escribir otro código, no como la salida—.
        */}
        <button
          type="button"
          onClick={release}
          className="flex shrink-0 items-center gap-1.5 rounded-lg border border-zinc-300
                     px-2.5 py-1.5 text-[11px] font-semibold text-zinc-500 transition-colors
                     hover:border-rose-400/50 hover:text-rose-500 dark:border-zinc-700
                     focus-visible:outline-none focus-visible:ring-2
                     focus-visible:ring-rose-400"
        >
          <Unlink size={11} aria-hidden="true" />
          Desvincular
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mb-6">
      <div
        className="flex w-full items-center justify-between gap-3 rounded-2xl border
                   border-zinc-200 bg-zinc-100 p-3 px-4 shadow-inner
                   dark:border-zinc-700/80 dark:bg-zinc-900"
      >
        <KeyRound size={16} className="shrink-0 text-zinc-400" aria-hidden="true" />

        <input
          value={code}
          onChange={(e) => handleCodeChange(e.target.value)}
          placeholder="¿Tienes un código de invitación?"
          aria-label="Código de invitación"
          autoComplete="off"
          autoCapitalize="characters"
          className="w-full border-none bg-transparent text-sm text-zinc-900 outline-none
                     placeholder:text-zinc-400 dark:text-white dark:placeholder:text-zinc-400"
        />

        <button type="submit" className={BUTTON}>Vincular</button>
      </div>

      {/* Segundo paso: sólo para códigos con permisos de publicación */}
      {needsPassword && (
        <div
          className="animate-rise mt-2 flex w-full items-center justify-between gap-3 rounded-2xl
                     border border-indigo-500/40 bg-indigo-500/5 p-3 px-4"
        >
          <Lock size={16} className="shrink-0 text-indigo-400" aria-hidden="true" />

          <input
            type="password"
            value={password}
            onChange={(e) => { setPassword(e.target.value); setError(''); }}
            placeholder="Contraseña de administrador"
            aria-label="Contraseña de administrador"
            autoComplete="current-password"
            className="w-full border-none bg-transparent text-sm text-zinc-900 outline-none
                       placeholder:text-zinc-400 dark:text-white dark:placeholder:text-zinc-500"
          />

          <button type="submit" className={BUTTON}>
            <Check size={13} className="mr-1 inline" />
            Entrar
          </button>
        </div>
      )}

      {error && (
        <p role="alert" className="mt-2 px-1 text-[11px] font-medium text-rose-500">
          {error}
        </p>
      )}
    </form>
  );
}
