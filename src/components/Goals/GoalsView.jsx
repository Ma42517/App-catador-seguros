import { useState, useCallback, useMemo } from 'react';
import { Plus, Target, Trophy, Flame } from 'lucide-react';
import FullScreenView from '../Layout/FullScreenView';
import Toast from '../Layout/Toast';
import GoalCard from './GoalCard';
import GoalFormSheet from './GoalFormSheet';
import ProgressSheet from './ProgressSheet';
import Celebration from './Celebration';
import { useGoals } from '../../context/GoalsContext';
import { percentOf, isComplete, cheerFor, daysLeft } from '../../data/goals';

/** Resumen de arriba: da sentido al conjunto antes de entrar meta por meta. */
function Summary({ goals }) {
  const stats = useMemo(() => {
    const done = goals.filter(isComplete).length;
    const average = goals.length
      ? Math.round(goals.reduce((total, goal) => total + percentOf(goal), 0) / goals.length)
      : 0;
    const urgent = goals.filter((goal) => {
      const left = daysLeft(goal);
      return !isComplete(goal) && left !== null && left >= 0 && left <= 7;
    }).length;
    return { done, average, urgent };
  }, [goals]);

  const items = [
    { key: 'avance', label: 'Avance promedio', value: `${stats.average}%`, icon: Target, tone: 'text-amber-400' },
    { key: 'cumplidas', label: 'Cumplidas', value: stats.done, icon: Trophy, tone: 'text-emerald-400' },
    { key: 'urgentes', label: 'Por vencer', value: stats.urgent, icon: Flame, tone: 'text-rose-400' },
  ];

  return (
    <div className="mb-5 grid grid-cols-3 gap-2">
      {items.map((item) => (
        <div
          key={item.key}
          className="rounded-2xl border border-zinc-200 bg-white p-3 text-center
                     dark:border-zinc-800 dark:bg-zinc-900"
        >
          <item.icon size={15} className={`mx-auto ${item.tone}`} aria-hidden="true" />
          <p className="mt-1.5 text-lg font-bold leading-none text-zinc-900 dark:text-white">
            {item.value}
          </p>
          <p className="mt-1 text-[10px] leading-tight text-zinc-500">{item.label}</p>
        </div>
      ))}
    </div>
  );
}

function EmptyState({ onCreate }) {
  return (
    <div className="py-10 text-center">
      <span
        className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-2xl border
                   border-amber-500/30 bg-amber-500/10 text-amber-500"
        aria-hidden="true"
      >
        <Target size={28} />
      </span>

      <p className="text-base font-bold text-zinc-900 dark:text-white">
        Todavía no tienes metas
      </p>
      <p className="mx-auto mt-1.5 max-w-xs text-xs leading-relaxed text-zinc-500">
        Ponle nombre, fecha e imagen a lo que quieres lograr. Lo que se mide y se
        ve, se persigue.
      </p>

      <button
        type="button"
        onClick={onCreate}
        className="mx-auto mt-5 flex items-center gap-2 rounded-xl bg-amber-500 px-5 py-3
                   text-sm font-bold text-zinc-950 shadow-lg shadow-amber-500/25
                   transition-all hover:bg-amber-400 active:scale-[0.98]"
      >
        <Plus size={16} />
        Crear mi primera meta
      </button>
    </div>
  );
}

/**
 * Tablero de metas.
 *
 * Ordena las pendientes antes que las cumplidas: lo que exige acción va arriba,
 * y las logradas se conservan porque ver lo ya conseguido también motiva.
 */
