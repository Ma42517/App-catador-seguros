import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  Phone, ClipboardList, Timer, Plus, Play, Pause, Square, X, Hourglass, Flame,
} from 'lucide-react';
import Toast from '../Layout/Toast';
import TimerRing from './TimerRing';
import BlockFormSheet from './BlockFormSheet';
import TodayFocus from './TodayFocus';
import SessionCompleteModal from './SessionCompleteModal';
import {
  DEFAULT_BLOCKS, readCustomBlocks, writeCustomBlocks, makeBlock,
  readSession, writeSession, remainingSeconds, formatClock, elapsedFraction,
  readHistory, recordCompletion, statsFor,
} from '../../data/timeBlocks';
import { primeAudio, playChime } from '../../data/chime';
import {
  tapFeedback, MILESTONE_PATTERN, SESSION_END_PATTERN, MILESTONE_STEP_SEC,
} from '../../lib/haptics';

/** Iconos disponibles para los bloques, por nombre. */
const ICONS = { Phone, ClipboardList, Timer };

/** Chip de selección de bloque. */
function BlockChip({ block, isActive, onSelect, onRemove }) {
  const Icon = ICONS[block.icon] ?? Timer;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={onSelect}
        className={`flex w-full items-center gap-2 rounded-xl border px-3 py-2.5 text-left
                    transition-all active:scale-[0.97] ${isActive
          ? 'border-indigo-500 bg-indigo-500/10'
          : 'border-zinc-200 bg-white hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-900'}`}
      >
        <Icon
          size={15}
          className={`shrink-0 ${isActive ? 'text-indigo-500' : 'text-zinc-400'}`}
          aria-hidden="true"
        />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold text-zinc-900 dark:text-white">
            {block.label}
          </span>
          <span className="block text-xs font-medium text-zinc-500">{block.minutes} min</span>
        </span>
      </button>

      {/* Los bloques propios se pueden retirar; los de la app no. */}
      {!block.builtIn && (
        <button
          type="button"
          onClick={onRemove}
          aria-label={`Quitar bloque ${block.label}`}
          className="absolute -right-1.5 -top-1.5 grid h-5 w-5 place-items-center rounded-full
                     border border-zinc-200 bg-white text-zinc-400 shadow-sm transition-colors
                     hover:bg-rose-500 hover:text-white
                     dark:border-zinc-700 dark:bg-zinc-800"
        >
          <X size={10} />
        </button>
      )}
    </div>
  );
}

/**
 * Bloques de tiempo: temporizador de enfoque con bloques predefinidos.
 *
 * La sesión se guarda con el instante de término, no con los segundos que
 * quedan. Así el bloque sigue corriendo aunque el asesor se vaya a la Agenda
 * (la sección se desmonta al navegar) o mande la app al fondo, donde el
 * navegador estrangula los intervalos.
 */
