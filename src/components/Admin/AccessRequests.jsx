import { useState, useEffect, useCallback } from 'react';
import {
  UserCheck, Loader2, RefreshCw, ShieldCheck, User, Ban, Crown, Trash2, AlertTriangle,
} from 'lucide-react';
import {
  listProfiles, setProfileRole, deleteProfile, describeError, roleLabel,
  PROFILE_ROLES, canChangeRole, canDeleteProfile,
} from '../../data/profilesRepo';
import { useSession } from '../../context/SessionContext';

/** Color del rol, para distinguir de un vistazo quién está en espera. */
const ROLE_TONE = {
  [PROFILE_ROLES.PENDING]: 'text-amber-500',
  [PROFILE_ROLES.ADVISOR]: 'text-emerald-600 dark:text-emerald-400',
  [PROFILE_ROLES.PROMOTER]: 'text-indigo-600 dark:text-indigo-400',
  [PROFILE_ROLES.ADMIN]: 'text-rose-600 dark:text-rose-400',
};

const ACTION =
  'flex items-center gap-1 rounded-lg border px-2 py-1 text-[11px] font-semibold '
  + 'transition-colors active:scale-95 disabled:cursor-wait disabled:opacity-50';

/**
 * Aprobación de solicitudes de acceso.
 *
 * Sin esta sección el flujo queda a medias: alguien pide entrar, se le crea la
 * ficha en `pending` y nadie puede cambiarla salvo entrando al panel de
 * Supabase a editar la fila a mano. Aquí es donde el promotor decide.
 *
 * Los pendientes van primero: son los que exigen una acción.
 */
