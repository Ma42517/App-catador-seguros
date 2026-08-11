import { useState, useEffect, useCallback } from 'react';
import {
  Users, TrendingUp, Loader2, RefreshCw, AlertTriangle, Database, UserCog,
} from 'lucide-react';
import { useSession } from '../../context/SessionContext';
import {
  listMyAdvisors, approveAdvisor, rejectAdvisor, blockAdvisor, unblockAdvisor,
  describeError,
} from '../../data/promotoriaRepo';
import InviteCodeCard from './InviteCodeCard';
import TeamTabs from './TeamTabs';
import AlertPublisher from './AlertPublisher';
import PostComposer from './PostComposer';
import AssistantsModal from './AssistantsModal';
import ActivityTable from './ActivityTable';
import PendingRequests from './PendingRequests';
import AdvisorCard from './AdvisorCard';

/**
 * Gestión de Promotoría: el equipo del promotor.
 *
 * Vive aparte del hub de Productividad a propósito, aunque las dos hablen de
 * rendimiento. Productividad mide **lo propio**: las metas, los bloques de tiempo
 * y las rachas de quien está mirando. Esto mide **a otros**, y esa diferencia
 * cambia lo que va dentro: una cifra baja aquí es una conversación con una
 * persona, no una tarea que hacer.
 *
 * El ancho, el centrado y el hueco de la barra inferior los pone la carcasa
 * (`AdminLayout`), así que aquí no se repiten.
 */
