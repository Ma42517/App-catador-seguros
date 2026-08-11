import { useState, useEffect, useRef } from 'react';
import { ArrowRight, Play } from 'lucide-react';
import TypedLine from './TypedLine';
import { DAILY_TARGET_MINUTES, formatDuration } from '../../data/timeBlocks';

/** Lo que tarda el "+" en irse antes de que entre la pregunta. */
const EXIT_MS = 320;

/** Lo que tarda la línea en trazarse; debe coincidir con `animate-draw-line`. */
const LINE_MS = 500;

const QUESTION = '¿En qué te gustaría enfocarte hoy?';
const HINT = 'Ej. Llamadas de seguimiento...';

/**
 * Actos 1 y 2: el gatillo y la pregunta.
 *
 * ACTO 1 es un signo "+" casi negro sobre negro, con un resplandor que respira.
 * Nada más: ni tarjetas, ni títulos, ni historial. La pantalla no ofrece opciones
 * porque en ese momento sólo hay una cosa que hacer, y un botón que respira lo dice
 * mejor que cualquier rótulo.
 *
 * ACTO 2 se escribe en cadena —pregunta, línea, ejemplo— y cada paso espera a que
 * el anterior termine de verdad, no a un retardo calculado a mano. Al final el
 * cursor entra en el campo, que en el teléfono levanta el teclado: la persona tocó
 * un "+" y lo siguiente que ve es una pregunta con el teclado abierto, sin ningún
 * toque intermedio.
 *
 * La pregunta va directa, sin "Hola, [Nombre]": la bienvenida ya ocurrió al entrar
 * a la app, y repetirla aquí retrasa la única frase que importa.
 */
/**
 * Meta del día, sin caja.
 *
 * Es la misma información que traía la tarjeta gris del diseño anterior —bloques
 * cerrados, minutos enfocados, objetivo— pero suelta sobre el negro: sin borde, sin
 * fondo y sin relleno. Ese recuadro era, sobre fondo negro, lo único que se veía en
 * la pantalla, y le robaba la atención al gesto de empezar.
 *
 * Lo que queda es una línea de dos píxeles y dos rótulos diminutos. A las seis de la
 * tarde, ver la línea a la mitad es la prueba de que el día valió, y para eso no
 * hace falta una tarjeta.
 */
function DailyGoal({ minutes }) {
  const percent = Math.min(100, (minutes / DAILY_TARGET_MINUTES) * 100);

  return (
    <div className="w-full max-w-xs">
      <div className="flex items-baseline justify-between text-[10px] font-semibold
                      uppercase tracking-widest text-white/25"
      >
        <span>Historial de hoy</span>
        <span className="tabular-nums text-white/40">{formatDuration(minutes)}</span>
      </div>

      <div
        className="mt-2.5 h-[2px] w-full overflow-hidden rounded-full bg-white/10"
        role="progressbar"
        aria-valuenow={Math.round(percent)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`Enfoque del día: ${minutes} de ${DAILY_TARGET_MINUTES} minutos`}
      >
        {/*
          Blanco y no un degradado de color: en esta pantalla el único acento es la
          luz. Un naranja aquí competiría con el resplandor del botón, que es lo que
          debe atraer el dedo.
        */}
        <div
          className="h-full rounded-full bg-white/70 transition-[width] duration-700 ease-out"
          style={{ width: `${percent}%` }}
        />
      </div>

      <p className="mt-2.5 text-[10px] font-semibold uppercase tracking-widest text-white/25">
        Meta del día: {formatDuration(DAILY_TARGET_MINUTES)}
      </p>
    </div>
  );
}

