/**
 * Almacenamiento local de lo que captura el asesor: actividades, recordatorios
 * y notas rápidas.
 *
 * Separado por usuario, igual que el onboarding, porque los pendientes son de
 * la persona. Usa localStorage para que sobrevivan al cierre de sesión.
 */
const KEY = 'df360:entries:v1';

const EMPTY = { activities: [], notes: [] };

function readAll() {
  try {
    const raw = localStorage.getItem(KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function writeAll(data) {
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
  } catch {
    // Sin persistencia se pierde al recargar: degradación aceptable.
  }
}

function readUser(username) {
  if (!username) return EMPTY;
  const bucket = readAll()[username];
  return {
    activities: Array.isArray(bucket?.activities) ? bucket.activities : [],
    notes: Array.isArray(bucket?.notes) ? bucket.notes : [],
  };
}

function saveUser(username, bucket) {
  if (!username) return;
  writeAll({ ...readAll(), [username]: bucket });
}

function newId() {
  return globalThis.crypto?.randomUUID?.()
    ?? `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/* ---------- Notas ---------- */

export function readNotes(username) {
  // Más recientes primero.
  return readUser(username).notes.slice().sort((a, b) => b.createdAt - a.createdAt);
}

export function addNote(username, text) {
  const clean = text.trim();
  if (!clean) return null;
  const bucket = readUser(username);
  const note = { id: newId(), text: clean, createdAt: Date.now(), processed: false };
  saveUser(username, { ...bucket, notes: [...bucket.notes, note] });
  return note;
}

export function removeNote(username, id) {
  const bucket = readUser(username);
  saveUser(username, { ...bucket, notes: bucket.notes.filter((n) => n.id !== id) });
}

export function toggleNoteProcessed(username, id) {
  const bucket = readUser(username);
  const notes = bucket.notes.map(
    (n) => (n.id === id ? { ...n, processed: !n.processed } : n),
  );
  saveUser(username, { ...bucket, notes });
}

/* ---------- Actividades y recordatorios ---------- */

export function readActivities(username) {
  return readUser(username).activities.slice().sort((a, b) => b.createdAt - a.createdAt);
}

export function addActivity(username, activity) {
  const bucket = readUser(username);
  const entry = { id: newId(), createdAt: Date.now(), ...activity };
  saveUser(username, { ...bucket, activities: [...bucket.activities, entry] });
  return entry;
}

/* ---------- Carga masiva y limpieza (datos de ejemplo) ---------- */

/** Reemplaza toda la información del usuario; se usa para la semana demo. */
export function replaceEntries(username, { activities = [], notes = [] }) {
  saveUser(username, { activities, notes });
}

export function clearEntries(username) {
  saveUser(username, { activities: [], notes: [] });
}
