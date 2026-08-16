import { useState, useEffect, useRef } from 'react';
import { ArrowRight, ArrowLeft, Sparkles, FlaskConical } from 'lucide-react';
import useTypewriter from '../../lib/useTypewriter';
import { useFinance } from '../../context/FinanceContext';
import { createEmptyState } from '../../data/defaults';

/*
  El perfil en blanco, para saber a qué volver al reiniciar.

  Se lee de la fábrica en lugar de escribir aquí los valores: la edad vacía es 35,
  no 0 ni cadena vacía, y copiar ese 35 a mano lo dejaría desincronizado el día que
  el esquema cambie de opinión.
*/
const EMPTY_PROFILE = createEmptyState().profile;

/** Mínimo de letras para dar por contestada la pregunta del nombre. */
const MIN_NAME = 2;

/*
  Rango de edad aceptado.

  Es el mismo que usa la captura clásica en su paso de perfil —16 a 100— recortado
  a 99 porque aquí el campo admite dos dígitos. Copiar el rango, y no inventar uno
  más estrecho, es lo que permite que la respuesta dada aquí siga siendo válida el
  día que este flujo alimente al motor financiero.
*/
const AGE = { min: 16, max: 99 };

/** Sólo dígitos y nunca más de dos: el rango cabe entero en esa forma. */
const toAgeDraft = (raw) => raw.replace(/\D/g, '').slice(0, 2);

const QUESTION = {
  name: () => 'Hola. Para comenzar a diseñar tu estrategia, '
    + '¿cómo te gusta que te llamen?',
  age: (name) => `Mucho gusto, ${name}. Para calcular tu línea de tiempo `
    + 'financiero, ¿cuántos años tienes hoy?',
};

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
 * Una pregunta con su respuesta: la coreografía compartida por todos los pasos.
 *
 * Vive en un solo sitio porque el encendido del campo, el botón que nace apagado y
 * el hueco de la barra de navegación son idénticos en cada paso. Repetidos por
 * pregunta, bastaría con que alguien ajustara el ritmo en una para que las demás se
 * quedaran atrás sin que ninguna prueba lo notara.
 */
function Ask({ text, isReady, onReady, isValid, onSubmit, onBack, children }) {
  return (
    <form onSubmit={onSubmit} className="flex w-full flex-col items-center">
      <Question text={text} onDone={onReady} />

      {/*
        El bloque de respuesta se queda montado desde el principio y sólo se
        enciende: si apareciera al terminar la frase, el salto de la pantalla al
        insertarlo movería la pregunta que se acaba de leer.
      */}
      <div
        className={`mt-12 w-full max-w-sm transition-opacity duration-700
                    ${isReady ? 'opacity-100' : 'pointer-events-none opacity-0'}`}
        aria-hidden={!isReady}
      >
        {children}

        {/*
          El botón nace apagado y se enciende con la respuesta válida. Es toda la
          validación que necesita: un mensaje de error sobre un campo que la persona
          apenas empieza a llenar regaña antes de tiempo.
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

        {/*
          La vuelta atrás sólo existe cuando hay algo detrás. Va discreta y debajo
          del botón: es una salida de emergencia para corregir un dato, no una de
          las dos opciones de la pregunta.
        */}
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="mx-auto mt-5 flex items-center gap-1.5 text-[11px] font-semibold
                       text-white/30 transition-colors hover:text-white/70"
          >
            <ArrowLeft size={12} aria-hidden="true" />
            Atrás
          </button>
        )}
      </div>
    </form>
  );
}

/** Campo de una sola línea: sin caja, sólo el subrayado. */
const FIELD_CLASS = 'w-full border-b border-white/20 bg-transparent pb-2 text-center '
  + 'text-xl text-white caret-indigo-400 transition-colors placeholder:text-white/25 '
  + 'focus:border-indigo-500 focus:outline-none';

/**
 * Captura V2: el diagnóstico como conversación.
 *
 * La versión clásica presenta ocho pasos con sus rejillas de campos, y funciona,
 * pero enseña la estructura del modelo financiero antes de haber preguntado nada.
 * Esta propuesta invierte el orden: una pregunta a la vez, en el centro de la
 * pantalla, sin que se vea el formulario que hay detrás.
 *
 * Hoy van dos de las tres preguntas, y lo que se contesta **sí se guarda**: nombre y
 * edad van al mismo perfil que llena la captura clásica. Es lo que permite alternar
 * entre las dos versiones sin perder lo escrito, y lo que evita que un asesor
 * conteste aquí con el prospecto delante para descubrir después que no quedó nada.
 */
