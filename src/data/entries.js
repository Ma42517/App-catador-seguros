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
    return true;
  } catch {
    // El caller transaccional necesita saber que nada se persistió.
    return false;
  }
}

function normalizeBucket(bucket) {
  return {
    activities: Array.isArray(bucket?.activities) ? bucket.activities : [],
    notes: Array.isArray(bucket?.notes) ? bucket.notes : [],
  };
}

function readUser(username) {
  if (!username) return EMPTY;
  return normalizeBucket(readAll()[username]);
}

function saveUser(username, bucket) {
  if (!username) return false;
  return writeAll({ ...readAll(), [username]: bucket });
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
  // Los identificadores son del repositorio, nunca del formulario/caller.
  const entry = { ...activity, id: newId(), createdAt: Date.now() };
  if (!saveUser(username, { ...bucket, activities: [...bucket.activities, entry] })) {
    throw new Error('No fue posible guardar la actividad.');
  }
  return entry;
}

/**
 * Commit atómico del Efecto Dominó dentro del bucket de agenda.
 *
 * Crea B y completa/elimina A con una sola escritura. Si A ya no existe o
 * ya estaba completada, no vuelve a crear B: esa comprobación es la segunda
 * barrera de idempotencia después del `isSubmitting` visual.
 */
export function resolveActivity(username, {
  resolvingEventId,
  resolveMode = 'complete',
  nextActivity = null,
  sourcePatch = {},
} = {}) {
  if (!username || !resolvingEventId) {
    throw new Error('Falta la actividad que se está resolviendo.');
  }
  if (!['complete', 'remove'].includes(resolveMode)) {
    throw new Error(`Modo de resolución inválido: ${resolveMode}`);
  }

  const all = readAll();
  const bucket = normalizeBucket(all[username]);
  const current = bucket.activities.find((activity) => activity.id === resolvingEventId);
  if (!current || current.completed) {
    return { status: 'already_resolved', activity: null };
  }

  const created = nextActivity
    ? { ...nextActivity, id: newId(), createdAt: Date.now() }
    : null;
  const resolvedActivities = resolveMode === 'remove'
    ? bucket.activities.filter((activity) => activity.id !== resolvingEventId)
    : bucket.activities.map((activity) => (
      activity.id === resolvingEventId
        ? { ...activity, ...sourcePatch, completed: true }
        : activity
    ));
  const activities = created ? [...resolvedActivities, created] : resolvedActivities;

  if (!writeAll({ ...all, [username]: { ...bucket, activities } })) {
    throw new Error('No fue posible guardar la resolución. Inténtalo nuevamente.');
  }

  return { status: 'committed', activity: created };
}

export function updateActivity(username, id, patch) {
  const bucket = readUser(username);
  const activities = bucket.activities.map(
    (a) => (a.id === id ? { ...a, ...patch } : a),
  );
  saveUser(username, { ...bucket, activities });
}

export function removeActivity(username, id) {
  const bucket = readUser(username);
  saveUser(username, {
    ...bucket,
    activities: bucket.activities.filter((a) => a.id !== id),
  });
}

/* ---------- Carga masiva y limpieza (datos de ejemplo) ---------- */

/** Reemplaza toda la información del usuario; se usa para la semana demo. */
export function replaceEntries(username, { activities = [], notes = [] }) {
  saveUser(username, { activities, notes });
}

export function clearEntries(username) {
  saveUser(username, { activities: [], notes: [] });
}