export default function FocusFlow({ blocks, minutes, onReady }) {
  /*
    'idle'    el "+" respirando
    'leaving' el "+" yéndose (existe sólo para poder animar su salida)
    'ask'     la pregunta
  */
  const [act, setAct] = useState('idle');

  /*
    Dentro del acto 2: 'question' → 'line' → 'hint' → 'ready'.
    Cada uno lo destraba el anterior al acabar su animación.
  */
  const [beat, setBeat] = useState('question');

  const [task, setTask] = useState('');
  const inputRef = useRef(null);

  // El "+" se va, y sólo cuando terminó de irse entra la pregunta.
  useEffect(() => {
    if (act !== 'leaving') return undefined;
    const id = setTimeout(() => setAct('ask'), EXIT_MS);
    return () => clearTimeout(id);
  }, [act]);

  // La línea tarda medio segundo en trazarse; el ejemplo espera a que acabe.
  useEffect(() => {
    if (beat !== 'line') return undefined;
    const id = setTimeout(() => setBeat('hint'), LINE_MS);
    return () => clearTimeout(id);
  }, [beat]);

  // El teclado se abre al final de la coreografía, no antes: apareciendo a media
  // pregunta tapa media pantalla mientras el texto todavía se está escribiendo.
  useEffect(() => {
    if (beat !== 'ready') return;
    inputRef.current?.focus();
  }, [beat]);

  const submit = (event) => {
    event.preventDefault();
    if (task.trim()) onReady(task.trim());
  };

  // ── Acto 1 ──────────────────────────────────────────────────────────────
  if (act !== 'ask') {
    const leaving = act === 'leaving';

    return (
      <div className="flex flex-1 flex-col items-center justify-center">
        <button
          type="button"
          onClick={() => setAct('leaving')}
          aria-label="Empezar un bloque de enfoque"
          className={`transition-all duration-300 ease-out
                      ${leaving ? 'scale-90 opacity-0' : 'scale-100 opacity-100'}`}
        >
          {/*
            Un triángulo de reproducción en lugar del "+" que había antes. Dice lo
            mismo con menos: "+" es "añade algo" —un bloque, un registro, una
            ficha— y esto no añade nada, arranca. Además es el gesto que cualquiera
            ya reconoce sin leer una palabra.

            Casi negro sobre negro: lo que se ve es su resplandor. Un triángulo
            blanco sería un botón; éste parece hundido en la pantalla, y al respirar
            invita a tocarlo sin pedirlo por escrito. `fill` es imprescindible: el
            icono viene hueco de fábrica y sin relleno el resplandor sólo dibujaría
            su contorno.
          */}
          <Play
            size={132}
            strokeWidth={1}
            fill="currentColor"
            className="animate-plus-breathe block select-none text-zinc-900"
            aria-hidden="true"
          />
        </button>

        {/*
          Todo lo de abajo flota: sin caja, sin borde y sin fondo, directamente sobre
          el negro.
        */}
        <div
          className={`mt-12 flex w-full flex-col items-center transition-opacity duration-300
                      ${leaving ? 'opacity-0' : 'opacity-100'}`}
        >
          <p className="text-lg font-light tracking-wide text-white/50">
            {blocks === 0
              ? 'Sin bloques todavía'
              : `${blocks} ${blocks === 1 ? 'bloque' : 'bloques'} · ${formatDuration(minutes)}`}
          </p>

          <div className="mt-10 w-full">
            <DailyGoal minutes={minutes} />
          </div>
        </div>
      </div>
    );
  }

  // ── Acto 2 ──────────────────────────────────────────────────────────────
  return (
    <form
      onSubmit={submit}
      className="animate-rise flex flex-1 flex-col items-center justify-center"
    >
      <TypedLine
        text={QUESTION}
        onDone={() => setBeat((current) => (current === 'question' ? 'line' : current))}
        className="max-w-xs text-center text-2xl font-light leading-snug text-white"
      />

      {/* La firma: la línea aparece cuando la pregunta terminó, no antes. */}
      {beat !== 'question' && (
        <div className="relative mt-10 w-full max-w-xs">
          <label className="sr-only" htmlFor="focus-task">Tarea del bloque</label>

          <input
            id="focus-task"
            ref={inputRef}
            value={task}
            onChange={(event) => setTask(event.target.value)}
            autoComplete="off"
            enterKeyHint="go"
            className="w-full bg-transparent pb-2 text-center text-lg text-white
                       caret-white focus:outline-none"
          />

          {/*
            El ejemplo no es un `placeholder` de verdad: un placeholder aparece de
            golpe y aquí se escribe. Va encima del campo, sin capturar toques, y se
            esconde en cuanto hay algo escrito.
          */}
          {beat !== 'line' && task === '' && (
            <div
              className="pointer-events-none absolute inset-x-0 top-0 flex justify-center pb-2"
            >
              <TypedLine
                text={HINT}
                cursor={false}
                onDone={() => setBeat((current) => (current === 'hint' ? 'ready' : current))}
                className="text-lg text-white/30"
              />
            </div>
          )}

          <span className="block h-px w-full animate-draw-line bg-white/25" aria-hidden="true" />
        </div>
      )}

      {/*
        "Continuar" nace invisible y se enciende con la primera letra. Se queda
        montado para poder fundirse: montándolo al teclear aparecería de golpe, y un
        botón que salta a la vista da la impresión de haber cometido un error.
      */}
      <button
        type="submit"
        disabled={!task.trim()}
        className={`mt-8 flex items-center gap-2 text-sm font-semibold text-white/70
                    transition-opacity duration-500 hover:text-white
                    ${task.trim() ? 'opacity-100' : 'pointer-events-none opacity-0'}`}
      >
        Continuar
        <ArrowRight size={15} />
      </button>
    </form>
  );
}