export default function ConversationalWizard({ onUseClassic, onExit }) {
  /*
    El mismo contexto que usa la V1. No un estado local propio: dos versiones de la
    captura que guardan cada una en su sitio son dos diagnósticos distintos, y al
    cambiar de pestaña ganaría el que se montara último.
  */
  const { profile, patchSection } = useFinance();

  /*
    'name' | 'age'  la pregunta correspondiente
    'done'          se acabó lo construido; la pantalla acusa recibo

    Un nombre por paso y no un índice numérico: el orden de la conversación va a
    cambiar mientras se prueba, y `step === 'age'` sigue queriendo decir lo mismo
    después de intercalar una pregunta, cosa que `step === 1` no.
  */
  const [step, setStep] = useState('name');

  /** Cierto cuando la pregunta terminó de escribirse: destraba el campo. */
  const [isReady, setReady] = useState(false);

  /*
    Los campos arrancan con lo que ya hubiera en el perfil, para que volver a la V2
    no borre lo contestado ni obligue a teclearlo de nuevo.

    La edad sólo se recupera si hay nombre, y ahí está el detalle que importa: el
    perfil vacío trae edad 35: es un valor por omisión razonable para los cálculos,
    no una respuesta de nadie. Sembrarlo sin más dejaría la pregunta ya contestada
    con un dato inventado, y bastaría con pulsar "Continuar" para firmar como propia
    la edad que puso el sistema.
  */
  const [name, setName] = useState(() => profile.name || '');
  const [age, setAge] = useState(
    () => (profile.name ? String(profile.age ?? '') : ''),
  );

  const inputRef = useRef(null);

  const cleanName = name.trim();
  const ageNumber = Number(age);
  const isAgeValid = age !== '' && ageNumber >= AGE.min && ageNumber <= AGE.max;

  /*
    El cursor entra en el campo cuando la frase acabó, no antes. En el teléfono eso
    levanta el teclado, y hacerlo a media pregunta taparía la mitad de la pantalla
    mientras el texto todavía se escribe.
  */
  useEffect(() => {
    if (!isReady) return undefined;
    const id = setTimeout(() => inputRef.current?.focus(), 120);
    return () => clearTimeout(id);
  }, [isReady, step]);

  /** Cambia de pregunta y vuelve a trabar el campo hasta que la nueva se escriba. */
  const goTo = (next) => {
    setReady(false);
    setStep(next);
  };

  /*
    Cada respuesta se guarda al pasar de pregunta, no en cada tecla.

    Escribiendo al teclear, el motor financiero recalcularía el diagnóstico completo
    letra por letra, y el nombre a medio escribir quedaría guardado si alguien cierra
    la pestaña a mitad. Al avanzar hay una respuesta terminada y validada.
  */
  const submitName = (event) => {
    event.preventDefault();
    if (cleanName.length < MIN_NAME) return;
    patchSection('profile', { name: cleanName });
    goTo('age');
  };

  const submitAge = (event) => {
    event.preventDefault();
    if (!isAgeValid) return;
    patchSection('profile', { age: ageNumber });
    goTo('done');
  };

  /**
   * Vuelve a la primera pregunta para empezar la conversación de cero.
   *
   * Limpia también el perfil compartido: "Empezar de nuevo" aquí significa otro
   * prospecto, y dejar el nombre del anterior en el diagnóstico haría que la captura
   * clásica siguiera mostrando a alguien que ya no está en la conversación.
   */
  const restart = () => {
    setName('');
    setAge('');
    patchSection('profile', { name: '', age: EMPTY_PROFILE.age });
    goTo('name');
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
        Lo único que acompaña a la conversación: el aviso de que esto está a medio
        construir y la puerta de vuelta a la captura clásica.

        El aviso dice ahora qué se guarda, no que no se guarde nada. Es la diferencia
        entre advertir y desinformar: nombre y edad ya van al diagnóstico, y un cartel
        que siguiera diciendo "aún no guarda" empujaría al asesor a recapturarlos.
      */}
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 px-5 pt-5">
        <div className="flex min-w-0 items-center gap-2">
          {/*
            La salida de la sección.

            Antes la ponía la barra de navegación inferior, que en el Diagnóstico ya
            no se dibuja. Sin esta flecha, una pantalla en `fixed inset-0` sin barra
            deja al usuario encerrado en la conversación, con "Captura clásica" como
            única puerta: le cambia la versión cuando lo que quería era salir.
          */}
          <button
            type="button"
            onClick={onExit}
            aria-label="Regresar"
            className="-ml-2 grid h-8 w-8 shrink-0 place-items-center rounded-lg
                       text-white/40 transition-colors hover:bg-white/10 hover:text-white
                       focus-visible:outline-none focus-visible:ring-2
                       focus-visible:ring-indigo-500"
          >
            <ArrowLeft size={17} />
          </button>

          <p className="flex items-center gap-1.5 rounded-full border border-amber-500/25
                        bg-amber-500/10 px-3 py-1 text-[10px] font-bold uppercase
                        tracking-widest text-amber-300/90"
          >
            <FlaskConical size={11} aria-hidden="true" />
            En desarrollo · guarda nombre y edad
          </p>
        </div>

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
        Antes aquí había un `pb-32` que reservaba el alto de la barra de navegación.
        En el Diagnóstico esa barra ya no se dibuja, así que el hueco sobra: mantenerlo
        empujaría la conversación un tercio de pantalla hacia arriba y dejaría la
        pregunta descentrada. Queda el respiro del área segura del teléfono.
      */}
      <div className="flex flex-1 flex-col items-center justify-center px-6
                      pb-[max(2rem,env(safe-area-inset-bottom))]"
      >
        {step === 'name' && (
          <Ask
            text={QUESTION.name()}
            isReady={isReady}
            onReady={() => setReady(true)}
            isValid={cleanName.length >= MIN_NAME}
            onSubmit={submitName}
          >
            <label className="sr-only" htmlFor="conversational-name">
              Cómo te gusta que te llamen
            </label>

            <input
              id="conversational-name"
              ref={inputRef}
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Escribe tu nombre"
              autoComplete="given-name"
              enterKeyHint="go"
              className={FIELD_CLASS}
            />
          </Ask>
        )}

        {step === 'age' && (
          <Ask
            text={QUESTION.age(cleanName)}
            isReady={isReady}
            onReady={() => setReady(true)}
            isValid={isAgeValid}
            onSubmit={submitAge}
            onBack={() => goTo('name')}
          >
            <label className="sr-only" htmlFor="conversational-age">
              Cuántos años tienes hoy
            </label>

            {/*
              Teclado numérico y dos dígitos, filtrados al escribir. No se usa
              `type="number"` porque en el teléfono trae su rueda y sus flechas, y
              acepta signos y decimales que en una edad no significan nada: aquí
              basta con que no entre lo que no es un número.
            */}
            <input
              id="conversational-age"
              ref={inputRef}
              value={age}
              onChange={(event) => setAge(toAgeDraft(event.target.value))}
              placeholder="00"
              inputMode="numeric"
              autoComplete="off"
              enterKeyHint="go"
              aria-describedby="conversational-age-help"
              className={`${FIELD_CLASS} tracking-[0.4em]`}
            />

            {/*
              El rango se dice de entrada, en gris y en voz baja, en lugar de esperar
              a reclamarlo. Es la diferencia entre avisar dónde está el límite y
              regañar por haberlo cruzado.
            */}
            <p
              id="conversational-age-help"
              className="mt-3 text-center text-[11px] text-white/30"
            >
              {`Entre ${AGE.min} y ${AGE.max} años`}
            </p>
          </Ask>
        )}

        {step === 'done' && (
          /*
            Pantalla limpia, con el terreno preparado para la pregunta 3. Se repiten
            las dos respuestas porque son la prueba de que se recibieron: limpiar sin
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
              {`${cleanName}, ${ageNumber} años.`}
            </p>

            <p className="mt-3 max-w-xs text-sm leading-relaxed text-white/40">
              Aquí entra la última pregunta de la conversación: qué aspecto de tu vida
              quieres blindar. El flujo completo se construye sobre esta base.
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
