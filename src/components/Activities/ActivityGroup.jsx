import { useState } from 'react';
import { ChevronRight } from 'lucide-react';
import ActionableCard from './ActionableCard';
import FullScreenView from '../Layout/FullScreenView';
import { metaForType } from '../../lib/activityGroups';

/**
 * Tarjeta de grupo colapsada + la pantalla a la que lleva.
 *
 * Cuando hay más de cuatro actividades del mismo tipo (`activityGroups.js`,
 * `GROUP_THRESHOLD`), la pantalla principal y la agenda dejan de pintarlas una
 * por una —que las empujaba fuera de la vista y hacía sentir la app trabada— y
 * muestran en su lugar esta sola tarjeta: "5 Citas Iniciales". Al tocarla se
 * abre `FullScreenView` con TODAS las actividades del grupo, y esa carcasa sí
 * trae scroll propio (`overflow-y-auto`), que es justo lo que falta en la lista
 * de fondo.
 *
 * Las tarjetas de dentro son las mismas `ActionableCard` del embudo: desde el
 * grupo se inicia una presentación, se cobra o se reagenda igual que si la
 * actividad estuviera suelta en "Hoy". No es un resumen de sólo lectura, es la
 * misma lista, sólo que guardada detrás de una puerta para que no sature la
 * pantalla.
 *
 * Los manejadores (`onStartSession`, etc.) se reciben y se pasan tal cual a
 * cada tarjeta: sin ellos los botones de resolución no llevarían a ningún lado,
 * el mismo contrato que ya cumplen "Hoy" y la "Agenda".
 */
export default function ActivityGroup({
  tipo, events, onStartSession, onReportResult, onOpenRequirements, onRouteToActivity,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const meta = metaForType(tipo);
  const Icon = meta.icon;
  const count = events.length;
  const heading = `${count} ${meta.plural}`;

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        aria-label={`Ver ${heading}`}
        /*
          Mismo lenguaje de las tarjetas del embudo —borde, redondeo, fondo
          blanco/zinc por tema y el hundido al pulsar— para que se lea como una
          más de la lista y no como un control ajeno. El número grande a la
          izquierda es lo que comunica de un vistazo cuántas hay sin tener que
          leer el rótulo.
        */
        className="flex w-full items-center gap-3 rounded-2xl border border-zinc-200
                   bg-white p-4 text-left shadow-sm transition-all active:scale-[0.98]
                   focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500
                   dark:border-zinc-800 dark:bg-zinc-900"
      >
        {/* Contador grande: el dato principal de la tarjeta. */}
        <span
          className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-indigo-500/10
                     text-indigo-600 dark:text-indigo-300"
          aria-hidden="true"
        >
          <span className="text-lg font-black leading-none">{count}</span>
        </span>

        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-1.5">
            <Icon size={14} className="shrink-0 text-zinc-400" aria-hidden="true" />
            <span className="text-[10px] font-bold uppercase tracking-wide text-indigo-500
                             dark:text-indigo-400"
            >
              Grupo
            </span>
          </span>
          <span className="mt-0.5 block truncate text-[15px] font-bold text-zinc-900 dark:text-white">
            {heading}
          </span>
          <span className="mt-0.5 block text-xs text-zinc-500">
            Toca para verlas todas
          </span>
        </span>

        <ChevronRight size={20} className="shrink-0 text-zinc-400" aria-hidden="true" />
      </button>

      <FullScreenView
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        label={heading}
        title={heading}
      >
        {/*
          La lista completa del grupo, cada una con su tarjeta real del embudo.
          `FullScreenView` ya aporta el scroll y el fondo por tema; aquí sólo se
          centra la columna y se separa cada tarjeta.
        */}
        <ul className="mx-auto w-full max-w-md px-4 py-6">
          {events.map((event) => (
            <li key={event.id} className="mb-3">
              <ActionableCard
                event={event}
                onStartSession={onStartSession}
                onReportResult={onReportResult}
                onOpenRequirements={onOpenRequirements}
                onRouteToActivity={onRouteToActivity}
              />
            </li>
          ))}
        </ul>
      </FullScreenView>
    </>
  );
}
