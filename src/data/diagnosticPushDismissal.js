/**
 * src/data/diagnosticPushDismissal.js
 *
 * Cuándo se descartó por última vez el "push" de Diagnósticos 360
 * (`DiagnosticPushNudge.jsx`, `components/Home/`). Se recuerda por día y no
 * para siempre: es una sugerencia oportuna del momento ("agenda libre hoy"),
 * no una advertencia permanente — descartarla hoy no debería esconderla
 * mañana, cuando la agenda vuelva a estar libre y la sugerencia sea
 * exactamente igual de válida otra vez.
 *
 * Mismo patrón de persistencia que `advisorPoints.js`/`safeZone.js`: una
 * sola clave de localStorage con un objeto `{ [username]: fecha }`.
 */
const KEY = 'df360:diagnosticPushDismissed:v1';

/** Mismo formato de fecha que usa `todayKey()` en `context/EventContext.jsx` — duplicado a propósito, para no acoplar la capa de datos al contexto de React. */
function todayKey() {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

function readAll() {
  try {
    const raw = localStorage.getItem(KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

/** ¿Ya se descartó el push por hoy? `false` para quien nunca lo ha tocado, o si la fecha guardada ya no es la de hoy. */
export function isDiagnosticPushDismissedToday(username) {
  if (!username) return false;
  return readAll()[username] === todayKey();
}

/** Marca el push como descartado por el resto del día de hoy. */
export function dismissDiagnosticPushToday(username) {
  if (!username) return;
  try {
    localStorage.setItem(KEY, JSON.stringify({ ...readAll(), [username]: todayKey() }));
  } catch {
    // Sin persistencia, el descarte sólo dura esta sesión.
  }
}
