import { useState, useEffect } from 'react';
import { Check } from 'lucide-react';
import BottomSheet from '../Layout/BottomSheet';
import { PRIORITIES, DEFAULT_PRIORITY } from './priorities';

/** Estilo compartido de los campos; adaptativo al tema. */
const INPUT =
  'w-full rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-900 '
  + 'placeholder:text-zinc-400 transition-colors [color-scheme:light] '
  + 'focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 '
  + 'dark:border-zinc-700 dark:bg-zinc-950/60 dark:text-zinc-100 dark:[color-scheme:dark]';

const LABEL = 'mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-zinc-500';

/** Fecha y hora de hoy en el formato que esperan los inputs nativos. */
function todayParts() {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return {
    date: `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`,
    time: `${pad(now.getHours())}:${pad(now.getMinutes())}`,
  };
}

/**
 * Formulario de actividad o recordatorio. La prioridad se elige aquí, al final,
 * justo antes de guardar: es una decisión sobre *este* evento, no un ajuste
 * global del menú de agregar.
 */
export default function ActivityForm({ isOpen, onClose, type = 'actividad', onSave }) {
  const isReminder = type === 'recordatorio';

  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [priority, setPriority] = useState(DEFAULT_PRIORITY);
  const [error, setError] = useState('');

  // Cada apertura empieza en limpio, con la fecha y hora actuales.
  useEffect(() => {
    if (!isOpen) return;
    const parts = todayParts();
    setTitle('');
    setDate(parts.date);
    setTime(parts.time);
    setPriority(DEFAULT_PRIORITY);
    setError('');
  }, [isOpen]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Escribe un título para continuar.');
      return;
    }
    onSave?.({ type, title: title.trim(), date, time, priority });
    onClose();
  };

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={onClose}
      label={isReminder ? 'Nuevo recordatorio' : 'Nueva actividad'}
    >
      <h2 className="mb-5 text-lg font-bold text-zinc-900 dark:text-white">
        {isReminder ? 'Nuevo Recordatorio' : 'Nueva Actividad'}
      </h2>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label className={LABEL} htmlFor="entry-title">
            {isReminder ? '¿Qué debes recordar?' : '¿Qué vas a hacer?'}
          </label>
          <input
            id="entry-title"
            className={INPUT}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={isReminder ? 'Llamar a Laura por su póliza' : 'Cita inicial con Laura'}
            autoComplete="off"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={LABEL} htmlFor="entry-date">Fecha</label>
            <input
              id="entry-date"
              type="date"
              className={INPUT}
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
          <div>
            <label className={LABEL} htmlFor="entry-time">Hora</label>
            <input
              id="entry-time"
              type="time"
              className={INPUT}
              value={time}
              onChange={(e) => setTime(e.target.value)}
            />
          </div>
        </div>

        {/* Prioridad: última decisión antes de guardar */}
        <div>
          <span className={LABEL}>Prioridad del Evento</span>
          <div role="radiogroup" aria-label="Prioridad del evento" className="flex gap-2">
            {PRIORITIES.map(({ key, label, idle, active }) => {
              const isActive = priority === key;
              return (
                <button
                  key={key}
                  type="button"
                  role="radio"
                  aria-checked={isActive}
                  onClick={() => setPriority(key)}
                  className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-all
                              active:scale-95 focus-visible:outline-none focus-visible:ring-2
                              focus-visible:ring-indigo-500 ${isActive ? active : idle}`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        {error && <p role="alert" className="text-xs font-medium text-rose-500">{error}</p>}

        <button
          type="submit"
          className="mt-1 flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3
                     text-sm font-semibold text-white shadow-lg shadow-indigo-600/30
                     transition-all hover:bg-indigo-500 active:scale-95
                     focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
        >
          <Check size={16} />
          Guardar
        </button>
      </form>
    </BottomSheet>
  );
}
