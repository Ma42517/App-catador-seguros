import { useState, useEffect, useRef } from 'react';
import { ArrowRight, ArrowLeft, RotateCcw } from 'lucide-react';
import useTypewriter from '../../lib/useTypewriter';
import { MAX_MINUTES } from '../../data/timeBlocks';

/** Duraciones de un toque. Cuatro: con más, la fila deja de leerse de un vistazo. */
const PRESETS = [15, 25, 30, 60];

/**
 * Frase que abre cada paso, escribiéndose sola.
 *
 * El texto completo va en un `sr-only` aparte y el animado queda oculto para
 * lectores de pantalla: si no, cada letra dispararía un anuncio nuevo y la
 * pregunta se oiría veinte veces a medio formar.
 */
function Prompt({ text }) {
  const { typed, isTyping } = useTypewriter(text);

  return (
    <>
      <p className="sr-only">{text}</p>
      <p
        className="min-h-[3.5rem] max-w-sm text-center text-xl font-light leading-snug
                   text-zinc-800 dark:text-white"
        aria-hidden="true"
      >
        {typed}
        {isTyping && <span className="animate-pulse text-indigo-400">|</span>}
      </p>
    </>
  );
}

/**
 * Preparación de un bloque de enfoque, como conversación en dos preguntas.
 *
 * Antes esto era una rejilla de bloques fijos —"Hacer Llamadas, 45 min"— más un
 * formulario aparte para inventar uno nuevo. El problema no era el aspecto: era
 * que obligaba a elegir entre dos tareas que alguien decidió meses antes, o a
 * abrir un formulario para escribir la que de verdad tenía enfrente. La pregunta
 * que se hace un asesor al sentarse no es "¿cuál de estos dos bloques?", es "¿en
 * qué me voy a enfocar?". Ahora esa es literalmente la pregunta.
 *
 * Dos pasos y no uno con dos campos: el segundo se contesta en un toque en el
 * caso normal, y un formulario con dos casillas vacías pide pensar en las dos a
 * la vez. Primero la tarea, que es la decisión; después el tiempo, que casi
 * siempre es un preajuste.
 *
 * El paso 3 —el reloj— no está aquí: lo dibuja `TimeBlocks` cuando ya hay sesión.
 * Es a propósito. Un `step` de tres valores en memoria devolvería a la persona al
 * paso 1 en cuanto recargara la página, mientras su bloque de 45 minutos sigue
 * corriendo en el almacenamiento. La sesión guardada es la única fuente honesta
 * de "vas por el reloj".
 */
