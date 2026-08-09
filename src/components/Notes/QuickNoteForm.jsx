import { useState, useEffect } from 'react';
import { Check } from 'lucide-react';
import BottomSheet from '../Layout/BottomSheet';

/**
 * Captura de nota rápida: un solo campo, sin fricción. La idea es apuntar algo
 * en segundos y ordenarlo después desde "Mis Notas".
 */
export default function QuickNoteForm({ isOpen, onClose, onSave }) {
  const [text, setText] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    setText('');
    setError('');
  }, [isOpen]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!text.trim()) {
      setError('Escribe algo para guardar la nota.');
      return;
    }
    onSave?.(text.trim());
    onClose();
  };

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} label="Nota rápida">
      <h2 className="mb-5 text-lg font-bold text-zinc-900 dark:text-white">Nota Rápida</h2>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={4}
          placeholder="Laura preguntó por un seguro para su hija..."
          className="w-full resize-none rounded-xl border border-zinc-200 bg-white px-3 py-2.5
                     text-sm text-zinc-900 placeholder:text-zinc-400 transition-colors
                     focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500
                     dark:border-zinc-700 dark:bg-zinc-950/60 dark:text-zinc-100"
        />

        {error && <p role="alert" className="text-xs font-medium text-rose-500">{error}</p>}

        <button
          type="submit"
          className="flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3
                     text-sm font-semibold text-white shadow-lg shadow-indigo-600/30
                     transition-all hover:bg-indigo-500 active:scale-95
                     focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
        >
          <Check size={16} />
          Guardar nota
        </button>
      </form>
    </BottomSheet>
  );
}
