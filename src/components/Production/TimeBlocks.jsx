import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Play, Pause, X } from 'lucide-react';
import FocusFlow from './FocusFlow';
import FocusClock, { STEP_SEC } from './FocusClock';
import TypedLine from './TypedLine';
import {
  readSession, writeSession, remainingSeconds, formatClock, formatDuration,
  readHistory, recordCompletion, statsFor, MAX_MINUTES,
} from '../../data/timeBlocks';
import { primeAudio, playChime } from '../../data/chime';
import {
  tapFeedback, MILESTONE_PATTERN, SESSION_END_PATTERN, MILESTONE_STEP_SEC,
} from '../../lib/haptics';

/** Con lo que arranca el reloj antes de que nadie lo toque. */
const DEFAULT_SEC = 25 * 60;

/** Tope, en segundos. Más de tres horas ya no es un bloque de enfoque. */
const MAX_SEC = MAX_MINUTES * 60;

/**
 * Bloques de tiempo, en tres actos sobre negro.
 *
 *   1. Un "+" que respira. Se toca y empieza.
 *   2. "¿En qué te gustaría enfocarte hoy?", con su línea de firma.
 *   3. "¿Cuánto tiempo?" y el reloj. Al arrancar, la pantalla se queda sólo con el
 *      reloj y su botón: durante el bloque no hay ninguna decisión que tomar, así
 *      que cualquier otra cosa en pantalla compite con el trabajo.
 *
 * El acto no se guarda en un número. Lo dice el estado: si hay sesión, el reloj; si
 * hay tarea sin sesión, la pregunta del tiempo; si no hay nada, el "+". Un `act` en
 * memoria y una sesión en el almacenamiento pueden contradecirse —recargar
 * mostraría el acto 1 mientras el bloque de 45 minutos sigue corriendo— y de las
 * dos, la que dice la verdad es la sesión.
 *
 * La sesión guarda el instante en que termina, no los segundos que quedan. Así el
 * bloque sobrevive a salir a la Agenda (esta pantalla se desmonta al navegar) y a
 * mandar la app al fondo, donde el navegador estrangula los intervalos.
 */