export default function GoalsView({ isOpen, onClose }) {
  // `undoLastProgress` existe en el contexto y aún no se expone aquí: deshacer
  // un registro pide una acción dentro del aviso, y el Toast actual no las
  // admite. Queda disponible para cuando se resuelva eso.
  const { goals, addGoal, updateGoal, removeGoal, addProgress } = useGoals();

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [progressFor, setProgressFor] = useState(null);
  const [toast, setToast] = useState('');
  const [celebrating, setCelebrating] = useState(null);

  // Se recuerda la última frase para no repetirla en el siguiente registro.
  const [lastCheer, setLastCheer] = useState('');

  const ordered = useMemo(() => {
    const pending = goals.filter((goal) => !isComplete(goal));
    const done = goals.filter(isComplete);
    return [...pending, ...done];
  }, [goals]);

  const clearToast = useCallback(() => setToast(''), []);

  const handleCreate = (draft) => {
    const created = addGoal(draft);
    setToast(created ? `Meta creada: ${created.title}` : 'No se pudo crear la meta.');
  };

  const handleEdit = (draft) => {
    updateGoal(editing.id, draft);
    setToast('Meta actualizada');
    setEditing(null);
  };

  const handleDelete = (goal) => {
    removeGoal(goal.id);
    setToast(`Se eliminó "${goal.title}"`);
  };

  /**
   * Registra el avance y decide el festejo con la meta ya actualizada.
   *
   * `addProgress` devuelve el resultado en lugar de leerlo del estado: en el
   * mismo tick el estado todavía tiene el valor anterior, y el mensaje saldría
   * un avance atrasado.
   */
  const handleProgress = (goal, amount) => {
    const updated = addProgress(goal.id, amount);
    if (!updated) return;

    const percent = percentOf(updated);
    const phrase = cheerFor(percent, lastCheer);
    setLastCheer(phrase);

    // La celebración se lanza sólo en el cruce del 100%, no en cada avance
    // posterior: `completedAt` se sella una vez y ya venía sellado si no es
    // la primera vez que llega.
    const justCompleted = Boolean(updated.completedAt) && !goal.completedAt;

    if (justCompleted) {
      setCelebrating(updated);
      setToast(phrase);
      return;
    }
    setToast(phrase);
  };

  return (
    <FullScreenView isOpen={isOpen} onClose={onClose} title="Mis Metas" label="Mis metas">
      {goals.length === 0 ? (
        <EmptyState onCreate={() => { setEditing(null); setFormOpen(true); }} />
      ) : (
        <>
          <Summary goals={goals} />

          <div className="flex flex-col gap-4">
            {ordered.map((goal) => (
              <GoalCard
                key={goal.id}
                goal={goal}
                onRegister={() => setProgressFor(goal.id)}
                onEdit={() => { setEditing(goal); setFormOpen(true); }}
                onDelete={() => handleDelete(goal)}
              />
            ))}
          </div>

          <button
            type="button"
            onClick={() => { setEditing(null); setFormOpen(true); }}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl border
                       border-dashed border-zinc-300 py-4 text-sm font-semibold text-zinc-500
                       transition-colors hover:border-amber-500 hover:text-amber-600
                       dark:border-zinc-700"
          >
            <Plus size={16} />
            Agregar otra meta
          </button>
        </>
      )}

      <GoalFormSheet
        isOpen={formOpen}
        onClose={() => { setFormOpen(false); setEditing(null); }}
        onSubmit={editing ? handleEdit : handleCreate}
        goal={editing}
      />

      {/*
        La meta se busca por id en cada render en lugar de guardarse en el
        estado: así la hoja ve el avance actualizado en cuanto se registra, sin
        quedarse con una copia vieja.
      */}
      <ProgressSheet
        isOpen={progressFor !== null}
        onClose={() => setProgressFor(null)}
        goal={goals.find((goal) => goal.id === progressFor) ?? null}
        onSubmit={(amount) => {
          const goal = goals.find((item) => item.id === progressFor);
          if (goal) handleProgress(goal, amount);
        }}
      />

      <Celebration
        isActive={celebrating !== null}
        title={celebrating?.title ?? ''}
        onDone={() => setCelebrating(null)}
      />

      <Toast message={toast} onDone={clearToast} />
    </FullScreenView>
  );
}
