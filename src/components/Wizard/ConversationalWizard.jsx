import { useState, useEffect, useRef } from 'react';
import { ArrowRight, Sparkles, FlaskConical } from 'lucide-react';
import useTypewriter from '../../lib/useTypewriter';

/** Mínimo de letras para dar por contestada la pregunta del nombre. */
const MIN_NAME = 2;

const GREETING = 'Hola. Para comenzar a diseñar tu estrategia, '
  + '¿cómo te gusta que te llamen?';

/**
 * Frase que se escribe sola y avisa al terminar.
 *
 * El aviso es lo que ordena la escena: el campo no aparece hasta que la pregunta
 * acaba. Con un retardo fijo habría que adivinar cuánto tarda cada frase, y al
 * cambiar una palabra la coreografía se desincronizaría sin que nada lo delate.
 *
 * El texto completo va aparte en un `sr-only` y el animado queda oculto para
 * lectores de pantalla: si no, cada letra dispara un anuncio nuevo y la pregunta se
 * oye veinte veces a medio formar.
 */
function Question({ text, onDone }) {
  const { typed, isTyping } = useTypewriter(text);
  const notified = useRef(null);

  useEffect(() => {
    if (isTyping || notified.current === text) return;
    notified.current = text;
    onDone?.();
  }, [isTyping, text, onDone]);

  return (
    <>
      <p className="sr-only">{text}</p>
      <p
        className="max-w-lg text-center text-2xl font-light leading-snug text-slate-100
                   sm:text-3xl"
        aria-hidden="true"
      >
        {typed}
        {isTyping && <span className="animate-pulse text-indigo-400">|</span>}
      </p>
    </>
  );
}

/**
 * Captura V2: el diagnóstico como conversación.
 *
 * La versión clásica presenta ocho pasos con sus rejillas de campos, y funciona,
 * pero enseña la estructura del modelo financiero antes de haber preguntado nada.
 * Esta propuesta invierte el orden: una pregunta a la vez, en el centro de la
 * pantalla, sin que se vea el formulario que hay detrás.
 *
 * Hoy es el esqueleto de la primera pregunta. Lo que se escribe **no se guarda**
 * todavía, y eso se avisa en pantalla: un asistente que parece capturar y no captura
 * le costaría a un asesor media hora de trabajo perdido.
 */