export default function TimeBlocks({ username }) {
  const [session, setSession] = useState(() => readSession(username));
  const [history, setHistory] = useState(() => readHistory(username));

  /*
    La tarea ya escrita, todavía sin reloj. Es lo que distingue el acto 3 antes de
    arrancar: hay enfoque elegido pero no sesión.
  */
  const [pendingTask, setPendingTask] = useState(null);
  const [setupSec, setSetupSec] = useState(DEFAULT_SEC);
  const [isClockIn, setClockIn] = useState(false);

  // Fuerza el redibujo cada segundo mientras corre; el valor no se usa, el
  // restante se calcula del reloj. Un contador en el estado se desincronizaría.
  const [, setTick] = useState(0);

  /**
   * Candado en memoria contra el doble registro dentro del mismo render.
   *
   * Hace falta además de `session.recorded` porque `setSession` no es inmediato:
   * si el efecto se evalúa dos veces antes de que el estado se actualice
   * (StrictMode hace exactamente eso), ambas pasadas verían `recorded` en falso y
   * el bloque se contaría dos veces.
   */
  const notifiedFor = useRef(null);

  /**
   * Último tramo de cinco minutos que ya avisó, y el restante de la vuelta
   * anterior. Son refs y no estado: sólo deciden si toca vibrar, y en estado
   * provocarían un render por segundo sin cambiar nada de lo que se ve.
   */
  const lastMilestone = useRef(null);
  const prevRemaining = useRef(null);

  /**
   * Olvida el rastro de vibraciones para que el bloque empiece de cero. Sin esto,
   * una segunda vuelta no volvería a avisar en sus tramos: el candado seguiría
   * marcando como ya avisado el último múltiplo de la vuelta anterior.
   */
  const resetHaptics = useCallback(() => {
    lastMilestone.current = null;
    prevRemaining.current = null;
  }, []);

  const today = useMemo(() => statsFor(history), [history]);

  /**
   * Recarga el estado sólo cuando *cambia* de persona, no en cada montaje.
   *
   * Sin este candado el efecto se convierte en un reinicio que pisa lo que el
   * cierre del bloque acaba de dejar. Los valores iniciales de `useState` ya leen
   * el almacenamiento, así que en el primer montaje aquí no hay nada que hacer.
   */
  const loadedFor = useRef(username);

  useEffect(() => {
    if (loadedFor.current === username) return;
    loadedFor.current = username;

    setSession(readSession(username));
    setHistory(readHistory(username));
    setPendingTask(null);
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

    Se compara contra el restante de la vuelta anterior en lugar de exigir que el
    segundo caiga exacto en un múltiplo de 300: con la pestaña de fondo el navegador
    estrangula el intervalo y el restante puede saltar de 902 a 898, sin pisar nunca
    el 900. Mirando el salto, el tramo se detecta igual.
  */
  useEffect(() => {
    const previous = prevRemaining.current;
    prevRemaining.current = remaining;

    if (!isRunning || previous === null || remaining >= previous) return;

    const crossed = Math.floor(previous / MILESTONE_STEP_SEC) * MILESTONE_STEP_SEC;

    /*
      `crossed > 0` deja el cero fuera: ése es el final del bloque y tiene su propio
      patrón. `crossed < totalSec` evita vibrar al arrancar, cuando el restante
      todavía es la duración completa —que en un bloque de 25 minutos también es
      múltiplo de cinco.
    */
    if (crossed <= 0 || crossed >= session.totalSec) return;
    if (remaining > crossed || lastMilestone.current === crossed) return;

    lastMilestone.current = crossed;
    tapFeedback(MILESTONE_PATTERN);
  }, [isRunning, remaining, session]);

  // Cierre del bloque: se detiene, suena y se anota. Una sola vez por sesión.
  useEffect(() => {
    if (!session || !isRunning || remaining > 0) return;

    // `recorded` viaja con la sesión persistida, así que sobrevive al desmontaje y
    // a recargar la página; el ref cubre el mismo render.
    if (session.recorded || notifiedFor.current === session.startedAt) return;

    notifiedFor.current = session.startedAt;
    setSession((prev) => (
      prev ? { ...prev, status: 'done', remainingSec: 0, recorded: true } : prev
    ));

    const minutes = Math.round(session.totalSec / 60);
    setHistory(recordCompletion(username, { label: session.label, minutes }));

    playChime();

    /*
      El cierre también vibra porque el sonido no siempre llega: el teléfono puede
      estar en silencio, que es como suele quedarse durante un bloque de enfoque.
    */
    tapFeedback(SESSION_END_PATTERN);
  }, [session, isRunning, remaining, username]);

  /** Acto 3: la tarea está elegida; toca el reloj. */
  const askForTime = (task) => {
    setPendingTask(task);
    setSetupSec(DEFAULT_SEC);
    setClockIn(false);
  };

  /** Arranca el bloque. De aquí en adelante manda la sesión guardada. */
  const begin = () => {
    // El audio se abre aquí, con el gesto: al terminar el bloque ya no habrá
    // ninguno e iOS no dejaría sonar la campana.
    primeAudio();
    tapFeedback();

    notifiedFor.current = null;
    resetHaptics();

    setSession({
      label: pendingTask,
      totalSec: setupSec,
      remainingSec: setupSec,
      endsAt: Date.now() + setupSec * 1000,
      status: 'running',
      startedAt: Date.now(),
      recorded: false,
    });
    setPendingTask(null);
  };

  const pause = () => {
    tapFeedback();
    setSession((prev) => (prev
      ? { ...prev, status: 'paused', remainingSec: remainingSeconds(prev), endsAt: null }
      : prev));
  };

  const resume = () => {
    tapFeedback();
    setSession((prev) => {
      if (!prev) return prev;
      const seconds = prev.remainingSec ?? prev.totalSec;
      return { ...prev, status: 'running', endsAt: Date.now() + seconds * 1000 };
    });
  };

  /** Suelta el bloque sin anotarlo y devuelve la pantalla al acto 1. */
  const cancel = () => {
    tapFeedback();
    notifiedFor.current = null;
    resetHaptics();
    setSession(null);
    setPendingTask(null);
  };

  /**
   * Mueve el reloj en pasos de medio minuto.
   *
   * Ajusta el total además del restante: los minutos que se anotan al terminar
   * salen del total, así que sin esto un bloque de 25 que se alargó a 40 quedaría
   * registrado como 25. El trabajo hecho se cuenta completo.
   *
   * El suelo son 30 segundos y no cero a propósito. Restar hasta el final
   * dispararía el cierre del bloque —campana, vibración y registro— sin que nadie
   * haya trabajado ese tiempo, que es anotar trabajo que no ocurrió.
   */
  const adjust = (delta) => {
    if (!session) {
      setSetupSec((current) => Math.max(STEP_SEC, Math.min(MAX_SEC, current + delta)));
      return;
    }

    setSession((prev) => {
      if (!prev) return prev;
      const current = remainingSeconds(prev);
      const next = Math.max(STEP_SEC, Math.min(MAX_SEC, current + delta));
      if (next === current) return prev;

      return {
        ...prev,
        totalSec: Math.max(next, prev.totalSec + (next - current)),
        remainingSec: next,
        endsAt: prev.status === 'running' ? Date.now() + next * 1000 : null,
      };
    });
  };

  // ── Acto 3: bloque terminado ────────────────────────────────────────────
  if (session && isDone) {
    return (
      <div className="animate-rise flex flex-1 flex-col items-center justify-center">
        <p className="font-mono text-[3.75rem] font-bold leading-none tabular-nums
                      text-emerald-400 sm:text-7xl"
        >
          {formatClock(0)}
        </p>

        <p className="mt-6 text-lg font-light text-white">¡Bloque completado!</p>
        <p className="mt-1 text-sm text-white/40">{session.label}</p>

        <p className="mt-10 text-xs font-semibold uppercase tracking-widest text-white/30">
          Hoy · {today.blocks} {today.blocks === 1 ? 'bloque' : 'bloques'}
          {' · '}{formatDuration(today.minutes)}
        </p>

        <button
          type="button"
          onClick={cancel}
          className="mt-10 rounded-full border border-white/20 px-8 py-3 text-sm font-semibold
                     text-white transition-colors hover:bg-white/10 active:scale-95"
        >
          Nuevo bloque
        </button>
      </div>
    );
  }

  // ── Acto 3: el reloj, corriendo o en pausa ──────────────────────────────
  if (session) {
    return (
      <div className="animate-rise flex flex-1 flex-col items-center justify-center">
        <FocusClock seconds={remaining} onAdjust={adjust} canSubtract={remaining > STEP_SEC} />

        {isRunning ? (
          <button
            type="button"
            onClick={pause}
            className="mt-14 flex items-center gap-2 rounded-full border border-white/20 px-10
                       py-3.5 text-sm font-bold uppercase tracking-widest text-white
                       transition-colors hover:bg-white/10 active:scale-95"
          >
            <Pause size={14} />
            Pausa
          </button>
        ) : (
          /*
            En pausa aparecen las dos salidas y sólo entonces. Mientras el bloque
            corre, una "X" al lado de "Pausa" es un botón de destruir a un dedo de
            distancia del que se usa cada rato.
          */
          <div className="mt-14 flex flex-col items-center gap-6">
            <button
              type="button"
              onClick={resume}
              className="flex items-center gap-2 rounded-full bg-white px-10 py-3.5 text-sm
                         font-bold uppercase tracking-widest text-black transition-transform
                         hover:bg-white/90 active:scale-95"
            >
              <Play size={14} />
              Reanudar
            </button>

            <button
              type="button"
              onClick={cancel}
              aria-label="Cancelar el bloque"
              className="grid h-12 w-12 place-items-center rounded-full border border-white/15
                         text-white/40 transition-colors hover:border-rose-500/60
                         hover:text-rose-400 active:scale-95"
            >
              <X size={20} />
            </button>
          </div>
        )}
      </div>
    );
  }

  // ── Acto 3: cuánto tiempo ───────────────────────────────────────────────
  if (pendingTask !== null) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center">
        <TypedLine
          text="¿Cuánto tiempo?"
          onDone={() => setClockIn(true)}
          className="text-2xl font-light text-white"
        />

        {/*
          El reloj entra cuando la pregunta acabó de escribirse. Montarlo antes
          dejaría la respuesta en pantalla mientras todavía se está preguntando.
        */}
        {isClockIn && (
          <div className="animate-rise mt-12 flex flex-col items-center">
            <FocusClock
              seconds={setupSec}
              onAdjust={adjust}
              canSubtract={setupSec > STEP_SEC}
            />

            <p className="mt-4 max-w-[16rem] truncate text-sm text-white/30">
              {pendingTask}
            </p>

            <button
              type="button"
              onClick={begin}
              className="mt-12 flex items-center gap-2 rounded-full bg-white px-12 py-4 text-sm
                         font-bold uppercase tracking-widest text-black transition-transform
                         hover:bg-white/90 active:scale-95"
            >
              <Play size={14} />
              Iniciar
            </button>
          </div>
        )}
      </div>
    );
  }

  // ── Actos 1 y 2 ─────────────────────────────────────────────────────────
  return (
    <FocusFlow blocks={today.blocks} minutes={today.minutes} onReady={askForTime} />
  );
}
