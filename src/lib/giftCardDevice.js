/**
 * src/lib/giftCardDevice.js
 *
 * La llave que deja a un dispositivo entrar a su tarjeta sin volver a pedir la
 * clave. Mismo criterio que `diagnosticDevice.js`, con su propio prefijo para
 * que una cosa no pise la otra: el secreto lo genera el SERVIDOR al validar la
 * clave, y aquí sólo se guarda.
 *
 * Se escribe en `localStorage` y en cookie a la vez porque los dos se pierden de
 * formas distintas —limpiar datos del sitio, o el borrado automático de Safari en
 * webs que no se visitan—. Perder la llave no pierde la tarjeta: sus datos viven
 * en la base, y el asesor puede emitir otra clave.
 */
const PREFIX = 'df360:giftpass:';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

function cookieName(cardId) {
  return `df360_giftpass_${String(cardId).replace(/[^a-z0-9-]/gi, '')}`;
}

function readCookie(name) {
  if (typeof document === 'undefined') return '';
  const found = document.cookie
    .split(';')
    .map((chunk) => chunk.trim())
    .find((chunk) => chunk.startsWith(`${name}=`));
  return found ? decodeURIComponent(found.slice(name.length + 1)) : '';
}

export function readCardSecret(cardId) {
  if (!cardId || typeof window === 'undefined') return '';
  try {
    const stored = window.localStorage.getItem(`${PREFIX}${cardId}`);
    if (stored) return stored;
  } catch { /* queda la cookie */ }
  return readCookie(cookieName(cardId));
}

export function saveCardSecret(cardId, secret) {
  if (!cardId || !secret || typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(`${PREFIX}${cardId}`, secret);
  } catch { /* queda la cookie */ }
  try {
    // `Secure` sólo con HTTPS: en desarrollo el navegador la descartaría y la
    // tarjeta parecería no recordarse nunca.
    const secure = window.location.protocol === 'https:' ? '; Secure' : '';
    document.cookie = `${cookieName(cardId)}=${encodeURIComponent(secret)}`
      + `; path=/; max-age=${COOKIE_MAX_AGE}; SameSite=Lax${secure}`;
  } catch { /* queda localStorage */ }
}

export function clearCardSecret(cardId) {
  if (!cardId || typeof window === 'undefined') return;
  try { window.localStorage.removeItem(`${PREFIX}${cardId}`); } catch { /* nada */ }
  try { document.cookie = `${cookieName(cardId)}=; path=/; max-age=0`; } catch { /* nada */ }
}
