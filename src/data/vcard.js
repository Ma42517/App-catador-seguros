/**
 * Construcción de la tarjeta de contacto (vCard) que viaja dentro del QR.
 *
 * Se usa vCard y no una URL porque el QR tiene que servir sin depender de que
 * la app esté publicada ni de que el prospecto tenga señal: al escanearlo con
 * la cámara, el teléfono reconoce el formato y ofrece guardar el contacto en
 * el acto. Una URL obligaría a abrir el navegador y a copiar los datos a mano.
 */

/** Versión 3.0 y no 4.0: es la que reconocen tanto iOS como Android sin peros. */
const VERSION = '3.0';

/**
 * Escapa un valor según la especificación de vCard.
 *
 * La barra invertida va primero: si se hiciera al final, escaparía las barras
 * que las sustituciones anteriores acaban de introducir.
 */
function escapeValue(value) {
  return String(value ?? '')
    .replace(/\\/g, '\\\\')
    .replace(/\n/g, '\\n')
    .replace(/,/g, '\\,')
    .replace(/;/g, '\\;');
}

/** Deja sólo dígitos y el `+` inicial, como espera un campo `TEL`. */
function phoneValue(value) {
  return String(value ?? '').replace(/[^\d+]/g, '');
}

/**
 * Divide el nombre en apellidos y nombre de pila para el campo `N`.
 *
 * Es una aproximación: en México lo normal son dos apellidos al final, así que
 * se toma la última palabra como apellido y el resto como nombre. No siempre
 * acierta, pero `FN` lleva el nombre completo tal cual se escribió, que es lo
 * que el teléfono muestra en la ficha.
 */
function splitName(fullName) {
  const parts = String(fullName ?? '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { given: '', family: '' };
  if (parts.length === 1) return { given: parts[0], family: '' };
  return { given: parts.slice(0, -1).join(' '), family: parts.at(-1) };
}

/**
 * ¿Hay suficiente para que el QR valga la pena?
 *
 * Un QR con sólo `BEGIN`/`END` se escanea y crea un contacto vacío, lo que es
 * peor que no ofrecerlo: el prospecto cree que ya tiene los datos.
 */
export function canBuildVCard(card) {
  if (!card) return false;
  return Boolean(
    String(card.fullName ?? '').trim()
    && (phoneValue(card.phone) || phoneValue(card.whatsapp) || String(card.email ?? '').trim()),
  );
}

/** Texto vCard listo para codificarse en un QR. */
export function buildVCard(card = {}) {
  const {
    fullName, title, company, phone, whatsapp, email, license,
  } = card;

  const { given, family } = splitName(fullName);

  const lines = [
    'BEGIN:VCARD',
    `VERSION:${VERSION}`,
    // `N` va con sus cinco campos aunque estén vacíos: recortarlos hace que
    // algunos lectores descarten la línea entera.
    `N:${escapeValue(family)};${escapeValue(given)};;;`,
    `FN:${escapeValue(fullName)}`,
  ];

  if (company) lines.push(`ORG:${escapeValue(company)}`);
  if (title) lines.push(`TITLE:${escapeValue(title)}`);

  const cell = phoneValue(phone);
  if (cell) lines.push(`TEL;TYPE=CELL:${cell}`);

  /*
    El WhatsApp sólo se añade si es un número distinto al principal: repetido,
    el teléfono crea dos entradas iguales en la misma ficha.
  */
  const wa = phoneValue(whatsapp);
  if (wa && wa !== cell) lines.push(`TEL;TYPE=WORK:${wa}`);

  if (email) lines.push(`EMAIL;TYPE=INTERNET:${escapeValue(email)}`);
  if (license) lines.push(`NOTE:${escapeValue(`Cédula profesional: ${license}`)}`);

  lines.push('END:VCARD');

  // Salto de línea CRLF: es lo que pide la especificación, y los lectores más
  // estrictos ignoran el archivo si sólo encuentran LF.
  return `${lines.join('\r\n')}\r\n`;
}