export default function AccessRequests({ onLog, onChanged }) {
  // Quién está mirando decide qué acciones se dibujan.
  const { identity, role: actorRole } = useSession();

  /*
    El error se guarda además de registrarse en la consola del panel, porque
    esta lista también vive por su cuenta en "Ver más": ahí no hay consola donde
    mirar y el fallo tiene que verse en su sitio.
  */
  const [error, setError] = useState('');
  const [list, setList] = useState([]);
  const [isLoading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState(null);

  /*
    Qué ficha está pidiendo confirmación para borrarse.

    La confirmación va dentro de la fila y no en un `window.confirm`: ese diálogo
    lo bloquean varios navegadores dentro de una app instalada, y cuando aparece
    no puede explicar *qué* se pierde. Aquí el aviso enumera las consecuencias
    justo debajo del nombre de la persona a la que le van a pasar.
  */
  const [confirmId, setConfirmId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    onLog?.('cmd', 'select * from profiles order by created_at desc');
    const { data, error } = await listProfiles();
    setLoading(false);

    if (error) {
      setError(describeError(error));
      onLog?.('error', describeError(error));
      return;
    }
    setError('');
    const pending = data.filter((item) => item.role === PROFILE_ROLES.PENDING);
    const rest = data.filter((item) => item.role !== PROFILE_ROLES.PENDING);
    setList([...pending, ...rest]);
    onLog?.('ok', `${data.length} perfil(es) · ${pending.length} en espera.`);
  }, [onLog]);

  useEffect(() => { load(); }, [load]);

  const changeRole = async (profile, role) => {
    setBusyId(profile.id);
    onLog?.('cmd', `update profiles set role = '${role}' where id = ${profile.id.slice(0, 8)}`);
    const { error } = await setProfileRole(profile.id, role);
    setBusyId(null);

    if (error) {
      setError(describeError(error));
      onLog?.('error', describeError(error));
      return;
    }
    setError('');
    onLog?.('ok', `${profile.email || profile.fullName}: ahora es ${roleLabel(role)}.`);
    load();
    onChanged?.();
  };

  const removeProfile = async (profile) => {
    setBusyId(profile.id);
    onLog?.('cmd', `delete from profiles where id = ${profile.id.slice(0, 8)}`);
    const { error } = await deleteProfile(profile.id);
    setBusyId(null);
    setConfirmId(null);

    if (error) {
      setError(describeError(error));
      onLog?.('error', describeError(error));
      return;
    }
    setError('');
    onLog?.('ok', `${profile.email || profile.fullName}: ficha eliminada.`);
    load();
    onChanged?.();
  };

  const pendingCount = list.filter((item) => item.role === PROFILE_ROLES.PENDING).length;

  return (
    <section className="mb-8">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 text-sm font-bold text-zinc-900 dark:text-white">
          <UserCheck size={15} className="text-indigo-500" aria-hidden="true" />
          Solicitudes de acceso
          {pendingCount > 0 && (
            <span
              className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold
                         text-amber-600 dark:text-amber-400"
            >
              {pendingCount} en espera
            </span>
          )}
        </h3>

        <button
          type="button"
          onClick={load}
          disabled={isLoading}
          className="flex items-center gap-1.5 rounded-lg px-2 py-1 text-[11px] font-semibold
                     uppercase tracking-wider text-zinc-500 transition-colors
                     hover:text-indigo-500 disabled:cursor-wait"
        >
          {isLoading
            ? <Loader2 size={12} className="animate-spin" />
            : <RefreshCw size={12} />}
          {isLoading ? 'Cargando' : 'Actualizar'}
        </button>
      </div>

      {error && (
        <p
          role="alert"
          className="mb-3 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3
                     text-[11px] leading-relaxed text-rose-600 dark:text-rose-300"
        >
          {error}
        </p>
      )}

      {!isLoading && list.length === 0 && (
        <p className="rounded-xl border border-dashed border-zinc-300 py-8 text-center text-xs
                      leading-relaxed text-zinc-500 dark:border-zinc-700"
        >
          Sin perfiles visibles. Si esperabas ver a alguien, revisa que exista la tabla
          <span className="font-mono"> profiles </span>
          y su política de lectura para promotores.
        </p>
      )}

      <ul className="flex flex-col gap-2">
        {list.map((profile) => {
          const isPending = profile.role === PROFILE_ROLES.PENDING;
          const busy = busyId === profile.id;

          return (
            <li
              key={profile.id}
              className={`rounded-xl border p-3 ${isPending
                ? 'border-amber-500/40 bg-amber-500/5'
                : 'border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900'}`}
            >
              <div className="flex items-center gap-3">
                {profile.avatarUrl ? (
                  <img
                    src={profile.avatarUrl}
                    alt=""
                    className="h-9 w-9 shrink-0 rounded-full"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <span
                    className="grid h-9 w-9 shrink-0 place-items-center rounded-full
                               bg-zinc-100 text-xs font-bold text-zinc-500 dark:bg-zinc-800"
                    aria-hidden="true"
                  >
                    {(profile.fullName || profile.email || '?').slice(0, 1).toUpperCase()}
                  </span>
                )}

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-zinc-900 dark:text-white">
                    {profile.fullName || 'Sin nombre'}
                  </p>
                  <p className="truncate text-[11px] text-zinc-500">{profile.email}</p>
                </div>

                <span className={`shrink-0 text-[11px] font-bold ${ROLE_TONE[profile.role] ?? 'text-zinc-500'}`}>
                  {roleLabel(profile.role)}
                </span>
              </div>

              {/*
                Se listan las acciones posibles y se filtran por permiso, en vez
                de anidar condiciones: así la regla vive en un solo lugar y
                añadir un rol no obliga a tocar el JSX.
              */}
              <div className="mt-2.5 flex flex-wrap gap-2">
                {[
                  {
                    role: PROFILE_ROLES.ADVISOR,
                    label: 'Aprobar como Asesor',
                    Icon: User,
                    tone: 'border-emerald-500/40 text-emerald-600 hover:bg-emerald-500/10 dark:text-emerald-400',
                  },
                  {
                    role: PROFILE_ROLES.PROMOTER,
                    label: 'Hacer Promotor',
                    Icon: ShieldCheck,
                    tone: 'border-indigo-500/40 text-indigo-600 hover:bg-indigo-500/10 dark:text-indigo-400',
                  },
                  {
                    role: PROFILE_ROLES.ADMIN,
                    label: 'Hacer Administrador',
                    Icon: Crown,
                    tone: 'border-amber-500/40 text-amber-600 hover:bg-amber-500/10 dark:text-amber-400',
                  },
                  {
                    role: PROFILE_ROLES.PENDING,
                    label: 'Revocar acceso',
                    Icon: Ban,
                    tone: 'border-zinc-300 text-zinc-500 hover:bg-rose-500/10 hover:text-rose-500 dark:border-zinc-700',
                  },
                ]
                  .filter((action) => action.role !== profile.role)
                  .filter(() => canChangeRole({
                    actorRole,
                    actorId: identity?.key,
                    target: profile,
                  }))
                  .map((action) => (
                    <button
                      key={action.role}
                      type="button"
                      onClick={() => changeRole(profile, action.role)}
                      disabled={busy}
                      className={`${ACTION} ${action.tone}`}
                    >
                      {busy
                        ? <Loader2 size={11} className="animate-spin" />
                        : <action.Icon size={11} />}
                      {action.label}
                    </button>
                  ))}

                {/*
                  Eliminar va al final y con el borde rojo: es la única acción de
                  esta fila que no se puede deshacer, y separarla del grupo de
                  aprobación evita el toque por inercia después de aprobar.
                */}
                {canDeleteProfile({ actorRole, actorId: identity?.key, target: profile }) && (
                  <button
                    type="button"
                    onClick={() => setConfirmId(confirmId === profile.id ? null : profile.id)}
                    disabled={busy}
                    className={`${ACTION} border-rose-500/40 text-rose-600 hover:bg-rose-500/10
                                dark:text-rose-400`}
                  >
                    <Trash2 size={11} />
                    Eliminar
                  </button>
                )}

                {/* Sin acciones disponibles se explica por qué, en lugar de
                    dejar una fila muda que parezca un fallo. */}
                {profile.id === identity?.key && (
                  <span className="text-[11px] italic text-zinc-500">
                    Tu propia cuenta: nadie puede cambiar su propio rol ni borrarla.
                  </span>
                )}
              </div>

              {/*
                Confirmación en su sitio, con las consecuencias enumeradas.

                Se dice que la cuenta de acceso sobrevive porque es la parte que
                sorprende: sin avisarlo, el administrador daría por hecho que esa
                persona ya no puede volver a registrarse y no entendería verla
                reaparecer en espera.
              */}
              {confirmId === profile.id && (
                <div className="animate-rise mt-2.5 rounded-xl border border-rose-500/40
                                bg-rose-500/10 p-3"
                >
                  <p className="flex items-start gap-2 text-[11px] font-semibold
                                leading-snug text-rose-600 dark:text-rose-300"
                  >
                    <AlertTriangle size={13} className="mt-0.5 shrink-0" aria-hidden="true" />
                    ¿Eliminar a
                    {' '}
                    {profile.fullName || profile.email}
                    ?
                  </p>

                  <ul className="mt-2 list-disc space-y-1 pl-8 text-[11px] leading-snug
                                 text-zinc-600 dark:text-zinc-400"
                  >
                    <li>Se borra su tarjeta digital y su rol.</li>
                    <li>Se borran los prospectos que capturó.</li>
                    <li>
                      Su cuenta de acceso sigue existiendo: si vuelve a entrar,
                      reaparecerá aquí en espera de aprobación.
                    </li>
                  </ul>

                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => removeProfile(profile)}
                      disabled={busy}
                      className="flex items-center gap-1.5 rounded-lg bg-rose-600 px-3 py-1.5
                                 text-[11px] font-bold text-white transition-colors
                                 hover:bg-rose-500 active:scale-95 disabled:cursor-wait
                                 disabled:opacity-60"
                    >
                      {busy
                        ? <Loader2 size={11} className="animate-spin" />
                        : <Trash2 size={11} />}
                      Sí, eliminar
                    </button>

                    <button
                      type="button"
                      onClick={() => setConfirmId(null)}
                      className="rounded-lg border border-zinc-300 px-3 py-1.5 text-[11px]
                                 font-semibold text-zinc-600 transition-colors
                                 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300
                                 dark:hover:bg-white/5"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
