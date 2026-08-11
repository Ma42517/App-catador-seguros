import { useState } from 'react';
import { Building2, Loader2, Unlink, AlertTriangle } from 'lucide-react';
import { leavePromotoria, describeError } from '../../data/promotoriaRepo';
import { useSession } from '../../context/SessionContext';

/**
 * A qué promotoría pertenece el asesor, arriba del muro.
 *
 * Sustituye al formulario del código una vez dentro. El campo ya no tiene nada
 * que pedir, y dejarlo ahí obligaba a preguntarse si hacía falta escribir algo
 * otra vez; en su lugar va el dato que sí importa —de quién es este muro— y la
 * única acción que queda: salirse.
 *
 * "Desvincularse" en rojo y con confirmación de dos pasos. En rojo porque es la
 * salida y tiene que distinguirse a simple vista; con confirmación porque un
 * toque accidental deja al asesor fuera del contenido de su equipo y volver a
 * entrar exige que su promotor lo apruebe de nuevo, que puede tardar días.
 */
export default function PromotoriaBadge({ name, onLeft }) {
  const { identity, refreshIdentity } = useSession();
  const [isConfirming, setConfirming] = useState(false);
  const [isLeaving, setLeaving] = useState(false);
  const [error, setError] = useState('');

  const leave = async () => {
    setLeaving(true);
    setError('');
    const { error: leaveError } = await leavePromotoria(identity?.key);
    setLeaving(false);

    if (leaveError) {
      setError(describeError(leaveError));
      return;
    }
    setConfirming(false);
    await refreshIdentity?.();
    onLeft?.();
  };

  return (
    <div className="mb-6 rounded-2xl border border-zinc-200 bg-zinc-100 p-4
                    dark:border-zinc-700/80 dark:bg-zinc-900"
    >
      <div className="flex items-center gap-3">
        <span
          className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border
                     border-indigo-500/30 bg-indigo-500/10 text-indigo-500
                     dark:text-indigo-300"
          aria-hidden="true"
        >
          <Building2 size={18} strokeWidth={1.9} />
        </span>

        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">
            Perteneces a
          </p>
          {/*
            El nombre de la promotoría, no un genérico. Es lo que le confirma al
            asesor que entró a la que le tocaba: con varias promotorías usando la
            app, un "Vinculado correctamente" no distingue entre haber acertado el
            código y haberse equivocado de equipo.
          */}
          <p className="truncate text-sm font-bold text-zinc-900 dark:text-white">
            {name || 'Tu promotoría'}
          </p>
        </div>

        {!isConfirming && (
          <button
            type="button"
            onClick={() => setConfirming(true)}
            className="flex shrink-0 items-center gap-1.5 rounded-lg border border-rose-500/40
                       px-2.5 py-1.5 text-[11px] font-semibold text-rose-500 transition-colors
                       hover:bg-rose-500/10 active:scale-95 focus-visible:outline-none
                       focus-visible:ring-2 focus-visible:ring-rose-400 dark:text-rose-400"
          >
            <Unlink size={11} aria-hidden="true" />
            Desvincularse
          </button>
        )}
      </div>

      {isConfirming && (
        <div className="animate-rise mt-3 rounded-xl border border-rose-500/40 bg-rose-500/10 p-3">
          <p className="flex items-start gap-2 text-xs font-bold leading-snug
                        text-rose-600 dark:text-rose-200"
          >
            <AlertTriangle size={14} className="mt-0.5 shrink-0" aria-hidden="true" />
            ¿Seguro que deseas salir del equipo?
          </p>

          {/*
            La consecuencia va debajo de la pregunta y no dentro de ella. Dicho
            todo en una línea, lo importante —que volver depende de otra persona y
            puede tardar días— se pierde al final de un párrafo que nadie termina
            de leer.
          */}
          <p className="mt-1.5 pl-6 text-[11px] leading-relaxed text-zinc-600
                        dark:text-zinc-400"
          >
            Pierdes el acceso al muro de
            {' '}
            {name || 'tu promotoría'}
            . Para volver tendrás que escribir el código otra vez y esperar a que
            te aprueben.
          </p>

          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={leave}
              disabled={isLeaving}
              className="flex items-center gap-1.5 rounded-lg bg-rose-600 px-3 py-1.5
                         text-[11px] font-bold text-white transition-colors hover:bg-rose-500
                         active:scale-95 disabled:cursor-wait disabled:opacity-60"
            >
              {isLeaving
                ? <Loader2 size={11} className="animate-spin" aria-hidden="true" />
                : <Unlink size={11} aria-hidden="true" />}
              Sí, desvincularme
            </button>

            <button
              type="button"
              onClick={() => setConfirming(false)}
              className="rounded-lg border border-zinc-300 px-3 py-1.5 text-[11px] font-semibold
                         text-zinc-600 transition-colors hover:bg-zinc-100 dark:border-zinc-700
                         dark:text-zinc-300 dark:hover:bg-white/5"
            >
              Cancelar
            </button>
          </div>

          {error && (
            <p role="alert" className="mt-2 text-[11px] leading-relaxed text-rose-500">
              {error}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
