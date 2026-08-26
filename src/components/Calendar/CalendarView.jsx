import { useState, useMemo, useRef, useEffect } from 'react';
import { CalendarDays, Clock, Bell } from 'lucide-react';
import { useEvents, todayKey } from '../../context/EventContext';
import { useSession } from '../../context/SessionContext';
import BottomSheet from '../Layout/BottomSheet';
import ActionableCard from '../Activities/ActionableCard';
import useNow from '../../lib/useNow';
import useAdvisorPoints from '../../lib/useAdvisorPoints';

/** Alto de una hora del lienzo, en píxeles. Es la escala de todo el timeline. */
const HOUR_HEIGHT = 64;

/*
  Ventana horaria por omisión. No es un recorte duro: si el día tiene algo
  antes de las 7 o después de las 23, el rango se estira para incluirlo (ver
  `hourRange`). Un evento que no se ve es un evento perdido, y esta pantalla es
  el inventario completo de la agenda.
*/
const DEFAULT_START_HOUR = 7;
const DEFAULT_END_HOUR = 23;

/** Alto mínimo de un bloque: por debajo de esto no se puede tocar con el pulgar. */
const MIN_BLOCK_HEIGHT = 34;

/*
  Duración por tipo, en minutos. Los eventos sólo guardan hora de inicio
  (`ActivityForm.jsx` nunca pidió duración), así que el timeline necesita un
  supuesto para dibujar el alto del bloque. Se distingue por tipo porque
  suponer una hora para una llamada de cinco minutos llenaría el día de
  bloques falsos.
*/
const DEFAULT_DURATION = 30;
const DURATION_BY_TYPE = {
  cita: 60,
  cita_inicial: 60,
  cita_propuesta: 60,
  cita_cierre: 60,
  entrega_poliza: 45,
};

/*
  Filo de color por tipo de actividad. Son los mismos colores con que cada
  etapa ya se identifica en el resto de la app —el verde de WhatsApp para la
  llamada, el índigo del embudo para las citas, el ámbar del seguimiento— para
  que el bloque del timeline y su tarjeta se reconozcan como la misma cosa.
*/
const ACCENT_BY_TYPE = {
  llamada: 'border-l-emerald-500',
  cita: 'border-l-sky-500',
  cita_inicial: 'border-l-indigo-500',
  cita_propuesta: 'border-l-violet-500',
  cita_cierre: 'border-l-fuchsia-500',
  recordatorio_emision: 'border-l-sky-500',
  entrega_poliza: 'border-l-teal-500',
  cobro: 'border-l-emerald-500',
  seguimiento: 'border-l-amber-500',
};
const DEFAULT_ACCENT = 'border-l-neutral-600';

/** Minutos desde medianoche de un `"HH:MM"`, o `null` si no hay hora válida. */
function minutesOf(time) {
  const match = /^(\d{1,2}):(\d{2})$/.exec(String(time ?? '').trim());
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return null;
  return hours * 60 + minutes;
}

/** Etiqueta de 12 horas con meridiano, como pide el diseño ("08:00 AM"). */
function hourLabel(hour) {
  const suffix = hour < 12 ? 'AM' : 'PM';
  const base = hour % 12 === 0 ? 12 : hour % 12;
  return `${String(base).padStart(2, '0')}:00 ${suffix}`;
}

/** Fecha en `"YYYY-MM-DD"` a partir de un `Date`. */
function keyOf(date) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/**
 * `Date` local a partir de `"YYYY-MM-DD"`.
 *
 * Se descompone a mano en lugar de pasar el texto a `new Date()`: ese
 * constructor interpreta `"2026-08-25"` como UTC y en México devolvería el día
 * anterior — misma precaución ya documentada en `eventStatus.js`.
 */
function dateOf(key) {
  const parts = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(key ?? ''));
  if (!parts) return new Date();
  return new Date(Number(parts[1]), Number(parts[2]) - 1, Number(parts[3]));
}

function addDays(date, days) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

/**
 * Reparte en columnas los eventos que se empalman.
 *
 * Primero agrupa en racimos —tramos de eventos que se solapan en cadena— y
 * dentro de cada racimo asigna a cada uno la primera columna que ya quedó
 * libre. El ancho de los bloques se divide entre las columnas del racimo, no
 * entre las del día: dos citas empalmadas a las 9 no deben adelgazar los
 * bloques de la tarde.
 */
