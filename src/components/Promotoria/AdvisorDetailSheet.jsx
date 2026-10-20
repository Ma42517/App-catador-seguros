import { useState, useEffect } from 'react';
import {
  X, Mail, CalendarClock, ShieldCheck, Ban, Undo2, ArrowUpCircle, Loader2,
  AlertTriangle, BadgeCheck,
} from 'lucide-react';
import {
  blockAdvisor, unblockAdvisor, promoteToAssistant, revokeAssistant, describeError,
  PROMOTORIA_STATUS,
} from '../../data/promotoriaRepo';
import { PROFILE_ROLES } from '../../data/profilesRepo';
import { isOnline } from '../../data/presence';
import { relativeTime } from '../../data/announcements';

/**
 * Detalle de un asesor del equipo, abierto desde el botón "Ver detalles" de su
 * tarjeta.
 *
 * ── Qué muestra y por qué sólo esto ────────────────────────────────────────
 *
 * Únicamente datos que existen de verdad en la ficha (`listMyAdvisors`): nombre,
 * correo, foto, rol, fecha de ingreso y estado de conexión. No hay llamadas,
 * citas ni cierres —no viven en ninguna tabla que el promotor pueda leer—, así
 * que no se inventan aquí: pintar un número sin sustento en la pantalla donde se
 * decide a quién llamar es peor que no ponerlo. Tampoco teléfono/WhatsApp: la
 * consulta del equipo no los trae.
 *
 * ── Acciones: las que de verdad funcionan ──────────────────────────────────
 *
 * Todas reutilizan las funciones del repo que ya usa el tablero, con el mismo
 * patrón: se escribe en la base y se avisa hacia arriba (`onChanged`) para que la
 * lista se relea —nunca se mueve la fila en memoria, porque si RLS rechazara el
 * cambio a medias la pantalla mostraría un estado que la base no tiene—.
 *
 * Ascender/quitar asistente sólo lo ve el titular (`isOwner`): un asistente no
 * nombra a otros. Bloquear/desbloquear lo ven titular y asistente, que son los
 * dos que gestionan el equipo.
 */

/** "Ingresó hace X" en palabras. Mismo criterio que la tarjeta. */
function joinedLabel(createdAt) {
  if (!createdAt) return 'Fecha de ingreso desconocida';

  const days = Math.floor((Date.now() - createdAt) / 86400000);
  if (days < 1) return 'Ingresó hoy';
  if (days === 1) return 'Ingresó ayer';
  if (days < 30) return `Ingresó hace ${days} días`;

  const months = Math.floor(days / 30);
  if (months === 1) return 'Ingresó hace 1 mes';
  if (months < 12) return `Ingresó hace ${months} meses`;

  const years = Math.floor(months / 12);
  return years === 1 ? 'Ingresó hace 1 año' : `Ingresó hace ${years} años`;
}

/** Avatar con respaldo a iniciales, igual que en la tarjeta. */
function Avatar({ url, name }) {
  if (url) {
    return (
      <img
        src={url}
        alt=""
        referrerPolicy="no-referrer"
        className="h-16 w-16 shrink-0 rounded-full border border-zinc-200 object-cover
                   dark:border-white/15"
      />
    );
  }
  return (
    <span
      className="grid h-16 w-16 shrink-0 place-items-center rounded-full border border-zinc-200
                 bg-zinc-100 text-xl font-bold text-zinc-500 dark:border-white/10
                 dark:bg-white/5 dark:text-zinc-400"
      aria-hidden="true"
    >
      {(name || '?').trim().charAt(0).toUpperCase()}
    </span>
  );
}

