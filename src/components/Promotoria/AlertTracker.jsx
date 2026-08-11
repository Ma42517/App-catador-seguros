import { useState, useEffect, useCallback } from 'react';
import {
  BellRing, Check, X, Clock, Loader2, ChevronDown, CalendarClock, Users,
} from 'lucide-react';
import {
  fetchSentAlerts, fetchAlertResponses, ALERT_RESPONSE, describeError,
} from '../../data/alertsRepo';
import { supabase, isSupabaseConfigured } from '../../lib/supabaseClient';

/** Fecha del evento en palabras, sin desfase de zona horaria. */
function eventLabel(date, time) {
  if (!date) return '';
  const [year, month, day] = date.split('-').map(Number);
  const when = new Date(year, (month ?? 1) - 1, day ?? 1);
  const formatted = when.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' });
  return time ? `${formatted} · ${time.slice(0, 5)}` : formatted;
}

/** Una columna de la respuesta: quiénes dijeron sí, no, o siguen sin contestar. */
function ResponseGroup({ label, people, tone, Icon }) {
  return (
    <div>
      <p className={`mb-1.5 flex items-center gap-1.5 text-[10px] font-bold uppercase
                     tracking-wider ${tone}`}
      >
        <Icon size={11} aria-hidden="true" />
        {label}
        <span className="tabular-nums">{people.length}</span>
      </p>

      {people.length === 0 ? (
        <p className="text-[11px] text-zinc-600">—</p>
      ) : (
        <ul className="flex flex-col gap-0.5">
          {people.map((person) => (
            <li key={person.id} className="truncate text-[11px] text-zinc-300">
              {person.fullName || person.email}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/**
 * Seguimiento de las notificaciones enviadas.
 *
 * La pregunta que se hace un promotor antes de una junta no es "quién contestó",
 * es **quién falta**. Por eso las tres columnas y no una lista de respuestas: los
 * pendientes se calculan cruzando el equipo completo con quienes ya contestaron, y
 * son la única columna sobre la que se puede actuar —a ésos hay que llamarlos—.
 *
 * Las respuestas se piden al abrir cada alerta y no todas de golpe: con veinte
 * notificaciones enviadas serían veinte consultas al entrar a la pestaña para leer
 * las de una sola.
 */
export default function AlertTracker({ promotorId, team }) {
  const [alerts, setAlerts] = useState([]);
  const [isLoading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [openId, setOpenId] = useState(null);
  const [responses, setResponses] = useState({});
  const [isLoadingResponses, setLoadingResponses] = useState(false);

  /*
    El fallo al leer las respuestas se guarda y se muestra.

    Aquí estaba el bug de "todos siguen sin responder": el error de la consulta se
    descartaba, así que una lectura que la base rechaza —falta la política de
    SELECT sobre `alert_responses` para el promotor— devolvía un mapa vacío y la
    pantalla lo interpretaba como "nadie ha contestado". Idéntico a la verdad y
    completamente distinto en la causa.
  */
  const [responsesError, setResponsesError] = useState('');

  /*
    Cierto cuando las respuestas se leyeron de la tabla y no de la función, es
    decir, cuando el conteo pasó por RLS y pudo venir recortado sin avisar.
  */
  const [isUnverified, setUnverified] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { alerts: found, error: loadError, missingStructure } = await fetchSentAlerts(promotorId);
    setLoading(false);

    /*
      Sin las columnas todavía no hay nada que mostrar y tampoco un problema que
      reportar: nunca se ha enviado una notificación porque la función no existía.
    */
    if (missingStructure) {
      setAlerts([]);
      setError('');
      return;
    }
    if (loadError) {
      setError(describeError(loadError));
      return;
    }
    setError('');
    setAlerts(found);
  }, [promotorId]);

  useEffect(() => { load(); }, [load]);

  /** Relee las respuestas de una alerta. Se usa al abrirla y al llegar una nueva. */
  const loadResponses = useCallback(async (alertId, { quiet = false } = {}) => {
    if (!quiet) setLoadingResponses(true);
    const {
      responses: found, error: readError, unverified,
    } = await fetchAlertResponses(alertId);
    if (!quiet) setLoadingResponses(false);

    if (readError) {
      setResponsesError(describeError(readError));
      return;
    }
    setResponsesError('');
    setResponses(found);
    setUnverified(Boolean(unverified));
  }, []);

  const toggle = async (alertId) => {
    if (openId === alertId) { setOpenId(null); return; }

    setOpenId(alertId);
    setResponses({});
    setResponsesError('');
    await loadResponses(alertId);
  };

  /*
    Tiempo real sobre la alerta abierta.

    Sin esto, el promotor que deja el panel abierto durante una junta ve la lista
    congelada en el momento en que la abrió, y las confirmaciones que llegan
    mientras mira no aparecen: tendría que cerrar y abrir para enterarse.

    Se relee la lista completa en lugar de añadir la fila del evento. Es una
    consulta corta y evita el caso incómodo de recibir dos avisos del mismo asesor
    -un cambio de respuesta- y tener que decidir cuál gana en memoria: la base ya
    lo decidió.

    Se suscribe sólo a la alerta abierta y se cancela al cerrarla. Un canal por cada
    alerta enviada dejaría veinte suscripciones vivas para mirar una.
  */
  useEffect(() => {
    if (!isSupabaseConfigured || !supabase || !openId) return undefined;

    const channel = supabase
      .channel(`alert-responses-${openId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'alert_responses',
          filter: `alert_id=eq.${openId}`,
        },
        () => { loadResponses(openId, { quiet: true }); },
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [openId, loadResponses]);

  if (isLoading) {
    return (
      <p className="flex items-center justify-center gap-2 py-8 text-xs text-zinc-500">
        <Loader2 size={13} className="animate-spin" aria-hidden="true" />
        Cargando notificaciones…
      </p>
    );
  }

  if (error) {
    return (
      <p role="alert" className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3
                                 text-[11px] leading-relaxed text-rose-300"
      >
        {error}
      </p>
    );
  }

  if (alerts.length === 0) return null;

  return (
    <section className="mt-6">
      <h2 className="mb-2.5 flex items-center gap-2 text-[11px] font-bold uppercase
                     tracking-widest text-zinc-500"
      >
        <BellRing size={13} aria-hidden="true" />
        Notificaciones enviadas
      </h2>

      <ul className="flex flex-col gap-2">
        {alerts.map((alert) => {
          const isOpen = openId === alert.id;

          const yes = team.filter((p) => responses[p.id] === ALERT_RESPONSE.YES);
          const no = team.filter((p) => responses[p.id] === ALERT_RESPONSE.NO);
          const pending = team.filter((p) => !responses[p.id]);

          return (
            <li key={alert.id} className="overflow-hidden rounded-xl border border-white/10
                                          bg-[#1a1a1a]"
            >
              <button
                type="button"
                onClick={() => toggle(alert.id)}
                aria-expanded={isOpen}
                className="flex w-full items-center gap-3 p-3 text-left transition-colors
                           hover:bg-white/5"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-zinc-100">{alert.title}</p>
                  <p className="mt-0.5 flex items-center gap-1.5 text-[11px] text-zinc-500">
                    {alert.eventDate && (
                      <>
                        <CalendarClock size={11} aria-hidden="true" />
                        {eventLabel(alert.eventDate, alert.eventTime)}
                      </>
                    )}
                  </p>
                </div>

                <span className="shrink-0 text-[11px] font-semibold text-zinc-500">
                  Ver respuestas
                </span>

                <ChevronDown
                  size={15}
                  className={`shrink-0 text-zinc-500 transition-transform duration-200
                              ${isOpen ? 'rotate-180' : ''}`}
                  aria-hidden="true"
                />
              </button>

              {isOpen && (
                <div className="animate-rise border-t border-white/10 p-3">
                  {responsesError ? (
                    /*
                      Se nombra la causa en lugar de dejar a todos en "sin
                      responder": con el mensaje anterior, el promotor concluía que
                      su equipo no contesta y el equipo juraba haber contestado.
                    */
                    <div role="alert" className="rounded-lg border border-rose-500/30
                                                 bg-rose-500/10 p-3"
                    >
                      <p className="text-[11px] font-semibold text-rose-300">
                        No se pudieron leer las respuestas
                      </p>
                      <p className="mt-1 text-[11px] leading-relaxed text-zinc-400">
                        {responsesError}
                      </p>
                      <button
                        type="button"
                        onClick={() => loadResponses(openId)}
                        className="mt-2 rounded-lg border border-rose-500/40 px-2.5 py-1
                                   text-[11px] font-semibold text-rose-300 transition-colors
                                   hover:bg-rose-500/10"
                      >
                        Reintentar
                      </button>
                    </div>
                  ) : isLoadingResponses ? (
                    <p className="flex items-center gap-2 py-2 text-[11px] text-zinc-500">
                      <Loader2 size={12} className="animate-spin" aria-hidden="true" />
                      Cargando respuestas…
                    </p>
                  ) : team.length === 0 ? (
                    <p className="flex items-center gap-1.5 py-2 text-[11px] text-zinc-500">
                      <Users size={12} aria-hidden="true" />
                      Todavía no hay nadie en tu promotoría a quien avisar.
                    </p>
                  ) : (
                    <div className="grid gap-4 sm:grid-cols-3">
                      {/*
                        Un "nadie ha contestado" que viene de la lectura ambigua se
                        marca como tal. Es la única combinación sospechosa: cero
                        respuestas y todo el equipo pendiente es lo que se ve cuando
                        la base esconde las filas en lugar de negarlas.
                      */}
                      {isUnverified && yes.length === 0 && no.length === 0 && (
                        <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-2.5
                                      text-[11px] leading-relaxed text-amber-200 sm:col-span-3"
                        >
                          Si alguien ya confirmó y aquí sigue pendiente, falta correr
                          el SQL de <code>alert_responses_for</code> en Supabase: sin
                          esa función la base puede ocultar las respuestas sin dar
                          error.
                        </p>
                      )}

                      <ResponseGroup
                        label="Sí asistirán"
                        people={yes}
                        tone="text-emerald-400"
                        Icon={Check}
                      />
                      <ResponseGroup
                        label="No podrán"
                        people={no}
                        tone="text-rose-400"
                        Icon={X}
                      />
                      {/*
                        Los pendientes van al final pero son la columna útil: es a
                        quienes hay que llamar. Se calculan cruzando el equipo con
                        las respuestas, porque una tabla de respuestas no puede
                        contener a quien no contestó.
                      */}
                      <ResponseGroup
                        label="Sin responder"
                        people={pending}
                        tone="text-amber-400"
                        Icon={Clock}
                      />
                    </div>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
