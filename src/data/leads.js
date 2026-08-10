/**
 * Prospectos capturados desde la tarjeta digital.
 *
 * Se guardan en el dispositivo del asesor, que es donde ocurre el intercambio:
 * él presta el teléfono, el prospecto escribe sus datos y se los queda. No hay
 * sesión del prospecto, así que no hay a quién atribuir una fila en la base.
 *
 * Si más adelante se quieren en Supabase, hace falta una tabla `leads` con
 * política de inserción anónima y el `advisor_id` en cada fila. Está documentado
 * en `.env.example`; el cambio se reduce a esta capa.
 */
const KEY = 'df360:leads:v1';

function newId() {
  return globalThis.crypto?.randomUUID?.()
    ?? `lead-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function readAll() {
  try {
    const raw = localStorage.getItem(KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

/** Prospectos de un asesor, los más recientes primero. */
export function readLeads(advisorKey) {
  if (!advisorKey) return [];
  const list = readAll()[advisorKey];
  return Array.isArray(list) ? [...list].sort((a, b) => b.capturedAt - a.capturedAt) : [];
}

export function saveLead(advisorKey, lead) {
  if (!advisorKey) return null;

  const entry = {
    id: newId(),
    name: String(lead.name ?? '').trim(),
    whatsapp: String(lead.whatsapp ?? '').trim(),
    email: String(lead.email ?? '').trim(),
    capturedAt: Date.now(),
  };
  if (!entry.name) return null;

  try {
    const all = readAll();
    const list = Array.isArray(all[advisorKey]) ? all[advisorKey] : [];
    localStorage.setItem(KEY, JSON.stringify({ ...all, [advisorKey]: [...list, entry] }));
  } catch {
    // Sin persistencia el prospecto vive esta sesión; la descarga del contacto
    // sí ocurre igual, que es lo que la otra persona espera.
  }
  return entry;
}

// ── Tarjeta de contacto ───────────────────────────────────────────────────

/**
 * Escapa un valor para vCard.
 *
 * Las comas, los puntos y coma y las barras invertidas son separadores dentro
 * del formato: sin escaparlos, un nombre como "Ramírez, Marco" partiría el campo
 * y el contacto se guardaría mal.
 */
function escapeVCard(value) {
  return String(value ?? '')
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n');
}

/** Divide el nombre en apellidos y nombre, que es como lo espera el formato. */
function splitName(fullName) {
  const parts = String(fullName ?? '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { given: '', family: '' };
  if (parts.length === 1) return { given: parts[0], family: '' };
  // En español lo habitual son dos apellidos; con cuatro palabras o más se
  // toman los dos últimos como apellidos.
  const family = parts.length >= 4 ? parts.slice(-2).join(' ') : parts.slice(-1).join(' ');
  const given = parts.slice(0, parts.length - family.split(' ').length).join(' ');
  return { given, family };
}

/**
 * Construye la tarjeta de contacto del asesor en formato vCard 3.0.
 *
 * Se usa 3.0 y no 4.0 porque es la versión que abren sin problemas los
 * contactos de Android y de iOS; la 4.0 todavía la rechazan algunos.
 */
export function buildVCard(card) {
  const { given, family } = splitName(card.fullName);
  const digits = (value) => String(value ?? '').replace(/[^\d+]/g, '');

  const lines = [
    'BEGIN:VCARD',
    'VERSION:3.0',
    `N:${escapeVCard(family)};${escapeVCard(given)};;;`,
    `FN:${escapeVCard(card.fullName)}`,
  ];

  if (card.title) lines.push(`TITLE:${escapeVCard(card.title)}`);
  if (card.company) lines.push(`ORG:${escapeVCard(card.company)}`);
  if (card.phone) lines.push(`TEL;TYPE=CELL,VOICE:${digits(card.phone)}`);
  if (card.whatsapp && digits(card.whatsapp) !== digits(card.phone)) {
    lines.push(`TEL;TYPE=WORK,VOICE:${digits(card.whatsapp)}`);
  }
  if (card.email) lines.push(`EMAIL;TYPE=INTERNET:${escapeVCard(card.email)}`);
  if (card.avatarUrl) lines.push(`PHOTO;VALUE=URI:${card.avatarUrl}`);

  // La cédula va en la nota: no hay campo estándar para ella y perderla sería
  // borrar el dato que acredita al asesor.
  const note = [card.bio, card.license ? `Cédula profesional: ${card.license}` : '']
    .filter(Boolean)
    .join(' — ');
  if (note) lines.push(`NOTE:${escapeVCard(note)}`);

  lines.push('END:VCARD');
  return lines.join('\r\n');
}

/** Nombre de archivo legible, sin acentos ni espacios. */
function vCardFileName(fullName) {
  const safe = String(fullName || 'contacto')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase();
  return `${safe || 'contacto'}.vcf`;
}

/**
 * Descarga la tarjeta de contacto.
 *
 * Se revoca la URL del blob al terminar: sin eso el archivo queda retenido en
 * memoria durante toda la sesión, y esta pantalla puede usarse muchas veces
 * seguidas en un día de prospección.
 */
export function downloadVCard(card) {
  const blob = new Blob([buildVCard(card)], { type: 'text/vcard;charset=utf-8' });
  const url = URL.createObjectURL(blob);

  try {
    const link = document.createElement('a');
    link.href = url;
    link.download = vCardFileName(card.fullName);
    document.body.appendChild(link);
    link.click();
    link.remove();
  } finally {
    URL.revokeObjectURL(url);
  }
}
