import { useState, useEffect, useCallback } from 'react';
import { StickyNote, Trash2, Check, RotateCcw } from 'lucide-react';
import BottomSheet from '../Layout/BottomSheet';
import { readNotes, removeNote, toggleNoteProcessed } from '../../data/entries';

const STAMP_FORMAT = {
  day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
};

/**
 * Lista de notas guardadas. Lee del almacenamiento cada vez que se abre, para
 * reflejar lo capturado desde la nota rápida sin necesidad de estado global.
 */
export default function NotesList({ isOpen, onClose, username }) {
  const [notes, setNotes] = useState([]);

  const refresh = useCallback(() => setNotes(readNotes(username)), [username]);

  useEffect(() => {
    if (isOpen) refresh();
  }, [isOpen, refresh]);

  const handleDelete = (id) => {
    removeNote(username, id);
    refresh();
  };

  const handleToggle = (id) => {
    toggleNoteProcessed(username, id);
    refresh();
  };

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} label="Mis notas">
      <div className="mb-5 flex items-center justify-between">
        <h2 className="text-lg font-bold text-zinc-900 dark:text-white">Mis Notas</h2>
        {notes.length > 0 && (
          <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
            {notes.length} {notes.length === 1 ? 'nota' : 'notas'}
          </span>
        )}
      </div>

      {notes.length === 0 ? (
        <div className="py-10 text-center">
          <span
            className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-xl border
                       border-zinc-200 bg-white text-zinc-400
                       dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-500"
            aria-hidden="true"
          >
            <StickyNote size={22} />
          </span>
          <p className="text-sm text-zinc-500">No tienes notas guardadas por ahora.</p>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {notes.map((note) => (
            <li
              key={note.id}
              className={`rounded-2xl border border-zinc-100 bg-white p-4 shadow-sm
                          transition-opacity dark:border-zinc-700 dark:bg-zinc-800
                          ${note.processed ? 'opacity-60' : ''}`}
            >
              <div className="mb-2 flex items-center justify-between gap-2">
                <time
                  dateTime={new Date(note.createdAt).toISOString()}
                  className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500"
                >
                  {new Date(note.createdAt).toLocaleString('es-MX', STAMP_FORMAT)}
                </time>

                <div className="flex shrink-0 items-center gap-1">
                  <button
                    type="button"
                    onClick={() => handleToggle(note.id)}
                    aria-label={note.processed ? 'Marcar como pendiente' : 'Marcar como procesada'}
                    title={note.processed ? 'Marcar como pendiente' : 'Marcar como procesada'}
                    className={`grid h-7 w-7 place-items-center rounded-lg transition-colors
                      ${note.processed
                        ? 'text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-700'
                        : 'text-emerald-600 hover:bg-emerald-500/10 dark:text-emerald-400'}`}
                  >
                    {note.processed ? <RotateCcw size={14} /> : <Check size={14} />}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(note.id)}
                    aria-label="Eliminar nota"
                    title="Eliminar nota"
                    className="grid h-7 w-7 place-items-center rounded-lg text-zinc-400
                               transition-colors hover:bg-rose-500/10 hover:text-rose-500"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              <p
                className={`whitespace-pre-wrap text-sm text-zinc-700 dark:text-zinc-200
                            ${note.processed ? 'line-through decoration-zinc-400' : ''}`}
              >
                {note.text}
              </p>
            </li>
          ))}
        </ul>
      )}
    </BottomSheet>
  );
}
