import { Check, X, Loader2, Clock } from 'lucide-react';

/** Fecha de la solicitud, corta y en español. */
function requestedOn(createdAt) {
  if (!createdAt) return '';
  return new Date(createdAt).toLocaleDateString('es-MX', {
    day: 'numeric', month: 'short',
  });
}

/**
 * Solicitudes esperando respuesta del promotor.
 *
 * Va arriba del equipo y con borde ámbar porque es lo único de esta pantalla que
 * exige una acción: el resto se consulta, esto se resuelve. Y no se dibuja
 * siquiera cuando la lista está vacía —lo decide quien la usa— para que el
 * promotor sin pendientes no vea un encabezado con un hueco debajo.
 *
 * Lista compacta y no tarjetas como el equipo: son dos botones por fila y la
 * decisión se toma con el nombre y el correo. Con el formato de tarjeta, aprobar
 * a cinco personas obligaba a desplazar cinco veces.
 */
export default function PendingRequests({ requests, busyId, onApprove, onReject }) {
  return (
    <section className="mb-6">
      <h2 className="mb-2.5 flex items-center gap-2 text-[11px] font-bold uppercase
                     tracking-widest text-amber-400"
      >
        <Clock size={13} aria-hidden="true" />
        Solicitudes pendientes
        <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] text-amber-300">
          {requests.length}
        </span>
      </h2>

      <ul className="flex flex-col gap-2">
        {requests.map((advisor) => {
          const busy = busyId === advisor.id;

          return (
            <li
              key={advisor.id}
              className="flex items-center gap-3 rounded-xl border border-amber-500/30
                         bg-amber-500/[0.06] p-3"
            >
              {advisor.avatarUrl ? (
                <img
                  src={advisor.avatarUrl}
                  alt=""
                  referrerPolicy="no-referrer"
                  className="h-9 w-9 shrink-0 rounded-full border border-white/15 object-cover"
                />
              ) : (
                <span
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-full
                             border border-white/10 bg-white/5 text-xs font-bold text-zinc-400"
                  aria-hidden="true"
                >
                  {(advisor.fullName || advisor.email || '?').trim().charAt(0).toUpperCase()}
                </span>
              )}

              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold leading-tight text-white">
                  {advisor.fullName || 'Sin nombre'}
                </p>
                <p className="truncate text-[11px] text-zinc-500">{advisor.email}</p>
                {advisor.createdAt && (
                  <p className="mt-0.5 text-[10px] text-zinc-600">
                    Solicitó el
                    {' '}
                    {requestedOn(advisor.createdAt)}
                  </p>
                )}
              </div>

              {/*
                Los dos botones son iconos con `aria-label` y no texto: en un
                teléfono, "Aprobar" y "Rechazar" escritos junto al nombre y el
                correo dejaban la fila en tres renglones. El color hace el trabajo
                —verde acepta, rojo descarta— y el nombre accesible lo dice para
                quien no distingue los colores o usa un lector.
              */}
              <div className="flex shrink-0 gap-1.5">
                <button
                  type="button"
                  onClick={() => onApprove(advisor)}
                  disabled={busy}
                  aria-label={`Aprobar a ${advisor.fullName || advisor.email}`}
                  className="grid h-9 w-9 place-items-center rounded-lg bg-emerald-500
                             text-zinc-950 transition-colors hover:bg-emerald-400
                             active:scale-95 disabled:cursor-wait disabled:opacity-60
                             focus-visible:outline-none focus-visible:ring-2
                             focus-visible:ring-emerald-300"
                >
                  {busy
                    ? <Loader2 size={15} className="animate-spin" aria-hidden="true" />
                    : <Check size={16} strokeWidth={3} aria-hidden="true" />}
                </button>

                <button
                  type="button"
                  onClick={() => onReject(advisor)}
                  disabled={busy}
                  aria-label={`Rechazar a ${advisor.fullName || advisor.email}`}
                  className="grid h-9 w-9 place-items-center rounded-lg border border-rose-500/40
                             text-rose-400 transition-colors hover:bg-rose-500/10
                             active:scale-95 disabled:cursor-wait disabled:opacity-60
                             focus-visible:outline-none focus-visible:ring-2
                             focus-visible:ring-rose-400"
                >
                  <X size={16} strokeWidth={3} aria-hidden="true" />
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