function assignColumns(items) {
  const sorted = [...items].sort((a, b) => a.start - b.start || a.end - b.end);
  const placed = [];

  let cluster = [];
  let clusterEnd = -Infinity;

  const flush = () => {
    if (!cluster.length) return;
    const columnEnds = [];
    const positions = cluster.map((item) => {
      let column = columnEnds.findIndex((end) => end <= item.start);
      if (column === -1) {
        columnEnds.push(item.end);
        column = columnEnds.length - 1;
      } else {
        columnEnds[column] = item.end;
      }
      return { ...item, column };
    });
    positions.forEach((item) => placed.push({ ...item, columns: columnEnds.length }));
    cluster = [];
    clusterEnd = -Infinity;
  };

  sorted.forEach((item) => {
    if (cluster.length && item.start >= clusterEnd) flush();
    cluster.push(item);
    clusterEnd = Math.max(clusterEnd, item.end);
  });
  flush();

  return placed;
}

/**
 * Tira horizontal de días.
 *
 * Cubre todo el rango en el que hay algo agendado —no una semana fija— para
 * que ninguna actividad quede fuera de alcance: con siete días, una cita del
 * mes que viene sería invisible y no habría forma de llegar a ella.
 *
 * El punto bajo el número avisa que ese día tiene actividades, y es lo que
 * permite recorrer la tira buscando dónde hay trabajo sin abrir día por día.
 */
function DayStrip({ days, selectedKey, countByDate, onSelect }) {
  const scrollRef = useRef(null);
  const selectedRef = useRef(null);

  // El día elegido se centra solo: al abrir la pantalla en un rango de dos
  // meses, "hoy" podría quedar fuera de la vista inicial de la tira.
  useEffect(() => {
    selectedRef.current?.scrollIntoView({ block: 'nearest', inline: 'center' });
  }, [selectedKey]);

  return (
    <div
      ref={scrollRef}
      className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none]
                 [&::-webkit-scrollbar]:hidden"
    >
      {days.map(({ key, weekday, dayNumber, isToday }) => {
        const isSelected = key === selectedKey;
        const count = countByDate.get(key) ?? 0;

        return (
          <button
            key={key}
            ref={isSelected ? selectedRef : undefined}
            type="button"
            onClick={() => onSelect(key)}
            aria-current={isSelected ? 'date' : undefined}
            aria-label={`${weekday} ${dayNumber}${count > 0 ? `, ${count} actividades` : ''}`}
            className={`flex w-12 shrink-0 flex-col items-center gap-1 rounded-xl py-2
                        transition-colors focus-visible:outline-none focus-visible:ring-2
                        focus-visible:ring-indigo-400
                        ${isSelected
              ? 'bg-indigo-600 text-white'
              : 'text-neutral-400 hover:bg-neutral-900'}`}
          >
            <span className="text-[10px] font-semibold uppercase leading-none">
              {weekday}
            </span>
            <span className="text-sm font-bold leading-none tabular-nums">
              {dayNumber}
            </span>

            {/*
              El punto siempre ocupa su sitio, aunque no haya nada: si
              apareciera y desapareciera, los números de la tira bailarían
              media línea al cambiar de día.
            */}
            <span
              className={`h-1 w-1 rounded-full ${count > 0
                ? (isSelected ? 'bg-white' : 'bg-indigo-400')
                : 'bg-transparent'}`}
              aria-hidden="true"
            />

            {/*
              El día de hoy se marca aunque esté seleccionado otro: sin esta
              pista, al navegar tres días adelante se pierde la referencia de
              dónde está el presente.
            */}
            {isToday && !isSelected && (
              <span className="sr-only">Hoy</span>
            )}
          </button>
        );
      })}
    </div>
  );
}

/**
 * Bloque de un evento sobre el lienzo.
 *
 * Es una vista compacta a propósito, no la tarjeta completa del embudo: un
 * bloque de 30 minutos mide 32px de alto y una tarjeta con sus botones de
 * acción mide cerca de 90px — no caben. Tocarlo abre la tarjeta de verdad en
 * una hoja (ver `CalendarView`), así que ninguna acción del embudo se pierde
 * por venir desde aquí.
 */
