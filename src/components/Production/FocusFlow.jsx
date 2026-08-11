import { useState, useEffect, useRef } from 'react';
import { ArrowRight } from 'lucide-react';
import TypedLine from './TypedLine';

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
export default function FocusFlow({ todayLabel, onReady }) {
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
            El signo es casi negro sobre negro: lo que se ve es su resplandor. Un "+"
            blanco sería un botón; éste parece hundido en la pantalla, y al respirar
            invita a tocarlo sin pedirlo por escrito.

            `select-none` porque un signo de 9rem es facilísimo de seleccionar por
            accidente al mantener el dedo, y el texto azul de selección arruina el
            efecto.
          */}
          <span
            className="animate-plus-breathe block select-none text-[9rem] font-thin leading-none
                       text-zinc-900"
            aria-hidden="true"
          >
            +
          </span>
        </button>

        {/*
          Flotando: sin caja, sin borde y sin fondo. Antes esto era una tarjeta gris
          con barra de progreso y meta del día; en una pantalla negra, ese recuadro
          era lo único que se veía y competía con el gesto de empezar.
        */}
        <p
          className={`mt-10 text-lg font-light tracking-wide text-white/50
                      transition-opacity duration-300
                      ${leaving ? 'opacity-0' : 'opacity-100'}`}
        >
          {todayLabel}
        </p>
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
