/**
 * Almacén local de comunicados, usado cuando no hay Supabase configurado.
 *
 * Los comunicados no se separan por usuario: los publica la promotoría y debe
 * verlos todo el equipo, no sólo quien los escribió.
 *
 * Forma canónica de un comunicado, igual que la fila de Supabase:
 *   { id, category, title, content, imageUrl, createdAt }
 */
const KEY = 'df360:announcements:v2';
const SEED_FLAG = 'df360:announcementsSeeded:v2';

/** Imagen de ejemplo para poder probar el compartido con marca de agua. */
const SAMPLE_FLYER = 'https://picsum.photos/800/1200';

/** Categorías disponibles, compartidas por el formulario y el tablero. */
export const CATEGORIES = {
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
  campana: {
    key: 'campana',
    label: '🚀 CAMPAÑA',
    short: 'Campaña',
    tone: 'text-emerald-600 dark:text-emerald-400',
  },
};

export const CATEGORY_LIST = Object.values(CATEGORIES);

/** Devuelve una categoría conocida, con respaldo para datos inesperados. */
export function categoryOf(key) {
  return CATEGORIES[key] ?? CATEGORIES.importante;
}

function newId() {
  return globalThis.crypto?.randomUUID?.()
    ?? `ann-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function writeAll(list) {
  try {
    localStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    // Sin persistencia el comunicado vive sólo en esta sesión.
  }
}

function readRaw() {
  try {
    const raw = localStorage.getItem(KEY);
    const list = raw ? JSON.parse(raw) : null;
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

/**
 * Siembra dos comunicados de ejemplo la primera vez, uno con imagen para poder
 * probar el compartido con marca de agua. Se hace una sola vez: si el usuario
 * los borra, no reaparecen.
 */
function seedIfFirstRun() {
  try {
    if (localStorage.getItem(SEED_FLAG)) return;
    localStorage.setItem(SEED_FLAG, '1');
    if (readRaw().length > 0) return;
    const now = Date.now();
    writeAll([
      {
        id: newId(),
        category: 'campana',
        title: 'Nueva Campaña de Vida y Gastos Médicos',
        content: 'Comparte el flyer con tus prospectos. Vigencia todo el mes.',
        imageUrl: SAMPLE_FLYER,
        createdAt: now - 2 * 60 * 60 * 1000,
      },
      {
        id: newId(),
        category: 'bases',
        title: 'Actualización: Bases Convención 2026',
        content: 'Revisa los nuevos lineamientos de primas pagadas para calificar al viaje.',
        imageUrl: '',
        createdAt: now - 26 * 60 * 60 * 1000,
      },
    ]);
  } catch {
    // localStorage bloqueado: se trabaja sin comunicados de ejemplo.
  }
}

/** Más recientes primero, que es como se lee un tablero de avisos. */
export function readLocalAnnouncements() {
  seedIfFirstRun();
  return readRaw()
    .slice()
    .sort((a, b) => b.createdAt - a.createdAt);
}

export function addLocalAnnouncement({ category, title, content, imageUrl }) {
  const clean = {
    id: newId(),
    category: CATEGORIES[category] ? category : 'importante',
    title: String(title ?? '').trim(),
    content: String(content ?? '').trim(),
    imageUrl: String(imageUrl ?? '').trim(),
    createdAt: Date.now(),
  };
  if (!clean.title) return null;
  writeAll([...readRaw(), clean]);
  return clean;
}

export function removeLocalAnnouncement(id) {
  writeAll(readRaw().filter((a) => a.id !== id));
}

/**
 * Aplica cambios sobre un comunicado existente.
 *
 * Conserva `id` y `createdAt`: editar el texto de un aviso no lo convierte en
 * otro aviso ni lo vuelve a poner arriba del tablero.
 */
export function updateLocalAnnouncement(id, { category, title, content, imageUrl }) {
  const list = readRaw();
  const index = list.findIndex((a) => a.id === id);
  if (index === -1) return null;

  const title_ = String(title ?? '').trim();
  if (!title_) return null;

  const updated = {
    ...list[index],
    category: CATEGORIES[category] ? category : list[index].category,
    title: title_,
    content: String(content ?? '').trim(),
    imageUrl: String(imageUrl ?? '').trim(),
  };
  const next = list.slice();
  next[index] = updated;
  writeAll(next);
  return updated;
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