function EventBlock({ item, startHour, onOpen }) {
  const { event, start, end, column, columns } = item;

  const top = ((start - startHour * 60) / 60) * HOUR_HEIGHT;
  const height = Math.max(MIN_BLOCK_HEIGHT, ((end - start) / 60) * HOUR_HEIGHT);
  const width = 100 / columns;

  const accent = ACCENT_BY_TYPE[event.tipo_actividad] ?? DEFAULT_ACCENT;
  const isDone = Boolean(event.completed);

  /*
    El título ya viene como `"Etiqueta: Nombre"` de `ActivityForm.jsx`. En un
    bloque estrecho se muestra sólo el nombre y el tipo se comunica con el
    filo de color, que no gasta ancho.
  */
  const [, afterColon] = String(event.title ?? '').split(/:\s*/);
  const compactTitle = afterColon || event.title;

  return (
    <button
      type="button"
      onClick={() => onOpen(event)}
      style={{
        top,
        height,
        left: `${column * width}%`,
        width: `calc(${width}% - 4px)`,
      }}
      className={`absolute overflow-hidden rounded-lg border border-neutral-800/80
                  border-l-[3px] bg-neutral-900/90 px-2 py-1 text-left backdrop-blur-sm
                  transition-colors hover:bg-neutral-800/90 focus-visible:outline-none
                  focus-visible:ring-2 focus-visible:ring-indigo-400
                  ${accent} ${isDone ? 'opacity-50' : ''}`}
    >
      <span
        className={`block truncate text-[11px] font-semibold leading-tight text-neutral-100
                    ${isDone ? 'line-through decoration-neutral-500' : ''}`}
      >
        {compactTitle}
      </span>
      {/*
        La hora sólo cabe si el bloque pasa de los 44px; por debajo se
        omitiría a medias y dejaría media línea cortada.
      */}
      {height >= 44 && (
        <span className="mt-0.5 block truncate text-[10px] leading-none text-neutral-500">
          {event.time}
        </span>
      )}
    </button>
  );
}

/**
 * Agenda del asesor como línea de tiempo diaria.
 *
 * ## Qué cambió respecto a la lista
 *
 * Antes era una lista de todos los eventos agrupados por fecha. Ahora es un
 * día a la vez sobre un lienzo de horas, con una tira superior para navegar.
 * Se gana la lectura de la jornada —los huecos libres, los empalmes, cuánto
 * falta para lo siguiente— que una lista no puede dar: dos citas a la misma
 * hora se veían como dos filas consecutivas, indistinguibles de dos citas
 * separadas por cuatro horas.
 *
 * ## Lo que se cuidó de no perder
 *
 *  - **Ninguna actividad se esconde.** La tira cubre todo el rango con
 *    eventos, no una semana fija, y marca con un punto los días que tienen
 *    algo. El lienzo estira su ventana horaria si el día empieza antes de las
 *    7 o termina después de las 23.
 *  - **Los eventos sin hora siguen existiendo.** No caben en un timeline, así
 *    que van en su propia lista debajo. Sin ella desaparecerían de la vista.
 *  - **Las acciones del embudo siguen completas.** El bloque del lienzo es
 *    compacto porque no hay espacio para una tarjeta con botones, pero al
 *    tocarlo se abre la tarjeta real (`ActionableCard.jsx`) en una hoja. Eso
 *    es lo que evita reabrir la fuga que se cerró antes: si el bloque
 *    ofreciera un simple "completar", una Cita de Propuesta podría cerrarse
 *    sin pasar por su router ni agendar la etapa siguiente.
 *
 * La hoja usa `z-[55]`, por debajo del `z-[60]` de `BottomSheet` y del
 * `z-[90]` de los modales de resolución: así el menú de opciones y los
 * routers que la propia tarjeta abre quedan por encima de ella y no atrapados
 * detrás.
 */
