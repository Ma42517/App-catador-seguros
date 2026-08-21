/**
 * src/data/diagnosticInventory.js
 *
 * Inventario de Diagnósticos Financieros 360 que cada asesor puede regalar
 * a sus prospectos. Todo asesor arranca con `DEFAULT_DIAGNOSTICS` de
 * cortesía — es el punto de partida declarado del producto, no un valor que
 * alguien tenga que activar a mano — y ese arranque es justo la razón por
 * la que "nunca haber guardado nada para esta persona" no significa "cero":
 * significa "todavía no tocó su inventario inicial".
 *
 * Mismo patrón de persistencia que `advisorPoints.js`/`safeZone.js`: una
 * sola clave de localStorage con un objeto `{ [username]: cantidad }`, en
 * vez de una entrada de storage por persona.
 */
const KEY = 'df360:diagnosticInventory:v1';

/** Con cuántos Diagnósticos arranca toda cuenta nueva — sin tope máximo hacia arriba, sólo este piso de cortesía al inicio. */
export const DEFAULT_DIAGNOSTICS = 5;

function readAll() {
  try {
    const raw = localStorage.getItem(KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

/**
 * Diagnósticos disponibles de una persona: `DEFAULT_DIAGNOSTICS` si nunca se
 * ha escrito nada para ella —la cortesía de arranque—, y nunca un `0` que
 * en realidad significa "dato ausente": un inventario en cero sólo se
 * devuelve si de verdad se guardó ese cero alguna vez (al gastar el
 * último, por ejemplo), nunca por ausencia del registro.
 */
export function readDiagnosticsCount(username) {
  if (!username) return DEFAULT_DIAGNOSTICS;
  const value = readAll()[username];
  return typeof value === 'number' && value >= 0 ? value : DEFAULT_DIAGNOSTICS;
}

/** @param {string} username @param {number} count - Nunca se guarda por debajo de 0. */
export function writeDiagnosticsCount(username, count) {
  if (!username) return;
  try {
    localStorage.setItem(KEY, JSON.stringify({ ...readAll(), [username]: Math.max(0, count) }));
  } catch {
    // Sin persistencia, el inventario vive sólo en esta sesión.
  }
}