export default function AdvisorDetailSheet({
  advisor, isOwner, onClose, onChanged,
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  // Confirmación de dos pasos para bloquear: es la acción fuerte de esta hoja —
  // saca a la persona del equipo— y un toque accidental no debe ejecutarla.
  const [confirmBlock, setConfirmBlock] = useState(false);

  // Cerrar con Escape y bloquear el scroll del fondo mientras está abierta.
  useEffect(() => {
    const onKeyDown = (e) => { if (e.key === 'Escape') onClose(); };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [onClose]);

  if (!advisor) return null;

  const isBlocked = advisor.status === PROMOTORIA_STATUS.BLOCKED;
  const isAssistant = advisor.role === PROFILE_ROLES.ASSISTANT;
  const online = isOnline(advisor.lastSeen);
  const presenceLabel = online === true
    ? 'En línea'
    : online === false ? `Activo ${relativeTime(advisor.lastSeen)}` : 'Sin actividad';

  /*
    Ejecuta una acción del repo y, al terminar bien, avisa hacia arriba para que
    el tablero relea la lista y esta hoja se cierre con el estado ya actualizado.
    Un único punto de manejo de error para las cuatro acciones.
  */
  const run = async (action) => {
    setBusy(true);
    setError('');
    const { error: writeError } = await action();
    setBusy(false);

    if (writeError) {
      setError(describeError(writeError));
      return;
    }
    onChanged?.();
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[80] flex items-end justify-center sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-label={`Detalle de ${advisor.fullName || 'asesor'}`}
    >
      <button
        type="button"
        aria-label="Cerrar"
        onClick={onClose}
        className="absolute inset-0 h-full w-full cursor-default bg-black/60 backdrop-blur-sm"
      />

      <div
        className="animate-rise relative max-h-[88dvh] w-full max-w-md overflow-y-auto
                   overscroll-contain rounded-t-3xl border border-zinc-200 bg-white p-5 pb-safe
                   dark:border-zinc-800 dark:bg-zinc-950 sm:rounded-3xl"
      >
        {/* ── Cierre ── */}
        <div className="mb-4 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-zinc-500
                       transition-colors hover:bg-zinc-100 hover:text-zinc-700
                       dark:text-zinc-400 dark:hover:bg-white/10 dark:hover:text-zinc-100"
          >
            <X size={17} />
          </button>
        </div>

        {/* ── Identidad ── */}
        <div className="flex items-start gap-4">
          <Avatar url={advisor.avatarUrl} name={advisor.fullName || advisor.email} />

          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-1.5 text-lg font-bold leading-tight
                          text-zinc-900 dark:text-white"
            >
              <span className="truncate">{advisor.fullName || 'Sin nombre'}</span>
              {isAssistant && (
                <BadgeCheck
                  size={16}
                  className="shrink-0 text-indigo-500 dark:text-indigo-400"
                  aria-hidden="true"
                />
              )}
            </p>

            {/* El rol real de la ficha, en palabras. */}
            <span
              className="mt-1.5 inline-flex items-center gap-1 rounded-full border px-2 py-0.5
                         text-[10px] font-bold uppercase tracking-wide
                         border-indigo-500/30 bg-indigo-500/10 text-indigo-600
                         dark:text-indigo-300"
            >
              {isAssistant ? 'Asistente' : 'Asesor'}
            </span>
          </div>
        </div>

        {/* ── Estado de conexión ── */}
        <div
          className={`mt-4 flex items-center gap-2 rounded-xl border px-3 py-2.5
            ${online === true
              ? 'border-emerald-500/30 bg-emerald-500/10'
              : 'border-zinc-200 bg-zinc-50 dark:border-white/10 dark:bg-white/[0.03]'}`}
        >
          <span
            className={`h-2 w-2 rounded-full ${online === true
              ? 'animate-pulse bg-emerald-400'
              : 'bg-zinc-400 dark:bg-zinc-500'}`}
            aria-hidden="true"
          />
          <span className={`text-xs font-semibold ${online === true
            ? 'text-emerald-600 dark:text-emerald-300'
            : 'text-zinc-500'}`}
          >
            {presenceLabel}
          </span>
        </div>

        {/* ── Datos ── */}
        <dl className="mt-4 flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <span
              className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-zinc-100
                         text-zinc-500 dark:bg-white/5 dark:text-zinc-400"
              aria-hidden="true"
            >
              <Mail size={16} />
            </span>
            <div className="min-w-0">
              <dt className="text-[10px] font-semibold uppercase tracking-wide text-zinc-400">
                Correo
              </dt>
              <dd className="truncate text-sm text-zinc-800 dark:text-zinc-200">
                {advisor.email || 'Sin correo'}
              </dd>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span
              className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-zinc-100
                         text-zinc-500 dark:bg-white/5 dark:text-zinc-400"
              aria-hidden="true"
            >
              <CalendarClock size={16} />
            </span>
            <div className="min-w-0">
              <dt className="text-[10px] font-semibold uppercase tracking-wide text-zinc-400">
                En tu promotoría
              </dt>
              <dd className="text-sm text-zinc-800 dark:text-zinc-200">
                {joinedLabel(advisor.createdAt)}
              </dd>
            </div>
          </div>
        </dl>

        {error && (
          <p
            role="alert"
            className="mt-4 flex items-start gap-2 rounded-xl border border-rose-500/30
                       bg-rose-500/10 p-3 text-[11px] leading-relaxed text-rose-600
                       dark:text-rose-300"
          >
            <AlertTriangle size={13} className="mt-0.5 shrink-0" aria-hidden="true" />
            {error}
          </p>
        )}

        {/* ── Acciones ── */}
        <div className="mt-5 border-t border-zinc-200 pt-5 dark:border-zinc-800">
          <p className="mb-3 flex items-center gap-1.5 text-[11px] font-bold uppercase
                        tracking-widest text-zinc-500"
          >
            <ShieldCheck size={12} aria-hidden="true" />
            Acciones
          </p>

          <div className="flex flex-col gap-2">
            {/*
              Ascender / quitar asistente: sólo el titular. El ascenso usa el
              correo, que es lo que pide la función del repo; quitar usa el id.
            */}
            {isOwner && (
              isAssistant ? (
                <button
                  type="button"
                  onClick={() => run(() => revokeAssistant(advisor.id))}
                  disabled={busy}
                  className="flex items-center justify-center gap-2 rounded-xl border
                             border-zinc-300 px-4 py-2.5 text-sm font-semibold text-zinc-700
                             transition-colors hover:border-amber-500/50 hover:text-amber-600
                             disabled:cursor-wait dark:border-zinc-700 dark:text-zinc-300
                             dark:hover:text-amber-300"
                >
                  {busy
                    ? <Loader2 size={15} className="animate-spin" aria-hidden="true" />
                    : <Undo2 size={15} aria-hidden="true" />}
                  Quitar como asistente
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => run(() => promoteToAssistant(advisor.email))}
                  disabled={busy}
                  className="flex items-center justify-center gap-2 rounded-xl bg-indigo-600
                             px-4 py-2.5 text-sm font-bold text-white shadow-lg
                             shadow-indigo-600/25 transition-colors hover:bg-indigo-500
                             active:scale-[0.98] disabled:cursor-wait disabled:opacity-60"
                >
                  {busy
                    ? <Loader2 size={15} className="animate-spin" aria-hidden="true" />
                    : <ArrowUpCircle size={15} aria-hidden="true" />}
                  Ascender a asistente
                </button>
              )
            )}

            {/*
              Bloquear / desbloquear: titular y asistente. Desbloquear devuelve a la
              cola de solicitudes (lo dice su texto para que no se confunda con
              "ya está dentro"). Bloquear pide confirmación por ser irreversible de
              facto para la persona: no puede volver a solicitar.
            */}
            {isBlocked ? (
              <button
                type="button"
                onClick={() => run(() => unblockAdvisor(advisor.id))}
                disabled={busy}
                className="flex items-center justify-center gap-2 rounded-xl border
                           border-zinc-300 px-4 py-2.5 text-sm font-semibold text-zinc-700
                           transition-colors hover:border-emerald-500/50 hover:text-emerald-600
                           disabled:cursor-wait dark:border-zinc-700 dark:text-zinc-300
                           dark:hover:text-emerald-300"
              >
                {busy
                  ? <Loader2 size={15} className="animate-spin" aria-hidden="true" />
                  : <Undo2 size={15} aria-hidden="true" />}
                Desbloquear (vuelve a solicitudes)
              </button>
            ) : confirmBlock ? (
              <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 p-3">
                <p className="flex items-start gap-2 text-xs font-bold leading-snug
                              text-rose-600 dark:text-rose-200"
                >
                  <AlertTriangle size={14} className="mt-0.5 shrink-0" aria-hidden="true" />
                  ¿Bloquear a
                  {' '}
                  {advisor.fullName || 'este asesor'}
                  ?
                </p>
                <p className="mt-1.5 pl-6 text-[11px] leading-relaxed text-zinc-600
                              dark:text-zinc-400"
                >
                  Sale del equipo y no podrá volver a solicitar entrar con tu código.
                  Puedes desbloquearlo después desde la lista de bloqueados.
                </p>

                <div className="mt-3 flex flex-wrap gap-2 pl-6">
                  <button
                    type="button"
                    onClick={() => run(() => blockAdvisor(advisor.id))}
                    disabled={busy}
                    className="flex items-center gap-1.5 rounded-lg bg-rose-600 px-3 py-1.5
                               text-[11px] font-bold text-white transition-colors
                               hover:bg-rose-500 active:scale-95 disabled:cursor-wait
                               disabled:opacity-60"
                  >
                    {busy
                      ? <Loader2 size={11} className="animate-spin" aria-hidden="true" />
                      : <Ban size={11} aria-hidden="true" />}
                    Sí, bloquear
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmBlock(false)}
                    className="rounded-lg border border-zinc-300 px-3 py-1.5 text-[11px]
                               font-semibold text-zinc-600 transition-colors hover:bg-zinc-100
                               dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-white/5"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmBlock(true)}
                disabled={busy}
                className="flex items-center justify-center gap-2 rounded-xl border
                           border-rose-500/40 px-4 py-2.5 text-sm font-semibold text-rose-500
                           transition-colors hover:bg-rose-500/10 active:scale-[0.98]
                           disabled:cursor-wait dark:text-rose-400"
              >
                <Ban size={15} aria-hidden="true" />
                Bloquear del equipo
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
