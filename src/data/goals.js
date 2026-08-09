/**
 * Dominio y persistencia de las metas del asesor.
 *
 * Forma de una meta:
 *   {
 *     id, title, strategy, imageUrl, deadline: 'YYYY-MM-DD',
 *     metric: 'money' | 'people' | 'points',
 *     target: number,
 *     entries: [{ id, amount, at }],
 *     createdAt, completedAt: number | null
 *   }
 *
 * El avance NO se guarda como un número acumulado: se deriva de `entries`. Así
 * un registro se puede deshacer sin que el total quede descuadrado, y queda el
 * historial que hará falta para avisar "llevas dos semanas sin registrar".
 *
 * `completedAt` existe para que la celebración se dispare una sola vez. Sin él,
 * cada avance posterior al 100% volvería a lanzar el confeti.
 */
const KEY = 'df360:goals:v1';

/** Tipos de medición. `step` es lo que se sugiere al registrar un avance. */
export const METRICS = {
  money: {
    key: 'money',
    label: 'Dinero',
    short: 'MXN',
    unit: 'MXN',
    step: 5000,
    placeholder: '15000',
    describe: (n) => `$${Math.round(n).toLocaleString('es-MX')} MXN`,
  },
  people: {
    key: 'people',
    label: 'Personas',
    short: 'personas',
    unit: 'personas',
    step: 1,
    placeholder: '1',
    describe: (n) => `${Math.round(n).toLocaleString('es-MX')} ${Math.round(n) === 1 ? 'persona' : 'personas'}`,
  },
  points: {
    key: 'points',
    label: 'Puntos',
    short: 'pts',
    unit: 'puntos',
    step: 10,
    placeholder: '50',
    describe: (n) => `${Math.round(n).toLocaleString('es-MX')} pts`,
  },
};

export const METRIC_LIST = Object.values(METRICS);

export function metricOf(key) {
  return METRICS[key] ?? METRICS.money;
}

/** Formatea una cantidad según el tipo de medición de la meta. */
export function formatAmount(amount, metric) {
  return metricOf(metric).describe(Number(amount) || 0);
}

