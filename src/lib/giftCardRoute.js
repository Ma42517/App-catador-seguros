/**
 * Ruta pública de una tarjeta digital de regalo: `/mi-tarjeta/<uuid>`.
 *
 * Vive aislada del mundo del asesor. Se resuelve en `App.jsx` antes de montar
 * `SessionProvider`, igual que la tarjeta del asesor y el diagnóstico público:
 * así el cliente que abre su tarjeta —y entra con su propio Google— nunca toca
 * el Gate ni crea una ficha de asesor.
 */
const ROOT = '/mi-tarjeta';
const PREFIX = `${ROOT}/`;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function giftCardRoute(pathname) {
  const path = pathname ?? (typeof window !== 'undefined' ? window.location.pathname : '');
  if (path !== ROOT && !path.startsWith(PREFIX)) {
    return { matched: false, cardId: null };
  }

  const raw = path === ROOT ? '' : path.slice(PREFIX.length).replace(/\/+$/, '');
  let cardId = '';
  try {
    cardId = decodeURIComponent(raw);
  } catch {
    return { matched: true, cardId: null };
  }

  return { matched: true, cardId: UUID.test(cardId) ? cardId : null };
}

export function giftCardUrl(cardId) {
  if (typeof window === 'undefined' || !cardId) return '';
  return `${window.location.origin}${PREFIX}${cardId}`;
}
