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

/**
 * Repara las Citas Iniciales que quedaron huérfanas por la versión que
 * descartaba la metadata del Dominó entre Productividad y ActivityForm.
 *
 * El patrón es deliberadamente estrecho: A sigue pendiente, ya fue iniciada y
 * existe una Propuesta o Seguimiento posterior del mismo prospecto. En ese
 * caso B demuestra que la resolución ya se guardó y A sólo es la notificación
 * residual del bug. Las demás actividades no se tocan.
 *
 * @returns {number} cantidad de notificaciones huérfanas eliminadas.
 */
export function reconcileOrphanedInitialMeetings(username) {
  if (!username) return 0;
  const all = readAll();
  const bucket = normalizeBucket(all[username]);
  const nextTypes = new Set(['cita_propuesta', 'seguimiento']);

  const identityOf = (activity) => {
    const phone = String(activity?.telefono ?? '').replace(/\D/g, '');
    const rawTitle = String(activity?.title ?? '').trim();
    const name = (rawTitle.split(/:\s*/)[1] || rawTitle)
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim()
      .toLowerCase();
    return { phone, name };
  };
  const sameProspect = (left, right) => {
    const a = identityOf(left);
    const b = identityOf(right);
    if (a.phone && b.phone) return a.phone === b.phone;
    return Boolean(a.name && b.name && a.name === b.name);
  };

  const orphanIds = new Set(
    bucket.activities
      .filter((activity) => (
        activity.tipo_actividad === 'cita_inicial'
        && activity.sessionStarted
        && !activity.completed
      ))
      .filter((initialMeeting) => bucket.activities.some((candidate) => (
        candidate.id !== initialMeeting.id
        && nextTypes.has(candidate.tipo_actividad)
        && Number(candidate.createdAt ?? 0) >= Number(initialMeeting.createdAt ?? 0)
        && sameProspect(initialMeeting, candidate)
      )))
      .map((activity) => activity.id),
  );

  if (orphanIds.size === 0) return 0;
  const activities = bucket.activities.filter((activity) => !orphanIds.has(activity.id));
  return writeAll({ ...all, [username]: { ...bucket, activities } }) ? orphanIds.size : 0;
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
