/** Ruta pública de una Radiografía Patrimonial: `/diagnostico/<uuid>`. */
const ROOT = '/diagnostico';
const PREFIX = `${ROOT}/`;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Distingue una URL ajena de una ruta de diagnóstico malformada. Esto evita
 * que un enlace incompleto caiga al login como si fuera una pantalla privada.
 */
export function publicDiagnosticRoute(pathname) {
  const path = pathname ?? (typeof window !== 'undefined' ? window.location.pathname : '');
  if (path !== ROOT && !path.startsWith(PREFIX)) {
    return { matched: false, diagnosticId: null };
  }

  const raw = path === ROOT ? '' : path.slice(PREFIX.length).replace(/\/+$/, '');
  let diagnosticId = '';
  try {
    diagnosticId = decodeURIComponent(raw);
  } catch {
    return { matched: true, diagnosticId: null };
  }

  return {
    matched: true,
    diagnosticId: UUID.test(diagnosticId) ? diagnosticId : null,
  };
}

export function publicDiagnosticUrl(diagnosticId) {
  if (typeof window === 'undefined' || !diagnosticId) return '';
  return `${window.location.origin}${PREFIX}${diagnosticId}`;
}
