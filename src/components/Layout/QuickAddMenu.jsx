import { CalendarPlus, BellPlus, StickyNote } from 'lucide-react';
import BottomSheet from './BottomSheet';

/**
 * Acciones rápidas del botón "+". Se mantiene deliberadamente limpio: sólo los
 * tres destinos. La prioridad se elige dentro del formulario, donde importa.
 */
const ACTIONS = [
  {
    key: 'actividad',
    title: 'Nueva Actividad',
    subtitle: 'Bloquea una cita o actividad en tu agenda.',
    Icon: CalendarPlus,
    accent: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  },
  {
    key: 'recordatorio',
    title: 'Nuevo Recordatorio',
    subtitle: 'Un aviso con fecha y hora para no olvidarlo.',
    Icon: BellPlus,
    accent: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
  },
  {
    key: 'nota',
    title: 'Nota Rápida',
    subtitle: 'Captura una idea ahora y ordénala después.',
    Icon: StickyNote,
    accent: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  },
];

export default function QuickAddMenu({ isOpen, onClose, onSelect }) {
  const handleSelect = (key) => {
    onSelect?.(key);
    onClose();
  };

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} label="Acciones rápidas">
      <div className="flex flex-col gap-4">
        {ACTIONS.map(({ key, title, subtitle, Icon, accent }) => (
          <button
            key={key}
            type="button"
            onClick={() => handleSelect(key)}
            className="flex items-center gap-4 rounded-2xl border border-zinc-100 bg-white p-4
                       text-left shadow-sm transition-transform active:scale-95
                       focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500
                       dark:border-zinc-700 dark:bg-zinc-800"
          >
            <span
              className={`grid h-12 w-12 shrink-0 place-items-center rounded-xl ${accent}`}
              aria-hidden="true"
            >
              <Icon size={22} />
            </span>
            <span className="min-w-0">
              <span className="block text-lg font-semibold text-zinc-900 dark:text-white">
                {title}
              </span>
              <span className="block text-sm text-zinc-500">{subtitle}</span>
            </span>
          </button>
        ))}
      </div>
    </BottomSheet>
  );
}
