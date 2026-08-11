import { useState } from 'react';
import { KeyRound, Copy, Check, Loader2, RefreshCw, Share2 } from 'lucide-react';
import { saveMyCode, describeError } from '../../data/promotoriaRepo';
import { generateCode } from '../../data/promotoriaCode';

/**
 * El código de invitación del promotor: se muestra, se copia y se comparte.
 *
 * Es lo primero de la pantalla porque es la acción que hace crecer el equipo:
 * sin código no hay solicitudes, y sin solicitudes esta vista está vacía para
 * siempre.
 *
 * No se genera solo al entrar. Un código creado sin que nadie lo pida ya está
 * circulando sin que su dueño lo sepa, y si además se regenerara por error el
 * anterior dejaría de funcionar para todos los que lo tienen apuntado. Lo crea un
 * toque explícito.
 */
export default function InviteCodeCard({ code, promotoriaName, onSaved, promoterId }) {
  const [isBusy, setBusy] = useState(false);
  const [isCopied, setCopied] = useState(false);
  const [error, setError] = useState('');

  /*
    Al generar se reintenta con un código nuevo si el elegido ya existe. Cinco
    intentos son de sobra —hay cien mil combinaciones por juego de iniciales— y
    ponerle un tope evita un bucle infinito si la base rechaza por otra razón que
    también se reporte como duplicado.
  */
  const generate = async () => {
    setBusy(true);
    setError('');

    for (let attempt = 0; attempt < 5; attempt += 1) {
      const candidate = generateCode(promotoriaName);
      // eslint-disable-next-line no-await-in-loop
      const { error: saveError, taken } = await saveMyCode(promoterId, candidate);

      if (!saveError) {
        setBusy(false);
        onSaved?.(candidate);
        return;
      }
      if (!taken) {
        setBusy(false);
        setError(describeError(saveError));
        return;
      }
    }

    setBusy(false);
    setError('No se pudo generar un código libre. Inténtalo de nuevo.');
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
    } catch {
      // Sin permiso de portapapeles el código sigue a la vista para copiarlo a
      // mano: no se pierde nada, así que no hay error que mostrar.
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const share = () => {
    const text = `Únete a mi promotoría en Prospecta con este código: ${code}`;
    if (navigator.share) {
      navigator.share({ text }).catch(() => {});
      return;
    }
    copy();
  };

  return (
    <section className="mb-6 rounded-2xl border border-indigo-500/25 bg-indigo-500/[0.07] p-4">
      <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest
                    text-indigo-300"
      >
        <KeyRound size={13} aria-hidden="true" />
        Código de tu promotoría
      </p>

      {code ? (
        <>
          {/*
            Monoespaciada y con letras separadas: el código se dicta por teléfono
            y se teclea a mano, así que la diferencia entre 0 y O, o entre 1 y l,
            tiene que verse sin esfuerzo.
          */}
          <p className="mt-2.5 select-all font-mono text-3xl font-bold tracking-[0.15em]
                        text-white"
          >
            {code}
          </p>

          <p className="mt-2 text-[11px] leading-relaxed text-zinc-400">
            Compártelo con tus asesores. Al usarlo quedarán en espera de que tú los
            apruebes, así que puedes difundirlo sin riesgo: el código no da acceso,
            sólo pide entrar.
          </p>

          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={copy}
              className="flex items-center gap-1.5 rounded-lg bg-white/10 px-3 py-2 text-[11px]
                         font-semibold text-zinc-100 transition-colors hover:bg-white/15
                         active:scale-95 focus-visible:outline-none focus-visible:ring-2
                         focus-visible:ring-indigo-400"
            >
              {isCopied
                ? <Check size={12} aria-hidden="true" />
                : <Copy size={12} aria-hidden="true" />}
              {isCopied ? 'Copiado' : 'Copiar'}
            </button>

            <button
              type="button"
              onClick={share}
              className="flex items-center gap-1.5 rounded-lg bg-white/10 px-3 py-2 text-[11px]
                         font-semibold text-zinc-100 transition-colors hover:bg-white/15
                         active:scale-95 focus-visible:outline-none focus-visible:ring-2
                         focus-visible:ring-indigo-400"
            >
              <Share2 size={12} aria-hidden="true" />
              Compartir
            </button>

            {/*
              Regenerar queda discreto y con su advertencia: es útil si el código
              se filtró, pero invalida el que ya tengan apuntados todos los demás.
            */}
            <button
              type="button"
              onClick={generate}
              disabled={isBusy}
              title="Genera un código nuevo. El anterior deja de funcionar."
              className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-[11px]
                         font-semibold text-zinc-500 transition-colors hover:text-amber-400
                         disabled:cursor-wait"
            >
              {isBusy
                ? <Loader2 size={12} className="animate-spin" aria-hidden="true" />
                : <RefreshCw size={12} aria-hidden="true" />}
              Cambiar
            </button>
          </div>
        </>
      ) : (
        <>
          <p className="mt-2 text-xs leading-relaxed text-zinc-400">
            Todavía no tienes código. Genera uno y compártelo para que tus asesores
            puedan solicitar entrar a tu promotoría.
          </p>

          <button
            type="button"
            onClick={generate}
            disabled={isBusy}
            className="mt-3 flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5
                       text-xs font-bold text-white shadow-lg shadow-indigo-600/25
                       transition-colors hover:bg-indigo-500 active:scale-95
                       disabled:cursor-wait disabled:opacity-60
                       focus-visible:outline-none focus-visible:ring-2
                       focus-visible:ring-indigo-400"
          >
            {isBusy
              ? <Loader2 size={13} className="animate-spin" aria-hidden="true" />
              : <KeyRound size={13} aria-hidden="true" />}
            Generar mi código
          </button>
        </>
      )}

      {error && (
        <p role="alert" className="mt-2.5 text-[11px] leading-relaxed text-rose-400">
          {error}
        </p>
      )}
    </section>
  );
}
