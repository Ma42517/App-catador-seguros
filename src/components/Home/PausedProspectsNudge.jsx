import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RotateCcw, X } from 'lucide-react';
import { useEvents } from '../../context/EventContext';
import { useSession } from '../../context/SessionContext';
import { readOrphans, removeOrphan, updateOrphan } from '../../data/orphanProspects';
import { markProspectDiscarded } from '../../data/prospectStatus';
import { buildFollowUpEvent } from '../../lib/followUpEvent';
import { evaluateReactivation } from '../../lib/reactivationSchedule';

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

/** Cuántos días lleva en pausa. */
function daysPaused(timestamp) {
  return Math.floor((Date.now() - timestamp) / 86400000);
}

/**
 * Por qué quedó en pausa, en una frase corta.
 *
 * Cubre los dos motivos que hoy generan una pausa —y cualquiera futuro cae
 * en el texto neutro—: no contestar una llamada (`CallFeedbackModal.jsx`,
 * "Cerrar sin más intentos") y dejar vencer una Cita Inicial sin iniciar la
 * presentación (el "Reloj de Arena" de `InitialMeetingCard.jsx`).
 */
function pauseReason(record) {
  if (record.reason === 'sin_respuesta') return 'no contestó y quedó sin seguimiento';
  if (record.reason === 'sin_sesion_30min') return 'su Cita Inicial se archivó sin presentación';
  return 'quedó fuera del embudo sin cerrarse';
}

/**
 * src/components/Home/PausedProspectsNudge.jsx
 *
 * Recomendación de recontacto en "Hoy", gobernada por el calendario de
 * `lib/reactivationSchedule.js`: tres oportunidades (días 3, 5 y 10 desde la
 * pausa), cada una abierta 24 horas, y descarte automático si las tres se
 * ignoran.
 *
 * La versión anterior mostraba al pausado más antiguo en cada entrada, sin
 * límite. Era hostigante en los dos extremos: aparecía el mismo día en que
 * alguien no contestó una llamada —cuando el asesor todavía lo tenía
 * fresco— y seguía apareciendo indefinidamente aunque en la práctica ya
 * hubiera decidido no retomarlo. Ahora la app propone poco, en momentos
 * concretos, y **deja de preguntar** cuando la falta de respuesta ya es una
 * respuesta.
 *
 * Alcanza a todos los pausados **excepto los descartados**, y eso no
 * necesita ningún filtro aquí: son dos almacenes distintos. Lo que quedó en
 * pausa vive en `data/orphanProspects.js`; los "no califica" viven en
 * `data/prospectStatus.js`. Leyendo sólo el primero, la app nunca insiste
 * con alguien a quien el asesor ya descartó a propósito.
 *
 * ## Las tres salidas
 *
 *  - **"Dar seguimiento"**: crea el Seguimiento para mañana con el teléfono
 *    que ya se tenía y lo saca de la pausa. Es la decisión que mueve el
 *    embudo. Va como texto y no como botón relleno a propósito: ver la nota
 *    de jerarquía en el contenedor, más abajo.
 *  - **"Descartar"**: lo manda a la lista de descartados, desde donde la app
 *    ya no vuelve a proponerlo (sigue visible en el perfil para revertirlo).
 *  - **La X**: "no ahora". Sólo esconde la fila en esta visita; la
 *    oportunidad sigue abierta sus 24 horas y el prospecto no se pierde. Es
 *    deliberadamente distinta de "Descartar": cerrar un aviso no debería
 *    equivaler a desechar a una persona.
 *
 * Muestra **una sola** a la vez, la del prospecto que lleva más tiempo en
 * pausa: varias filas en la pantalla de inicio se leerían como un reclamo y
 * competirían con la agenda del día.
 */
