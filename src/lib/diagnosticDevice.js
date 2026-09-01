/**
 * src/lib/diagnosticDevice.js
 *
 * La llave que deja a un dispositivo entrar a su Radiografía Patrimonial sin
 * volver a pedir el código.
 *
 * El secreto lo genera el SERVIDOR al reclamar el pase y aquí sólo se guarda.
 * Es deliberado: si lo generara el navegador, su calidad dependería del
 * dispositivo, y la base guarda únicamente el hash, así que una llave débil no
 * se podría detectar después.
 *
 * ## Por qué se guarda en dos sitios
 * `localStorage` es lo natural, pero se borra con más facilidad de lo que
 * parece: limpiar datos del sitio, y en Safari de iPhone el propio sistema
 * puede eliminar el almacenamiento de una web que no se visita en varios días.
 * La cookie sobrevive algunos de esos casos y viceversa, así que se escribe en
 * ambos y se lee del que quede. No es paranoia: perder la llave significa
 * pedirle otro código al asesor.
 *
 * Perder la llave nunca pierde el diagnóstico: las respuestas viven en la base.
 */
const PREFIX = 'df360:diagpass:';
/** Un año. El pase se revoca desde la app, no por caducidad del navegador. */
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

function cookieName(diagnosticId) {
  // Los dos puntos no son válidos en el nombre de una cookie.
  return `df360_diagpass_${String(diagnosticId).replace(/[^a-z0-9-]/gi, '')}`;
}

function readCookie(name) {
  if (typeof document === 'undefined') return '';
  const found = document.cookie
    .split(';')
    .map((chunk) => chunk.trim())
    .find((chunk) => chunk.startsWith(`${name}=`));
  return found ? decodeURIComponent(found.slice(name.length + 1)) : '';
}

/** Llave guardada para este pase, del almacén que la conserve. */
export function readDeviceSecret(diagnosticId) {
  if (!diagnosticId || typeof window === 'undefined') return '';

  try {
    const stored = window.localStorage.getItem(`${PREFIX}${diagnosticId}`);
    if (stored) return stored;
  } catch {
    // Modo privado o almacenamiento bloqueado: queda la cookie.
  }

  return readCookie(cookieName(diagnosticId));
}

/** Guarda la llave en los dos almacenes, sin fallar si uno está bloqueado. */
export function saveDeviceSecret(diagnosticId, secret) {
  if (!diagnosticId || !secret || typeof window === 'undefined') return;

  try {
    window.localStorage.setItem(`${PREFIX}${diagnosticId}`, secret);
  } catch {
    // Sigue la cookie.
  }

  try {
    // `Secure` sólo donde existe HTTPS: en desarrollo el navegador la
    // descartaría en silencio y el pase parecería no recordarse nunca.
    const secure = window.location.protocol === 'https:' ? '; Secure' : '';
    document.cookie = `${cookieName(diagnosticId)}=${encodeURIComponent(secret)}`
      + `; path=/; max-age=${COOKIE_MAX_AGE}; SameSite=Lax${secure}`;
  } catch {
    // Sin cookies queda localStorage.
  }
}

/** Olvida la llave de este dispositivo, por ejemplo si el servidor la rechaza. */
export function clearDeviceSecret(diagnosticId) {
  if (!diagnosticId || typeof window === 'undefined') return;

  try {
    window.localStorage.removeItem(`${PREFIX}${diagnosticId}`);
  } catch { /* nada que limpiar */ }

  try {
    document.cookie = `${cookieName(diagnosticId)}=; path=/; max-age=0`;
  } catch { /* nada que limpiar */ }
}
