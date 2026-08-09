/**
 * Comunicados publicados por la promotoría.
 *
 * Se guardan sin separar por usuario, a diferencia del resto: un comunicado lo
 * publica el promotor y debe verlo todo el equipo, no sólo quien lo escribió.
 */
const KEY = 'df360:announcements:v1';

/** Etiquetas disponibles, compartidas por el formulario y el tablero. */
export const TAGS = {
  importante: {
    key: 'importante',
    label: '📌 IMPORTANTE',
    short: 'Importante',
    tone: 'text-rose-500 dark:text-rose-400',
  },
  bases: {
    key: 'bases',
    label: '📄 BASES',
    short: 'Bases',
    tone: 'text-blue-600 dark:text-blue-400',
  },
};

export const TAG_LIST = Object.values(TAGS);

function newId() {
  return globalThis.crypto?.randomUUID?.()
    ?? `ann-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

/** Más recientes primero, que es como se lee un tablero de avisos. */
export function readAnnouncements() {
  try {
    const raw = localStorage.getItem(KEY);
    const list = raw ? JSON.parse(raw) : null;
    if (!Array.isArray(list)) return [];
    return list.slice().sort((a, b) => b.createdAt - a.createdAt);
  } catch {
    return [];
  }
}

function writeAll(list) {
  try {
    localStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    // Sin persistencia el comunicado vive sólo en esta sesión.
  }
}

export function addAnnouncement({ tag, title, description }) {
  const clean = {
    id: newId(),
    tag: TAGS[tag] ? tag : 'importante',
    title: String(title ?? '').trim(),
    description: String(description ?? '').trim(),
    createdAt: Date.now(),
  };
  if (!clean.title) return null;
  writeAll([...readAnnouncements(), clean]);
  return clean;
}

export function removeAnnouncement(id) {
  writeAll(readAnnouncements().filter((a) => a.id !== id));
}

/** Antigüedad en lenguaje natural, para no mostrar una fecha cruda. */
export function relativeTime(timestamp) {
  const minutes = Math.floor((Date.now() - timestamp) / 60000);
  if (minutes < 1) return 'Ahora';
  if (minutes < 60) return `Hace ${minutes} ${minutes === 1 ? 'minuto' : 'minutos'}`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Hace ${hours} ${hours === 1 ? 'hora' : 'horas'}`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'Ayer';
  return `Hace ${days} días`;
}
