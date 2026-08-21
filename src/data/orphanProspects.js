/**
 * src/data/orphanProspects.js
 *
 * Lista de prospectos "Huérfanos": los que tenían una Cita Inicial y el
 * asesor dejó pasar los 30 minutos de gracia sin iniciar la sesión de
 * presentación (`InitialMeetingCard.jsx`, "Reloj de Arena"). Mismo patrón de
 * persistencia que `entries.js`/`safeZone.js`: todo bajo una sola clave de
 * localStorage, separado por usuario.
 */
const KEY = 'df360:orphans:v1';

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

function newId() {
  return globalThis.crypto?.randomUUID?.()
    ?? `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/** Prospectos huérfanos de un usuario, más recientes primero. */
export function readOrphans(username) {
  if (!username) return [];
  const list = readAll()[username];
  return (Array.isArray(list) ? list : []).slice().sort((a, b) => b.archivedAt - a.archivedAt);
}

/**
 * Archiva un prospecto a la lista de Huérfanos.
 *
 * No toca la actividad original de ninguna forma: quien llama a esta
 * función (`InitialMeetingCard.jsx`, al cumplirse el Gatillo de 30 minutos)
 * es responsable de quitarla de la agenda del día (`removeEvent` de
 * `EventContext`) — este módulo sólo lleva el registro de a quién se le
 * archivó la cita sin puntos.
 *
 * @param {string} username
 * @param {{prospectId?: string, name?: string, phone?: string, reason?: string}} entry
 */
export function addOrphanProspect(username, entry) {
  if (!username) return null;
  const list = readOrphans(username);
  const record = { id: newId(), archivedAt: Date.now(), ...entry };
  writeAll({ ...readAll(), [username]: [record, ...list] });
  return record;
}
