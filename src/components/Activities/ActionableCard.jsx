import { useState } from 'react';
import { Bell, Calendar as CalendarIcon } from 'lucide-react';
import TaskOptionsSheet from './TaskOptionsSheet';
import CallActivityCard from './CallActivityCard';
import InitialMeetingCard from './InitialMeetingCard';
import PipelineCard from './PipelineCard';
import FollowUpCard from './FollowUpCard';
import SwipeableCard from '../Layout/SwipeableCard';
import { getEventStatus, eventStatusStyles } from './eventStatus';
import { useEvents } from '../../context/EventContext';
import useNow from '../../lib/useNow';

/**
 * Tarjeta de evento accionable de la pantalla de inicio: se toca para abrir el
 * menú de opciones de la tarea. Cada tarjeta administra su propia hoja, así la
 * lista que la usa no tiene que llevar el estado de cuál está seleccionada.
 *
 * El estado temporal —normal, próximo o vencido— se pinta en la propia tarjeta
 * y nunca abre nada por su cuenta. Un evento que se acerca es información, no
 * una orden de atender: interrumpir con un panel al llegar la hora obliga a
 * cerrarlo antes de seguir, justo cuando la persona estaba en otra cosa.
 *
 * Excepción: una actividad de tipo "Llamada" (`tipo_actividad === 'llamada'`,
 * escrito por `ActivityForm.jsx`) no usa esta tarjeta genérica ni su menú de
 * opciones — cede el lugar entero a `CallActivityCard.jsx`, que reemplaza el
 * botón de check por el flujo de teléfono/WhatsApp y el feedback automático
 * al volver de la llamada. Una "Cita Inicial" (`tipo_actividad ===
 * 'cita_inicial'`) tampoco usa esta tarjeta: cede a `InitialMeetingCard.jsx`,
 * con sus 3 acciones propias y el "Reloj de Arena" del auto-archivo. Una
 * "Cita de Propuesta" y "Cita de Cierre" (`tipo_actividad ===
 * 'cita_propuesta'`/`'cita_cierre'`) ceden a `PipelineCard.jsx`, la misma
 * tarjeta reversible base para las dos etapas —se distinguen sólo por el
 * título y por a qué etapa del router de ventas apuntan
 * (`STAGE_META`/`resolvePipelineStage`, dentro de `PipelineCard.jsx`)—.
 * "Seguimiento" (`'seguimiento'`) cede a `FollowUpCard.jsx`, compacta y
 * sin Flip. Cualquier otro tipo de evento (o uno viejo, de antes de que
 * existiera `tipo_actividad`) sigue el camino de siempre — y es justo esa
 * rama la que se envuelve en `SwipeableCard.jsx`: deslizar hacia la
 * izquierda revela "Reagendar" (abre `TaskOptionsSheet` directo en el paso
 * de reprogramar) y "Descartar" (`removeEvent`, mismo destino que
 * "Eliminar" en ese mismo menú). Las tarjetas especiales de arriba —
 * llamada, Cita Inicial, Cita de Propuesta/Cierre— no se envuelven: cada
 * una ya tiene su propio lenguaje de gestos y acciones, y sumarles el
 * deslizamiento por encima competiría con lo que ya hacen (por ejemplo,
 * `PipelineCard.jsx` ya usa el toque para voltear la tarjeta).
 */
export default function ActionableCard({
  event, onEarnPoints, onStartSession, onOpenRequirements, onRouteToActivity,
}) {
  const { removeEvent } = useEvents();
  const [isOpen, setIsOpen] = useState(false);
  const [rescheduleOnOpen, setRescheduleOnOpen] = useState(false);

  /*
    El reloj entra como dependencia del render para que la tarjeta cambie
    de estado sola al pasar la hora, sin tener que salir y volver a la
    pantalla. Se llama siempre, sin importar el tipo de evento —las
    Reglas de los Hooks prohíben llamarlo sólo cuando la rama de "Llamada"
    no aplica—: `getEventStatus` de abajo tampoco corre para esa rama, así
    que el reloj de más no cambia nada visible, sólo evita el error de
    hooks condicionales.
  */
  const now = useNow();

  if (event.tipo_actividad === 'llamada') {
    return <CallActivityCard event={event} onEarnPoints={onEarnPoints} />;
  }

  if (event.tipo_actividad === 'cita_inicial') {
    return <InitialMeetingCard event={event} onStartSession={onStartSession} />;
  }

  if (event.tipo_actividad === 'cita_propuesta' || event.tipo_actividad === 'cita_cierre') {
    return (
      <PipelineCard
        event={event}
        onOpenRequirements={onOpenRequirements}
        onRouteToActivity={onRouteToActivity}
      />
    );
  }

  if (event.tipo_actividad === 'seguimiento') {
    return <FollowUpCard event={event} />;
  }

  const Icon = event.type === 'recordatorio' ? Bell : CalendarIcon;

  const status = getEventStatus(event.time, {
    date: event.date,
    completed: event.completed,
    now,
  });
  const tone = eventStatusStyles(status);

  return (
    <>
      <SwipeableCard
        onReschedule={() => { setRescheduleOnOpen(true); setIsOpen(true); }}
        onDiscard={() => removeEvent(event.id)}
      >
        <button
          type="button"
          onClick={() => { setRescheduleOnOpen(false); setIsOpen(true); }}
          /*
            Fondo sólido, no translúcido: con `bg-zinc-900/5`/`dark:bg-zinc-800/40`
            (5%/40% de opacidad) y `backdrop-blur-sm`, la tarjeta dejaba
            entrever lo que hay debajo incluso en reposo, sin haber
            deslizado nada —y desde que existe `SwipeableCard.jsx`, "lo que
            hay debajo" son los botones azul/rojo de Reagendar/Descartar—.
            Mismos tonos de siempre (`zinc-50`/`zinc-800`), sólo que ahora
            al 100% de opacidad: no es un color nuevo, es el mismo color ya
            sin dejar pasar nada por detrás.
          */
          className={`flex w-full cursor-pointer items-center justify-between gap-3 rounded-xl
                      border bg-zinc-50 p-4 text-left transition-all
                      active:scale-95 focus-visible:outline-none focus-visible:ring-2
                      focus-visible:ring-indigo-500 dark:bg-zinc-800 ${tone.container}`}
        >
          <span className="flex min-w-0 items-center gap-3">
            <Icon size={16} className={`shrink-0 ${tone.icon}`} aria-hidden="true" />
            <span className="truncate text-sm font-medium text-zinc-800 dark:text-zinc-100">
              {event.title}
            </span>
          </span>

          <span className="flex shrink-0 items-center gap-1.5">
            {/*
              El punto acompaña a la hora, que es el dato que quedó atrás. Puesto
              en la esquina de la tarjeta se leería como un aviso del evento
              entero, sin decir qué es lo que está mal.
            */}
            {tone.showDot && (
              <span
                className="h-2 w-2 shrink-0 rounded-full bg-rose-500 dark:bg-rose-400"
                aria-hidden="true"
              />
            )}
            <span className={`text-xs tabular-nums ${tone.time}`}>
              {event.time || 'Sin hora'}
            </span>
          </span>

          {/*
            El estado también se nombra: el color y el latido no llegan a quien
            usa un lector de pantalla ni a quien no distingue el ámbar del rosa.
          */}
          {tone.label && <span className="sr-only">{tone.label}</span>}
        </button>
      </SwipeableCard>

      <TaskOptionsSheet
        event={event}
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        initialReschedule={rescheduleOnOpen}
      />
    </>
  );
}
