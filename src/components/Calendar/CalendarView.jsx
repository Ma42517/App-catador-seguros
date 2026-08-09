import { useMemo } from 'react';
import { CalendarDays, Bell, Calendar as CalendarIcon } from 'lucide-react';
import { useEvents, todayKey } from '../../context/EventContext';

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

const COPY = {
  today: {
    title: 'Eventos',
    empty: 'Tus eventos de hoy aparecerán aquí.',
    summary: (n) => `${n} ${n === 1 ? 'evento' : 'eventos'} para hoy.`,
  },
  all: {
    title: 'Calendario',
    empty: 'Tu agenda completa aparecerá aquí.',
    summary: (n) => `${n} ${n === 1 ? 'evento' : 'eventos'} en tu agenda.`,
  },
};

/**
 * Agenda del asesor. Un mismo componente sirve a los dos destinos de la barra:
 *  - `scope="today"` → "Eventos": sólo lo de hoy, todas las prioridades.
 *  - `scope="all"`   → "Calendario": toda la agenda, agrupada por fecha.
 */
export default function CalendarView({ scope = 'all' }) {
  const { events } = useEvents();
  const copy = COPY[scope] ?? COPY.all;

  const visible = useMemo(
    () => (scope === 'today' ? events.filter((e) => e.date === todayKey()) : events),
    [events, scope],
  );
  const grouped = useMemo(() => groupByDate(visible), [visible]);

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="text-2xl font-bold tracking-tight text-zinc-900 md:text-3xl dark:text-white">
        {copy.title}
      </h1>
      <p className="mt-1 text-sm text-zinc-500">
        {visible.length === 0 ? copy.empty : copy.summary(visible.length)}
      </p>

      {visible.length === 0 ? (
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
            {scope === 'today'
              ? 'Hoy no tienes nada agendado.'
              : 'Aún no tienes eventos.'}{' '}
            Agrega el primero con el botón{' '}
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
                  return (
                    <li
                      key={event.id}
                      className="flex items-center gap-3 rounded-xl border border-zinc-200 bg-white
                                 p-4 shadow-sm dark:border-white/10 dark:bg-zinc-800/40
                                 dark:backdrop-blur-sm"
                    >
                      <span
                        className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border
                                   border-zinc-200 bg-zinc-50 text-zinc-500
                                   dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400"
                        aria-hidden="true"
                      >
                        <Icon size={16} />
                      </span>

                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-zinc-900 dark:text-white">
                          {event.title}
                        </p>
                        <p className="mt-0.5 text-xs text-zinc-500">
                          {event.time || 'Sin hora'}
                          {' · '}
                          {event.type === 'recordatorio' ? 'Recordatorio' : 'Actividad'}
                        </p>
                      </div>

                      <span
                        className={`shrink-0 rounded-full border px-2.5 py-1 text-[10px]
                                    font-semibold ${priority.chip}`}
                      >
                        {priority.label}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
