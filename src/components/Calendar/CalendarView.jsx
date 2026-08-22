import { useState, useMemo } from 'react';
import { CalendarDays, Bell, Calendar as CalendarIcon } from 'lucide-react';
import { useEvents, todayKey } from '../../context/EventContext';
import TaskOptionsSheet from '../Activities/TaskOptionsSheet';
import SwipeableCard from '../Layout/SwipeableCard';
import { getEventStatus, eventStatusStyles } from '../Activities/eventStatus';
import useNow from '../../lib/useNow';

const PRIORITY_STYLES = {
  baja: { label: 'Baja', chip: 'border-emerald-500/30 text-emerald-600 dark:text-emerald-400' },
  importante: { label: 'Importante', chip: 'border-amber-500/30 text-amber-600 dark:text-amber-400' },
  maxima: {
    label: 'Máxima',
    chip: 'border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300',
  },
};

const DAY_FORMAT = { weekday: 'long', day: 'numeric', month: 'long' };

/** Agrupa por fecha y ordena: fechas ascendentes, y por hora dentro del día. */
function groupByDate(events) {
  const groups = new Map();
  events.forEach((e) => {
    const key = e.date || 'sin-fecha';
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(e);
  });
  return [...groups.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, items]) => [
      date,
      items.slice().sort((a, b) => (a.time ?? '').localeCompare(b.time ?? '')),
    ]);
}

function formatDay(dateKey) {
  if (dateKey === 'sin-fecha') return 'Sin fecha';
  // Se construye en horario local para que no se corra un día.
  const [y, m, d] = dateKey.split('-').map(Number);
  const label = new Date(y, m - 1, d).toLocaleDateString('es-MX', DAY_FORMAT);
  return dateKey === todayKey() ? `Hoy · ${label}` : label;
}

/**
 * Agenda del asesor: todos los eventos agrupados por fecha, con el día de hoy
 * primero. Sustituye a los destinos separados de "Eventos" y "Calendario".
 */
