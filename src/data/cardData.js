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

/** Plantillas soportadas; 'editorial' es la de las tarjetas viejas (default). */
export const TEMPLATES = ['editorial', 'executive', 'creator'];
export const DEFAULT_TEMPLATE = 'editorial';

/**
 * Capacidades por plantilla: qué campos EXTRA usa cada diseño.
 *
 * Centralizar esto aquí evita condicionales sueltos por el editor y el visor:
 * cada componente pregunta `templateFeatures(t).backAvatar` en vez de comparar
 * el nombre de la plantilla a mano. Una plantilla nueva declara aquí lo que usa
 * y el resto de la app se adapta sola.
 *
 * · backAvatar → la plantilla tiene una FOTO propia en el reverso (además de la
 *   del frente). Sólo 'creator' la usa hoy; por eso su recortador sólo aparece
 *   con esa plantilla y las viejas no muestran nada de más.
 */
const TEMPLATE_FEATURES = {
  editorial: { backAvatar: false },
  executive: { backAvatar: false },
  creator: { backAvatar: true },
};

export function templateFeatures(value) {
  return TEMPLATE_FEATURES[normalizeTemplate(value)] ?? TEMPLATE_FEATURES.editorial;
}

/** Cuántas píldoras caben en la tarjeta. Más allá de esto no se muestran. */
export const MAX_PILDORAS = 4;

/** Sólo las plantillas listadas son válidas; cualquier otra cae al default. */
export function normalizeTemplate(value) {
  return TEMPLATES.includes(value) ? value : DEFAULT_TEMPLATE;
}

/**
 * Encuadre de la foto como { ox, oy, zoom }.
 *
 * Acepta el objeto directo (lo que usa el editor en vivo) o su forma serializada
 * como texto JSON (lo que devuelve la base, porque photo_focus es una columna de
 * texto). Cualquier cosa rara cae a "centrado y sin zoom", que nunca rompe la
 * tarjeta. ox/oy son porcentajes de traslación; zoom, el acercamiento.
 */
export function normalizeFocus(value) {
  let v = value;
  if (typeof v === 'string') {
    try { v = JSON.parse(v); } catch { v = null; }
  }
  if (!v || typeof v !== 'object') return { ox: 0, oy: 0, zoom: 1 };
  const num = (n, d) => (Number.isFinite(Number(n)) ? Number(n) : d);
  return { ox: num(v.ox, 0), oy: num(v.oy, 0), zoom: num(v.zoom, 1) || 1 };
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

/**
 * Contactos publicables que NO son columna propia (los que van en cardExtra).
 *
 * Ya no hay `web`: se quitó el canal de sitio web del editor del cliente. Si una
 * tarjeta vieja lo trae guardado, simplemente se ignora al no incluirlo aquí.
 */
export function normalizeContactos(value) {
  const c = value && typeof value === 'object' ? value : {};
  return {
    maps: String(c.maps ?? '').trim(),
    instagram: String(c.instagram ?? '').trim(),
    email: String(c.email ?? '').trim(),
  };
}

/**
 * Cara trasera de la tarjeta (mensaje destacado + agenda).
 *
 * Ya no hay `videoUrl`: en la tarjeta del cliente se quitó la posibilidad de
 * poner video. `bookingUrl` guarda hoy el enlace público de la agenda de Google
 * Calendar; se conserva ese mismo nombre a propósito, para que cuando se conecte
 * la sincronización real de Google no haya que migrar datos.
 */
export function normalizeReverso(value) {
  const r = value && typeof value === 'object' ? value : {};
  /*
    bookingMode decide cómo recibe las citas quien no tiene sincronización real de
    Google todavía:
     · 'whatsapp' → el botón Agendar abre WhatsApp con el mensaje prellenado.
     · 'link'     → abre el enlace público de agenda de Google Calendar (bookingUrl).
    Se guarda desde ya para que, cuando exista la conexión automática con Google,
    sólo se agregue un modo más sin migrar lo existente.
  */
  const mode = r.bookingMode === 'link' ? 'link' : 'whatsapp';
  return {
    ctaTitulo: String(r.ctaTitulo ?? '').trim(),
    ctaBadge: String(r.ctaBadge ?? '').trim(),
    ctaSubtitulo: String(r.ctaSubtitulo ?? '').trim(),
    bookingMode: mode,
    bookingUrl: String(r.bookingUrl ?? '').trim(),
    bookingTexto: String(r.bookingTexto ?? '').trim(),
    // Foto propia del reverso (sólo la usan las plantillas con backAvatar).
    backAvatarUrl: r.backAvatarUrl ?? null,
    backAvatarPath: r.backAvatarPath ?? null,
    backPhotoFocus: normalizeFocus(r.backPhotoFocus),
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
    photoFocus: normalizeFocus(raw.photoFocus),
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
  // photo_focus es columna de TEXTO y el RPC la lee con ->> (texto). Se serializa
  // el encuadre a JSON para que quepa; al leer, normalizeFocus lo vuelve a objeto.
  const focusText = JSON.stringify(normalizeFocus(cardData.photoFocus));
  const reverso = normalizeReverso(cardData.reverso);
  return {
    fullName: cardData.fullName,
    title: cardData.title,
    company: cardData.company,
    bio: cardData.bio,
    phone: cardData.phone,
    whatsapp: cardData.whatsapp,
    photoFocus: focusText,
    template: normalizeTemplate(cardData.template),
    estadoPill: cardData.estadoPill,
    pildoras: normalizePildoras(cardData.pildoras),
    cardExtra: {
      contactos: normalizeContactos(cardData.contactos),
      // El encuadre del reverso también serializado, por el mismo motivo.
      reverso: { ...reverso, backPhotoFocus: JSON.stringify(reverso.backPhotoFocus) },
    },
  };
}
