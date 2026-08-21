import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Zap, Target, Inbox, Flame, RefreshCw, UserPlus, PlusCircle, PhoneCall, ArrowRight,
} from 'lucide-react';

/**
 * src/components/Home/SmartEmptyState.jsx
 *
 * "Asistente Proactivo" del Dashboard principal ("Hoy"): lo que se muestra
 * en vez de una agenda vacía cuando no hay ninguna actividad agendada para
 * el día. Vive junto al resto de piezas de esa pantalla (`AISequence.jsx`,
 * `PriorityAlerts.jsx`, `DailyGoalBar.jsx`) y no dentro de
 * `components/Dashboard/`, que es el tablero del Diagnóstico Financiero 360
 * (`ExecutiveDashboard.jsx`) — un módulo distinto, con su propio significado
 * de "dashboard".
 *
 * Cruza dos datos que la persona ya trae consigo —su inventario de
 * Diagnósticos (`diagnosticsCount`) y su lista de prospectos sin contactar
 * (`uncontactedProspects`)— para sugerir la Siguiente Mejor Acción, en vez
 * de dejar la pantalla en blanco. Es puramente presentacional: no decide
 * puntos, no descuenta inventario ni agenda nada por su cuenta — cada botón
 * dispara un callback y es quien lo recibe (la pantalla de "Hoy") el que
 * decide qué hacer con esa intención (abrir el modal de agendamiento,
 * abrir el buscador de prospectos, abrir "Nueva actividad"...).
 */

/** Primer nombre del prospecto sugerido — respaldo genérico si el registro no trae ninguno de los dos formatos conocidos (`name`/`nombre`). */
function firstName(prospect) {
  return (prospect?.name || prospect?.nombre || 'tu prospecto').split(' ')[0];
}

/**
 * Resuelve cuál de los cuatro estados aplica y arma su contenido completo
 * (eyebrow, mensaje e íconos) en un solo lugar — el componente sólo lee el
 * resultado y lo dibuja, sin repetir la lógica condicional en el JSX.
 */
function resolveState({ diagnosticsCount, prospect, hasProspects }) {
  const hasDiagnostics = diagnosticsCount > 0;

  if (hasDiagnostics && hasProspects) {
    return {
      key: 'has-both',
      eyebrowIcon: Zap,
      eyebrowText: 'Sugerencia de tu Asistente',
      message: `Agenda libre hoy. Tienes ${diagnosticsCount} Diagnósticos en tu `
        + `inventario. ¿Qué tal si le llamamos a ${firstName(prospect)} para `
        + 'regalarle una consultoría?',
    };
  }

  if (!hasDiagnostics && hasProspects) {
    return {
      key: 'no-diagnostics',
      eyebrowIcon: Target,
      eyebrowText: 'Momento de capitalizar',
      message: 'Tu inventario de Diagnósticos está vacío. Acumula puntos hoy para '
        + `adquirir uno nuevo. Comencemos contactando a ${firstName(prospect)}.`,
    };
  }

  if (hasDiagnostics && !hasProspects) {
    return {
      key: 'no-prospects',
      eyebrowIcon: Inbox,
      eyebrowText: 'Inventario estancado',
      message: `Tienes ${diagnosticsCount} Diagnósticos listos para usarse, pero no `
        + 'tienes prospectos nuevos en fila. Es el momento perfecto para nutrir tu base.',
    };
  }

  return {
    key: 'empty',
    eyebrowIcon: Flame,
    eyebrowText: 'Día de Prospección Pura',
    message: 'Agenda libre y sin prospectos en fila. Hoy es un excelente día para '
      + 'prospectar en frío, pedir referidos a tus clientes actuales y sumar puntos.',
  };
}

/** Botón de acción primaria: mismo estilo (índigo, con resplandor) en los cuatro casos, sólo cambian el texto y el ícono. */
function PrimaryAction({ icon: Icon, label, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center justify-center gap-2 rounded-full bg-indigo-600 px-5 py-2.5
                 text-sm font-semibold text-white shadow-[0_0_15px_rgba(79,70,229,0.5)]
                 transition-all hover:bg-indigo-500 hover:shadow-[0_0_22px_rgba(79,70,229,0.7)]
                 active:scale-95 focus-visible:outline-none focus-visible:ring-2
                 focus-visible:ring-indigo-400"
    >
      <Icon size={15} aria-hidden="true" />
      {label}
      <ArrowRight size={15} aria-hidden="true" />
    </button>
  );
}

