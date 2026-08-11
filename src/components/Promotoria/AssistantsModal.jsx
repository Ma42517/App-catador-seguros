import { useState } from 'react';
import {
  X, UserPlus, Loader2, AlertTriangle, ShieldCheck, Undo2, CheckCircle2,
} from 'lucide-react';
import { promoteToAssistant, revokeAssistant, describeError } from '../../data/promotoriaRepo';

/**
 * Gestión de asistentes, sólo para el titular de la promotoría.
 *
 * Se pide el correo y no se ofrece una lista de usuarios para elegir. La razón no
 * es comodidad: una lista de personas registradas es un directorio, y el titular de
 * una promotoría no tiene por qué ver quién más usa la app ni con qué correo. Con
 * el correo escrito a mano sólo alcanza a quien ya conoce.
 *
 * El ascenso ocurre en la base, dentro de una función que vuelve a comprobar quién
 * llama. Lo de aquí es la puerta, no la cerradura.
 */
export default function AssistantsModal({ isOpen, onClose, assistants, onChanged }) {
  const [email, setEmail] = useState('');
  const [isBusy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState('');
  const [busyId, setBusyId] = useState(null);

  if (!isOpen) return null;

  const promote = async (event) => {
    event.preventDefault();
    setError('');
    setDone('');

    if (!email.trim()) {
      setError('Escribe el correo de la persona.');
      return;
    }

    setBusy(true);
    const { data, error: promoteError } = await promoteToAssistant(email);
    setBusy(false);

    if (promoteError) {
      setError(describeError(promoteError));
      return;
    }

    setEmail('');
    setDone(`${data?.name || 'La persona'} ya es asistente de tu promotoría.`);
    onChanged?.();
  };

  const revoke = async (assistant) => {
    setBusyId(assistant.id);
    setError('');
    const { error: revokeError } = await revokeAssistant(assistant.id);
    setBusyId(null);

    if (revokeError) {
      setError(describeError(revokeError));
      return;
    }
    setDone(`${assistant.fullName || 'La persona'} vuelve a ser asesor.`);
    onChanged?.();
  };

  return (
    <div
      className="fixed inset-0 z-[80] flex items-end justify-center sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-label="Gestionar asistentes"
    >
      <button
        type="button"
        aria-label="Cerrar"
        onClick={onClose}
        className="absolute inset-0 h-full w-full cursor-default bg-black/60 backdrop-blur-sm"
      />

      <div
        className="animate-rise relative max-h-[88dvh] w-full max-w-md overflow-y-auto
                   overscroll-contain rounded-t-3xl border border-zinc-800 bg-zinc-950 p-5
                   pb-safe sm:rounded-3xl"
      >
        <div className="mb-5 flex items-start justify-between gap-3">
          <div>
            <p className="flex items-center gap-2 text-[11px] font-bold uppercase
                          tracking-widest text-indigo-400"
            >
              <ShieldCheck size={13} aria-hidden="true" />
              Sólo tú puedes hacer esto
            </p>
            <h2 className="mt-1 text-lg font-bold text-white">Gestionar asistentes</h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-zinc-400
                       transition-colors hover:bg-white/10 hover:text-zinc-100"
          >
            <X size={17} />
          </button>
        </div>

        <p className="mb-4 text-xs leading-relaxed text-zinc-400">
          Un asistente aprueba solicitudes, publica en el muro y ve la actividad del
          equipo. No puede ver ni cambiar tu código de invitación, ni nombrar a otros
          asistentes.
        </p>

        <form onSubmit={promote} className="mb-5">
          <label
            className="mb-1.5 block text-[11px] font-medium uppercase tracking-wide text-zinc-400"
            htmlFor="assistant-email"
          >
            Correo de la persona
          </label>

          <div className="flex gap-2">
            <input
              id="assistant-email"
              type="email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setError(''); setDone(''); }}
              placeholder="asistente@ejemplo.com"
              autoComplete="off"
              autoCapitalize="none"
              className="min-w-0 flex-1 rounded-xl border border-zinc-800 bg-zinc-950/60 px-3
                         py-2.5 text-sm text-zinc-100 placeholder:text-zinc-600
                         focus:border-indigo-500 focus:outline-none focus:ring-2
                         focus:ring-indigo-500"
            />

            <button
              type="submit"
              disabled={isBusy}
              className="flex shrink-0 items-center gap-1.5 rounded-xl bg-indigo-600 px-3.5
                         py-2.5 text-xs font-bold text-white transition-colors
                         hover:bg-indigo-500 active:scale-95 disabled:cursor-wait
                         disabled:opacity-60"
            >
              {isBusy
                ? <Loader2 size={13} className="animate-spin" aria-hidden="true" />
                : <UserPlus size={13} aria-hidden="true" />}
              Ascender
            </button>
          </div>

          {/*
            Se avisa de que la persona debe estar registrada antes. Es el fallo más
            probable de esta pantalla: el titular escribe el correo de alguien que
            todavía no ha abierto la app y no entiende por qué "no existe".
          */}
          <p className="mt-1.5 text-[11px] leading-relaxed text-zinc-500">
            Tiene que estar registrada en la app. Si aún no lo está, pídele que entre
            una vez y vuelve aquí.
          </p>
        </form>

        {error && (
          <p
            role="alert"
            className="mb-4 flex items-start gap-2 rounded-xl border border-rose-500/30
                       bg-rose-500/10 p-3 text-[11px] leading-relaxed text-rose-300"
          >
            <AlertTriangle size={13} className="mt-0.5 shrink-0" aria-hidden="true" />
            {error}
          </p>
        )}

        {done && (
          <p
            role="status"
            className="mb-4 flex items-start gap-2 rounded-xl border border-emerald-500/30
                       bg-emerald-500/10 p-3 text-[11px] leading-relaxed text-emerald-300"
          >
            <CheckCircle2 size={13} className="mt-0.5 shrink-0" aria-hidden="true" />
            {done}
          </p>
        )}

        <p className="mb-2.5 text-[11px] font-bold uppercase tracking-widest text-zinc-500">
          Tus asistentes
          {assistants.length > 0 && ` · ${assistants.length}`}
        </p>

        {assistants.length === 0 ? (
          <p className="rounded-xl border border-dashed border-zinc-800 py-6 text-center
                        text-[11px] text-zinc-600"
          >
            Todavía no tienes asistentes.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {assistants.map((assistant) => (
              <li
                key={assistant.id}
                className="flex items-center gap-3 rounded-xl border border-white/10
                           bg-white/[0.04] p-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-zinc-100">
                    {assistant.fullName || 'Sin nombre'}
                  </p>
                  <p className="truncate text-[11px] text-zinc-500">{assistant.email}</p>
                </div>

                {/*
                  "Quitar" y no "Eliminar": vuelve a ser asesor y sigue en el equipo.
                  Con la palabra equivocada, nadie lo pulsaría por miedo a borrar a
                  una persona.
                */}
                <button
                  type="button"
                  onClick={() => revoke(assistant)}
                  disabled={busyId === assistant.id}
                  className="flex shrink-0 items-center gap-1.5 rounded-lg border
                             border-zinc-700 px-2.5 py-1.5 text-[11px] font-semibold
                             text-zinc-400 transition-colors hover:border-amber-500/40
                             hover:text-amber-300 disabled:cursor-wait"
                >
                  {busyId === assistant.id
                    ? <Loader2 size={11} className="animate-spin" aria-hidden="true" />
                    : <Undo2 size={11} aria-hidden="true" />}
                  Quitar
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
