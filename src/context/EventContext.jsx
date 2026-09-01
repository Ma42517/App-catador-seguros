import {
  createContext, useContext, useState, useEffect, useCallback, useMemo,
} from 'react';
import {
  readActivities, addActivity, resolveActivity, reconcileOrphanedInitialMeetings,
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

  // Al cambiar de usuario, primero repara las Citas Iniciales residuales de
  // la versión que perdía la metadata A→B y después publica su agenda real.
  useEffect(() => {
    reconcileOrphanedInitialMeetings(username);
    refresh();
  }, [username, refresh]);

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

  /**
   * Crea el siguiente evento y resuelve el actual en un único commit.
   * Devuelve `already_resolved` si otro toque ya ganó la carrera; los
   * callers sólo deben premiar/ejecutar efectos laterales en `committed`.
   */
  const resolveEvent = useCallback((transition) => {
    const result = resolveActivity(username, transition);
    refresh();
    return result;
  }, [username, refresh]);

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

  /** Devuelve una tarea completada a pendiente, para deshacer un toque erróneo. */
  const reopenEvent = useCallback((id) => {
    persistUpdate(username, id, { completed: false });
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
   * Actualiza cualquier campo suelto de un evento (fusiona, no reemplaza).
   *
   * Genérico a propósito: lo usa `InitialMeetingCard.jsx` para marcar
   * `sessionStarted: true` —el "Seguro de Vida" del Reloj de Arena—, un
   * campo que no encaja en ninguno de los otros ayudantes específicos de
   * arriba (`completeEvent`, `rescheduleEvent`...). Cualquier otra pantalla
   * futura que necesite guardar un dato suelto del evento usa éste, en vez
   * de sumar un ayudante nuevo por cada campo.
   */
  const updateEvent = useCallback((id, patch) => {
    persistUpdate(username, id, patch);
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

  /**
   * Todo lo de hoy que sigue pendiente, ordenado por hora.
   *
   * Es la cuenta que alimenta el aviso de la pestaña Agenda, y por eso sólo
   * mira el día de hoy y descarta lo completado: un aviso tiene que
   * corresponder a algo que la persona todavía puede hacer. Incluir días
   * pasados o tareas ya cerradas volvería el número permanente, y un número
   * que nunca baja deja de leerse como un aviso.
   *
   * A diferencia de `highPriorityToday`, aquí no se filtra por prioridad: el
   * aviso cuenta la carga real del día, no sólo lo urgente.
   */
  const activeToday = useMemo(() => {
    const key = todayKey();
    return events
      .filter((e) => e.date === key && !e.completed)
      .sort((a, b) => (a.time ?? '').localeCompare(b.time ?? ''));
  }, [events]);

  const value = useMemo(() => ({
    events, notes, highPriorityToday, activeToday,
    addEvent, resolveEvent, completeEvent, reopenEvent, removeEvent, rescheduleEvent, updateEvent,
    addNote, removeNote, toggleNoteProcessed,
    loadDemoWeek, clearAgenda,
  }), [
    events, notes, highPriorityToday, activeToday,
    addEvent, resolveEvent, completeEvent, reopenEvent, removeEvent, rescheduleEvent, updateEvent,
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
