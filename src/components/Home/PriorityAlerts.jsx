import { useState, useEffect, useCallback } from 'react';
import { BellRing, Check, X, Loader2 } from 'lucide-react';
import { useSession } from '../../context/SessionContext';
import { useEvents } from '../../context/EventContext';
import {
  fetchPendingAlerts, respondToAlert, ALERT_RESPONSE,
} from '../../data/alertsRepo';

/** Fecha y hora del evento, en una línea corta. */
function eventLabel(date, time) {
  if (!date) return '';

  /*
    Se construye con la fecha partida a mano en lugar de `new Date('2026-08-15')`.
    Ese formato se interpreta como UTC, así que en México se veía el día anterior:
    una junta del 15 aparecía como 14 y el asesor llegaba un día tarde.
  */
  const [year, month, day] = date.split('-').map(Number);
  const when = new Date(year, (month ?? 1) - 1, day ?? 1);

  const formatted = when.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' });
  return time ? `${formatted} · ${time.slice(0, 5)}` : formatted;
}

/**
 * Avisos de la promotoría que esperan confirmación, en la pantalla de inicio.
 *
 * Van **debajo** del saludo y no encima, como primer elemento de lo que hay que
 * atender hoy. Encima del saludo interrumpían la entrada a la app cada vez que se
 * abría; aquí siguen siendo lo primero de la lista sin desplazar la bienvenida.
 *
 * Y con la forma de un evento de agenda a propósito: es lo que va a ser en cuanto
 * se confirme. Una tarjeta grande y distinta le daba el aspecto de anuncio, y un
 * anuncio se aprende a ignorar.
 *
 * No se van hasta que el asesor contesta, y ahí está su valor: un aviso que se
 * puede descartar no sirve para confirmar asistencia a una junta.
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
        Si la respuesta no se pudo guardar, el aviso se queda. Quitarlo daría por
        contestado algo que el promotor nunca va a ver, y el asesor creería haber
        confirmado su asistencia.
      */
      return;
    }

    if (response === ALERT_RESPONSE.YES && alert.eventDate) {
      /*
        Prioridad máxima: lo pidió su promotor y tiene fecha. Un apunte de prioridad
        baja se pierde entre las tareas del día, que es justo lo que este aviso vino
        a evitar.
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
    <section className="mt-6 flex flex-col gap-2" aria-label="Avisos de tu promotoría">
      {alerts.map((alert) => {
        const busy = busyId === alert.id;
        const when = eventLabel(alert.eventDate, alert.eventTime);

        return (
          <article
            key={alert.id}
            /*
              Tarjeta delgada, del mismo lenguaje que la agenda: fondo oscuro, borde
              sutil, esquinas redondeadas. Lo único que la distingue es el filo
              índigo de la izquierda, que basta para que se lea como algo que viene
              de fuera sin convertirla en un cartel.
            */
            className="animate-rise flex items-center gap-3 rounded-xl border border-zinc-200
                       border-l-[3px] border-l-indigo-500 bg-white p-3
                       dark:border-zinc-800 dark:border-l-indigo-500 dark:bg-zinc-900"
          >
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase
                            tracking-wider text-indigo-500 dark:text-indigo-400"
              >
                <BellRing size={10} aria-hidden="true" />
                Confirma tu asistencia
              </p>

              <p className="mt-0.5 truncate text-sm font-semibold text-zinc-900 dark:text-white">
                {alert.title}
              </p>

              {when && (
                <p className="mt-0.5 text-[11px] capitalize text-zinc-500">{when}</p>
              )}
            </div>

            {/*
              Botones pequeños y a la derecha, apilados en pantallas estrechas. Se
              distinguen por el color y no por el tamaño: un "Sí" más grande daría
              confirmaciones por inercia, y un promotor con asistentes que no llegan
              pierde más que uno que sabe cuántos faltan.
            */}
            <div className="flex shrink-0 flex-col gap-1.5 sm:flex-row">
              <button
                type="button"
                onClick={() => answer(alert, ALERT_RESPONSE.YES)}
                disabled={busy}
                className="flex items-center justify-center gap-1 rounded-lg bg-emerald-500/15
                           px-3 py-1 text-xs font-semibold text-emerald-600 transition-colors
                           hover:bg-emerald-500/25 active:scale-95 disabled:cursor-wait
                           disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2
                           focus-visible:ring-emerald-400 dark:text-emerald-300"
              >
                {busy
                  ? <Loader2 size={11} className="animate-spin" aria-hidden="true" />
                  : <Check size={12} strokeWidth={3} aria-hidden="true" />}
                Sí asistiré
              </button>

              <button
                type="button"
                onClick={() => answer(alert, ALERT_RESPONSE.NO)}
                disabled={busy}
                className="flex items-center justify-center gap-1 rounded-lg px-3 py-1 text-xs
                           font-semibold text-zinc-500 transition-colors hover:bg-rose-500/10
                           hover:text-rose-500 active:scale-95 disabled:cursor-wait
                           disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2
                           focus-visible:ring-rose-400"
              >
                <X size={12} strokeWidth={3} aria-hidden="true" />
                No podré
              </button>
            </div>
          </article>
        );
      })}
    </section>
  );
}
