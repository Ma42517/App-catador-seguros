import { useState } from 'react';
import { Clock, RefreshCw, LogOut, Loader2, Check } from 'lucide-react';
import { useSession } from '../../context/SessionContext';

/**
 * Sala de espera: la cuenta existe pero un promotor todavía no la aprobó.
 *
 * Es una pantalla completa sin barra de navegación ni acceso a nada más. Que no
 * haya nada que tocar es intencional: si asomara aunque sea el menú, se leería
 * como que el acceso está a medias.
 *
 * El botón de revisar existe para no obligar a recargar. Una persona que acaba
 * de pedir acceso por teléfono va a querer comprobarlo en cuanto le digan que ya
 * está, y recargar la página no es un gesto evidente en un celular.
 */
export default function PendingApproval() {
  const { identity, signOut, refreshRole } = useSession();
  const [isChecking, setChecking] = useState(false);
  const [checkedAt, setCheckedAt] = useState('');

  const check = async () => {
    setChecking(true);
    const { changed } = await refreshRole();
    setChecking(false);

    // Si cambió, la app entera se vuelve a evaluar y esta pantalla desaparece;
    // sólo hay que dar señal cuando sigue igual.
    if (!changed) {
      setCheckedAt(new Date().toLocaleTimeString('es-MX', { hour12: false }));
    }
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

      <div className="animate-rise relative w-full max-w-sm text-center">
        <div
          className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-7 shadow-xl
                     shadow-zinc-950/60 backdrop-blur-md"
        >
          <span
            className="mx-auto mb-5 grid h-16 w-16 place-items-center rounded-2xl
                       border border-amber-500/30 bg-amber-500/10 text-amber-400"
            aria-hidden="true"
          >
            <Clock size={30} />
          </span>

          <h1 className="text-xl font-bold text-zinc-900 dark:text-white">
            Solicitud en revisión
          </h1>

          <p className="mt-3 text-sm leading-relaxed text-zinc-400">
            Tu solicitud de registro ha sido enviada. Espera a que un administrador
            de la promotoría apruebe tu acceso.
          </p>

          {/* Con qué cuenta entró: evita la confusión de haber usado otro correo */}
          {identity?.email && (
            <div
              className="mt-5 flex items-center gap-3 rounded-xl border border-zinc-800
                         bg-zinc-950/50 p-3 text-left"
            >
              {identity.avatarUrl ? (
                <img
                  src={identity.avatarUrl}
                  alt=""
                  className="h-9 w-9 shrink-0 rounded-full"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <span
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-full
                             bg-zinc-800 text-xs font-bold text-zinc-300"
                  aria-hidden="true"
                >
                  {(identity.name || '?').slice(0, 1).toUpperCase()}
                </span>
              )}

              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold text-white">
                  {identity.name}
                </span>
                <span className="block truncate text-[11px] text-zinc-500">
                  {identity.email}
                </span>
              </span>
            </div>
          )}

          <button
            type="button"
            onClick={check}
            disabled={isChecking}
            className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl
                       bg-indigo-600 px-4 py-3.5 text-base font-semibold text-white
                       shadow-lg shadow-indigo-600/30 transition-all hover:bg-indigo-500
                       active:scale-[0.98] disabled:cursor-wait disabled:opacity-70"
          >
            {isChecking
              ? <Loader2 size={17} className="animate-spin" />
              : <RefreshCw size={17} />}
            {isChecking ? 'Revisando...' : 'Ya me aprobaron, revisar'}
          </button>

          {checkedAt && (
            <p
              role="status"
              className="mt-2.5 flex items-center justify-center gap-1.5 text-[11px] text-zinc-500"
            >
              <Check size={12} />
              Revisado a las {checkedAt}. Tu acceso sigue en espera.
            </p>
          )}

          <button
            type="button"
            onClick={signOut}
            className="mx-auto mt-4 flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs
                       font-semibold text-zinc-500 transition-colors hover:text-rose-400"
          >
            <LogOut size={13} />
            Salir de esta cuenta
          </button>
        </div>

        <p className="mt-4 text-[10px] leading-relaxed text-zinc-600">
          Si llevas mucho tiempo esperando, avísale a tu promotor con el correo
          que aparece arriba.
        </p>
      </div>
    </div>
  );
}
