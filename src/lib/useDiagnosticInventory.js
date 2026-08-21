import { useState, useEffect, useRef, useCallback } from 'react';
import { readDiagnosticsCount, writeDiagnosticsCount } from '../data/diagnosticInventory';

/**
 * src/lib/useDiagnosticInventory.js
 *
 * Inventario de Diagnósticos 360, reactivo y persistido por usuario. Mismo
 * patrón que `useAdvisorPoints.js` (leer al montar, releer si cambia
 * `username`, y un `useRef` que evita escribir con el estado inicial antes
 * de que `username` esté resuelto): son dos economías distintas del mismo
 * asesor —puntos que se ganan, Diagnósticos que se gastan—, así que viven
 * en dos hooks separados en vez de fundirse en uno solo.
 *
 * @param {string} username - Clave de la persona (`identity.key` o `PREVIEW_KEY`).
 * @returns {[number, () => void]} Cantidad disponible y una función para
 *   gastar uno (nunca baja de 0; hoy no hay ningún llamador real todavía —
 *   se usará el día que "usar un Diagnóstico con un prospecto" quede
 *   conectado de punta a punta).
 */
export default function useDiagnosticInventory(username) {
  const [count, setCount] = useState(() => readDiagnosticsCount(username));
  const loadedFor = useRef(username);

  useEffect(() => {
    loadedFor.current = username;
    setCount(readDiagnosticsCount(username));
  }, [username]);

  const spendDiagnostic = useCallback(() => {
    setCount((current) => {
      const next = Math.max(0, current - 1);
      if (loadedFor.current === username) writeDiagnosticsCount(username, next);
      return next;
    });
  }, [username]);

  return [count, spendDiagnostic];
}
