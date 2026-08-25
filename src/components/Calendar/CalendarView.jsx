import { useState, useMemo } from 'react';
import { CalendarDays, Bell, Calendar as CalendarIcon } from 'lucide-react';
import { useEvents, todayKey } from '../../context/EventContext';
import { useSession } from '../../context/SessionContext';
import TaskOptionsSheet from '../Activities/TaskOptionsSheet';
import ActionableCard from '../Activities/ActionableCard';
import SwipeableCard from '../Layout/SwipeableCard';
import { getEventStatus, eventStatusStyles } from '../Activities/eventStatus';
import useNow from '../../lib/useNow';
import useAdvisorPoints from '../../lib/useAdvisorPoints';

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
 *
 * ## Por qué dibuja las tarjetas del embudo y no filas propias
 *
 * Antes esta pantalla pintaba su propia fila para TODO evento, sin importar
 * el tipo: un rectángulo con ícono, título, hora y una etiqueta de
 * prioridad, que al tocarse abría el menú genérico de `TaskOptionsSheet`.
 * Eso abría una fuga en el embudo: ese menú ofrece "Marcar como
 * Completada", así que una Cita de Propuesta o un Cobro podían cerrarse en
 * silencio desde aquí —sin pasar por su router, sin agendar la etapa
 * siguiente y sin dejar constancia de por qué—, mientras que la MISMA
 * actividad abierta desde "Hoy" obligaba a elegir una resolución. Un solo
 * evento con dos comportamientos según por dónde se abriera.
 *
 * Ahora cualquier actividad con `tipo_actividad` cede a
 * `ActionableCard.jsx`, exactamente el mismo componente que usa "Hoy": la
 * Cita de Propuesta trae su "Iniciar", el Seguimiento su "Retomar", el
 * Cobro su "Cobrado" con los cobros recurrentes. Una actividad se
 * administra igual desde donde se la encuentre, que era la intención
 * original de compartir `TaskOptionsSheet` entre las dos pantallas.
 *
 * Se conservan las filas propias para dos casos donde sí son lo correcto:
 *
 *  1. **Recordatorios y eventos viejos** (sin `tipo_actividad`): no son
 *     etapas del embudo, no tienen router al que mandarlos, y "Marcar como
 *     Completada" es justo lo que les toca — un recordatorio ya avisó.
 *  2. **Actividades ya completadas**: las tarjetas del embudo asumen una
 *     tarea viva y mostrarían sus botones de resolución para algo ya
 *     resuelto. La fila las muestra tachadas y su menú ofrece "Marcar como
 *     pendiente", que es la acción que de verdad aplica. La Agenda es la
 *     única pantalla que muestra el historial ("Hoy" filtra lo completado),
 *     así que este caso sólo existe aquí.
 */
export default function CalendarView({
  onStartSession, onOpenRequirements, onRouteToActivity,
}) {
  const { events, removeEvent } = useEvents();
  const grouped = useMemo(() => groupByDate(events), [events]);

  /*
    Los puntos que puede otorgar una tarjeta desde aquí (el feedback de una
    llamada, por ejemplo) van al mismo marcador persistido por usuario que
    usa "Hoy". Se instancia el hook aquí en vez de recibir `onEarnPoints`
    como prop: las dos pantallas nunca están montadas a la vez —`Shell`
    cambia de sección— y el hook relee el valor guardado al montar, así que
    no hay dos contadores compitiendo.
  */
  const { identity } = useSession();
  const [, addPoints] = useAdvisorPoints(identity?.key);

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
                  /*
                    Una actividad del embudo todavía viva se dibuja con su
                    tarjeta real, la misma de "Hoy": así su botón de
                    resolución (Iniciar, Retomar, Cobrado...) es el único
                    camino para cerrarla, y no se puede completar en silencio
                    desde el menú genérico. Ver la nota de arriba para el
                    porqué de las dos excepciones.
                  */
                  if (event.tipo_actividad && !event.completed) {
                    return (
                      <li key={event.id}>
                        <ActionableCard
                          event={event}
                          onEarnPoints={addPoints}
                          onStartSession={onStartSession}
                          onOpenRequirements={onOpenRequirements}
                          onRouteToActivity={onRouteToActivity}
                        />
                      </li>
                    );
                  }

                  const priority = PRIORITY_STYLES[event.priority] ?? PRIORITY_STYLES.importante;
                  const Icon = event.type === 'recordatorio' ? Bell : CalendarIcon;

                  /*
                    Misma etiqueta de tipo que ya llevan las tarjetas de
                    "Hoy" (`ActionableCard.jsx`, mismo criterio ahí
                    documentado): "Cita Inicial: Manuel Ruiz" se separa en
                    "CITA INICIAL" arriba y "Manuel Ruiz" como nombre, en
                    vez de mostrar el título completo tal cual. Un
                    recordatorio es texto libre y no sigue ese patrón, así
                    que su etiqueta es la fija "Recordatorio".
                  */
                  const isReminder = event.type === 'recordatorio';
                  let typeLabel = null;
                  let displayTitle = event.title;
                  if (isReminder) {
                    typeLabel = 'Recordatorio';
                  } else {
                    const [before, after] = String(event.title ?? '').split(/:\s*/);
                    if (after) {
                      typeLabel = before;
                      displayTitle = after;
                    }
                  }

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
                          /*
                            `dark:bg-zinc-800/40` con `backdrop-blur-sm` (40%
                            de opacidad) dejaba ver los botones de
                            Reagendar/Descartar de `SwipeableCard.jsx` por
                            detrás, incluso en reposo. Mismo tono
                            (`zinc-800`), sólo que sólido: nada de color
                            nuevo, sólo deja de ser transparente.
                          */
                          className={`flex w-full cursor-pointer items-center gap-3 rounded-xl border
                                     bg-white p-4 text-left shadow-sm
                                     transition-all active:scale-95 focus-visible:outline-none
                                     focus-visible:ring-2 focus-visible:ring-indigo-500
                                     dark:bg-zinc-800 ${tone.container}
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
                            {typeLabel && (
                              <p className="break-words text-[10px] font-bold uppercase
                                            tracking-wide text-indigo-500 dark:text-indigo-400"
                              >
                                {typeLabel}
                              </p>
                            )}
                            {/* Sin `truncate`: ver la nota de `ActionCardBase.jsx`. */}
                            <p
                              className={`break-words text-sm font-semibold text-zinc-900
                                          dark:text-white
                                          ${event.completed ? 'line-through decoration-zinc-400' : ''}`}
                            >
                              {displayTitle}
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