/** Botón de acción secundaria (ghost): sin fondo ni borde propio, sólo el texto y el resalte de hover — para una acción de apoyo, no la principal. */
function GhostAction({ icon: Icon, label, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center justify-center gap-1.5 rounded-full px-3 py-2 text-xs
                 font-semibold text-slate-400 transition-colors hover:text-white
                 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/30"
    >
      <Icon size={13} aria-hidden="true" />
      {label}
    </button>
  );
}

/**
 * @param {object[]} uncontactedProspects - Prospectos sin contactar, cada uno `{ name, phone? }` (o `{ nombre, telefono }`, mismo contrato de `data/safeZone.js`).
 * @param {number} diagnosticsCount - Diagnósticos disponibles en el inventario, sin tope máximo.
 * @param {(prospect: object) => void} [onContactProspect] - Se dispara al tocar "Agendar Llamada" / "Llamar para ganar puntos", con el prospecto sugerido en ese momento. Quien la recibe decide si abre el modal de agendamiento o marca directo.
 * @param {() => void} [onAddProspects] - Se dispara al tocar "Agregar Nuevos Prospectos" (Caso 3).
 * @param {() => void} [onRegisterActivity] - Se dispara al tocar "Registrar Nueva Actividad" (Caso 4).
 */
export default function SmartEmptyState({
  uncontactedProspects = [],
  diagnosticsCount = 0,
  onContactProspect,
  onAddProspects,
  onRegisterActivity,
}) {
  const hasProspects = uncontactedProspects.length > 0;

  /*
    "Ver otro prospecto" (Caso 1) no vuelve a preguntar nada ni recarga la
    pantalla: sólo avanza este índice local, en ciclo, sobre la misma lista
    ya recibida. Se reinicia si la lista cambia de tamaño (un prospecto se
    contactó y salió de la lista, por ejemplo) para no quedar señalando una
    posición que ya no existe.
  */
  const [index, setIndex] = useState(0);
  useEffect(() => {
    setIndex(0);
  }, [uncontactedProspects.length]);

  const prospect = hasProspects ? uncontactedProspects[index % uncontactedProspects.length] : null;
  const canCycleProspects = uncontactedProspects.length > 1;

  const state = resolveState({ diagnosticsCount, prospect, hasProspects });
  const EyebrowIcon = state.eyebrowIcon;

  return (
    <motion.div
      key={state.key}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="group w-full rounded-2xl border border-slate-800/50 bg-slate-900 p-5
                 shadow-lg shadow-black/20 transition-all duration-300
                 hover:border-amber-500/30 hover:shadow-[0_0_30px_-8px_rgba(245,158,11,0.25)]"
    >
      <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest
                    text-amber-400"
      >
        <EyebrowIcon size={13} aria-hidden="true" />
        {state.eyebrowText}
      </p>

      <p className="mt-3 text-sm leading-relaxed text-slate-200 sm:text-[15px]">
        {state.message}
      </p>

      <div className="mt-5 flex flex-wrap items-center gap-2">
        {state.key === 'has-both' && (
          <>
            <PrimaryAction
              icon={PhoneCall}
              label="Agendar Llamada"
              onClick={() => onContactProspect?.(prospect)}
            />
            {canCycleProspects && (
              <GhostAction
                icon={RefreshCw}
                label="Ver otro prospecto"
                onClick={() => setIndex((current) => current + 1)}
              />
            )}
          </>
        )}

        {state.key === 'no-diagnostics' && (
          <PrimaryAction
            icon={PhoneCall}
            label="Llamar para ganar puntos"
            onClick={() => onContactProspect?.(prospect)}
          />
        )}

        {state.key === 'no-prospects' && (
          <PrimaryAction
            icon={UserPlus}
            label="Agregar Nuevos Prospectos"
            onClick={() => onAddProspects?.()}
          />
        )}

        {state.key === 'empty' && (
          <PrimaryAction
            icon={PlusCircle}
            label="Registrar Nueva Actividad"
            onClick={() => onRegisterActivity?.()}
          />
        )}
      </div>
    </motion.div>
  );
}