export default function CalendarView() {
  const { events, removeEvent } = useEvents();
  const grouped = useMemo(() => groupByDate(events), [events]);

  /*
    Si "Reagendar" (del gesto de deslizar) se disparó, la hoja de opciones
    debe abrir directo en el paso de reprogramar y no en el menú
    intermedio — mismo criterio que ya usa `ActionableCard.jsx`
    (`initialReschedule`, en `TaskOptionsSheet.jsx`).
  */
  const [rescheduleOnOpen, setRescheduleOnOpen] = useState(false);

  /*
    Un solo reloj para toda la agenda. Si cada fila llevara el suyo, una lista
    de cincuenta eventos montaría cincuenta temporizadores para leer la misma
    hora.
  */
  const now = useNow();

  /*
    Un solo panel para toda la lista, no uno por fila: con una agenda de decenas
    de eventos, montar una hoja por tarjeta sería trabajo inútil.
  */
  const [selectedId, setSelectedId] = useState(null);
  const setSelected = (event, { reschedule = false } = {}) => {
    setRescheduleOnOpen(reschedule);
    setSelectedId(event.id);
  };
  // Se busca por id en cada render para que el panel refleje el evento ya
  // actualizado tras reprogramarlo o completarlo.
  const selected = events.find((e) => e.id === selectedId) ?? null;

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="text-2xl font-bold tracking-tight text-zinc-900 md:text-3xl dark:text-white">
        Agenda
      </h1>
      <p className="mt-1 text-sm text-zinc-500">
        {events.length === 0
          ? 'Tu agenda aparecerá aquí.'
          : `${events.length} ${events.length === 1 ? 'evento' : 'eventos'} en tu agenda.`}
      </p>

      {events.length === 0 ? (
        <div className="mt-10 text-center">
          <span
            className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-xl border
                       border-zinc-200 bg-white text-zinc-400
                       dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-500"
            aria-hidden="true"
          >
            <CalendarDays size={22} />
          </span>
          <p className="text-sm text-zinc-500">
            Aún no tienes eventos. Agrega el primero con el botón{' '}
            <span className="font-semibold text-zinc-700 dark:text-zinc-300">+</span>.
          </p>
        </div>
      ) : (
        <div className="mt-8 flex flex-col gap-8">
          {grouped.map(([date, items]) => (
            <section key={date}>
              <h2 className="mb-3 text-[11px] font-bold uppercase tracking-widest text-indigo-400">
                {formatDay(date)}
              </h2>

              <ul className="flex flex-col gap-2">
                {items.map((event) => {
                  const priority = PRIORITY_STYLES[event.priority] ?? PRIORITY_STYLES.importante;
                  const Icon = event.type === 'recordatorio' ? Bell : CalendarIcon;
                  const status = getEventStatus(event.time, {
                    date: event.date,
                    completed: event.completed,
                    now,
                  });
                  const tone = eventStatusStyles(status);

                  return (
                    <li key={event.id}>
                      {/*
                        Esta agenda es la lista completa de eventos —a
                        diferencia de "Hoy" (`AISequence.jsx`), que sólo
                        muestra los de prioridad máxima del día—, así que es
                        el lugar donde se ve *todo*: mismo gesto de deslizar
                        que ya tienen las tarjetas de "Hoy"
                        (`ActionableCard.jsx`), para que "Reagendar" y
                        "Descartar" funcionen sin importar desde qué pantalla
                        se esté viendo la actividad.
                      */}
                      <SwipeableCard
                        onReschedule={() => setSelected(event, { reschedule: true })}
                        onDiscard={() => removeEvent(event.id)}
                      >
                        <button
                          type="button"
                          onClick={() => setSelected(event)}
                          className={`flex w-full cursor-pointer items-center gap-3 rounded-xl border
                                     bg-white p-4 text-left shadow-sm
                                     transition-all active:scale-95 focus-visible:outline-none
                                     focus-visible:ring-2 focus-visible:ring-indigo-500
                                     dark:bg-zinc-800/40 dark:backdrop-blur-sm ${tone.container}
                                     ${event.completed ? 'opacity-50' : ''}`}
                        >
                          <span
                            className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg border
                                        border-zinc-200 bg-zinc-50
                                        dark:border-zinc-700 dark:bg-zinc-900 ${tone.icon}`}
                            aria-hidden="true"
                          >
                            <Icon size={16} />
                          </span>

                          <div className="min-w-0 flex-1">
                            <p
                              className={`truncate text-sm font-semibold text-zinc-900
                                          dark:text-white
                                          ${event.completed ? 'line-through decoration-zinc-400' : ''}`}
                            >
                              {event.title}
                            </p>
                            <p className="mt-0.5 flex items-center gap-1.5 text-xs text-zinc-500">
                              {/* El punto va pegado a la hora, que es el dato vencido. */}
                              {tone.showDot && (
                                <span
                                  className="h-2 w-2 shrink-0 rounded-full bg-rose-500
                                             dark:bg-rose-400"
                                  aria-hidden="true"
                                />
                              )}
                              <span className={tone.time}>{event.time || 'Sin hora'}</span>
                              <span aria-hidden="true">·</span>
                              <span>
                                {event.type === 'recordatorio' ? 'Recordatorio' : 'Actividad'}
                              </span>
                            </p>
                          </div>

                          <span
                            className={`shrink-0 rounded-full border px-2.5 py-1 text-[10px]
                                        font-semibold ${priority.chip}`}
                          >
                            {priority.label}
                          </span>

                          {/* El estado se nombra, no sólo se pinta. */}
                          {tone.label && <span className="sr-only">{tone.label}</span>}
                        </button>
                      </SwipeableCard>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      )}

      <TaskOptionsSheet
        event={selected}
        isOpen={Boolean(selected)}
        onClose={() => setSelectedId(null)}
        initialReschedule={rescheduleOnOpen}
      />
    </div>
  );
}
