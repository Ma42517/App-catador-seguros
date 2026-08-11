import { useState } from 'react';
import { Lock, Loader2, RefreshCw, Unlink } from 'lucide-react';
import { useSession } from '../../context/SessionContext';
import { leavePromotoria, describeError } from '../../data/promotoriaRepo';

/**
 * Sala de espera: lo que ve el asesor cuya solicitud está sin responder.
 *
 * Bloquea el contenido compartido de la promotoría, no la app entera. La
 * diferencia importa: su tarjeta digital, su agenda y sus notas son suyas y no
 * dependen de que nadie lo autorice, así que encerrarlo fuera de todo lo dejaría
 * con la app inservible por un trámite ajeno —y sin nada que hacer mientras
 * espera—. Lo que sí queda cerrado es lo que pertenece al equipo.
 *
 * El botón de recargar existe porque la aprobación ocurre en otro dispositivo, en
 * el teléfono del promotor. Sin él, la única salida sería cerrar y volver a abrir
 * la app a ciegas, probando cada pocos minutos.
 */
export default function PromotoriaWaitingRoom({ title = 'Contenido de la promotoría' }) {
  const { identity, refreshIdentity } = useSession();
  const [isChecking, setChecking] = useState(false);
  const [isLeaving, setLeaving] = useState(false);
  const [error, setError] = useState('');

  const check = async () => {
    setChecking(true);
    await refreshIdentity?.();
    setChecking(false);
    /*
      No hace falta avisar del resultado: si ya lo aprobaron, la identidad cambia
      y este componente desaparece solo. Y si no, se queda donde estaba, que es la
      respuesta.
    */
  };

  /*
    Cancelar la solicitud tiene que existir. Entrar exige que otro te acepte, pero
    salir no debería exigirle nada a nadie: sin esta salida, quien manda el código
    equivocado se queda esperando para siempre una respuesta que ya no quiere, y su
    única alternativa sería pedirle al promotor ajeno que lo rechace.
  */
  const leave = async () => {
    setLeaving(true);
    setError('');
    const { error: leaveError } = await leavePromotoria(identity?.key);
    setLeaving(false);

    if (leaveError) {
      setError(describeError(leaveError));
      return;
    }
    await refreshIdentity?.();
  };

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm text-center">
        <span
          className="mx-auto mb-5 grid h-16 w-16 place-items-center rounded-2xl border
                     border-amber-500/30 bg-amber-500/10 text-amber-300"
          aria-hidden="true"
        >
          <Lock size={28} strokeWidth={1.8} />
        </span>

        <h2 className="text-lg font-bold leading-snug text-white">
          Tu solicitud ha sido enviada
        </h2>

        <p className="mt-2.5 text-sm leading-relaxed text-zinc-400">
          Estamos esperando a que tu promotor apruebe tu acceso.
        </p>

        <p className="mt-4 text-[11px] leading-relaxed text-zinc-500">
          {title}
          {' '}
          se desbloquea en cuanto te autorice. Mientras tanto puedes usar tu
          tarjeta digital, tu agenda y tus notas con normalidad.
        </p>

        <button
          type="button"
          onClick={check}
          disabled={isChecking}
          className="mx-auto mt-6 flex items-center gap-2 rounded-xl border border-white/10
                     bg-white/5 px-4 py-2.5 text-xs font-semibold text-zinc-300
                     transition-colors hover:bg-white/10 disabled:cursor-wait
                     focus-visible:outline-none focus-visible:ring-2
                     focus-visible:ring-indigo-500"
        >
          {isChecking
            ? <Loader2 size={13} className="animate-spin" aria-hidden="true" />
            : <RefreshCw size={13} aria-hidden="true" />}
          {isChecking ? 'Revisando…' : 'Ya me aprobaron, revisar'}
        </button>

        {/*
          Discreto y en texto, no como botón: es la salida, no la acción esperada.
          Quien espera una aprobación no debería tener dos botones del mismo peso
          compitiendo, uno para seguir esperando y otro para rendirse.
        */}
        <button
          type="button"
          onClick={leave}
          disabled={isLeaving}
          className="mx-auto mt-3 flex items-center gap-1.5 rounded-lg px-3 py-2 text-[11px]
                     font-semibold text-zinc-500 underline decoration-zinc-700
                     underline-offset-4 transition-colors hover:text-rose-400
                     hover:decoration-rose-400/60 disabled:cursor-wait
                     focus-visible:outline-none focus-visible:ring-2
                     focus-visible:ring-rose-400"
        >
          {isLeaving
            ? <Loader2 size={11} className="animate-spin" aria-hidden="true" />
            : <Unlink size={11} aria-hidden="true" />}
          {isLeaving ? 'Cancelando…' : 'Cancelar mi solicitud'}
        </button>

        {error && (
          <p role="alert" className="mt-3 text-[11px] leading-relaxed text-rose-400">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}
