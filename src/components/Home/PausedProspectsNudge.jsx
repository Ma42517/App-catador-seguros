import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RotateCcw, X, ArrowRight } from 'lucide-react';
import { useEvents } from '../../context/EventContext';
import { useSession } from '../../context/SessionContext';
import { readOrphans, removeOrphan } from '../../data/orphanProspects';
import { buildFollowUpEvent } from '../../lib/followUpEvent';

/** Fecha de mañana a las 9: la hora en que un recontacto tiene sentido. */
function tomorrowParts() {
  const now = new Date();
  now.setDate(now.getDate() + 1);
  const pad = (n) => String(n).padStart(2, '0');
  return {
    date: `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`,
    time: '09:00',
  };
}

/** Cuántos días lleva en pausa; sirve para decir "hace X días" sin librerías. */
function daysPaused(timestamp) {
  return Math.floor((Date.now() - timestamp) / 86400000);
}

/**
 * Por qué quedó en pausa, en una frase corta que quepa en la fila.
 *
 * Cubre los dos motivos que hoy generan una pausa —y cualquiera futuro cae
 * en el texto neutro—: no contestar una llamada
 * (`CallFeedbackModal.jsx`, "Cerrar sin más intentos") y dejar vencer una
 * Cita Inicial sin iniciar la presentación (el "Reloj de Arena" de
 * `InitialMeetingCard.jsx`).
 */
function pauseReason(record) {
  if (record.reason === 'sin_respuesta') return 'no contestó y quedó sin seguimiento';
  if (record.reason === 'sin_sesion_30min') return 'su Cita Inicial se archivó sin presentación';
  return 'quedó fuera del embudo sin cerrarse';
}

/**
 * src/components/Home/PausedProspectsNudge.jsx
 *
 * Recomendación de recontacto en "Hoy": la app vuelve a proponer a los
 * prospectos que quedaron en pausa sin que nadie les diera seguimiento.
 *
 * Alcanza a TODOS los pausados **excepto los descartados**. Esa distinción
 * no necesita ningún filtro aquí porque son dos almacenes distintos: lo que
 * quedó en pausa vive en `data/orphanProspects.js` (citas archivadas por el
 * Reloj de Arena y llamadas sin respuesta que se cerraron sin más intentos),
 * y los "no califica" viven aparte, en `data/prospectStatus.js`. Leyendo
 * sólo el primero, la app nunca insiste con alguien a quien el asesor ya
 * descartó a propósito — insistir ahí sería desoír una decisión que ya
 * tomó, y es justo lo que vuelve creíble al resto de las sugerencias.
 *
 * Muestra **uno a la vez**, el más antiguo: es el que lleva más tiempo
 * olvidado y el que más urge rescatar. Una lista de diez pausados en la
 * pantalla de inicio se leería como un reclamo y competiría con la agenda
 * del día; una sola fila delgada, con el mismo peso visual que
 * `DiagnosticPushNudge.jsx`, se lee como lo que es: un recordatorio.
 *
 * A diferencia de ese push, este no espera a que la agenda esté vacía. Un
 * prospecto olvidado no deja de estar olvidado porque hoy haya trabajo; el
 * punto de la recomendación es justamente que reaparezca hasta que se
 * atienda.
 *
 * "Retomar" resuelve todo en un toque: crea el Seguimiento para mañana con
 * el teléfono que ya se tenía y lo saca de la pausa. La X descarta la
 * sugerencia sólo por esta visita —igual que el otro push, sin
 * persistencia—: el prospecto sigue en pausa y la app volverá a proponerlo
 * la próxima vez, que es exactamente lo que se pidió.
 */
export default function PausedProspectsNudge() {
  const { addEvent } = useEvents();
  const { identity } = useSession();
  const username = identity?.key;

  const [records, setRecords] = useState([]);
  const [dismissed, setDismissed] = useState(false);

  /*
    Se ordena del más antiguo al más reciente —`readOrphans` los devuelve al
    revés, con los últimos primero— porque aquí interesa el olvidado hace
    más tiempo, no el que acaba de entrar en pausa.
  */
  const load = useCallback(() => {
    setRecords(readOrphans(username).slice().sort((a, b) => a.archivedAt - b.archivedAt));
  }, [username]);

  useEffect(() => { load(); }, [load]);

  if (dismissed || records.length === 0) return null;

  const record = records[0];
  const remaining = records.length - 1;
  const days = daysPaused(record.archivedAt);
  const name = String(record.name ?? '').trim() || 'Un prospecto';

  const retake = () => {
    const parts = tomorrowParts();
    addEvent(buildFollowUpEvent(
      // `title` sin dos puntos: `prospectNameFrom` devuelve el texto
      // completo, que es justo el nombre guardado en el registro de pausa.
      { title: name, telefono: record.phone },
      {
        date: parts.date,
        time: parts.time,
        reason: record.reason === 'sin_respuesta'
          ? 'Retomado: no había contestado la llamada'
          : 'Retomado: su Cita Inicial se había archivado',
      },
    ));
    removeOrphan(username, record.id);
    // Se relee en vez de quitarlo del estado a mano: así la fila pasa sola
    // al siguiente pausado, si queda alguno.
    load();
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        role="status"
        className="group flex w-full items-center gap-2 rounded-xl border border-slate-800/50
                   bg-slate-900 p-3 transition-colors hover:border-indigo-500/30"
      >
        <button
          type="button"
          onClick={retake}
          className="flex min-w-0 flex-1 items-center gap-3 text-left focus-visible:outline-none"
        >
          <span
            className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border
                       border-indigo-500/30 bg-indigo-500/10 text-indigo-400"
            aria-hidden="true"
          >
            <RotateCcw size={14} strokeWidth={1.8} aria-hidden="true" />
          </span>

          <span className="min-w-0 flex-1 break-words text-sm font-medium text-slate-200">
            Retoma a {name}: {pauseReason(record)}
            {days > 0 && (
              <span className="text-slate-500">
                {' '}
                (hace {days} {days === 1 ? 'día' : 'días'})
              </span>
            )}
            {remaining > 0 && (
              <span className="block text-[11px] font-normal text-slate-500">
                Y {remaining} {remaining === 1 ? 'más' : 'más'} en pausa esperando.
              </span>
            )}
          </span>

          <ArrowRight
            size={15}
            className="shrink-0 text-slate-500 transition-colors group-hover:text-indigo-400"
            aria-hidden="true"
          />
        </button>

        <button
          type="button"
          onClick={() => setDismissed(true)}
          aria-label="Descartar la sugerencia por ahora"
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
