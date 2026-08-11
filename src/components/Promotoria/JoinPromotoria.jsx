import { useState } from 'react';
import { KeyRound, Loader2, CheckCircle2, AlertTriangle } from 'lucide-react';
import { joinPromotoriaByCode, describeError } from '../../data/promotoriaRepo';
import { normalizeCode, isValidCode } from '../../data/promotoriaCode';
import { useSession } from '../../context/SessionContext';

/**
 * Lo que ve un asesor que todavía no pertenece a ninguna promotoría.
 *
 * Pide el código y nada más. No hay lista de promotorías para elegir a propósito:
 * mostrarla revelaría quién más usa la app y con qué nombre, y la pertenencia a
 * un equipo no es información pública.
 */
export default function JoinPromotoria() {
  const { refreshIdentity } = useSession();
  const [code, setCode] = useState('');
  const [isBusy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [joined, setJoined] = useState('');

  const submit = async (event) => {
    event.preventDefault();
    setError('');

    const normalized = normalizeCode(code);
    if (!isValidCode(normalized)) {
      setError('El código tiene la forma ABC-123-45. Revisa que esté completo.');
      return;
    }

    setBusy(true);
    const { data, error: joinError } = await joinPromotoriaByCode(normalized);
    setBusy(false);

    if (joinError) {
      setError(describeError(joinError));
      return;
    }

    setJoined(data?.promotoria || 'tu promotoría');
    // La identidad se relee para que el resto de la app sepa que ahora está en
    // espera: es lo que hace aparecer la sala de espera sin recargar.
    await refreshIdentity?.();
  };

  if (joined) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm text-center">
          <span
            className="mx-auto mb-5 grid h-16 w-16 place-items-center rounded-2xl border
                       border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
            aria-hidden="true"
          >
            <CheckCircle2 size={28} strokeWidth={1.8} />
          </span>

          <h2 className="text-lg font-bold leading-snug text-white">Solicitud enviada</h2>
          <p className="mt-2.5 text-sm leading-relaxed text-zinc-400">
            Pediste unirte a
            {' '}
            <span className="font-semibold text-zinc-200">{joined}</span>
            . Falta que tu promotor apruebe tu acceso.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-[50vh] items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-5 text-center">
          <span
            className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl border
                       border-indigo-500/30 bg-indigo-500/10 text-indigo-300"
            aria-hidden="true"
          >
            <KeyRound size={24} strokeWidth={1.8} />
          </span>

          <h2 className="text-lg font-bold leading-snug text-white">
            Únete a tu promotoría
          </h2>
          <p className="mt-2 text-xs leading-relaxed text-zinc-400">
            Pide a tu promotor el código de invitación. Tiene esta forma:
            {' '}
            <span className="font-mono text-zinc-300">MAC-866-08</span>
          </p>
        </div>

        <form onSubmit={submit}>
          <label
            className="mb-1.5 block text-[11px] font-medium uppercase tracking-wide text-zinc-400"
            htmlFor="promotoria-code"
          >
            Código de invitación
          </label>

          <input
            id="promotoria-code"
            value={code}
            /*
              Se normaliza mientras escribe: los guiones se ponen solos y las
              letras suben a mayúscula. Así el código copiado de WhatsApp con un
              espacio de más entra igual, y nadie pelea con el formato.
            */
            onChange={(e) => { setCode(normalizeCode(e.target.value)); setError(''); }}
            placeholder="MAC-866-08"
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck="false"
            maxLength={10}
            className="w-full rounded-xl border border-zinc-800 bg-zinc-950/60 px-3 py-3
                       text-center font-mono text-xl tracking-[0.15em] text-zinc-100
                       placeholder:text-zinc-600 transition-colors focus:border-indigo-500
                       focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />

          {error && (
            <p
              role="alert"
              className="mt-2.5 flex items-start gap-2 rounded-xl border border-rose-500/30
                         bg-rose-500/10 p-3 text-[11px] leading-relaxed text-rose-300"
            >
              <AlertTriangle size={13} className="mt-0.5 shrink-0" aria-hidden="true" />
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={isBusy}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl
                       bg-indigo-600 px-4 py-3 text-sm font-bold text-white shadow-lg
                       shadow-indigo-600/25 transition-colors hover:bg-indigo-500
                       active:scale-[0.98] disabled:cursor-wait disabled:opacity-60
                       focus-visible:outline-none focus-visible:ring-2
                       focus-visible:ring-indigo-400"
          >
            {isBusy && <Loader2 size={14} className="animate-spin" aria-hidden="true" />}
            {isBusy ? 'Enviando…' : 'Solicitar acceso'}
          </button>
        </form>

        <p className="mt-4 text-center text-[11px] leading-relaxed text-zinc-500">
          Al enviarlo quedas en espera. Tu promotor decide si te acepta en el equipo.
        </p>
      </div>
    </div>
  );
}