function newId() {
  return globalThis.crypto?.randomUUID?.()
    ?? `goal-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

// ── Persistencia por usuario ───────────────────────────────────────────────
// Las metas son de la persona, no del dispositivo: `marco` y `asesor` no
// comparten sus objetivos aunque usen el mismo navegador.

function readAll() {
  try {
    const raw = localStorage.getItem(KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

export function readGoals(username) {
  if (!username) return [];
  const list = readAll()[username];
  return Array.isArray(list) ? list : [];
}

export function writeGoals(username, goals) {
  if (!username) return;
  try {
    localStorage.setItem(KEY, JSON.stringify({ ...readAll(), [username]: goals }));
  } catch {
    // Cuota llena o almacenamiento bloqueado: las metas viven esta sesión.
    // Es el motivo por el que las imágenes se reescalan antes de guardarse.
  }
}

// ── Cálculos ──────────────────────────────────────────────────────────────

/** Suma de los avances registrados. */
export function progressOf(goal) {
  return (goal.entries ?? []).reduce((total, entry) => total + (Number(entry.amount) || 0), 0);
}

/** Porcentaje 0–100, acotado: pasarse de la meta no rompe la barra. */
export function percentOf(goal) {
  const target = Number(goal.target) || 0;
  if (target <= 0) return 0;
  return Math.min(100, Math.max(0, (progressOf(goal) / target) * 100));
}

export function isComplete(goal) {
  return percentOf(goal) >= 100;
}

/**
 * Días que faltan para la fecha límite. Negativo si ya pasó, `null` sin fecha.
 *
 * Se compara a mediodía para que el cambio de horario de verano no desplace la
 * cuenta un día entero.
 */
export function daysLeft(goal) {
  if (!goal.deadline) return null;
  const [year, month, day] = goal.deadline.split('-').map(Number);
  if (!year || !month || !day) return null;
  const target = new Date(year, month - 1, day, 12, 0, 0).getTime();
  const today = new Date();
  const noonToday = new Date(
    today.getFullYear(), today.getMonth(), today.getDate(), 12, 0, 0,
  ).getTime();
  return Math.round((target - noonToday) / 86400000);
}

/** La fecha límite en palabras, que es como la lee una persona. */
export function deadlineLabel(goal) {
  const left = daysLeft(goal);
  if (left === null) return 'Sin fecha límite';
  if (left === 0) return 'Vence hoy';
  if (left === 1) return 'Vence mañana';
  if (left > 0) return `Faltan ${left} días`;
  if (left === -1) return 'Venció ayer';
  return `Venció hace ${Math.abs(left)} días`;
}

/** Fecha límite en formato largo, para el detalle. */
export function deadlineDate(goal) {
  if (!goal.deadline) return '';
  const [year, month, day] = goal.deadline.split('-').map(Number);
  if (!year) return '';
  return new Date(year, month - 1, day).toLocaleDateString('es-MX', {
    day: 'numeric', month: 'long', year: 'numeric',
  });
}

// ── Operaciones ───────────────────────────────────────────────────────────

/** Crea una meta a partir de lo capturado. Devuelve `null` si falta lo mínimo. */
export function makeGoal({ title, strategy, imageUrl, deadline, metric, target }) {
  const cleanTitle = String(title ?? '').trim();
  const cleanTarget = Number(target);
  if (!cleanTitle || !Number.isFinite(cleanTarget) || cleanTarget <= 0) return null;

  return {
    id: newId(),
    title: cleanTitle,
    strategy: String(strategy ?? '').trim(),
    imageUrl: String(imageUrl ?? '').trim(),
    deadline: String(deadline ?? '').trim(),
    metric: METRICS[metric] ? metric : 'money',
    target: cleanTarget,
    entries: [],
    createdAt: Date.now(),
    completedAt: null,
  };
}

/** Añade un avance y sella la fecha de logro si con esto se completa. */
export function withProgress(goal, amount) {
  const value = Number(amount);
  if (!Number.isFinite(value) || value === 0) return goal;

  const next = {
    ...goal,
    entries: [...(goal.entries ?? []), { id: newId(), amount: value, at: Date.now() }],
  };

  if (!next.completedAt && isComplete(next)) next.completedAt = Date.now();
  return next;
}

/** Quita el último avance, para deshacer un registro equivocado. */
export function withoutLastEntry(goal) {
  const entries = (goal.entries ?? []).slice(0, -1);
  const next = { ...goal, entries };
  // Si el retroceso baja del 100%, la meta vuelve a estar en curso.
  if (!isComplete(next)) next.completedAt = null;
  return next;
}

// ── Gamificación ──────────────────────────────────────────────────────────

const CHEERS = [
  '¡Excelente trabajo! Estás un paso más cerca de tu meta.',
  '¡Felicidades! Sigue con ese ritmo.',
  '¡Increíble avance! No sueltes el volante.',
  'Así se ve la disciplina. ¡Vas muy bien!',
  'Otro tramo ganado. ¡Sigue así!',
  '¡Eso es! Cada registro te acerca.',
  'Constancia pura. ¡Vamos por más!',
];

const NEAR_FINISH = [
  '¡Ya casi! Te queda muy poco.',
  'Estás a un paso. ¡No pares ahora!',
  'La meta ya se ve desde aquí. ¡Cierra fuerte!',
];

const COMPLETED = [
  '¡META CUMPLIDA! Lo lograste.',
  '¡Objetivo alcanzado! Disfrútalo, te lo ganaste.',
  '¡Lo hiciste! Meta al 100%.',
];

/**
 * Frase de aliento acorde al momento, evitando repetir la anterior.
 *
 * Sonaría falso celebrar igual un primer registro que el cierre de la meta, y
 * repetir la misma frase dos veces seguidas delata que es un texto enlatado.
 */
export function cheerFor(percent, previousPhrase = '') {
  let pool = CHEERS;
  if (percent >= 100) pool = COMPLETED;
  else if (percent >= 80) pool = NEAR_FINISH;

  const options = pool.length > 1 ? pool.filter((p) => p !== previousPhrase) : pool;
  return options[Math.floor(Math.random() * options.length)];
}
