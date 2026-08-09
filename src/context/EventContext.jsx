import {
  createContext, useContext, useState, useEffect, useCallback, useMemo,
} from 'react';
import {
  readActivities, addActivity,
  updateActivity as persistUpdate,
  removeActivity as persistRemoveActivity,
  readNotes, addNote as persistNote,
  removeNote as persistRemoveNote,
  toggleNoteProcessed as persistToggleNote,
  replaceEntries, clearEntries,
} from '../data/entries';
import { buildDemoWeek } from '../data/demoWeek';

const EventContext = createContext(null);

/** Usuario que arranca con la semana de ejemplo ya cargada. */
const DEMO_USER = 'marco';
/** Marca de que ya se sembró la demo, para no reponerla si se vacía a propósito. */
const DEMO_FLAG = 'df360:demoWeek:v1';

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

  const refresh = useCallback(() => {
    setEvents(readActivities(username));
    setNotes(readNotes(username));
  }, [username]);

  /** Carga la semana de ejemplo, reemplazando lo que hubiera. */
  const loadDemoWeek = useCallback(() => {
    replaceEntries(username, buildDemoWeek());
    try { localStorage.setItem(DEMO_FLAG, '1'); } catch { /* sin persistencia */ }
    refresh();
  }, [username, refresh]);

  const clearAgenda = useCallback(() => {
    clearEntries(username);
    refresh();
  }, [username, refresh]);

  // Al cambiar de usuario se recarga su información.
  useEffect(() => {
    refresh();
  }, [refresh]);

  /*
    La cuenta de demostración arranca poblada: una agenda vacía no permite
    valorar el producto. Se siembra una sola vez y sólo si no hay nada, para
    no reponer datos que el usuario borró a propósito ni pisar los suyos.
  */
  useEffect(() => {
    if (username !== DEMO_USER) return;
    let alreadySeeded = false;
    try { alreadySeeded = Boolean(localStorage.getItem(DEMO_FLAG)); } catch { /* ignore */ }
    if (alreadySeeded) return;
    if (readActivities(username).length > 0 || readNotes(username).length > 0) {
      try { localStorage.setItem(DEMO_FLAG, '1'); } catch { /* ignore */ }
      return;
    }
    loadDemoWeek();
  }, [username, loadDemoWeek]);

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

  const completeEvent = useCallback((id) => {
    persistUpdate(username, id, { completed: true });
    refresh();
  }, [username, refresh]);

  const removeEvent = useCallback((id) => {
    persistRemoveActivity(username, id);
    refresh();
  }, [username, refresh]);

  const rescheduleEvent = useCallback((id, { date, time }) => {
    persistUpdate(username, id, { date, time });
    refresh();
  }, [username, refresh]);

  /**
   * Eventos de hoy con prioridad máxima, ordenados por hora.
   * Los completados salen de la lista: la pantalla de inicio muestra lo que
   * falta por hacer, no un historial.
   */
  const highPriorityToday = useMemo(() => {
    const key = todayKey();
    return events
      .filter((e) => e.date === key && e.priority === 'maxima' && !e.completed)
      .sort((a, b) => (a.time ?? '').localeCompare(b.time ?? ''));
  }, [events]);

  const value = useMemo(() => ({
    events, notes, highPriorityToday,
    addEvent, completeEvent, removeEvent, rescheduleEvent,
    addNote, removeNote, toggleNoteProcessed,
    loadDemoWeek, clearAgenda,
  }), [
    events, notes, highPriorityToday,
    addEvent, completeEvent, removeEvent, rescheduleEvent,
    addNote, removeNote, toggleNoteProcessed,
    loadDemoWeek, clearAgenda,
  ]);

  return <EventContext.Provider value={value}>{children}</EventContext.Provider>;
}

export function useEvents() {
  const ctx = useContext(EventContext);
  if (!ctx) throw new Error('useEvents debe usarse dentro de <EventProvider>');
  return ctx;
}
