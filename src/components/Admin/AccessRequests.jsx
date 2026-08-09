import { useState, useEffect, useCallback } from 'react';
import { UserCheck, Loader2, RefreshCw, ShieldCheck, User, Ban } from 'lucide-react';
import {
  listProfiles, setProfileRole, describeError, roleLabel, PROFILE_ROLES,
} from '../../data/profilesRepo';

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
export default function AccessRequests({ onLog }) {
  const [list, setList] = useState([]);
  const [isLoading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    onLog?.('cmd', 'select * from profiles order by created_at desc');
    const { data, error } = await listProfiles();
    setLoading(false);

    if (error) {
      onLog?.('error', describeError(error));
      return;
    }
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
      onLog?.('error', describeError(error));
      return;
    }
    onLog?.('ok', `${profile.email || profile.fullName}: ahora es ${roleLabel(role)}.`);
    load();
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

              <div className="mt-2.5 flex flex-wrap gap-2">
                {profile.role !== PROFILE_ROLES.ADVISOR && (
                  <button
                    type="button"
                    onClick={() => changeRole(profile, PROFILE_ROLES.ADVISOR)}
                    disabled={busy}
                    className={`${ACTION} border-emerald-500/40 text-emerald-600
                                hover:bg-emerald-500/10 dark:text-emerald-400`}
                  >
                    {busy ? <Loader2 size={11} className="animate-spin" /> : <User size={11} />}
                    Aprobar como Asesor
                  </button>
                )}

                {profile.role !== PROFILE_ROLES.PROMOTER && (
                  <button
                    type="button"
                    onClick={() => changeRole(profile, PROFILE_ROLES.PROMOTER)}
                    disabled={busy}
                    className={`${ACTION} border-indigo-500/40 text-indigo-600
                                hover:bg-indigo-500/10 dark:text-indigo-400`}
                  >
                    {busy ? <Loader2 size={11} className="animate-spin" /> : <ShieldCheck size={11} />}
                    Hacer Promotor
                  </button>
                )}

                {!isPending && (
                  <button
                    type="button"
                    onClick={() => changeRole(profile, PROFILE_ROLES.PENDING)}
                    disabled={busy}
                    className={`${ACTION} border-zinc-300 text-zinc-500
                                hover:bg-rose-500/10 hover:text-rose-500 dark:border-zinc-700`}
                  >
                    {busy ? <Loader2 size={11} className="animate-spin" /> : <Ban size={11} />}
                    Revocar
                  </button>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