export default function CalendarView({
  onStartSession, onOpenRequirements, onRouteToActivity,
}) {
  const { events } = useEvents();
  const { identity } = useSession();
  const [, addPoints] = useAdvisorPoints(identity?.key);

  const [selectedKey, setSelectedKey] = useState(todayKey);
  const [openEventId, setOpenEventId] = useState(null);

  /*
    Reloj vivo para la línea de la hora actual. El mismo hook que ya usan
    `PriorityAlerts.jsx` y `ActionableCard.jsx`: sin él la línea se quedaría
    clavada donde estaba al abrir la pantalla.
  */
  const now = useNow();

  /** Cuántas actividades tiene cada día, para los puntos de la tira. */
  const countByDate = useMemo(() => {
    const counts = new Map();
    events.forEach((event) => {
      if (!event.date) return;
      counts.set(event.date, (counts.get(event.date) ?? 0) + 1);
    });
    return counts;
  }, [events]);

  /*
    Rango de la tira: de tres días antes del primer evento a tres después del
    último, incluyendo siempre hoy. Así cualquier actividad es alcanzable
    —incluida una del mes que viene— sin dejar la tira infinita.
  */
  const days = useMemo(() => {
    const keys = [...countByDate.keys()].filter(Boolean);
    const today = todayKey();
    const sorted = [...keys, today].sort();
    const first = addDays(dateOf(sorted[0]), -3);
    const last = addDays(dateOf(sorted[sorted.length - 1]), 3);

    const list = [];
    for (let d = first; d <= last; d = addDays(d, 1)) {
      const key = keyOf(d);
      list.push({
        key,
        weekday: d.toLocaleDateString('es-MX', { weekday: 'short' }).replace('.', ''),
        dayNumber: d.getDate(),
        isToday: key === today,
      });
    }
    return list;
  }, [countByDate]);

  /** Eventos del día elegido, separados por si tienen hora o no. */
  const { timed, untimed } = useMemo(() => {
    /*
      Los eventos sin fecha se enganchan al día de hoy. La lista anterior los
      agrupaba bajo un apartado "Sin fecha"; en una vista de un día a la vez no
      hay dónde ponerlos, y filtrar por fecha a secas los habría dejado sin
      ningún día que los muestre — invisibles para siempre, que es peor que
      mostrarlos en el día equivocado. Son datos viejos: `ActivityForm.jsx`
      siempre escribe fecha, con hoy como respaldo.
    */
    const isToday = selectedKey === todayKey();
    const ofDay = events.filter((event) => (
      event.date === selectedKey || (!event.date && isToday)
    ));
    const withTime = [];
    const without = [];

    ofDay.forEach((event) => {
      const start = minutesOf(event.time);
      if (start === null) {
        without.push(event);
        return;
      }
      const duration = DURATION_BY_TYPE[event.tipo_actividad] ?? DEFAULT_DURATION;
      withTime.push({ event, start, end: Math.min(24 * 60, start + duration) });
    });

    return { timed: assignColumns(withTime), untimed: without };
  }, [events, selectedKey]);

  /*
    Ventana horaria del día: la de por omisión, estirada si hace falta para
    que el evento más temprano y el más tardío queden dentro.
  */
  const [startHour, endHour] = useMemo(() => {
    if (!timed.length) return [DEFAULT_START_HOUR, DEFAULT_END_HOUR];
    const earliest = Math.min(...timed.map((item) => item.start));
    const latest = Math.max(...timed.map((item) => item.end));
    return [
      Math.min(DEFAULT_START_HOUR, Math.floor(earliest / 60)),
      Math.max(DEFAULT_END_HOUR, Math.ceil(latest / 60)),
    ];
  }, [timed]);

  const hours = useMemo(() => {
    const list = [];
    for (let h = startHour; h <= endHour; h += 1) list.push(h);
    return list;
  }, [startHour, endHour]);

  const isViewingToday = selectedKey === todayKey();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const showNowLine = isViewingToday
    && nowMinutes >= startHour * 60 && nowMinutes <= endHour * 60;
  const nowTop = ((nowMinutes - startHour * 60) / 60) * HOUR_HEIGHT;

  const nowLineRef = useRef(null);
  // Al abrir el día de hoy, la vista arranca donde está el presente en vez de
  // a las 7 de la mañana.
  useEffect(() => {
    if (showNowLine) nowLineRef.current?.scrollIntoView({ block: 'center' });
    // Sólo al cambiar de día: reencuadrar en cada tic del reloj secuestraría
    // el scroll mientras la persona está mirando otra hora.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedKey]);

  const openEvent = events.find((event) => event.id === openEventId) ?? null;
  const monthLabel = dateOf(selectedKey)
    .toLocaleDateString('es-MX', { month: 'long', year: 'numeric' });

  return (
    <div className="mx-auto max-w-2xl px-4 pb-8">
      {/*
        Cabecera fija: el mes y la tira de días quedan a la vista mientras se
        recorre el lienzo, que puede medir más de mil píxeles de alto. Fondo
        negro sólido para que los bloques no se transparenten por detrás.
      */}
      <header className="sticky top-0 z-20 -mx-4 bg-black px-4 pb-3 pt-6">
        <div className="mb-3 flex items-baseline justify-between gap-3">
          <h1 className="text-2xl font-bold capitalize tracking-tight text-white">
            {monthLabel}
          </h1>
          {!isViewingToday && (
            <button
              type="button"
              onClick={() => setSelectedKey(todayKey())}
              className="shrink-0 rounded-full border border-neutral-800 px-3 py-1 text-[11px]
                         font-semibold text-neutral-400 transition-colors
                         hover:border-indigo-500/40 hover:text-indigo-300"
            >
              Ir a hoy
            </button>
          )}
        </div>

        <DayStrip
          days={days}
          selectedKey={selectedKey}
          countByDate={countByDate}
          onSelect={setSelectedKey}
        />
      </header>

      {/* ── Lienzo de horas ── */}
      <div className="relative mt-4 flex">
        {/* Columna de horas */}
        <div className="w-16 shrink-0">
          {hours.map((hour) => (
            <div key={hour} style={{ height: HOUR_HEIGHT }} className="relative">
              <span className="absolute -top-1.5 left-0 text-xs tabular-nums text-neutral-500">
                {hourLabel(hour)}
              </span>
            </div>
          ))}
        </div>

        {/*
          Área de eventos. `relative` es el marco de referencia de los bloques,
          que se posicionan en absoluto: su `top` sale de la hora de inicio y su
          alto de la duración, así que la posición vertical *es* el dato.
        */}
        <div className="relative flex-1">
          {hours.map((hour) => (
            <div
              key={hour}
              style={{ height: HOUR_HEIGHT }}
              className="border-t border-neutral-800/40"
              aria-hidden="true"
            />
          ))}

          {timed.map((item) => (
            <EventBlock
              key={item.event.id}
              item={item}
              startHour={startHour}
              onOpen={(event) => setOpenEventId(event.id)}
            />
          ))}

          {/* ── Línea de la hora actual ── */}
          {showNowLine && (
            <div
              ref={nowLineRef}
              style={{ top: nowTop }}
              className="pointer-events-none absolute -left-1 right-0 z-10 flex items-center"
              aria-hidden="true"
            >
              <span className="h-2 w-2 shrink-0 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.8)]" />
              <span className="h-px flex-1 bg-indigo-500/70" />
            </div>
          )}
        </div>
      </div>

      {/* Día sin nada agendado */}
      {timed.length === 0 && untimed.length === 0 && (
        <div className="mt-6 rounded-2xl border border-neutral-800/60 bg-neutral-900/40 p-6
                        text-center"
        >
          <span
            className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-xl border
                       border-neutral-800 bg-neutral-900 text-neutral-500"
            aria-hidden="true"
          >
            <CalendarDays size={22} />
          </span>
          <p className="text-sm font-semibold text-neutral-200">Día libre</p>
          <p className="mx-auto mt-1 max-w-xs text-xs leading-relaxed text-neutral-500">
            No tienes nada agendado. Agrega una actividad con el botón{' '}
            <span className="font-semibold text-neutral-300">+</span>.
          </p>
        </div>
      )}

      {/*
        ── Sin hora ──

        Un evento sin hora no tiene dónde ir en un timeline, pero tampoco debe
        desaparecer: se lista aparte, debajo del lienzo. Es sobre todo el caso
        de los recordatorios y de las actividades viejas.
      */}
      {untimed.length > 0 && (
        <section className="mt-6">
          <h2 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase
                         tracking-wider text-neutral-500"
          >
            <Clock size={12} aria-hidden="true" />
            Sin hora
          </h2>
          <ul className="divide-y divide-neutral-800/50 overflow-hidden rounded-2xl border
                         border-neutral-800/60 bg-neutral-900/40"
          >
            {untimed.map((event) => (
              <li key={event.id}>
                <button
                  type="button"
                  onClick={() => setOpenEventId(event.id)}
                  className="flex w-full items-center gap-3 px-4 py-3 text-left
                             transition-colors hover:bg-neutral-800/60 active:bg-neutral-800"
                >
                  <span
                    className="grid h-8 w-8 shrink-0 place-items-center rounded-lg
                               bg-neutral-800 text-neutral-400"
                    aria-hidden="true"
                  >
                    <Bell size={15} />
                  </span>
                  <span
                    className={`min-w-0 flex-1 break-words text-sm font-medium text-neutral-200
                                ${event.completed ? 'line-through opacity-50' : ''}`}
                  >
                    {event.title}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/*
        ── Hoja de detalle ──

        Contiene la tarjeta real del evento, con todas sus acciones. Es lo que
        permite que el lienzo muestre bloques compactos sin que se pierda ni un
        botón del embudo.
      */}
      <BottomSheet
        isOpen={Boolean(openEvent)}
        onClose={() => setOpenEventId(null)}
        label="Detalle de la actividad"
        zIndexClass="z-[55]"
      >
        {openEvent && (
          <div className="dark pb-2">
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider
                          text-neutral-500"
            >
              {openEvent.time ? `${openEvent.time} · ` : ''}
              {dateOf(openEvent.date).toLocaleDateString('es-MX', {
                weekday: 'long', day: 'numeric', month: 'long',
              })}
            </p>
            <ActionableCard
              event={openEvent}
              onEarnPoints={addPoints}
              onStartSession={onStartSession}
              onOpenRequirements={onOpenRequirements}
              onRouteToActivity={onRouteToActivity}
            />
          </div>
        )}
      </BottomSheet>
    </div>
  );
}