export default function PromotorDashboard() {
  const { identity, refreshIdentity, isPromoterOwner, isAssistant } = useSession();

  /*
    De quién es la promotoría que se está operando.

    Para el titular, él mismo. Para su asistente, el titular al que está vinculado.
    Sin esta distinción, el asistente habría consultado su propio id y visto un
    equipo vacío: las fichas de los asesores apuntan al titular, no a él.
  */
  const promotorId = isAssistant
    ? (identity?.promotorId ?? '')
    : (identity?.key ?? '');

  /*
    El código se guarda en el estado además de leerse de la identidad: al generarlo
    se ve al instante, sin esperar a que la sesión se relea. Y se arranca con el
    valor de la identidad para que al volver a entrar ya esté ahí.
  */
  const [code, setCode] = useState(identity?.promotoriaCode ?? '');

  const [pending, setPending] = useState([]);
  const [approved, setApproved] = useState([]);
  const [blocked, setBlocked] = useState([]);
  const [assistants, setAssistants] = useState([]);
  const [isAssistantsOpen, setAssistantsOpen] = useState(false);
  const [isLoading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [needsMigration, setNeedsMigration] = useState(false);
  const [busyId, setBusyId] = useState(null);

  /*
    Pestaña activa. Arranca en 'asesores' porque es lo que un promotor viene a
    ver; las solicitudes se avisan con el distintivo ámbar de su tarjeta, así que
    abrir ahí no esconde nada urgente.
  */
  const [activeTab, setActiveTab] = useState('asesores');


  const load = useCallback(async () => {
    setLoading(true);
    const result = await listMyAdvisors(promotorId);
    setLoading(false);

    /*
      La migración pendiente se trata como un caso propio y no como "no se pudo
      cargar". Es el único fallo de esta pantalla que se arregla corriendo un
      guion, y confundirlo con un error genérico manda a revisar la conexión o
      los permisos, que son justo lo que no está mal.
    */
    if (result.missingMigration) {
      setNeedsMigration(true);
      setError('');
      return;
    }

    setNeedsMigration(false);
    if (result.error) {
      setError(describeError(result.error));
      return;
    }
    setError('');
    setPending(result.pending);
    setApproved(result.approved);
    setBlocked(result.blocked ?? []);
    setAssistants(result.assistants ?? []);
  }, [promotorId]);

  useEffect(() => { load(); }, [load]);

  const respond = async (advisor, action) => {
    setBusyId(advisor.id);
    const { error: writeError } = await action(advisor);
    setBusyId(null);

    if (writeError) {
      setError(describeError(writeError));
      return;
    }
    setError('');
    // Se relee en lugar de mover la fila en memoria: si la política de RLS
    // rechazó el cambio a medias, la lista mostraría un estado que la base no
    // tiene.
    load();
  };

  const isEmpty = pending.length === 0 && approved.length === 0 && blocked.length === 0;

  return (
    <div className="animate-rise py-6">
      <header className="mb-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-widest text-indigo-400">
              Mi Promotoría
            </p>
            <h1 className="mt-1 flex items-center gap-2.5 text-2xl font-bold leading-tight
                           tracking-tight text-white"
            >
              <Users
                size={24}
                strokeWidth={1.9}
                className="shrink-0 text-indigo-400"
                aria-hidden="true"
              />
              Gestión de Equipo y Rendimiento
            </h1>
          </div>

          {/*
            Gestionar asistentes vive aquí arriba y no en una pestaña: se usa una vez
            cada varios meses, y una pestaña permanente para eso le robaría sitio a lo
            que se usa a diario. Sólo lo ve el titular.
          */}
          {isPromoterOwner && (
            <button
              type="button"
              onClick={() => setAssistantsOpen(true)}
              title="Gestionar asistentes"
              aria-label="Gestionar asistentes"
              className="mt-1 flex shrink-0 items-center gap-1.5 rounded-lg border
                         border-white/10 px-2.5 py-1.5 text-[11px] font-semibold text-zinc-400
                         transition-colors hover:border-indigo-500/40 hover:text-indigo-300
                         focus-visible:outline-none focus-visible:ring-2
                         focus-visible:ring-indigo-500"
            >
              <UserCog size={13} aria-hidden="true" />
              {assistants.length > 0 ? `Asistentes · ${assistants.length}` : 'Asistentes'}
            </button>
          )}

          <button
            type="button"
            onClick={load}
            disabled={isLoading}
            className="mt-1 flex shrink-0 items-center gap-1.5 rounded-lg px-2 py-1 text-[11px]
                       font-semibold uppercase tracking-wider text-zinc-500 transition-colors
                       hover:text-indigo-400 disabled:cursor-wait"
          >
            {isLoading
              ? <Loader2 size={12} className="animate-spin" aria-hidden="true" />
              : <RefreshCw size={12} aria-hidden="true" />}
            {isLoading ? 'Cargando' : 'Actualizar'}
          </button>
        </div>

        <p className="mt-2 text-xs leading-relaxed text-zinc-400">
          Aquí das seguimiento a tus asesores: quién está activo, quién necesita
          apoyo y quién espera tu autorización para entrar.
        </p>
      </header>

      {/*
        La migración faltante se explica con el guion a la vista. Es lo que
        distingue un aviso útil de uno que sólo dice que algo falló: quien lo lee
        puede resolverlo sin salir a buscar en otro sitio.
      */}
      {needsMigration && (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4">
          <p className="flex items-center gap-2 text-sm font-bold text-amber-300">
            <Database size={15} aria-hidden="true" />
            Falta preparar la base
          </p>
          <p className="mt-1.5 text-xs leading-relaxed text-zinc-400">
            La tabla
            {' '}
            <span className="font-mono text-zinc-300">profiles</span>
            {' '}
            todavía no tiene las columnas
            {' '}
            <span className="font-mono text-zinc-300">promotor_id</span>
            {' '}
            y
            {' '}
            <span className="font-mono text-zinc-300">promotoria_status</span>
            . Corre este guion en el editor SQL de Supabase y vuelve a esta pantalla.
          </p>
          <pre className="mt-3 overflow-x-auto rounded-lg border border-white/10 bg-black/60 p-3
                          text-[10px] leading-relaxed text-zinc-400"
          >
            {`alter table public.profiles
  add column if not exists promotor_id uuid
    references public.profiles(id) on delete set null,
  add column if not exists promotoria_status text;`}
          </pre>
        </div>
      )}

      {error && !needsMigration && (
        <p
          role="alert"
          className="mb-4 flex items-start gap-2 rounded-xl border border-rose-500/30
                     bg-rose-500/10 p-3 text-[11px] leading-relaxed text-rose-300"
        >
          <AlertTriangle size={13} className="mt-0.5 shrink-0" aria-hidden="true" />
          {error}
        </p>
      )}

      {isLoading && !needsMigration && (
        <p className="flex items-center justify-center gap-2 py-12 text-xs text-zinc-500">
          <Loader2 size={14} className="animate-spin" aria-hidden="true" />
          Cargando tu equipo…
        </p>
      )}

      {!isLoading && !needsMigration && (
        <>
          {/*
            El código de invitación es la llave de la promotoría: decide quién puede
            pedir entrar. Se omite del marcado para el asistente, no se esconde con
            CSS —una tarjeta oculta sigue en el DOM y su texto se lee desde el
            inspector—, y con ella se van sus botones de copiar, compartir y editar.
          */}
          {isPromoterOwner && (
            <InviteCodeCard
              code={code}
              promoterId={promotorId}
              promotoriaName={identity?.company || identity?.name || 'Promotoria'}
              onSaved={(next) => { setCode(next); refreshIdentity?.(); }}
            />
          )}

          {/*
            En su lugar, el asistente recibe su propio encabezado. No es un relleno
            para tapar el hueco: le dice qué puede hacer en esta pantalla, que es
            distinto de lo que puede el titular, y evita que busque un código que
            nunca va a encontrar.
          */}
          {isAssistant && (
            <div className="mb-6 rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
              <h2 className="text-xl font-bold text-white">Panel Operativo de Promotoría</h2>
              <p className="mt-2 text-sm text-zinc-400">
                Desde aquí puedes gestionar las aprobaciones, publicar en el muro y
                monitorear la actividad del equipo.
              </p>
            </div>
          )}

          <TeamTabs
            activeTab={activeTab}
            onChange={setActiveTab}
            total={approved.length}
            pendingCount={pending.length}
          />

          {/* ── Asesores ── */}
          {activeTab === 'asesores' && (
            approved.length > 0 ? (
              <section>
                {/*
                  Una columna en teléfono, dos en tableta y tres en escritorio. Es
                  la única disposición que deja la tarjeta legible en 360 píxeles
                  sin desperdiciar la mitad de la pantalla en un monitor.
                */}
                <div className="grid w-full grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {approved.map((advisor) => (
                    <AdvisorCard key={advisor.id} advisor={advisor} />
                  ))}
                </div>
              </section>
            ) : (
              <div className="rounded-2xl border border-dashed border-zinc-700 bg-zinc-900/40
                              px-6 py-10 text-center"
              >
                <p className="text-sm font-semibold text-zinc-300">
                  Todavía no tienes asesores aprobados
                </p>
                <p className="mx-auto mt-1.5 max-w-sm text-xs leading-relaxed text-zinc-500">
                  {pending.length > 0
                    ? 'Tienes solicitudes esperando: revísalas en "Por Aprobar".'
                    : 'Comparte tu código de arriba para que puedan solicitar entrar.'}
                </p>
              </div>
            )
          )}

          {/* ── Por Aprobar ── */}
          {activeTab === 'aprobar' && (
            pending.length > 0 ? (
              <PendingRequests
                requests={pending}
                busyId={busyId}
                /*
                  Se le pasa el rol actual para que aprobar pueda ascender a quien
                  todavía está en `pending`: es lo que convierte el visto bueno del
                  promotor en acceso real a la app.
                */
                onApprove={(advisor) => respond(advisor, (a) => approveAdvisor(a.id, a.role))}
                onReject={(advisor) => respond(advisor, (a) => rejectAdvisor(a.id))}
                onBlock={(advisor) => respond(advisor, (a) => blockAdvisor(a.id))}
              />
            ) : (
              <div className="rounded-2xl border border-dashed border-zinc-700 bg-zinc-900/40
                              px-6 py-10 text-center"
              >
                <p className="text-sm font-semibold text-zinc-300">Sin solicitudes pendientes</p>
                <p className="mx-auto mt-1.5 max-w-sm text-xs leading-relaxed text-zinc-500">
                  Cuando alguien use tu código aparecerá aquí con su nombre completo
                  para aprobarlo, rechazarlo o bloquearlo.
                </p>
              </div>
            )
          )}

          {/* ── Publicar en el muro ── */}
          {activeTab === 'workspace' && (
            <PostComposer />
          )}

          {/* ── Publicar Alerta ── */}
          {activeTab === 'alerta' && <AlertPublisher />}

          {/* ── Actividad General ── */}
          {activeTab === 'actividad' && <ActivityTable advisors={approved} />}

          {/*
            Bloqueados, al final y plegados en una lista sobria: no son el equipo
            ni una tarea pendiente, pero tienen que estar a la vista para poder
            deshacer el bloqueo. Escondidos, un bloqueo por error sería definitivo.
          */}
          {blocked.length > 0 && (
            <section className="mt-6">
              <h2 className="mb-2.5 text-[11px] font-bold uppercase tracking-widest text-zinc-600">
                Bloqueados
              </h2>

              <ul className="flex flex-col gap-2">
                {blocked.map((advisor) => (
                  <li
                    key={advisor.id}
                    className="flex items-center gap-3 rounded-xl border border-white/5
                               bg-zinc-900/40 p-3"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-zinc-400">
                        {advisor.fullName || 'Sin nombre'}
                      </p>
                      <p className="truncate text-[11px] text-zinc-600">{advisor.email}</p>
                    </div>

                    <button
                      type="button"
                      onClick={() => respond(advisor, (a) => unblockAdvisor(a.id))}
                      disabled={busyId === advisor.id}
                      className="shrink-0 rounded-lg border border-zinc-700 px-2.5 py-1.5
                                 text-[11px] font-semibold text-zinc-400 transition-colors
                                 hover:border-emerald-500/40 hover:text-emerald-300
                                 disabled:cursor-wait"
                    >
                      Desbloquear
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/*
            Vacío. Se explica cómo se llena, porque un promotor recién nombrado no
            tiene forma de adivinar que hace falta escribir su identificador en la
            ficha del asesor: no hay ninguna pantalla que lo haga todavía.
          */}
          {isEmpty && activeTab === 'asesores' && (
            <div className="rounded-2xl border border-dashed border-zinc-700 bg-zinc-900/40
                            px-6 py-12 text-center"
            >
              <span
                className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-xl border
                           border-indigo-500/30 bg-indigo-500/10 text-indigo-300"
                aria-hidden="true"
              >
                <TrendingUp size={22} strokeWidth={1.9} />
              </span>

              <p className="text-sm font-semibold text-zinc-200">
                Todavía no tienes asesores en tu promotoría.
              </p>
              <p className="mx-auto mt-2 max-w-sm text-xs leading-relaxed text-zinc-500">
                {isPromoterOwner
                  ? 'Comparte tu código de arriba. Cuando alguien lo escriba en '
                    + 'Productividad → Workplace, su solicitud aparecerá aquí con su '
                    + 'nombre completo para que la apruebes, la rechaces o la bloquees.'
                  : 'Cuando alguien use el código de la promotoría, su solicitud '
                    + 'aparecerá aquí con su nombre completo para que la apruebes, la '
                    + 'rechaces o la bloquees.'}
              </p>
            </div>
          )}
        </>
      )}

      {/*
        Fuera del contenido de las pestañas: es una capa que cubre la pantalla, y
        montada dentro se desmontaría al cambiar de pestaña por debajo.
      */}
      {isPromoterOwner && (
        <AssistantsModal
          isOpen={isAssistantsOpen}
          onClose={() => setAssistantsOpen(false)}
          assistants={assistants}
          onChanged={load}
        />
      )}
    </div>
  );
}
