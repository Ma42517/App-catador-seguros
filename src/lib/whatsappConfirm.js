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

/**
 * Línea de lugar compartida por los mensajes de Propuesta y Cierre: el
 * enlace de Zoom si es virtual y el asesor lo tiene guardado, la dirección
 * si es presencial, o nada si no hay ninguno de los dos — misma
 * degradación elegante que ya usa `buildConfirmMessage` (Caso C): nunca
 * inventa un dato que no existe, sólo omite la frase de lugar.
 */
function meetingPlaceLine(modality, location, zoomLink) {
  if (modality === 'virtual') {
    return zoomLink ? `por videollamada en este enlace: ${zoomLink}` : null;
  }
  const place = location?.trim();
  return place ? `en ${place}` : null;
}

/**
 * Plantillas de confirmación por etapa del embudo, posteriores a la Cita
 * Inicial (`ProposalCard.jsx`/`ClosingCard.jsx`, botón de WhatsApp). El texto de
 * cada etapa lo pidió el pedido tal cual; sólo la frase de lugar es
 * condicional, con la misma lógica de `meetingPlaceLine`.
 */
const STAGE_TEMPLATES = {
  propuesta: (name, hour, placeLine) => `Hola ${name}, te confirmo nuestra cita hoy a las ${hour}`
    + `${placeLine ? `, ${placeLine}` : ''}. Ya tengo listos los números y el diseño de tu plan a la medida.`,
  cierre: (name, hour, placeLine) => `Hola ${name}, te tengo excelentes noticias: tengo listo el `
    + `documento final de tu plan. Nos vemos hoy a las ${hour}${placeLine ? `, ${placeLine}` : ''} `
    + 'para revisarlo a detalle.',
};

/**
 * Enlace de `wa.me` para las etapas Propuesta y Cierre — mismo contrato que
 * `generateWhatsAppConfirmLink`, pero con el texto propio de cada etapa en
 * vez del de confirmación de la Cita Inicial.
 *
 * @param {'propuesta'|'cierre'} stage
 * @param {{name?: string, phone?: string}} client
 * @param {string} time
 * @param {'presencial'|'virtual'} modality
 * @param {string} location
 * @param {{zoomLink?: string}} userSettings
 */
export function generateStageWhatsAppLink(stage, client, time, modality, location, userSettings = {}) {
  const phone = digitsOnly(client?.phone);
  if (!phone) return null;

  const name = client?.name || 'tu prospecto';
  const hour = time || '';
  const zoomLink = userSettings?.zoomLink?.trim();
  const placeLine = meetingPlaceLine(modality, location, zoomLink);
  const buildMessage = STAGE_TEMPLATES[stage] ?? STAGE_TEMPLATES.propuesta;

  return `https://wa.me/${phone.replace(/^\+/, '')}?text=${encodeURIComponent(buildMessage(name, hour, placeLine))}`;
}
