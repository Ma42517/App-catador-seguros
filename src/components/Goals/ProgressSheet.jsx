import { useState, useEffect } from 'react';
import { Plus, TrendingUp } from 'lucide-react';
import BottomSheet from '../Layout/BottomSheet';
import {
  metricOf, formatAmount, progressOf, percentOf,
} from '../../data/goals';

const INPUT =
  'w-full rounded-xl border border-zinc-200 bg-white px-3 py-3 text-center text-2xl '
  + 'font-bold text-zinc-900 transition-colors focus:border-amber-500 focus:outline-none '
  + 'focus:ring-2 focus:ring-amber-500 dark:border-zinc-700 dark:bg-zinc-950/60 '
  + 'dark:text-white';

/** Atajos según el tipo de medición, para no teclear en el caso común. */
function quickAmounts(metric) {
  const { step } = metricOf(metric);
  return [step, step * 2, step * 5];
}

/**
 * Registro rápido de avance.
 *
 * Los atajos existen porque el gesto habitual es "+1 cliente" o "+5,000": si
 * cada registro obliga a teclear, se deja de registrar y la meta se abandona.
 */
export default function ProgressSheet({ isOpen, onClose, goal, onSubmit }) {
  const [amount, setAmount] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    setAmount('');
    setError('');
  }, [isOpen]);

  if (!goal) return null;

  const metric = metricOf(goal.metric);
  const current = progressOf(goal);
  const percent = percentOf(goal);

  const submit = (event) => {
    event.preventDefault();
    const value = Number(amount);
    if (!Number.isFinite(value) || value <= 0) {
      setError('Escribe cuánto avanzaste.');
      return;
    }
    onSubmit(value);
    onClose();
  };

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} label="Registrar avance">
      <div className="mb-1 flex items-center gap-2">
        <TrendingUp size={16} className="text-amber-500" aria-hidden="true" />
        <h2 className="text-lg font-bold text-zinc-900 dark:text-white">Registrar avance</h2>
      </div>

      <p className="mb-5 text-xs text-zinc-500">
        {goal.title} · llevas {formatAmount(current, goal.metric)} de{' '}
        {formatAmount(goal.target, goal.metric)} ({Math.round(percent)}%)
      </p>

      <form onSubmit={submit}>
        <label
          className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-zinc-500"
          htmlFor="progress-amount"
        >
          Cuánto avanzaste ({metric.unit})
        </label>

        <input
          id="progress-amount"
          className={INPUT}
          value={amount}
          onChange={(event) => { setAmount(event.target.value); setError(''); }}
          placeholder={metric.placeholder}
          inputMode="numeric"
          autoComplete="off"
        />

        <div className="mt-3 flex gap-2">
          {quickAmounts(goal.metric).map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => { setAmount(String(value)); setError(''); }}
              className="flex-1 rounded-xl border border-zinc-200 py-2 text-xs font-semibold
                         text-zinc-600 transition-colors hover:border-amber-500
                         hover:text-amber-600 active:scale-95
                         dark:border-zinc-700 dark:text-zinc-300"
            >
              +{metric.describe(value)}
            </button>
          ))}
        </div>

        {error && (
          <p role="alert" className="mt-3 text-[11px] font-medium text-rose-500">{error}</p>
        )}

        <button
          type="submit"
          className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-amber-500
                     px-4 py-3 text-sm font-bold text-zinc-950 shadow-lg shadow-amber-500/25
                     transition-all hover:bg-amber-400 active:scale-[0.98]"
        >
          <Plus size={16} />
          Sumar a mi meta
        </button>
      </form>
    </BottomSheet>
  );
}
