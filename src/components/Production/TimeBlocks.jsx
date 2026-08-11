import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  Play, Pause, X, RotateCcw, Flame, Target,
} from 'lucide-react';
import FocusFlow from './FocusFlow';
import TodayFocus from './TodayFocus';
import SessionCompleteModal from './SessionCompleteModal';
import {
  readSession, writeSession, remainingSeconds, formatClock,
  readHistory, recordCompletion, statsFor, todayKey,
} from '../../data/timeBlocks';
import { primeAudio, playChime } from '../../data/chime';
import {
  tapFeedback, MILESTONE_PATTERN, SESSION_END_PATTERN, MILESTONE_STEP_SEC,
} from '../../lib/haptics';

/** Cuántas tareas de hoy se ofrecen para repetir en el paso 1. */
const RECENT_LIMIT = 3;

/**
 * Bloques de tiempo: temporizador de enfoque, preguntado en tres pasos.
 *
 * La sesión se guarda con el instante de término, no con los segundos que
 * quedan. Así el bloque sigue corriendo aunque el asesor se vaya a la Agenda
 * (la sección se desmonta al navegar) o mande la app al fondo, donde el
 * navegador estrangula los intervalos.
 *
 * Ese mismo dato decide qué se ve: si hay sesión, el reloj; si no, la
 * conversación de `FocusFlow`. El paso en el que va la persona no se guarda en un
 * estado aparte a propósito. Un `step` en memoria y una sesión en el
 * almacenamiento pueden contradecirse —recargar la página mostraría el paso 1
 * mientras el bloque de 45 minutos sigue corriendo— y de las dos, la que dice la
 * verdad es la sesión.
 */
