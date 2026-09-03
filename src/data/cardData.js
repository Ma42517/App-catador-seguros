/**
 * Normalización del modelo de datos de la tarjeta (cardData).
 *
 * Este helper es PURO (sin efectos ni dependencias del backend) y concentra en un
 * solo sitio la "forma" del cardData nuevo, para que el repo y los componentes del
 * editor y del visor no repitan la misma lógica de defaults ni tengan que adivinar
 * qué claves existen.
 *
 * ── Mapeos con el esquema de la base ──
 * · pildoras   ↔ specialties (jsonb): son el MISMO dato. specialties es el nombre
 *   viejo que ya vive en la columna; pildoras es como lo llama el editor nuevo. Se
 *   normaliza a un array de máximo 4 textos (la tarjeta no muestra más).
 * · phone/whatsapp: siguen siendo COLUMNAS tipadas propias, no van en cardExtra;
 *   por eso viven en el nivel superior del cardData y no dentro de `contactos`.
 * · contactos (maps, instagram, email, web) y reverso (video + CTA + booking) NO
 *   tienen columna propia: viajan dentro de cardExtra, que en la base es una única
 *   columna jsonb.
 */

/** Las dos únicas plantillas soportadas; 'editorial' es la de las tarjetas viejas. */
export const TEMPLATES = ['editorial', 'executive'];
export const DEFAULT_TEMPLATE = 'editorial';

/** Cuántas píldoras caben en la tarjeta. Más allá de esto no se muestran. */
export const MAX_PILDORAS = 4;

/** Sólo 'editorial'/'executive' son válidas; cualquier otra cae al default. */
export function normalizeTemplate(value) {
  return TEMPLATES.includes(value) ? value : DEFAULT_TEMPLATE;
}

/**
 * Píldoras como array de hasta 4 textos no vacíos.
 *
 * Acepta lo que llegue (array o valor suelto), descarta lo que no sea texto útil
 * y recorta al máximo. Se usa tanto al leer (specialties de la base) como al
 * escribir (lo que el editor manda como pildoras).
 */
export function normalizePildoras(value) {
  const list = Array.isArray(value) ? value : [];
  return list
    .map((item) => String(item ?? '').trim())
    .filter(Boolean)
    .slice(0, MAX_PILDORAS);
}

/** Contactos publicables que NO son columna propia (los que van en cardExtra). */
export function normalizeContactos(value) {
  const c = value && typeof value === 'object' ? value : {};
  return {
    maps: String(c.maps ?? '').trim(),
    instagram: String(c.instagram ?? '').trim(),
    email: String(c.email ?? '').trim(),
    web: String(c.web ?? '').trim(),
  };
}

/** Cara trasera de la tarjeta (video + llamada a la acción + agenda). */
export function normalizeReverso(value) {
  const r = value && typeof value === 'object' ? value : {};
  return {
    videoUrl: String(r.videoUrl ?? '').trim(),
    ctaTitulo: String(r.ctaTitulo ?? '').trim(),
    ctaBadge: String(r.ctaBadge ?? '').trim(),
    ctaSubtitulo: String(r.ctaSubtitulo ?? '').trim(),
    bookingUrl: String(r.bookingUrl ?? '').trim(),
    bookingTexto: String(r.bookingTexto ?? '').trim(),
  };
}

/**
 * Da forma completa al cardData que sale del backend, para el front.
 *
 * Recibe la respuesta cruda del RPC (que ya trae pildoras alias de specialties,
 * template, estadoPill y cardExtra o los objetos contactos/reverso derivados) y
 * devuelve un objeto con todas las claves presentes y con defaults sanos, para que
 * el editor y el visor nunca tengan que comprobar si algo es null.
 */
export function normalizeCardData(raw = {}) {
  // cardExtra puede llegar entero (my_gift_card) o desglosado en contactos/reverso
  // (public_gift_card); se contemplan ambos caminos.
  const extra = raw.cardExtra && typeof raw.cardExtra === 'object' ? raw.cardExtra : {};
  return {
    fullName: String(raw.fullName ?? '').trim(),
    title: String(raw.title ?? '').trim(),
    company: String(raw.company ?? '').trim(),
    bio: String(raw.bio ?? '').trim(),
    phone: String(raw.phone ?? '').trim(),
    whatsapp: String(raw.whatsapp ?? '').trim(),
    photoFocus: raw.photoFocus ?? null,
    avatarUrl: raw.avatarUrl ?? null,
    template: normalizeTemplate(raw.template),
    estadoPill: String(raw.estadoPill ?? '').trim(),
    // specialties es el origen real; pildoras es su alias.
    pildoras: normalizePildoras(raw.pildoras ?? raw.specialties),
    contactos: normalizeContactos(raw.contactos ?? extra.contactos),
    reverso: normalizeReverso(raw.reverso ?? extra.reverso),
  };
}

/**
 * Convierte el cardData del editor en el patch que espera save_gift_card.
 *
 * Deja pildoras como tal (el RPC las escribe en specialties), y empaqueta contactos
 * y reverso dentro de cardExtra, que es lo que el RPC fusiona con merge superficial.
 * phone/whatsapp quedan en el nivel superior porque son columnas propias.
 */
export function toSavePatch(cardData = {}) {
  return {
    fullName: cardData.fullName,
    title: cardData.title,
    company: cardData.company,
    bio: cardData.bio,
    phone: cardData.phone,
    whatsapp: cardData.whatsapp,
    photoFocus: cardData.photoFocus,
    template: normalizeTemplate(cardData.template),
    estadoPill: cardData.estadoPill,
    pildoras: normalizePildoras(cardData.pildoras),
    cardExtra: {
      contactos: normalizeContactos(cardData.contactos),
      reverso: normalizeReverso(cardData.reverso),
    },
  };
}