export default function FocusFlow({ name, recent = [], onStart }) {
  const [step, setStep] = useState(1);
  const [task, setTask] = useState('');
  const [minutes, setMinutes] = useState('25');
  const [error, setError] = useState('');

  const taskRef = useRef(null);
  const minutesRef = useRef(null);

  const saludo = name ? `, ${name.split(' ')[0]}` : '';

  /*
    El cursor entra en el campo del paso que se acaba de abrir. En el teléfono eso
    levanta el teclado, y aquí conviene: los dos pasos existen para escribir. Se
    espera un instante para no pelear con la animación de entrada.
  */
  useEffect(() => {
    const field = step === 1 ? taskRef.current : minutesRef.current;

    const id = setTimeout(() => {
      field?.focus();

      /*
        En el paso 2 el campo llega con 25 escrito, así que se selecciona: al teclear
        un 4 y un 0 se quiere "40", no "2540". Sin esto el cursor cae al final y el
        número crece hasta pasarse del tope, que es un error inventado por la
        interfaz y no por la persona.
      */
      if (step === 2) field?.select?.();
    }, 120);

    return () => clearTimeout(id);
  }, [step]);

  const goToTime = (event) => {
    event?.preventDefault();
    if (!task.trim()) return;
    setStep(2);
  };

  /** Arranca con los minutos que se den, o con los del campo si no viene ninguno. */
  const begin = (value) => {
    const clean = Math.round(Number(value ?? minutes));

    if (!Number.isFinite(clean) || clean < 1 || clean > MAX_MINUTES) {
      setError(`Los minutos van de 1 a ${MAX_MINUTES}.`);
      return;
    }
    onStart({ task: task.trim(), minutes: clean });
  };

  // ── Paso 1: la tarea ────────────────────────────────────────────────────
  if (step === 1) {
    return (
      <div key="paso-1" className="animate-rise flex flex-col items-center px-2 pt-6">
        <Prompt text={`Hola${saludo}. ¿En qué te gustaría enfocarte hoy?`} />

        <form onSubmit={goToTime} className="mt-8 flex w-full max-w-sm items-center gap-2">
          <label className="sr-only" htmlFor="focus-task">Tarea del bloque</label>

          {/*
            Sin caja: sólo una línea abajo. Un recuadro con borde y fondo lo
            convierte en "formulario", y la pantalla está haciendo una pregunta.
          */}
          <input
            id="focus-task"
            ref={taskRef}
            value={task}
            onChange={(event) => setTask(event.target.value)}
            placeholder="Ej. Llamadas de seguimiento..."
            autoComplete="off"
            className="min-w-0 flex-1 border-b border-zinc-300 bg-transparent pb-2 text-lg
                       text-zinc-900 transition-colors placeholder:text-zinc-400
                       focus:border-indigo-500 focus:outline-none dark:border-zinc-700
                       dark:text-white dark:placeholder:text-zinc-600"
          />

          {/*
            La flecha nace apagada y sin poder tocarse hasta que hay algo escrito.
            Es la única señal de que falta un dato: no hace falta un mensaje de
            error para un campo que la persona todavía no ha llenado.
          */}
          <button
            type="submit"
            disabled={!task.trim()}
            aria-label="Continuar al tiempo"
            className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-indigo-600
                       text-white transition-all hover:bg-indigo-500 active:scale-95
                       disabled:cursor-not-allowed disabled:bg-zinc-200 disabled:text-zinc-400
                       dark:disabled:bg-zinc-800 dark:disabled:text-zinc-600"
          >
            <ArrowRight size={18} />
          </button>
        </form>

        {/*
          Lo que ya se trabajó hoy, para repetirlo sin volver a escribirlo. Es lo
          que queda de los bloques fijos, pero al revés: en lugar de dos tareas que
          alguien supuso, las que esta persona sí hizo.
        */}
        {recent.length > 0 && (
          <div className="mt-8 flex w-full max-w-sm flex-col items-center gap-2">
            <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
              Hoy trabajaste en
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              {recent.map((label) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => { setTask(label); setStep(2); }}
                  className="flex items-center gap-1.5 rounded-full border border-zinc-200
                             px-3 py-1.5 text-xs font-semibold text-zinc-600 transition-colors
                             hover:border-indigo-500 hover:text-indigo-500 active:scale-95
                             dark:border-zinc-800 dark:text-zinc-300"
                >
                  <RotateCcw size={11} aria-hidden="true" />
                  {label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // ── Paso 2: el tiempo ───────────────────────────────────────────────────
  return (
    <div key="paso-2" className="animate-rise flex flex-col items-center px-2 pt-6">
      <Prompt text="Perfecto. ¿Durante cuánto tiempo?" />

      <div className="mt-6 flex items-baseline justify-center gap-2">
        <label className="sr-only" htmlFor="focus-minutes">Minutos del bloque</label>

        {/*
          `tabular-nums` mantiene quieto el número al cambiar de dígito, y el ancho
          fijo evita que el campo se encoja al borrarlo todo y deje de ser tocable.
        */}
        <input
          id="focus-minutes"
          ref={minutesRef}
          value={minutes}
          onChange={(event) => {
            // Sólo dígitos: un "25 min" tecleado dentro del campo no es un número.
            setMinutes(event.target.value.replace(/\D/g, '').slice(0, 3));
            setError('');
          }}
          inputMode="numeric"
          autoComplete="off"
          aria-invalid={Boolean(error)}
          className="w-28 border-none bg-transparent p-0 text-center text-6xl font-bold
                     tabular-nums text-zinc-900 focus:outline-none focus:ring-0
                     dark:text-white"
        />
        <span className="text-lg font-medium text-zinc-400">min</span>
      </div>

      {/*
        Un toque y arranca: el preajuste es la respuesta completa, así que pedir un
        "continuar" después sería pedir dos veces lo mismo.
      */}
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        {PRESETS.map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => { setMinutes(String(value)); begin(value); }}
            className={`rounded-full border px-4 py-2 text-sm font-semibold transition-colors
                        active:scale-95 ${Number(minutes) === value
              ? 'border-indigo-500 bg-indigo-500/10 text-indigo-600 dark:text-indigo-300'
              : 'border-zinc-200 text-zinc-600 hover:border-indigo-400 dark:border-zinc-800 dark:text-zinc-300'}`}
          >
            {value} min
          </button>
        ))}
      </div>

      {error && (
        <p role="alert" className="mt-4 text-xs font-medium text-rose-500">{error}</p>
      )}

      <button
        type="button"
        onClick={() => begin()}
        className="mt-8 flex w-full max-w-sm items-center justify-center gap-2 rounded-xl
                   bg-indigo-600 py-3.5 text-base font-semibold text-white
                   shadow-lg shadow-indigo-600/30 transition-all hover:bg-indigo-500
                   active:scale-[0.98]"
      >
        Continuar
        <ArrowRight size={16} />
      </button>

      {/*
        La vuelta atrás importa más de lo que parece: el paso 1 ya no se ve, y sin
        salida habría que cerrar la pantalla completa para corregir una palabra del
        nombre de la tarea.
      */}
      <button
        type="button"
        onClick={() => { setStep(1); setError(''); }}
        className="mt-3 flex items-center gap-1.5 text-xs font-semibold text-zinc-500
                   transition-colors hover:text-zinc-800 dark:hover:text-zinc-200"
      >
        <ArrowLeft size={12} />
        {task.trim() || 'Cambiar la tarea'}
      </button>
    </div>
  );
}
