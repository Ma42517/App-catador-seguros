/**
 * src/data/prospectStatus.js
 *
 * Estatus final de un prospecto tras el cierre de su Cita Inicial
 * (`PresentationEndModal.jsx`, opción "No califica"). No existe en este
 * proyecto una tabla de prospectos/clientes en Supabase —el único CRM local
 * es `leads.js`, y es de otro flujo (captura desde la tarjeta digital)—, así
 * que esto sustituye la "mutación a la base de datos" del pedido con el
 * mismo patrón de persistencia local que ya usa `orphanProspects.js`. El
 * día que exista una tabla real de prospectos, esta función es la que se
 * cambia por la llamada a Supabase; nada más del flujo tiene que tocarse.
 */
const KEY = 'df360:prospectStatus:v1';

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
    // Sin persistencia el estatus se pierde al recargar: degradación aceptable.
  }
}

/** Prospectos descartados de un asesor, más recientes primero. */
export function readDiscardedProspects(username) {
  if (!username) return [];
  const list = readAll()[username];
  return (Array.isArray(list) ? list : []).slice().sort((a, b) => b.discardedAt - a.discardedAt);
}

/**
 * Marca a un prospecto como `status: 'discarded'` — no califica para
 * continuar en el embudo.
 *
 * @param {string} username
 * @param {{id?: string, name?: string, phone?: string}} client
 */
export function markProspectDiscarded(username, client) {
  if (!username) return null;
  const list = readDiscardedProspects(username);
  const record = {
    id: client?.id ?? `discarded-${Date.now()}`,
    name: client?.name ?? '',
    phone: client?.phone ?? '',
    status: 'discarded',
    discardedAt: Date.now(),
  };
  writeAll({ ...readAll(), [username]: [record, ...list] });
  return record;
}

/**
 * Saca a un prospecto de la lista de descartados.
 *
 * Es lo que permite deshacer un "No califica": la usa
 * `PausedProspects.jsx` al reactivar a alguien —vuelve al embudo como
 * actividad real— y al borrarlo de la lista para siempre. Sin esto, un
 * descarte por error no tenía marcha atrás.
 */
export function removeDiscardedProspect(username, id) {
  if (!username) return;
  const all = readAll();
  const list = Array.isArray(all[username]) ? all[username] : [];
  writeAll({ ...all, [username]: list.filter((entry) => entry.id !== id) });
}
