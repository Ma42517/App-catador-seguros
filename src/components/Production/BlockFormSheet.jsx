import { useState, useEffect } from 'react';
import { Plus } from 'lucide-react';
import BottomSheet from '../Layout/BottomSheet';
import { MAX_MINUTES } from '../../data/timeBlocks';

const INPUT =
  'w-full rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-900 '
  + 'placeholder:text-zinc-400 transition-colors focus:border-indigo-500 focus:outline-none '
  + 'focus:ring-2 focus:ring-indigo-500 dark:border-zinc-700 dark:bg-zinc-950/60 '
  + 'dark:text-zinc-100 dark:placeholder:text-zinc-600';

const LABEL = 'mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-zinc-500';

/** Duraciones frecuentes, para no teclear en el caso común. */
const SUGGESTED = [15, 25, 30, 45, 60, 90];

/** Alta de un bloque propio: nombre de la tarea y minutos. */
export default function BlockFormSheet({ isOpen, onClose, onSubmit }) {
  const [label, setLabel] = useState('');
  const [minutes, setMinutes] = useState('25');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    setLabel('');
    setMinutes('25');
    setError('');
  }, [isOpen]);

  const submit = (event) => {
    event.preventDefault();

    if (!label.trim()) {
      setError('Ponle nombre a la tarea.');
      return;
    }
    const value = Math.round(Number(minutes));
    if (!Number.isFinite(value) || value < 1 || value > MAX_MINUTES) {
      setError(`Los minutos tienen que ir de 1 a ${MAX_MINUTES}.`);
      return;
    }

    onSubmit({ label: label.trim(), minutes: value });
    onClose();
  };

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} label="Nuevo bloque de tiempo">
      <h2 className="mb-5 text-lg font-bold text-zinc-900 dark:text-white">
        Nuevo bloque
      </h2>

      <form onSubmit={submit}>
        <div className="mb-4">
          <label className={LABEL} htmlFor="block-label">Nombre de la tarea</label>
          <input
            id="block-label"
            className={INPUT}
            value={label}
            onChange={(event) => { setLabel(event.target.value); setError(''); }}
            placeholder="Ej. Prospección en frío"
            autoComplete="off"
          />
        </div>

        <div className="mb-4">
          <label className={LABEL} htmlFor="block-minutes">Minutos</label>
          <input
            id="block-minutes"
            className={INPUT}
            value={minutes}
            onChange={(event) => { setMinutes(event.target.value); setError(''); }}
            inputMode="numeric"
            autoComplete="off"
          />

          <div className="mt-2 flex flex-wrap gap-2">
            {SUGGESTED.map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => { setMinutes(String(value)); setError(''); }}
                className={`rounded-full border px-3 py-1 text-xs font-semibold
                            transition-colors active:scale-95 ${Number(minutes) === value
                  ? 'border-indigo-500 bg-indigo-500/10 text-indigo-600 dark:text-indigo-300'
                  : 'border-zinc-200 text-zinc-500 dark:border-zinc-700'}`}
              >
                {value} min
              </button>
            ))}
          </div>
        </div>

        {error && (
          <p role="alert" className="mb-4 text-xs font-medium text-rose-500">{error}</p>
        )}

        <button
          type="submit"
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600
                     px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-600/30
                     transition-all hover:bg-indigo-500 active:scale-[0.98]"
        >
          <Plus size={16} />
          Guardar bloque
        </button>
      </form>
    </BottomSheet>
  );
}
