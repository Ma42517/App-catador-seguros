import { useState, useEffect, useCallback } from 'react';
import { BellRing, Check, X, Loader2 } from 'lucide-react';
import { useSession } from '../../context/SessionContext';
import { useEvents } from '../../context/EventContext';
import {
  fetchPendingAlerts, respondToAlert, ALERT_RESPONSE,
} from '../../data/alertsRepo';
import { isAlertActive } from '../../lib/alertExpiry';
import useNow from '../../lib/useNow';

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
  const { identity, promotorId, isPromoterOwner } = useSession();
  const { addEvent } = useEvents();

  const [alerts, setAlerts] = useState([]);
  const [busyId, setBusyId] = useState(null);

  /*
    El reloj de `useNow` es lo que hace que un aviso desaparezca solo al
    cruzar las 4:00 AM del día siguiente, sin que nadie tenga que refrescar
    la pantalla. El mismo hook ya lo usa `ActionableCard.jsx` para el estado
    vencido/próximo de las citas, así que no es un segundo temporizador
    corriendo por separado en esta pantalla.
  */
  const now = useNow();

  /*
    De qué muro se leen los avisos.

    El asesor y el asistente lo tienen en su ficha (`promotor_id` apunta al
    titular). El titular no: su ficha no apunta a nadie porque la promotoría es
    suya, así que su muro es su propio id. Es el mismo `coalesce(promotor_id, id)`
    que usa la base en `my_wall()`, resuelto aquí.

    Sin esta línea el titular no recibía nada: la consulta salía con un
    `promotor_id` vacío y se cortaba antes de preguntar. Publicaba una junta y en su
    propia pantalla de inicio no aparecía, lo que hacía dudar de si el aviso había
    salido siquiera. Ahora la reciben los tres, que es lo que se pidió: al titular y
    a sus asistentes también les toca ir a la junta.

    El asesor sin promotoría se queda fuera a propósito: cae en el `else` y no se
    consulta nada, en lugar de preguntar por su propio id y esperar cero filas.
  */
  const wallId = promotorId || (isPromoterOwner ? identity?.key : '');

  const load = useCallback(async () => {
    const { alerts: found } = await fetchPendingAlerts(wallId, identity?.key);
    setAlerts(found);
  }, [wallId, identity?.key]);

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

  /*
    Filtro de caducidad: un aviso con fecha de evento sigue vigente hasta las
    4:00 AM del día siguiente a esa fecha, no hasta la medianoche de su
    propio día — ver `alertExpiry.js` para el porqué del margen. Los avisos
    sin `eventDate` no entran en esta regla y siguen visibles hasta que se
    contestan, como antes.
  */
  const activeAlerts = alerts.filter((alert) => isAlertActive(alert.eventDate, now));

  if (activeAlerts.length === 0) return null;

  return (
    <section className="mt-6 flex flex-col gap-2" aria-label="Avisos de tu promotoría">
      {activeAlerts.map((alert) => {
        const busy = busyId === alert.id;
        const when = eventLabel(alert.eventDate, alert.eventTime);

        return (
          <article
            key={alert.id}
            /*
              Tarjeta delgada, del mismo lenguaje que la agenda: fondo oscuro,
              esquinas redondeadas, nada de cartel.

              Lo que la distingue ahora es el resplandor rojo, y sólo eso. Antes
              llevaba además un filo índigo a la izquierda: dos señales para decir
              lo mismo, y el filo cortaba la tarjeta en dos justo donde empieza a
              leerse. El halo rodea la tarjeta completa, así que la marca sin
              partirla.

              El borde propio se va con él: el resplandor ya dibuja su contorno con
              el primer valor de la sombra, y sumarle un borde gris dejaba una línea
              apagada por dentro del brillo.
            */
            className="animate-rise animate-alert-glow flex items-center gap-3 rounded-xl
                       bg-white p-3 dark:bg-zinc-900"
          >
            <div className="min-w-0 flex-1">
              {/*
                "Aviso" y no "Confirma tu asistencia": por aquí van a pasar juntas,
                cambios de sede, documentos que entregar y recordatorios de pago.
                Un rótulo que habla de asistencia contradice al aviso en cuanto el
                promotor manda cualquier otra cosa, y el asesor deja de creerle al
                rótulo.
              */}
              <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase
                            tracking-wider text-rose-500 dark:text-rose-400"
              >
                <BellRing size={10} aria-hidden="true" />
                Aviso
              </p>

              <p className="mt-0.5 truncate text-sm font-semibold text-zinc-900 dark:text-white">
                {alert.title}
              </p>

              {when && (
                <p className="mt-0.5 text-[11px] capitalize text-zinc-500">{when}</p>
              )}
            </div>

            {/*
              "Sí" y "No", nada más. Decían "Sí asistiré" y "No podré", que sólo
              tienen sentido si el aviso es una invitación; con un cambio de sede o
              un pago pendiente la respuesta no es sobre asistir a nada. La palomita
              y la tacha ya dicen de qué lado está cada botón, y en dos letras caben
              lado a lado sin robarle línea al título.

              Se distinguen por el color y no por el tamaño: un "Sí" más grande daría
              confirmaciones por inercia, y un promotor con asistentes que no llegan
              pierde más que uno que sabe cuántos faltan.
            */}
            <div className="flex shrink-0 gap-1.5">
              <button
                type="button"
                onClick={() => answer(alert, ALERT_RESPONSE.YES)}
                disabled={busy}
                /*
                  Dos letras alcanzan en pantalla porque el título está al lado, pero
                  un lector de pantalla anuncia los botones sueltos: con tres avisos
                  en la lista se oirían tres "Sí" idénticos. El título va en la
                  etiqueta para que cada uno diga a qué contesta.
                */
                aria-label={`Sí: ${alert.title}`}
                className="flex items-center justify-center gap-1 rounded-lg bg-emerald-500/15
                           px-3 py-1 text-xs font-semibold text-emerald-600 transition-colors
                           hover:bg-emerald-500/25 active:scale-95 disabled:cursor-wait
                           disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2
                           focus-visible:ring-emerald-400 dark:text-emerald-300"
              >
                {busy
                  ? <Loader2 size={11} className="animate-spin" aria-hidden="true" />
                  : <Check size={12} strokeWidth={3} aria-hidden="true" />}
                Sí
              </button>

              <button
                type="button"
                onClick={() => answer(alert, ALERT_RESPONSE.NO)}
                disabled={busy}
                aria-label={`No: ${alert.title}`}
                className="flex items-center justify-center gap-1 rounded-lg px-3 py-1 text-xs
                           font-semibold text-zinc-500 transition-colors hover:bg-rose-500/10
                           hover:text-rose-500 active:scale-95 disabled:cursor-wait
                           disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2
                           focus-visible:ring-rose-400"
              >
                <X size={12} strokeWidth={3} aria-hidden="true" />
                No
              </button>
            </div>
          </article>
        );
      })}
    </section>
  );
}