export default function TimeBlocks({ username }) {
  const [custom, setCustom] = useState(() => readCustomBlocks(username));
  const [session, setSession] = useState(() => readSession(username));
  const [formOpen, setFormOpen] = useState(false);
  const [toast, setToast] = useState('');
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

  const blocks = useMemo(() => [...DEFAULT_BLOCKS, ...custom], [custom]);

  const today = useMemo(() => statsFor(history), [history]);

  // Al cambiar de usuario se cargan sus bloques y su sesión.
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

    setCustom(readCustomBlocks(username));
    setSession(readSession(username));
    setHistory(readHistory(username));
    setCompleted(null);
    notifiedFor.current = null;
    resetHaptics();
  }, [username, resetHaptics]);

  useEffect(() => {
    writeCustomBlocks(username, custom);
  }, [username, custom]);

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

  const clearToast = useCallback(() => setToast(''), []);

  /** Selecciona un bloque y lo deja listo, sin arrancar. */
  const selectBlock = (block) => {
    notifiedFor.current = null;
    resetHaptics();
    setSession({
      blockId: block.id,
      label: block.label,
      icon: block.icon,
      totalSec: block.minutes * 60,
      remainingSec: block.minutes * 60,
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
      ? { ...prev, status: 'paused', remainingSec: prev.totalSec, endsAt: null, startedAt: Date.now(), recorded: false }
      : prev));
  };

  const close = () => {
    notifiedFor.current = null;
    resetHaptics();
    setSession(null);
  };

  const addBlock = (draft) => {
    const block = makeBlock(draft);
    if (!block) {
      setToast('No se pudo crear el bloque.');
      return;
    }
    setCustom((prev) => [...prev, block]);
    setToast(`Bloque creado: ${block.label} · ${block.minutes} min`);
  };

  const removeBlock = (id) => {
    setCustom((prev) => prev.filter((block) => block.id !== id));
    // Si se quita el bloque que está cargado, el temporizador se retira con él.
    setSession((prev) => (prev?.blockId === id ? null : prev));
  };

  return (
    <section aria-label="Bloques de tiempo">
      {/* El título lo pone la cabecera de la pantalla; aquí sólo la medalla. */}
      <div className="mb-4 flex items-center gap-2">
        <Hourglass size={16} className="text-indigo-500" aria-hidden="true" />
        <h2 className="text-sm font-bold text-zinc-900 dark:text-white">Enfoque de hoy</h2>

        {/*
          Medalla de enfoque del día. Vive en la cabecera, no dentro del reloj:
          así se ve incluso sin ningún bloque cargado, que es cuando decide si
          vale la pena empezar otro.
        */}
        <span
          className={`ml-auto flex items-center gap-1.5 rounded-full px-2.5 py-1
                      text-sm font-bold transition-colors duration-500 ${today.blocks > 0
            ? 'bg-orange-500/15 text-orange-600 dark:text-orange-300'
            : 'bg-zinc-100 text-zinc-400 dark:bg-zinc-800 dark:text-zinc-500'}`}
          title={`${today.blocks} bloques completados hoy`}
        >
          <Flame size={14} aria-hidden="true" />
          {today.blocks}
          <span className="sr-only">bloques completados hoy</span>
        </span>
      </div>

      {/* Reloj: sólo cuando hay un bloque cargado, para no ocupar espacio en vano */}
      {session && (
        <div className="mb-4">
          <TimerRing
            clock={formatClock(remaining)}
            fraction={elapsedFraction(session)}
            label={session.label}
            isDone={isDone}
            isRunning={isRunning}
          />

          <div className="mt-4 flex gap-2">
            {isRunning ? (
              <button
                type="button"
                onClick={pause}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl border
                           border-zinc-300 py-3.5 text-base font-semibold text-zinc-700
                           transition-colors hover:bg-zinc-100 active:scale-[0.98]
                           dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
              >
                <Pause size={15} />
                Pausar
              </button>
            ) : (
              <button
                type="button"
                onClick={start}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-indigo-600
                           py-3.5 text-base font-semibold text-white shadow-lg shadow-indigo-600/30
                           transition-all hover:bg-indigo-500 active:scale-[0.98]"
              >
                <Play size={15} />
                {isDone ? 'Otra vuelta' : (remaining < session.totalSec ? 'Continuar' : 'Iniciar')}
              </button>
            )}

            <button
              type="button"
              onClick={reset}
              aria-label="Reiniciar el bloque"
              className="grid h-12 w-12 shrink-0 place-items-center rounded-xl border
                         border-zinc-300 text-zinc-500 transition-colors hover:bg-zinc-100
                         active:scale-95 dark:border-zinc-700 dark:hover:bg-zinc-800"
            >
              <Square size={14} />
            </button>

            <button
              type="button"
              onClick={close}
              aria-label="Cerrar el temporizador"
              className="grid h-12 w-12 shrink-0 place-items-center rounded-xl border
                         border-zinc-300 text-zinc-500 transition-colors
                         hover:bg-rose-500/10 hover:text-rose-500 active:scale-95
                         dark:border-zinc-700"
            >
              <X size={15} />
            </button>
          </div>
        </div>
      )}

      {/* Selección de bloque */}
      <div className="grid grid-cols-2 gap-2">
        {blocks.map((block) => (
          <BlockChip
            key={block.id}
            block={block}
            isActive={session?.blockId === block.id}
            onSelect={() => selectBlock(block)}
            onRemove={() => removeBlock(block.id)}
          />
        ))}

        <button
          type="button"
          onClick={() => setFormOpen(true)}
          className="flex items-center justify-center gap-1.5 rounded-xl border border-dashed
                     border-zinc-300 px-3 py-2.5 text-sm font-semibold text-zinc-500
                     transition-colors hover:border-indigo-500 hover:text-indigo-500
                     active:scale-[0.97] dark:border-zinc-700"
        >
          <Plus size={14} />
          Nuevo Bloque
        </button>
      </div>

      <TodayFocus blocks={today.blocks} minutes={today.minutes} />

      <BlockFormSheet
        isOpen={formOpen}
        onClose={() => setFormOpen(false)}
        onSubmit={addBlock}
      />

      <SessionCompleteModal
        isOpen={completed !== null}
        label={completed?.label ?? ''}
        minutes={completed?.minutes ?? 0}
        todayBlocks={completed?.stats.blocks ?? 0}
        todayMinutes={completed?.stats.minutes ?? 0}
        onClose={() => setCompleted(null)}
      />

      <Toast message={toast} onDone={clearToast} />
    </section>
  );
}
