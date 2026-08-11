import { useState, useEffect, useCallback } from 'react';
import {
  BellRing, Check, X, Clock, Loader2, ChevronDown, CalendarClock, Users,
} from 'lucide-react';
import {
  fetchSentAlerts, fetchAlertResponses, ALERT_RESPONSE, describeError,
} from '../../data/alertsRepo';

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

  const toggle = async (alertId) => {
    if (openId === alertId) { setOpenId(null); return; }

    setOpenId(alertId);
    setLoadingResponses(true);
    const { responses: found } = await fetchAlertResponses(alertId);
    setResponses(found);
    setLoadingResponses(false);
  };

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
                  {isLoadingResponses ? (
                    <p className="flex items-center gap-2 py-2 text-[11px] text-zinc-500">
                      <Loader2 size={12} className="animate-spin" aria-hidden="true" />
                      Cargando respuestas…
                    </p>
                  ) : team.length === 0 ? (
                    <p className="flex items-center gap-1.5 py-2 text-[11px] text-zinc-500">
                      <Users size={12} aria-hidden="true" />
                      Todavía no tienes asesores aprobados a quienes avisar.
                    </p>
                  ) : (
                    <div className="grid gap-4 sm:grid-cols-3">
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
