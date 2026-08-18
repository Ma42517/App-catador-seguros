/**
 * src/lib/advisorPhone.js
 * De dónde sale el número del asesor para los enlaces de WhatsApp.
 *
 * No está escrito en el código a propósito, y no es sólo higiene: esta app la usan varios
 * asesores de una misma promotoría. Un número fijo mandaría los prospectos de todos al
 * teléfono de quien lo escribió.
 *
 * Se busca en tres sitios, en este orden:
 *
 *   1. La prop `advisorPhone`, si quien monta el componente ya lo sabe.
 *   2. El parámetro `?advisor=` de la dirección. Es lo que permite compartir un enlace del
 *      diagnóstico que apunte a un asesor concreto, incluso a quien no tiene sesión.
 *   3. El WhatsApp de la tarjeta digital de quien está en sesión, con el teléfono como
 *      respaldo: casi nadie llena los dos campos, y dejar el botón muerto por eso
 *      desperdicia la pantalla donde el prospecto ya dijo que sí.
 */

/**
 * Deja el número como lo quiere `wa.me`: sólo dígitos, sin el `+`.
 *
 * Es la misma normalización que ya usan la tarjeta digital y el seguimiento de prospectos.
 * `wa.me` exige la lada del país y rechaza espacios, guiones y paréntesis; un número que se
 * capturó como "(55) 1234-5678" abre un chat vacío sin decir por qué.
 */
export function normalizePhone(value) {
  return String(value ?? '').replace(/[^\d+]/g, '').replace(/^\+/, '');
}

/** Lee `?advisor=` (o `?advisorPhone=`) de la dirección. Cadena vacía si no viene. */
export function advisorPhoneFromUrl() {
  if (typeof window === 'undefined') return '';
  const params = new URLSearchParams(window.location.search);
  return normalizePhone(params.get('advisor') || params.get('advisorPhone') || '');
}

/**
 * Resuelve el número con la cadena de respaldos.
 *
 * @param prop     Número recibido como propiedad, si lo hay.
 * @param identity Identidad en sesión (`useSession`), para leer su tarjeta.
 */
export function resolveAdvisorPhone(prop, identity) {
  return normalizePhone(prop)
    || advisorPhoneFromUrl()
    || normalizePhone(identity?.whatsapp)
    || normalizePhone(identity?.phone);
}

/**
 * Enlace de WhatsApp con el mensaje ya escrito.
 *
 * Sin número devuelve un `wa.me` sin destinatario, que abre WhatsApp con el texto puesto y
 * deja elegir el contacto. Es peor que apuntar al asesor, pero muy mejor que un botón que no
 * hace nada: el mensaje se conserva y el prospecto puede enviarlo.
 */
export function whatsAppLink(phone, message) {
  const number = normalizePhone(phone);
  const text = encodeURIComponent(message);
  return number ? `https://wa.me/${number}?text=${text}` : `https://wa.me/?text=${text}`;
}
