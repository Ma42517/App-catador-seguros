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
        className="max-w-lg text-center text-2xl font-light leading-snug text-white
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
export default function ConversationalWizard({ onUseClassic }) {
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
    /*
      Toma la pestaña completa: negro puro, de borde a borde.

      Va en posición fija y no en el flujo de la página porque tiene que cubrir todo
      lo que pertenece a la versión clásica —la cabecera con su marca y su
      conmutador de fases, el resplandor de cuadrícula del fondo, el pie con el
      aviso legal y el contenedor de ancho de lectura—. Dentro de ese contenedor
      seguiría siendo un recuadro rodeado de la interfaz que viene a sustituir.

      El `z-40` está elegido: la barra de navegación inferior vive en `z-50`, así que
      queda por encima y sigue siendo la salida de la sección. Cubrir también la
      navegación dejaría a la persona encerrada en una propuesta que todavía no
      guarda nada.
    */
    <div className="fixed inset-0 z-40 flex flex-col bg-black">
      {/*
        Lo único que acompaña a la conversación: el aviso de que esto no guarda y la
        puerta de vuelta a la captura clásica.

        El aviso va arriba y a la vista, no en letra chica al final. Mientras esto
        sea un esqueleto, lo único que no puede pasar es que alguien capture su
        diagnóstico completo aquí y lo pierda al salir.
      */}
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 px-5 pt-5">
        <p className="flex items-center gap-1.5 rounded-full border border-amber-500/25
                      bg-amber-500/10 px-3 py-1 text-[10px] font-bold uppercase
                      tracking-widest text-amber-300/90"
        >
          <FlaskConical size={11} aria-hidden="true" />
          En desarrollo · aún no guarda
        </p>

        <button
          type="button"
          onClick={onUseClassic}
          className="rounded-full px-3 py-1 text-[11px] font-semibold text-white/30
                     transition-colors hover:text-white"
        >
          Captura clásica
        </button>
      </div>

      {/*
        `pb-32` reserva el alto de la barra de navegación: sin ese hueco, el botón
        "Continuar" queda debajo de ella y no se puede tocar en el teléfono.
      */}
      <div className="flex flex-1 flex-col items-center justify-center px-6 pb-32">
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
              className="w-full border-b border-white/20 bg-transparent pb-2 text-center
                         text-xl text-white caret-indigo-400 transition-colors
                         placeholder:text-white/25 focus:border-indigo-500
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
                         disabled:cursor-not-allowed disabled:bg-white/[0.06]
                         disabled:text-white/25 disabled:shadow-none"
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

          <p className="mt-6 text-2xl font-light text-white">
            Mucho gusto, {name.trim()}.
          </p>

          <p className="mt-3 max-w-xs text-sm leading-relaxed text-white/40">
            Aquí entra la siguiente pregunta de la conversación. El flujo completo se
            construye sobre esta base.
          </p>

          <button
            type="button"
            onClick={restart}
            className="mt-10 rounded-full border border-white/15 px-6 py-2.5 text-xs
                       font-semibold text-white/70 transition-colors
                       hover:border-white/40 hover:text-white active:scale-95"
          >
            Empezar de nuevo
          </button>
        </div>
      )}
      </div>
    </div>
  );
}
