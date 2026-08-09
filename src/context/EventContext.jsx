import {
  createContext, useContext, useState, useEffect, useCallback, useMemo,
} from 'react';
import {
  readActivities, addActivity,
  readNotes, addNote as persistNote,
  removeNote as persistRemoveNote,
  toggleNoteProcessed as persistToggleNote,
} from '../data/entries';

const EventContext = createContext(null);

/** Fecha de hoy en el mismo formato que guardan los inputs nativos. */
export function todayKey() {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

/**
 * Estado global de la agenda del asesor: eventos (actividades y recordatorios)
 * y notas.
 *
 * La persistencia vive en `data/entries.js`, que ya separa por usuario; este
 * contexto añade la capa reactiva para que la UI se actualice al instante sin
 * releer el almacenamiento en cada componente.
 */
export function EventProvider({ username, children }) {
  const [events, setEvents] = useState(() => readActivities(username));
  const [notes, setNotes] = useState(() => readNotes(username));

  // Al cambiar de usuario se recarga su información.
  useEffect(() => {
    setEvents(readActivities(username));
    setNotes(readNotes(username));
  }, [username]);

  const addEvent = useCallback((event) => {
    const saved = addActivity(username, event);
    setEvents(readActivities(username));
    return saved;
  }, [username]);

  const addNote = useCallback((text) => {
    const saved = persistNote(username, text);
    setNotes(readNotes(username));
    return saved;
  }, [username]);

  const removeNote = useCallback((id) => {
    persistRemoveNote(username, id);
    setNotes(readNotes(username));
  }, [username]);

  const toggleNoteProcessed = useCallback((id) => {
    persistToggleNote(username, id);
    setNotes(readNotes(username));
  }, [username]);

  /** Eventos de hoy con prioridad máxima, ordenados por hora. */
  const highPriorityToday = useMemo(() => {
    const key = todayKey();
    return events
      .filter((e) => e.date === key && e.priority === 'maxima')
      .sort((a, b) => (a.time ?? '').localeCompare(b.time ?? ''));
  }, [events]);

  const value = useMemo(() => ({
    events, notes, highPriorityToday,
    addEvent, addNote, removeNote, toggleNoteProcessed,
  }), [events, notes, highPriorityToday, addEvent, addNote, removeNote, toggleNoteProcessed]);

  return <EventContext.Provider value={value}>{children}</EventContext.Provider>;
}

export function useEvents() {
  const ctx = useContext(EventContext);
  if (!ctx) throw new Error('useEvents debe usarse dentro de <EventProvider>');
  return ctx;
}
