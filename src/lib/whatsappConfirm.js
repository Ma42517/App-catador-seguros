/**
 * src/lib/whatsappConfirm.js
 *
 * Mensaje y enlace de `wa.me` para confirmar una cita, con degradación
 * elegante en el escenario virtual: si el asesor no tiene guardado su link
 * fijo de Zoom/Meet (`userSettings.zoomLink`, `data/advisorProfile.js`), el
 * mensaje no promete un enlace que no existe — se adapta a un recordatorio
 * simple, y el asesor lo comparte después, sin haber bloqueado el resto de
 * la confirmación por un dato que no tenía a la mano.
 */

/** Sólo dígitos y el `+` inicial, que es lo que `wa.me` espera. */
function digitsOnly(value) {
  return String(value ?? '').replace(/[^\d+]/g, '');
}

/**
 * Texto del mensaje, sin codificar todavía.
 *
 * - CASO A — Presencial: requiere `location` (la dirección o el nombre del
 *   lugar); sin ella el mensaje seguiría siendo válido pero mudo sobre dónde
 *   es, así que se cae al Caso C con un texto neutro si no hay nada que
 *   decir.
 * - CASO B — Virtual con `userSettings.zoomLink` guardado: lo incluye.
 * - CASO C — Virtual sin `zoomLink` (vacío, `null` o `undefined`): no
 *   inventa un enlace, avisa que llega después.
 */
export function buildConfirmMessage(clientName, time, modality, location, userSettings = {}) {
  const name = clientName || 'tu prospecto';
  const hour = time || '';
  const zoomLink = userSettings?.zoomLink?.trim();

  if (modality === 'virtual') {
    return zoomLink
      ? `Hola ${name}, te escribo para confirmarte nuestra cita de hoy a las ${hour}. `
        + `Nos vemos por videollamada en este enlace: ${zoomLink}. ¡Un saludo!`
      : `Hola ${name}, te escribo para confirmarte nuestra cita virtual de hoy a las ${hour}. `
        + 'En un momento te comparto el acceso. ¡Un saludo!';
  }

  const place = location?.trim();
  return place
    ? `Hola ${name}, te escribo para confirmarte nuestra cita de hoy a las ${hour}. `
      + `Nos vemos en ${place}. ¡Un saludo!`
    : `Hola ${name}, te escribo para confirmarte nuestra cita de hoy a las ${hour}. ¡Un saludo!`;
}

/**
 * Enlace completo de `wa.me` con el mensaje ya codificado, o `null` si no
 * hay un teléfono al que mandarlo — mismo criterio que el resto de los
 * botones de WhatsApp de la app: sin dato no hay acción, no un enlace roto.
 *
 * @param {{name?: string, phone?: string}} client
 * @param {string} time Hora de la cita, tal como la muestra la agenda ("18:00").
 * @param {'presencial'|'virtual'} modality
 * @param {string} location Dirección o lugar; sólo aplica cuando `modality` es 'presencial'.
 * @param {{zoomLink?: string}} userSettings Ajustes del asesor (`data/advisorProfile.js`).
 */
export function generateWhatsAppConfirmLink(client, time, modality, location, userSettings = {}) {
  const phone = digitsOnly(client?.phone);
  if (!phone) return null;

  const message = buildConfirmMessage(client?.name, time, modality, location, userSettings);
  return `https://wa.me/${phone.replace(/^\+/, '')}?text=${encodeURIComponent(message)}`;
}