export default function TimeBlocks({ username, name }) {
  const [session, setSession] = useState(() => readSession(username));
  const [history, setHistory] = useState(() => readHistory(username));

  // Lo que muestra el modal se congela al cerrar el bloque: si dependiera del
  // estado vivo, cargar otro bloque cambiaria el texto del festejo.
  const [completed, setCompleted] = useState(null);

  // Fuerza el redibujo cada segundo mientras corre; el valor no se usa, el
  // restante se calcula del reloj. Un contador en el estado se desincronizaría.
  const [, setTick] = useState(0);

  /**
   * Candado en memoria contra el doble registro dentro del mismo render.
   *
   * Hace falta además de `session.recorded` porque `setSession` no es
   * inmediato: si el efecto se evalúa dos veces antes de que el estado se
   * actualice (StrictMode hace exactamente eso), ambas pasadas verían
   * `recorded` en falso y el bloque se contaría dos veces.
   */
  const notifiedFor = useRef(null);

  /**
   * Último tramo de cinco minutos que ya avisó, y el restante de la vuelta
   * anterior.
   *
   * Los dos son refs y no estado a propósito: sólo sirven para decidir si toca
   * vibrar, y guardarlos en estado provocaría un render extra por segundo sin
   * cambiar nada de lo que se ve.
   *
   * El candado es imprescindible. El restante no vive en el estado, se calcula
   * del reloj en cada render, así que un render de más —y en StrictMode hay uno
   * de más garantizado— volvería a ver el mismo segundo y dispararía una ráfaga
   * de vibraciones sobre el mismo tramo.
   */
  const lastMilestone = useRef(null);
  const prevRemaining = useRef(null);

  /**
   * Olvida el rastro de vibraciones para que el bloque empiece de cero.
   *
   * Sin esto, una segunda vuelta del mismo bloque no volvería a avisar en sus
   * tramos: el candado seguiría marcando como ya avisado el último múltiplo de
   * la vuelta anterior.
   */
  const resetHaptics = useCallback(() => {
    lastMilestone.current = null;
    prevRemaining.current = null;
  }, []);

  const today = useMemo(() => statsFor(history), [history]);

  /*
    Las tareas de hoy, sin repetir y de la más reciente a la más vieja.

    Se ofrecen para volver a empezarlas con un toque. Sustituyen a los bloques
    fijos que traía la app, y con ventaja: eran dos nombres que alguien supuso
    ("Hacer Llamadas", "Seguimientos"), y esto es lo que esta persona sí hizo hoy.
  */
  const recent = useMemo(() => {
    const entries = history[todayKey()] ?? [];
    const labels = [];

    // De atrás hacia adelante: lo último que se trabajó es lo primero que se ofrece.
    for (let index = entries.length - 1; index >= 0; index -= 1) {
      const label = entries[index]?.label;
      if (label && !labels.includes(label)) labels.push(label);
      if (labels.length === RECENT_LIMIT) break;
    }
    return labels;
  }, [history]);

  /**
   * Recarga el estado sólo cuando *cambia* de persona, no en cada montaje.
   *
   * Sin este candado el efecto se convierte en un reinicio que pisa lo que el
   * cierre del bloque acaba de dejar: borraba el modal de celebración antes de
   * que se viera y reabría el registro, contando el mismo bloque dos veces.
   * Los valores iniciales de `useState` ya leen el almacenamiento, así que en el
   * primer montaje aquí no hay nada que hacer.
   */
  const loadedFor = useRef(username);

  useEffect(() => {
    if (loadedFor.current === username) return;
    loadedFor.current = username;

    setSession(readSession(username));
    setHistory(readHistory(username));
    setCompleted(null);
    notifiedFor.current = null;
    resetHaptics();
  }, [username, resetHaptics]);

  useEffect(() => {
    writeSession(username, session);
  }, [username, session]);

  const isRunning = session?.status === 'running';
  const remaining = session ? remainingSeconds(session) : 0;
  const isDone = Boolean(session) && remaining === 0 && session.status !== 'idle';

  // Latido de un segundo, sólo mientras corre. `clearInterval` en la limpieza
  // cubre tanto el desmontaje como la pausa.
  useEffect(() => {
    if (!isRunning) return undefined;
    const id = setInterval(() => setTick((value) => value + 1), 1000);
    return () => clearInterval(id);
  }, [isRunning]);

  /*
    Aviso al cruzar cada tramo de cinco minutos.

    Se compara contra el restante de la vuelta anterior en lugar de exigir que
    el segundo caiga exacto en un múltiplo de 300: con la pestaña de fondo el
    navegador estrangula el intervalo y el restante puede saltar de 902 a 898,
    sin pisar nunca el 900. Mirando el salto, el tramo se detecta igual.

    El múltiplo que quedó atrás en el salto es lo que se guarda en el candado,
    así que cada tramo avisa una sola vez aunque el efecto se evalúe de más.
  */
  useEffect(() => {
    const previous = prevRemaining.current;
    prevRemaining.current = remaining;

    if (!isRunning || previous === null || remaining >= previous) return;

    // Múltiplo de cinco minutos más alto que el salto dejó atrás.
    const crossed = Math.floor(previous / MILESTONE_STEP_SEC) * MILESTONE_STEP_SEC;

    /*
      `crossed > 0` deja el cero fuera: ése es el final del bloque y tiene su
      propio patrón. `crossed < totalSec` evita vibrar al arrancar, cuando el
      restante todavía es la duración completa —que en un bloque de 25 o 50
      minutos también es múltiplo de cinco.
    */
    if (crossed <= 0 || crossed >= session.totalSec) return;
    if (remaining > crossed || lastMilestone.current === crossed) return;

    lastMilestone.current = crossed;
    tapFeedback(MILESTONE_PATTERN);
  }, [isRunning, remaining, session]);

  // Cierre del bloque: se detiene, suena y avisa. Una sola vez por sesión.
  useEffect(() => {
    if (!session || !isRunning || remaining > 0) return;

    // `recorded` viaja con la sesión persistida, así que sobrevive al
    // desmontaje y a recargar la página; el ref cubre el mismo render.
    if (session.recorded || notifiedFor.current === session.startedAt) return;

    notifiedFor.current = session.startedAt;
    setSession((prev) => (
      prev ? { ...prev, status: 'done', remainingSec: 0, recorded: true } : prev
    ));

    const minutes = Math.round(session.totalSec / 60);
    const updated = recordCompletion(username, { label: session.label, minutes });
    setHistory(updated);

    playChime();

    /*
      El cierre va acompañado de vibración porque el sonido no siempre llega:
      el teléfono puede estar en silencio, que es como suele quedarse durante
      un bloque de enfoque. Este efecto ya está protegido por `recorded` y por
      `notifiedFor`, así que el patrón se dispara una sola vez por sesión.
    */
    tapFeedback(SESSION_END_PATTERN);

    setCompleted({ label: session.label, minutes, stats: statsFor(updated) });
  }, [session, isRunning, remaining, username]);

  /** Paso 3: queda el bloque cargado y en pausa, esperando el "Iniciar". */
  const openTimer = ({ task, minutes }) => {
    notifiedFor.current = null;
    resetHaptics();
    setSession({
      label: task,
      totalSec: minutes * 60,
      remainingSec: minutes * 60,
      endsAt: null,
      status: 'paused',
      startedAt: Date.now(),
      recorded: false,
    });
  };

  const start = () => {
    // El audio se abre aquí, con el gesto: al terminar el bloque ya no habrá
    // ninguno y iOS no dejaría sonar la campana.
    primeAudio();

    setSession((prev) => {
      if (!prev) return prev;
      const seconds = prev.status === 'done' ? prev.totalSec : (prev.remainingSec ?? prev.totalSec);
      if (prev.status === 'done') {
        notifiedFor.current = null;
        resetHaptics();
      }
      return {
        ...prev,
        status: 'running',
        endsAt: Date.now() + seconds * 1000,
        remainingSec: seconds,
        startedAt: prev.status === 'done' ? Date.now() : prev.startedAt,
        recorded: prev.status === 'done' ? false : prev.recorded,
      };
    });
  };

  const pause = () => {
    setSession((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        status: 'paused',
        remainingSec: remainingSeconds(prev),
        endsAt: null,
      };
    });
  };

  /** Vuelve el bloque a su duración completa, sin cerrarlo. */
  const reset = () => {
    notifiedFor.current = null;
    resetHaptics();
    setSession((prev) => (prev
      ? {
        ...prev,
        status: 'paused',
        remainingSec: prev.totalSec,
        endsAt: null,
        startedAt: Date.now(),
        recorded: false,
      }
      : prev));
  };

  /** Suelta el bloque y devuelve la conversación al paso 1. */
  const close = () => {
    notifiedFor.current = null;
    resetHaptics();
    setSession(null);
  };

  return (
    <section aria-label="Bloques de tiempo">
      {session ? (
        /* ── Paso 3: el reloj ────────────────────────────────────────────── */
        <div className="animate-rise flex flex-col items-center pt-4">
          {/*
            La tarea, arriba y en pequeño. Es lo único que queda del contexto:
            durante el bloque no hay ninguna decisión que tomar, así que cualquier
            otra cosa en pantalla sólo compite con el trabajo.

            Con icono y no con emoji: los emojis dependen de que el sistema traiga
            la fuente y en algunos Android caen al cuadrito de glifo faltante.
          */}
          <p className="flex max-w-[85%] items-center gap-1.5 text-xs font-semibold
                        text-zinc-500 dark:text-zinc-400"
          >
            <Target size={12} className="shrink-0 text-indigo-500" aria-hidden="true" />
            <span className="truncate">Enfoque: {session.label}</span>
          </p>

          {/*
            `font-mono` y `tabular-nums` por la misma razón: que los dígitos midan
            todos igual. Con una tipografía proporcional el reloj se mueve solo cada
            vez que un 1 sustituye a un 8, y un número que tiembla en el centro de la
            pantalla se mira más que el trabajo.
          */}
          <p
            role="timer"
            aria-live="off"
            className={`mt-6 font-mono text-6xl font-bold tabular-nums tracking-tight
                        transition-colors sm:text-7xl ${isDone
              ? 'text-emerald-500'
              : 'text-zinc-900 dark:text-white'}`}
          >
            {formatClock(remaining)}
          </p>

          <p className="mt-2 h-4 text-xs font-semibold text-zinc-400">
            {isDone ? '¡Bloque completado!' : `${Math.round(session.totalSec / 60)} min de enfoque`}
          </p>

          <button
            type="button"
            onClick={isRunning ? pause : start}
            className={`mt-8 flex w-full max-w-sm items-center justify-center gap-2 rounded-xl
                        py-4 text-base font-semibold transition-all active:scale-[0.98]
                        ${isRunning
              ? 'border border-zinc-300 text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800'
              : 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30 hover:bg-indigo-500'}`}
          >
            {isRunning ? <Pause size={16} /> : <Play size={16} />}
            {isRunning
              ? 'Pausar'
              : (isDone ? 'Otra vuelta' : (remaining < session.totalSec ? 'Continuar' : 'Iniciar'))}
          </button>

          {/*
            Las dos salidas van en texto pequeño y no en botones grandes: se usan una
            vez cada varias sesiones, y al lado de "Pausar" invitarían a tocarlas por
            error justo cuando el bloque va a la mitad.
          */}
          <div className="mt-4 flex items-center gap-5">
            <button
              type="button"
              onClick={reset}
              className="flex items-center gap-1.5 text-xs font-semibold text-zinc-500
                         transition-colors hover:text-zinc-800 dark:hover:text-zinc-200"
            >
              <RotateCcw size={12} />
              Reiniciar
            </button>

            <button
              type="button"
              onClick={close}
              className="flex items-center gap-1.5 text-xs font-semibold text-zinc-500
                         transition-colors hover:text-rose-500"
            >
              <X size={12} />
              Nuevo enfoque
            </button>
          </div>
        </div>
      ) : (
        /* ── Pasos 1 y 2: la conversación ────────────────────────────────── */
        <>
          {/*
            La medalla del día vive aquí y no dentro del reloj: se ve justo cuando
            hay que decidir si vale la pena empezar otro bloque, no mientras uno
            corre.
          */}
          <div className="flex items-center justify-end">
            <span
              className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-sm font-bold
                          transition-colors duration-500 ${today.blocks > 0
                ? 'bg-orange-500/15 text-orange-600 dark:text-orange-300'
                : 'bg-zinc-100 text-zinc-400 dark:bg-zinc-800 dark:text-zinc-500'}`}
              title={`${today.blocks} bloques completados hoy`}
            >
              <Flame size={14} aria-hidden="true" />
              {today.blocks}
              <span className="sr-only">bloques completados hoy</span>
            </span>
          </div>

          <FocusFlow name={name} recent={recent} onStart={openTimer} />

          <TodayFocus blocks={today.blocks} minutes={today.minutes} />
        </>
      )}

      <SessionCompleteModal
        isOpen={completed !== null}
        label={completed?.label ?? ''}
        minutes={completed?.minutes ?? 0}
        todayBlocks={completed?.stats.blocks ?? 0}
        todayMinutes={completed?.stats.minutes ?? 0}
        onClose={() => setCompleted(null)}
      />
    </section>
  );
}