export default function ConversationalWizard() {
  /*
    'asking'   la pregunta se está escribiendo o esperando respuesta
    'answered' ya contestó; la pantalla se limpia para la siguiente
  */
  const [stage, setStage] = useState('asking');

  /** Cierto cuando la pregunta terminó de escribirse: destraba el campo. */
  const [isReady, setReady] = useState(false);

  const [name, setName] = useState('');
  const inputRef = useRef(null);

  const isValid = name.trim().length >= MIN_NAME;

  /*
    El cursor entra en el campo cuando la frase acabó, no antes. En el teléfono eso
    levanta el teclado, y hacerlo a media pregunta taparía la mitad de la pantalla
    mientras el texto todavía se escribe.
  */
  useEffect(() => {
    if (!isReady || stage !== 'asking') return undefined;
    const id = setTimeout(() => inputRef.current?.focus(), 120);
    return () => clearTimeout(id);
  }, [isReady, stage]);

  const submit = (event) => {
    event.preventDefault();
    if (!isValid) return;
    setStage('answered');
  };

  /** Vuelve a la primera pregunta para poder corregir el nombre. */
  const restart = () => {
    setStage('asking');
    setReady(false);
    setName('');
  };

  return (
    <div
      className="relative flex min-h-[70dvh] flex-col items-center justify-center
                 overflow-hidden rounded-3xl bg-slate-950 px-6 py-16"
    >
      {/*
        Alto del 70% de la pantalla y no `min-h-screen`. Esta vista vive dentro de
        una página que ya tiene cabecera y pie, así que una altura de pantalla
        completa los empujaría fuera del campo visual y obligaría a hacer scroll
        para ver un contenido que está centrado. `dvh` y no `vh` porque en móvil la
        barra del navegador se recoge y con `vh` el centro se calcula contra una
        altura que ya no existe.
      */}
      <span
        className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-gradient-to-b
                   from-indigo-500/10 to-transparent"
        aria-hidden="true"
      />

      {/*
        El aviso va arriba y a la vista, no en letra chica al final. Mientras esto
        sea un esqueleto, lo único que no puede pasar es que alguien capture su
        diagnóstico completo aquí y lo pierda al salir.
      */}
      <p className="absolute left-1/2 top-5 flex -translate-x-1/2 items-center gap-1.5
                    rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1
                    text-[10px] font-bold uppercase tracking-widest text-amber-300"
      >
        <FlaskConical size={11} aria-hidden="true" />
        Propuesta en desarrollo · aún no guarda
      </p>

      {stage === 'asking' ? (
        <form onSubmit={submit} className="flex w-full flex-col items-center">
          <Question text={GREETING} onDone={() => setReady(true)} />

          {/*
            El campo se queda montado desde el principio y sólo se enciende: si
            apareciera al terminar la frase, el salto de la pantalla al insertarlo
            movería la pregunta que se acaba de leer.
          */}
          <div
            className={`mt-12 w-full max-w-sm transition-opacity duration-700
                        ${isReady ? 'opacity-100' : 'pointer-events-none opacity-0'}`}
            aria-hidden={!isReady}
          >
            <label className="sr-only" htmlFor="conversational-name">
              Cómo te gusta que te llamen
            </label>

            {/*
              Sin caja: sólo una línea debajo. Un recuadro con borde y fondo
              convierte la conversación en formulario, que es justo lo que esta
              versión intenta no parecer.
            */}
            <input
              id="conversational-name"
              ref={inputRef}
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Escribe tu nombre"
              autoComplete="given-name"
              enterKeyHint="go"
              className="w-full border-b border-slate-700 bg-transparent pb-2 text-center
                         text-xl text-white caret-indigo-400 transition-colors
                         placeholder:text-slate-600 focus:border-indigo-500
                         focus:outline-none"
            />

            {/*
              El botón nace apagado y se enciende con la segunda letra. Es toda la
              validación que necesita: un mensaje de error sobre un campo que la
              persona apenas empieza a llenar regaña antes de tiempo.
            */}
            <button
              type="submit"
              disabled={!isValid}
              className="mt-8 flex w-full items-center justify-center gap-2 rounded-xl
                         bg-indigo-600 py-3.5 text-base font-semibold text-white
                         shadow-lg shadow-indigo-600/25 transition-all
                         hover:bg-indigo-500 active:scale-[0.98]
                         disabled:cursor-not-allowed disabled:bg-slate-800
                         disabled:text-slate-500 disabled:shadow-none"
            >
              Continuar
              <ArrowRight size={16} />
            </button>
          </div>
        </form>
      ) : (
        /*
          Pantalla limpia, con el terreno preparado para la pregunta 2. Se confirma
          el nombre porque es la prueba de que la respuesta se recibió: limpiar sin
          acusar recibo deja la duda de si el toque contó.
        */
        <div className="animate-rise flex flex-col items-center text-center">
          <span
            className="grid h-12 w-12 place-items-center rounded-full bg-indigo-500/15
                       text-indigo-300"
            aria-hidden="true"
          >
            <Sparkles size={20} />
          </span>

          <p className="mt-6 text-2xl font-light text-slate-100">
            Mucho gusto, {name.trim()}.
          </p>

          <p className="mt-3 max-w-xs text-sm leading-relaxed text-slate-500">
            Aquí entra la siguiente pregunta de la conversación. El flujo completo se
            construye sobre esta base.
          </p>

          <button
            type="button"
            onClick={restart}
            className="mt-10 rounded-full border border-slate-700 px-6 py-2.5 text-xs
                       font-semibold text-slate-300 transition-colors
                       hover:border-slate-500 hover:text-white active:scale-95"
          >
            Empezar de nuevo
          </button>
        </div>
      )}
    </div>
  );
}
