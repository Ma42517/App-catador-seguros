import { useState, useEffect, useCallback } from 'react';
import { BellRing, Check, X, Loader2, CalendarClock } from 'lucide-react';
import { useSession } from '../../context/SessionContext';
import { useEvents } from '../../context/EventContext';
import {
  fetchPendingAlerts, respondToAlert, ALERT_RESPONSE,
} from '../../data/alertsRepo';

/** Fecha y hora del evento, en palabras. */
function eventLabel(date, time) {
  if (!date) return '';

  /*
    Se construye con la fecha partida a mano en lugar de `new Date('2026-08-15')`.
    Ese formato se interpreta como UTC, así que en México se veía el día anterior:
    una junta del 15 aparecía como 14 y el asesor llegaba un día tarde.
  */
  const [year, month, day] = date.split('-').map(Number);
  const when = new Date(year, (month ?? 1) - 1, day ?? 1);

  const formatted = when.toLocaleDateString('es-MX', {
    weekday: 'long', day: 'numeric', month: 'long',
  });

  return time ? `${formatted} · ${time.slice(0, 5)}` : formatted;
}

/**
 * Notificaciones de alta prioridad en la pantalla de inicio.
 *
 * No se van hasta que el asesor contesta, y ahí está su valor: un aviso que se
 * puede ignorar deslizando no sirve para confirmar asistencia a una junta. La
 * contrapartida es que estorba, así que sólo aparecen las que de verdad esperan
 * respuesta y desaparecen en el mismo toque.
 *
 * Al decir "sí", el evento entra en su agenda local. Esa agenda vive en su propio
 * teléfono —no hay tabla de citas en la base—, así que el apunte se hace donde de
 * verdad lo va a consultar y no en un registro que nadie lee.
 */
export default function PriorityAlerts() {
  const { identity, promotorId } = useSession();
  const { addEvent } = useEvents();

  const [alerts, setAlerts] = useState([]);
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(async () => {
    const { alerts: found } = await fetchPendingAlerts(promotorId, identity?.key);
    setAlerts(found);
  }, [promotorId, identity?.key]);

  useEffect(() => { load(); }, [load]);

  const answer = async (alert, response) => {
    setBusyId(alert.id);

    const { error } = await respondToAlert(alert.id, identity?.key, response);

    if (error) {
      setBusyId(null);
      /*
        Si la respuesta no se pudo guardar, la alerta se queda. Quitarla de la
        pantalla daría por contestado algo que el promotor nunca va a ver, y el
        asesor creería haber confirmado su asistencia.
      */
      return;
    }

    if (response === ALERT_RESPONSE.YES && alert.eventDate) {
      /*
        Prioridad máxima: lo pidió su promotor y tiene fecha. Un apunte con
        prioridad baja se pierde entre las tareas del día, que es justo lo que esta
        alerta vino a evitar.
      */
      addEvent({
        type: 'recordatorio',
        title: alert.title,
        date: alert.eventDate,
        time: (alert.eventTime || '09:00').slice(0, 5),
        priority: 'maxima',
      });
    }

    // Fuera de la lista en el mismo toque, sin esperar otra consulta.
    setAlerts((current) => current.filter((item) => item.id !== alert.id));
    setBusyId(null);
  };

  if (alerts.length === 0) return null;

  return (
    <section className="mx-auto mb-2 max-w-2xl px-4 pt-4" aria-label="Avisos de tu promotoría">
      <div className="flex flex-col gap-3">
        {alerts.map((alert) => {
          const busy = busyId === alert.id;
          const when = eventLabel(alert.eventDate, alert.eventTime);

          return (
            <article
              key={alert.id}
              /*
                Borde índigo y fondo apenas teñido. Llamativo sin gritar: esto
                aparece encima del saludo cada vez que se abre la app, así que un
                rojo de emergencia acabaría leyéndose como un error del sistema.
              */
              className="animate-rise rounded-2xl border border-indigo-500/40
                         bg-indigo-500/[0.07] p-4"
            >
              <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase
                            tracking-widest text-indigo-400"
              >
                <BellRing size={12} aria-hidden="true" />
                Aviso de tu promotoría
              </p>

              <h2 className="mt-1.5 text-base font-bold leading-snug text-white">
                {alert.title}
              </h2>

              {alert.content && (
                <p className="mt-1.5 text-xs leading-relaxed text-zinc-300">{alert.content}</p>
              )}

              {when && (
                <p className="mt-2.5 flex items-center gap-1.5 text-xs font-semibold
                              text-indigo-200"
                >
                  <CalendarClock size={13} aria-hidden="true" />
                  <span className="capitalize">{when}</span>
                </p>
              )}

              {alert.authorName && (
                <p className="mt-1 text-[11px] text-zinc-500">{alert.authorName}</p>
              )}

              {/*
                Dos botones del mismo tamaño. "Sí" lleva el color y "No" queda en
                contorno, pero ninguno es más fácil de pulsar que el otro: inclinar
                la balanza daría confirmaciones falsas, y un promotor que organiza
                una junta con asistentes que no van pierde más que uno que sabe
                cuántos faltan.
              */}
              <div className="mt-4 flex gap-2.5">
                <button
                  type="button"
                  onClick={() => answer(alert, ALERT_RESPONSE.YES)}
                  disabled={busy}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-xl
                             bg-emerald-500 px-3 py-2.5 text-xs font-bold text-zinc-950
                             shadow-lg shadow-emerald-500/20 transition-colors
                             hover:bg-emerald-400 active:scale-[0.98] disabled:cursor-wait
                             disabled:opacity-60 focus-visible:outline-none
                             focus-visible:ring-2 focus-visible:ring-emerald-300"
                >
                  {busy
                    ? <Loader2 size={13} className="animate-spin" aria-hidden="true" />
                    : <Check size={14} strokeWidth={3} aria-hidden="true" />}
                  Sí, asistiré
                </button>

                <button
                  type="button"
                  onClick={() => answer(alert, ALERT_RESPONSE.NO)}
                  disabled={busy}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-xl
                             border border-rose-500/40 px-3 py-2.5 text-xs font-bold
                             text-rose-300 transition-colors hover:bg-rose-500/10
                             active:scale-[0.98] disabled:cursor-wait disabled:opacity-60
                             focus-visible:outline-none focus-visible:ring-2
                             focus-visible:ring-rose-400"
                >
                  <X size={14} strokeWidth={3} aria-hidden="true" />
                  No podré
                </button>
              </div>

              {alert.eventDate && (
                <p className="mt-2 text-center text-[10px] leading-relaxed text-zinc-500">
                  Al confirmar se agrega a tu agenda.
                </p>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}