export default function PausedProspectsNudge() {
  const { addEvent } = useEvents();
  const { identity } = useSession();
  const username = identity?.key;

  const [record, setRecord] = useState(null);
  const [schedule, setSchedule] = useState(null);
  const [dismissed, setDismissed] = useState(false);

  /*
    Se resuelve una sola vez por montaje —no en cada render— porque este
    efecto tiene efectos secundarios que persisten: descarta a los agotados y
    "consume" una oportunidad al abrirla. Repetirlo en cada render quemaría
    los tres intentos de un prospecto en la misma visita.
  */
  useEffect(() => {
    if (!username) return;
    const now = Date.now();
    const all = readOrphans(username);

    const showing = [];
    const due = [];

    all.forEach((entry) => {
      const state = evaluateReactivation(entry, now);

      if (state.status === 'exhausted') {
        /*
          Descarte automático: tres oportunidades ignoradas en diez días. Se
          conserva el registro en la lista de descartados —no se borra sin
          más— para que el asesor pueda encontrarlo y revertirlo desde
          "Prospectos en pausa" si resulta que sí le interesaba.
        */
        markProspectDiscarded(username, {
          id: entry.prospectId ?? entry.id,
          name: entry.name,
          phone: entry.phone,
        });
        removeOrphan(username, entry.id);
        return;
      }

      if (state.status === 'showing') showing.push([entry, state]);
      else if (state.status === 'due') due.push([entry, state]);
    });

    const byOldest = (a, b) => a[0].archivedAt - b[0].archivedAt;

    // Una oportunidad ya abierta manda sobre una nueva: su ventana de 24
    // horas está corriendo y hay que terminarla antes de consumir otra.
    const current = showing.sort(byOldest)[0] ?? due.sort(byOldest)[0] ?? null;
    if (!current) return;

    const [entry, state] = current;

    if (state.status === 'due') {
      // Abrir la oportunidad: se persiste para que la ventana de 24 horas
      // corra de verdad y el intento quede contado entre recargas.
      const offersShown = state.offersShown + 1;
      updateOrphan(username, entry.id, { offersShown, lastOfferAt: now });
      setRecord({ ...entry, offersShown, lastOfferAt: now });
      setSchedule({ ...state, attempt: offersShown });
      return;
    }

    setRecord(entry);
    setSchedule(state);
  }, [username]);

  if (!record || dismissed) return null;

  const name = String(record.name ?? '').trim() || 'Un prospecto';
  const days = daysPaused(record.archivedAt);
  const attempt = schedule?.attempt ?? 1;
  const total = schedule?.totalAttempts ?? 3;
  const isLastChance = attempt >= total;

  const resolveWithFollowUp = () => {
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
    setRecord(null);
  };

  const resolveWithDiscard = () => {
    markProspectDiscarded(username, {
      id: record.prospectId ?? record.id,
      name: record.name,
      phone: record.phone,
    });
    removeOrphan(username, record.id);
    setRecord(null);
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
          ── Jerarquía deliberadamente por debajo de las tarjetas del embudo ──

          Esto es una sugerencia de la app, no una actividad agendada, y no
          debe competir con una Cita de Propuesta ni con un Cobro. La primera
          versión sí competía: mismo `bg-slate-900`, mismo `rounded-xl`, mismo
          `text-sm` y un botón `bg-indigo-600` idéntico al "Iniciar" de
          `ProposalCard.jsx` — con tres filas de alto acababa pesando MÁS que
          las tarjetas reales.

          Cuatro cosas la bajan de nivel sin sacarla de la paleta:
            · Fondo casi transparente (`bg-slate-900/30`) en vez de sólido.
            · Borde punteado: en toda la app el trazo continuo es de
              contenido real; el punteado ya se usa para lo opcional
              (`ProposalResolutionModal.jsx`, "Llenar Cuestionario").
            · Ícono suelto y gris, sin la píldora de color que llevan las
              tarjetas.
            · Texto `text-xs` y acciones como texto, nunca botones rellenos.
        */
        className="w-full rounded-xl border border-dashed border-slate-800 bg-slate-900/30 p-3"
      >
        <div className="flex items-start gap-2.5">
          <RotateCcw
            size={13}
            className="mt-0.5 shrink-0 text-slate-500"
            strokeWidth={1.8}
            aria-hidden="true"
          />

          <div className="min-w-0 flex-1">
            <p className="break-words text-xs leading-relaxed text-slate-400">
              ¿Retomas a <span className="font-medium text-slate-300">{name}</span>?
              {' '}
              {pauseReason(record)}
              {days > 0 && (
                <span className="text-slate-600">
                  {' '}
                  (hace {days} {days === 1 ? 'día' : 'días'})
                </span>
              )}
            </p>

            {/*
              Acciones como texto, separadas por un punto medio: se leen como
              dos enlaces de una sugerencia y no como los botones de una
              tarjeta. Siguen siendo áreas táctiles cómodas —`py-1` más el
              alto de línea— sin necesitar fondo ni borde para anunciarse.
            */}
            <div className="mt-1.5 flex items-center gap-2 text-[11px] font-semibold">
              <button
                type="button"
                onClick={resolveWithFollowUp}
                className="py-1 text-indigo-400 transition-colors hover:text-indigo-300
                           focus-visible:outline-none focus-visible:underline"
              >
                Dar seguimiento
              </button>

              <span className="text-slate-700" aria-hidden="true">·</span>

              <button
                type="button"
                onClick={resolveWithDiscard}
                className="py-1 text-slate-500 transition-colors hover:text-rose-400
                           focus-visible:outline-none focus-visible:underline"
              >
                Descartar
              </button>
            </div>

            {/*
              Se dice en voz alta cuántos avisos quedan y qué pasa si no se
              decide nada. Un descarte automático que ocurre en silencio se
              siente como un dato perdido; anunciado, se lee como lo que es
              —la app dejando de insistir— y empuja a resolver el último.
            */}
            <p className="mt-0.5 text-[10px] leading-relaxed text-slate-600">
              {isLastChance
                ? 'Último aviso: si no decides, se descarta solo.'
                : `Aviso ${attempt} de ${total}. Si no decides, vuelve más adelante.`}
            </p>
          </div>

          <button
            type="button"
            onClick={() => setDismissed(true)}
            aria-label="No ahora"
            className="grid h-6 w-6 shrink-0 place-items-center rounded-full text-slate-600
                       transition-colors hover:bg-white/5 hover:text-slate-400
                       focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/30"
          >
            <X size={12} aria-hidden="true" />
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
