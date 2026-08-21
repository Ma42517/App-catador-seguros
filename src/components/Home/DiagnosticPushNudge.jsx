import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Gift, Target, Inbox, Flame, X, ArrowRight,
} from 'lucide-react';

/**
 * src/components/Home/DiagnosticPushNudge.jsx
 *
 * "Push" al estilo Duolingo, justo debajo de la barra de Objetivo Diario
 * (`DailyGoalBar.jsx`) en la pantalla "Hoy": mientras la agenda de hoy esté
 * vacía, SIEMPRE hay algo que sugerir — nunca se deja el espacio en blanco
 * ni depende de un único escenario. Cruza el inventario de Diagnósticos
 * Financieros 360 (todo asesor arranca con `DEFAULT_DIAGNOSTICS` de
 * cortesía, `data/diagnosticInventory.js`) con la lista de prospectos
 * capturada al entrar por primera vez (`FirstLoginIntro.jsx`, Paso 3 →
 * `data/safeZone.js`) en cuatro combinaciones posibles (`resolveState`,
 * más abajo) — la única condición para que algo se muestre es que la
 * agenda esté libre, no una combinación específica de inventario/lista.
 *
 * El descarte (la X) sólo dura lo que dura esta visita a "Hoy": es estado
 * local, sin persistencia. Cada vez que la persona entra de nuevo —recarga
 * la página, vuelve de otra pestaña de la app— la sugerencia puede volver
 * a aparecer si la agenda sigue libre. Es exactamente el mismo espíritu
 * "push" que Duolingo: una notificación que se repite en cada entrada
 * mientras la condición se mantenga, no una que se apague para siempre
 * con un solo toque.
 */

/** Primer nombre del prospecto de la Zona Segura (`{ nombre, telefono }`, ver `data/safeZone.js`). */
function firstName(prospect) {
  return (prospect?.nombre || 'uno de tus contactos').split(' ')[0];
}

/**
 * Cuál de las cuatro combinaciones aplica, y su contenido (mensaje corto de
 * una línea, ícono y si tiene una acción real de 1 clic o es sólo
 * informativa). Sólo la combinación "tiene Diagnósticos y tiene
 * prospectos" abre una pantalla real (`onUseDiagnostic`, ya conectada
 * hasta el Diagnóstico 360 real vía `Shell`/`TodayView`/`AISequence`); las
 * otras tres todavía no tienen una pantalla propia a la que saltar, así
 * que quedan como recordatorio sin acción — mejor un aviso honesto que un
 * botón que no lleva a ningún lado.
 */
function resolveState({ diagnosticsCount, prospect, hasProspects }) {
  const hasDiagnostics = diagnosticsCount > 0;

  if (hasDiagnostics && hasProspects) {
    return {
      icon: Gift,
      message: `Usa un Diagnóstico 360 con ${firstName(prospect)}`,
      actionable: true,
    };
  }
  if (!hasDiagnostics && hasProspects) {
    return {
      icon: Target,
      message: `Contacta a ${firstName(prospect)} y suma puntos para tu próximo Diagnóstico`,
      actionable: false,
    };
  }
  if (hasDiagnostics && !hasProspects) {
    return {
      icon: Inbox,
      message: 'Tu agenda está libre: es buen momento para pedir referidos',
      actionable: false,
    };
  }
  return {
    icon: Flame,
    message: 'Agenda libre y sin prospectos en fila. Hoy es día de prospectar',
    actionable: false,
  };
}

/**
 * @param {{ nombre: string, telefono: string }[]} prospects - Zona Segura (`readSafeZone`), los apoyos capturados en el Paso 3 del primer ingreso.
 * @param {number} diagnosticsCount - Diagnósticos disponibles en el inventario (`useDiagnosticInventory`).
 * @param {boolean} hasAgendaToday - `true` si ya hay algo agendado hoy: el push sólo tiene sentido con la agenda libre.
 * @param {string} username - Clave de la persona, para recordar el descarte del día.
 * @param {(prospect: object) => void} [onUseDiagnostic] - Se dispara al tocar la fila, sólo cuando el estado es "accionable" (hay Diagnósticos y prospectos).
 */
export default function DiagnosticPushNudge({
  prospects = [], diagnosticsCount = 0, hasAgendaToday, onUseDiagnostic,
}) {
  // Sin persistencia a propósito (ver nota de arriba): se reinicia en cada
  // montaje, así que cada nueva entrada a "Hoy" vuelve a mostrar el push.
  const [dismissed, setDismissed] = useState(false);

  // Única condición para mostrar algo: la agenda de hoy está libre. Qué se
  // sugiere ya lo decide `resolveState` con lo que haya disponible.
  if (hasAgendaToday || dismissed) return null;

  const hasProspects = prospects.length > 0;
  const prospect = hasProspects ? prospects[0] : null;
  const state = resolveState({ diagnosticsCount, prospect, hasProspects });
  const Icon = state.icon;

  const dismiss = () => setDismissed(true);

  const Row = state.actionable ? 'button' : 'div';

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
        <Row
          type={state.actionable ? 'button' : undefined}
          onClick={state.actionable ? () => onUseDiagnostic?.(prospect) : undefined}
          className="flex min-w-0 flex-1 items-center gap-3 text-left
                     focus-visible:outline-none"
        >
          <span
            className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border
                       border-amber-500/30 bg-amber-500/10 text-amber-400"
            aria-hidden="true"
          >
            <Icon size={14} strokeWidth={1.8} aria-hidden="true" />
          </span>

          <span className="min-w-0 flex-1 truncate text-sm font-medium text-slate-200">
            {state.message}
          </span>

          {state.actionable && (
            <ArrowRight
              size={15}
              className="shrink-0 text-slate-500 transition-colors group-hover:text-amber-400"
              aria-hidden="true"
            />
          )}
        </Row>

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
