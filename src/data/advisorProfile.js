/**
 * Datos del asesor que se usarán para marcar los flyers: nombre a mostrar y
 * teléfono de contacto.
 *
 * Se guarda por usuario y en localStorage, no sólo en memoria: una marca de
 * agua que se pierde al recargar obligaría a recapturarla en cada sesión.
 */
const KEY = 'df360:advisorProfile:v1';

const EMPTY = { displayName: '', phone: '', zoomLink: '' };

function readAll() {
  try {
    const raw = localStorage.getItem(KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

export function readAdvisorProfile(username) {
  if (!username) return EMPTY;
  const stored = readAll()[username];
  return {
    displayName: typeof stored?.displayName === 'string' ? stored.displayName : '',
    phone: typeof stored?.phone === 'string' ? stored.phone : '',
    /*
      Enlace fijo de Zoom/Meet del asesor (sala personal, no de una cita en
      particular): es el que usa `generateWhatsAppConfirmLink` (ver
      `lib/whatsappConfirm.js`) para las citas virtuales cuando el evento no
      trae uno propio — así el asesor no tiene que escribir un link cada vez
      que agenda una cita virtual, sólo lo guarda una vez aquí.
    */
    zoomLink: typeof stored?.zoomLink === 'string' ? stored.zoomLink : '',
  };
}

export function saveAdvisorProfile(username, profile) {
  if (!username) return;
  try {
    localStorage.setItem(KEY, JSON.stringify({
      ...readAll(),
      [username]: {
        displayName: profile.displayName ?? '',
        phone: profile.phone ?? '',
        zoomLink: profile.zoomLink ?? '',
      },
    }));
  } catch {
    // Sin persistencia los datos viven sólo en esta sesión.
  }
}

/** Iniciales para el avatar: hasta dos, a partir del nombre o del usuario. */
export function initialsFrom(displayName, username) {
  const source = (displayName || username || '').trim();
  if (!source) return '?';
  return source
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word.charAt(0).toUpperCase())
    .join('');
}
