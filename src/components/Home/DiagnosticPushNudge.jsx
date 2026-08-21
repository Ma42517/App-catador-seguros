import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Gift, X, ArrowRight } from 'lucide-react';
import {
  isDiagnosticPushDismissedToday, dismissDiagnosticPushToday,
} from '../../data/diagnosticPushDismissal';

/**
 * src/components/Home/DiagnosticPushNudge.jsx
 *
 * "Push" al estilo Duolingo, justo debajo de la barra de Objetivo Diario
 * (`DailyGoalBar.jsx`) en la pantalla "Hoy": cuando la agenda de hoy está
 * vacía, en vez de dejar el espacio en blanco, empuja a la persona hacia
 * la Siguiente Mejor Acción — usar uno de sus Diagnósticos Financieros 360
 * (todo asesor arranca con `DEFAULT_DIAGNOSTICS` de cortesía, ver
 * `data/diagnosticInventory.js`) con alguien de la lista de prospectos que
 * ya capturó al entrar por primera vez a la app (`FirstLoginIntro.jsx`,
 * Paso 3 → `data/safeZone.js`).
 *
 * Éste es el **Escenario 1**: tiene Diagnósticos disponibles Y tiene
 * prospectos de esa lista inicial sin haber usado ninguno con ellos
 * todavía. Es un componente aparte de `SmartEmptyState.jsx` —que ya cubre
 * las cuatro combinaciones de inventario/prospectos como un remplazo
 * completo de la pantalla— porque este "push" vive en un lugar fijo del
 * recorrido (siempre debajo del Objetivo Diario, nunca ocupando el centro
 * de la pantalla) y sólo habla de este escenario puntual; los demás
 * escenarios de esta misma familia (sin Diagnósticos, sin prospectos de
 * arranque, agenda ya ocupada...) son ampliaciones futuras de este mismo
 * componente, no de `SmartEmptyState`.
 *
 * Se puede descartar por el resto del día (`dismissDiagnosticPushToday`):
 * es una sugerencia oportuna del momento, no una advertencia permanente —
 * la persona no tiene por qué volver a verla cada vez que abre "Hoy" si ya
 * dijo que no le interesa por ahora, pero tampoco debería desaparecer para
 * siempre por un solo toque.
 */

/** Primer nombre del prospecto de la Zona Segura (`{ nombre, telefono }`, ver `data/safeZone.js`). */
function firstName(prospect) {
  return (prospect?.nombre || 'uno de tus contactos').split(' ')[0];
}

/*
  Una sola fila, del mismo tamaño que cualquier otra tarjeta delgada de
  "Hoy" (`ActionableCard.jsx`) — no un bloque destacado con eyebrow, título
  y mensaje largo aparte: el pedido explícito fue "más simple y
  minimalista", del mismo peso visual con el que la app ya empuja
  cualquier otra sugerencia mientras hay tiempo libre. Todo el mensaje
  cabe en la propia fila ("Usa un Diagnóstico 360 con {nombre}"), sin
  eyebrow ni párrafo separado.
*/

/**
 * @param {{ nombre: string, telefono: string }[]} prospects - Zona Segura (`readSafeZone`), los apoyos capturados en el Paso 3 del primer ingreso.
 * @param {number} diagnosticsCount - Diagnósticos disponibles en el inventario (`useDiagnosticInventory`).
 * @param {boolean} hasAgendaToday - `true` si ya hay algo agendado hoy: el push sólo tiene sentido con la agenda libre.
 * @param {string} username - Clave de la persona, para recordar el descarte del día.
 * @param {(prospect: object) => void} [onUseDiagnostic] - Se dispara al tocar "Usar Diagnóstico 360", con el prospecto sugerido.
 */
export default function DiagnosticPushNudge({
  prospects = [], diagnosticsCount = 0, hasAgendaToday, username, onUseDiagnostic,
}) {
  const [dismissed, setDismissed] = useState(
    () => isDiagnosticPushDismissedToday(username),
  );

  const eligible = !hasAgendaToday && diagnosticsCount > 0 && prospects.length > 0;
  if (!eligible || dismissed) return null;

  const prospect = prospects[0];

  const dismiss = () => {
    dismissDiagnosticPushToday(username);
    setDismissed(true);
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        role="status"
        /*
          Misma escala que el resto de tarjetas delgadas de "Hoy"
          (`ActionableCard.jsx`, `PriorityAlerts.jsx`): una fila, no un
          bloque — la app "empuja" con el mismo peso visual con el que ya
          avisa cualquier otra cosa, en vez de reclamar una tarjeta grande
          para sí misma.
        */
        className="group flex w-full items-center gap-2 rounded-xl border
                   border-slate-800/50 bg-slate-900 p-3 transition-colors
                   hover:border-amber-500/30"
      >
        <button
          type="button"
          onClick={() => onUseDiagnostic?.(prospect)}
          className="flex min-w-0 flex-1 items-center gap-3 text-left
                     focus-visible:outline-none"
        >
          <span
            className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border
                       border-amber-500/30 bg-amber-500/10 text-amber-400"
            aria-hidden="true"
          >
            <Gift size={14} strokeWidth={1.8} aria-hidden="true" />
          </span>

          <span className="min-w-0 flex-1 truncate text-sm font-medium text-slate-200">
            Usa un Diagnóstico 360 con {firstName(prospect)}
          </span>

          <ArrowRight
            size={15}
            className="shrink-0 text-slate-500 transition-colors group-hover:text-amber-400"
            aria-hidden="true"
          />
        </button>

        <button
          type="button"
          onClick={dismiss}
          aria-label="Descartar por hoy"
          className="grid h-6 w-6 shrink-0 place-items-center rounded-full text-slate-500
                     transition-colors hover:bg-white/5 hover:text-slate-300
                     focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/30"
        >
          <X size={12} aria-hidden="true" />
        </button>
      </motion.div>
    </AnimatePresence>
  );
}
