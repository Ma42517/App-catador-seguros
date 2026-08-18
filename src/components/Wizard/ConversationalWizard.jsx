import { useState, useEffect, useRef } from 'react';
import { ArrowRight, ArrowLeft, Sparkles, FlaskConical } from 'lucide-react';
import useTypewriter from '../../lib/useTypewriter';
import { useFinance } from '../../context/FinanceContext';
import { createEmptyState, createIncome } from '../../data/defaults';

/*
  El perfil en blanco, para saber a qué volver al reiniciar.

  Se lee de la fábrica en lugar de escribir aquí los valores: la edad vacía es 35,
  no 0 ni cadena vacía, y copiar ese 35 a mano lo dejaría desincronizado el día que
  el esquema cambie de opinión.
*/
const EMPTY_STATE = createEmptyState();
const EMPTY_PROFILE = EMPTY_STATE.profile;

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

/*
  Edad de retiro: mismo tope que ProfileStep.jsx (95). El mínimo es dinámico
  (edad + 1) y se aplica en el propio paso, no aquí.
*/
const RETIREMENT_AGE_MAX = 95;

/*
  Años estimados de vida por defecto: 85, igual que DEFAULT_ASSUMPTIONS en
  defaults.js. No se pregunta al usuario — vive "bajo el cofre" — pero si la
  edad de retiro elegida lo alcanza o lo supera, hay que empujarlo hacia
  arriba. La misma protección de las "tres edades" que ya vive en
  ProfileStep.jsx: se nace, se retira, se vive. Sin esto, alguien que responde
  "quiero retirarme a los 90" se quedaría con un plan de retiro de duración
  negativa (85 - 90 = -5 años), y nadie en este flujo lo vería venir porque el
  dato nunca se muestra en pantalla.
*/
const DEFAULT_LIFE_EXPECTANCY = 85;
const LIFE_EXPECTANCY_MAX = 110;

/** Sólo dígitos y nunca más de dos: el rango cabe entero en esa forma. */
const toAgeDraft = (raw) => raw.replace(/\D/g, '').slice(0, 2);

/** Sólo dígitos, sin tope de longitud: un ingreso mensual puede tener 6+ cifras. */
const toDigitsDraft = (raw) => raw.replace(/\D/g, '');

/*
  Metas rápidas del Paso 2 ("el gancho").

  No existe un campo equivalente en la estructura del V1 para "meta principal
  declarada en la conversación" — el V1 modela metas como filas en `goals[]`,
  cada una con costo, plazo y aportación, datos que aquí no se preguntan.
  Crear una fila de meta con costo $0 para que "cuadre" con el V1 sería
  inventar un dato: el diagnóstico mostraría una meta sin sustento numérico,
  que es justo lo que este proyecto prohíbe explícitamente ("la interfaz no
  miente", .kiro/steering/codigo.md). Por eso esta elección sólo vive en el
  estado local del wizard, como hilo narrativo para personalizar el texto de
  las preguntas siguientes, y no se escribe al contexto compartido.
*/
const GOALS = [
  { value: 'home', label: 'Comprar una casa' },
  { value: 'retirement', label: 'Libertad financiera / Retiro' },
  { value: 'family', label: 'Proteger a mi familia' },
  { value: 'debt', label: 'Salir de deudas' },
  { value: 'other', label: 'Otra' },
];

/*
  Dependientes rápidos del Paso 4.

  El V1 los modela como dos contadores numéricos independientes —`dependents`
  y `children`— sin una opción "Pareja" ni "Ninguno" explícitas: una pareja
  sin hijos ya cuenta como 1 dependiente en ese esquema, y "Ninguno" es
  simplemente ambos en 0. Este mapeo traduce la selección rápida conversacional
  a esos dos contadores sin inventar un campo nuevo.
*/
const DEPENDENTS_OPTIONS = [
  { value: 'partner', label: 'Pareja', dependents: 1, children: 0 },
  { value: 'kids', label: 'Hijos', dependents: 1, children: 1 },
  { value: 'other', label: 'Otros', dependents: 1, children: 0 },
  { value: 'none', label: 'Ninguno', dependents: 0, children: 0 },
];

const YES_NO = [
  { value: true, label: 'Sí' },
  { value: false, label: 'No' },
];

const QUESTION = {
  name: () => 'Hola. Para comenzar a diseñar tu estrategia, '
    + '¿cómo te gusta que te llamen?',
  goal: (name) => `Mucho gusto, ${name}. Todos tenemos un motor financiero. `
    + '¿Cuál es tu meta principal?',
  age: () => '¿Cuántos años tienes?',
  city: (name) => `${name}, ¿en qué ciudad vives?`,
  dependents: () => '¿Alguien más depende de ti hoy?',
  income: () => 'Hablemos de números. ¿Cuál es tu ingreso mensual neto '
    + '—lo que recibes ya sin impuestos—?',
  retirementAge: () => '¿A qué edad te gustaría retirarte?',
  medicalInsurance: () => '¿Cuentas con un seguro de Gastos Médicos Mayores (GMM)?',
  lifeInsurance: () => '¿Cuentas con un seguro de vida?',
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
function Ask({
  text, isReady, onReady, isValid, onSubmit, onBack, children, hideContinue = false,
}) {
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

          Los pasos de botones de selección rápida avanzan solos al elegir una
          opción (ver `onChoose`), así que ocultan este botón: tenerlo de todas
          formas ofrecería dos caminos para la misma acción.
        */}
        {!hideContinue && (
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
        )}

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

/**
 * Rejilla de botones de selección rápida.
 *
 * Cada botón dispara `onChoose` de inmediato: elegir ya es responder, así que no
 * hace falta un segundo toque en "Continuar" para confirmar lo que se acaba de
 * tocar. `selected` resalta la opción ya guardada al volver con "Atrás".
 */
function QuickChoices({ options, selected, onChoose }) {
  return (
    <div className="grid grid-cols-2 gap-2.5">
      {options.map((opt) => {
        const active = selected === opt.value;
        return (
          <button
            key={String(opt.value)}
            type="button"
            onClick={() => onChoose(opt.value)}
            className={`rounded-xl border px-4 py-3 text-sm font-semibold transition-all
                       active:scale-[0.97] ${
              active
                ? 'border-indigo-500 bg-indigo-500/15 text-indigo-200'
                : 'border-white/15 text-white/70 hover:border-white/30 hover:bg-white/[0.04] hover:text-white'
            }`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

/** Campo de una sola línea: sin caja, sólo el subrayado. */
const FIELD_CLASS = 'w-full border-b border-white/20 bg-transparent pb-2 text-center '
  + 'text-xl text-white caret-indigo-400 transition-colors placeholder:text-white/25 '
  + 'focus:border-indigo-500 focus:outline-none';

/**
 * Pantalla de bienvenida inmersiva. Paso 0, antes de pedir cualquier dato.
 *
 * Fondo negro puro y texto centrado que aparece con fade-in — usa la misma
 * animación `animate-rise` que ya vive en `index.css` para el resto de la app,
 * en lugar de definir una nueva, para no tener dos animaciones de entrada
 * haciendo lo mismo con nombres distintos.
 */
function WelcomeStep({ onStart }) {
  return (
    <div className="animate-rise flex flex-col items-center px-6 text-center">
      <span
        className="grid h-14 w-14 place-items-center rounded-full bg-indigo-500/15
                   text-indigo-300"
        aria-hidden="true"
      >
        <Sparkles size={24} />
      </span>

      <p className="mt-8 max-w-md text-2xl font-light leading-relaxed text-white
                    sm:text-3xl"
      >
        Bienvenido. Soy tu asistente virtual y te ayudaré a conocerte mejor
        para construir tus metas.
      </p>

      <button
        type="button"
        onClick={onStart}
        className="mt-10 rounded-full bg-indigo-600 px-8 py-3 text-sm font-semibold
                   text-white shadow-lg shadow-indigo-600/25 transition-all
                   hover:bg-indigo-500 active:scale-95"
      >
        Comenzar
      </button>
    </div>
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
 * Arquitectura compartida: cada respuesta que sí tiene un campo equivalente en
 * el V1 se escribe con `patchSection`/`add` sobre el mismo `FinanceContext` que
 * usa la captura clásica — nunca en un estado propio. Es lo que permite que
 * ambas versiones alimenten las mismas calculadoras sin que el motor financiero
 * (`src/engine/`, zona intocable) tenga que enterarse de que existe un segundo
 * flujo de captura.
 */
export default function ConversationalWizard({ onUseClassic, onExit }) {
  /*
    El mismo contexto que usa la V1. No un estado local propio: dos versiones de la
    captura que guardan cada una en su sitio son dos diagnósticos distintos, y al
    cambiar de pestaña ganaría el que se montara último.
  */
  const { profile, incomes, patchSection, setField, add, update, remove } = useFinance();

  /*
    Un nombre por paso y no un índice numérico: el orden va a cambiar mientras
    se prueba, y `step === 'age'` sigue queriendo decir lo mismo después de
    intercalar una pregunta, cosa que `step === 3` no. Cada paso conoce su
    propio destino de "Atrás" (ver `onBack` en cada `<Ask>` de abajo), así que
    no hace falta una lista central de pasos para calcularlo.
  */
  const [step, setStep] = useState('welcome');

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
  const hasAnswered = Boolean(profile.name);
  const [name, setName] = useState(() => profile.name || '');
  const [goal, setGoal] = useState(null);
  const [age, setAge] = useState(() => (hasAnswered ? String(profile.age ?? '') : ''));
  const [city, setCity] = useState(() => profile.city || '');
  const [dependentsChoice, setDependentsChoice] = useState(null);

  /*
    Ingreso mensual neto: no existe como campo simple en el perfil del V1 — se
    modela como una fila dentro de `incomes[]` (nombre, categoría, tipo, monto,
    frecuencia, estabilidad), la misma colección que llena el paso de Ingresos
    de la captura clásica. La fila que crea este paso usa 'stable'/'monthly'
    porque es justo lo que se preguntó: "tu ingreso mensual neto", sin
    variabilidad declarada. Se guarda el id de esa fila para poder actualizarla
    en vez de duplicarla si la persona vuelve atrás a corregir el monto.
  */
  const seedIncomeId = incomes.find((row) => row.name === 'Ingreso principal')?.id || null;
  const [incomeRowId, setIncomeRowId] = useState(seedIncomeId);
  const [income, setIncome] = useState(() => {
    const row = incomes.find((r) => r.id === seedIncomeId);
    return row && row.amount ? String(row.amount) : '';
  });

  const [retirementAge, setRetirementAge] = useState(
    () => (hasAnswered ? String(profile.retirementAge ?? '') : ''),
  );
  const [hasMedicalInsurance, setHasMedicalInsurance] = useState(
    () => (hasAnswered ? profile.hasMedicalInsurance : null),
  );
  const [hasLifeInsurance, setHasLifeInsurance] = useState(
    () => (hasAnswered ? profile.hasLifeInsurance : null),
  );

  const inputRef = useRef(null);

  const cleanName = name.trim();
  const cleanCity = city.trim();
  const ageNumber = Number(age);
  const isAgeValid = age !== '' && ageNumber >= AGE.min && ageNumber <= AGE.max;
  const incomeNumber = Number(income);
  const isIncomeValid = income !== '' && incomeNumber >= 0;
  const retirementAgeNumber = Number(retirementAge);
  const retirementMin = (isAgeValid ? ageNumber : profile.age) + 1;
  const isRetirementAgeValid = retirementAge !== ''
    && retirementAgeNumber >= retirementMin
    && retirementAgeNumber <= RETIREMENT_AGE_MAX;

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
    goTo('goal');
  };

  /*
    La meta no se persiste en el contexto (ver comentario junto a `GOALS`): sólo
    decide el texto de la siguiente pregunta.
  */
  const chooseGoal = (value) => {
    setGoal(value);
    goTo('age');
  };

  const submitAge = (event) => {
    event.preventDefault();
    if (!isAgeValid) return;

    /*
      Protección de las tres edades, igual que en ProfileStep.jsx: si la edad
      de retiro ya guardada quedó por debajo de la nueva edad + 1, se empuja
      hacia arriba. No se toca si ya era mayor — alguien de 40 que planea
      retirarse a los 70 no debería ver su plan encogerse por corregir un año
      de su edad actual.
    */
    const nextRetirementAge = Math.min(
      RETIREMENT_AGE_MAX,
      Math.max(profile.retirementAge || EMPTY_PROFILE.retirementAge, ageNumber + 1),
    );
    patchSection('profile', { age: ageNumber, retirementAge: nextRetirementAge });
    goTo('city');
  };

  const submitCity = (event) => {
    event.preventDefault();
    if (!cleanCity) return;
    patchSection('profile', { city: cleanCity });
    goTo('dependents');
  };

  const chooseDependents = (value) => {
    setDependentsChoice(value);
    const option = DEPENDENTS_OPTIONS.find((o) => o.value === value);
    patchSection('profile', {
      dependents: option.dependents,
      children: option.children,
    });
    goTo('income');
  };

  const submitIncome = (event) => {
    event.preventDefault();
    if (!isIncomeValid) return;

    if (incomeRowId) {
      update('incomes', incomeRowId, { amount: incomeNumber });
    } else {
      const row = createIncome({
        name: 'Ingreso principal',
        group: 'labor',
        type: 'salary',
        amount: incomeNumber,
        frequency: 'monthly',
        stability: 'stable',
      });
      add('incomes', row);
      setIncomeRowId(row.id);
    }
    goTo('retirementAge');
  };

  const submitRetirementAge = (event) => {
    event.preventDefault();
    if (!isRetirementAgeValid) return;

    /*
      "Bajo el cofre": años estimados de vida = 85 por defecto, sin
      preguntarle a la persona. Pero si el retiro elegido alcanza o supera
      ese default, se empuja hacia arriba — la misma regla de
      ProfileStep.jsx. Sin esto, "retiro a los 90" con el default de 85
      generaría un módulo de retiro con -5 años de duración, sin que nada en
      esta conversación lo hubiera advertido.
    */
    const currentLifeExpectancy = profile.retirement?.lifeExpectancy
      ?? DEFAULT_LIFE_EXPECTANCY;
    const lifeExpectancy = Math.min(
      LIFE_EXPECTANCY_MAX,
      Math.max(currentLifeExpectancy || DEFAULT_LIFE_EXPECTANCY, retirementAgeNumber + 1),
    );
    patchSection('profile', { retirementAge: retirementAgeNumber });
    patchSection('retirement', { lifeExpectancy });
    goTo('medicalInsurance');
  };

  const chooseMedicalInsurance = (value) => {
    setHasMedicalInsurance(value);
    patchSection('profile', { hasMedicalInsurance: value });
    goTo('lifeInsurance');
  };

  const chooseLifeInsurance = (value) => {
    setHasLifeInsurance(value);
    patchSection('profile', { hasLifeInsurance: value });
    goTo('done');
  };

  /*
    Valores por defecto "bajo el cofre": se aplican una sola vez, al llegar a
    la pantalla final, y no en cada tecla — igual que el resto de las
    respuestas de este flujo. `setField`/`patchSection` son las mismas
    acciones que usa la captura clásica, así que el motor financiero
    (`src/engine/`) recalcula exactamente como si estos valores se hubieran
    tecleado ahí.
  */
  useEffect(() => {
    if (step !== 'done') return;
    setField('variabilityFactor', 0.7);
    patchSection('profile', { earners: 1 });
  }, [step, setField, patchSection]);

  /**
   * Vuelve a la primera pregunta para empezar la conversación de cero.
   *
   * Limpia también el perfil compartido: "Empezar de nuevo" aquí significa otro
   * prospecto, y dejar el nombre del anterior en el diagnóstico haría que la captura
   * clásica siguiera mostrando a alguien que ya no está en la conversación.
   */
  const restart = () => {
    setName('');
    setGoal(null);
    setAge('');
    setCity('');
    setDependentsChoice(null);
    setIncome('');
    setRetirementAge('');
    setHasMedicalInsurance(null);
    setHasLifeInsurance(null);

    if (incomeRowId) {
      remove('incomes', incomeRowId);
      setIncomeRowId(null);
    }

    patchSection('profile', {
      name: '',
      age: EMPTY_PROFILE.age,
      city: '',
      dependents: EMPTY_PROFILE.dependents,
      children: EMPTY_PROFILE.children,
      retirementAge: EMPTY_PROFILE.retirementAge,
      hasMedicalInsurance: EMPTY_PROFILE.hasMedicalInsurance,
      hasLifeInsurance: EMPTY_PROFILE.hasLifeInsurance,
    });
    patchSection('retirement', { lifeExpectancy: DEFAULT_LIFE_EXPECTANCY });
    goTo('welcome');
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
        La cabecera de estado se oculta en la bienvenida: es una pantalla de
        entrada limpia, sin chrome de "en desarrollo" encima del primer
        mensaje que se le muestra a nadie.
      */}
      {step !== 'welcome' && (
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
              En desarrollo · guarda perfil, ingreso y coberturas
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
      )}

      <div className="flex flex-1 flex-col items-center justify-center px-6
                      pb-[max(2rem,env(safe-area-inset-bottom))]"
      >
        {step === 'welcome' && (
          <WelcomeStep onStart={() => goTo('name')} />
        )}

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

        {step === 'goal' && (
          <Ask
            text={QUESTION.goal(cleanName)}
            isReady={isReady}
            onReady={() => setReady(true)}
            isValid
            hideContinue
            onSubmit={(e) => e.preventDefault()}
            onBack={() => goTo('name')}
          >
            <QuickChoices options={GOALS} selected={goal} onChoose={chooseGoal} />
          </Ask>
        )}

        {step === 'age' && (
          <Ask
            text={QUESTION.age()}
            isReady={isReady}
            onReady={() => setReady(true)}
            isValid={isAgeValid}
            onSubmit={submitAge}
            onBack={() => goTo('goal')}
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

        {step === 'city' && (
          <Ask
            text={QUESTION.city(cleanName)}
            isReady={isReady}
            onReady={() => setReady(true)}
            isValid={cleanCity.length > 0}
            onSubmit={submitCity}
            onBack={() => goTo('age')}
          >
            <label className="sr-only" htmlFor="conversational-city">
              En qué ciudad vives
            </label>

            <input
              id="conversational-city"
              ref={inputRef}
              value={city}
              onChange={(event) => setCity(event.target.value)}
              placeholder="Ciudad de México"
              autoComplete="address-level2"
              enterKeyHint="go"
              className={FIELD_CLASS}
            />
          </Ask>
        )}

        {step === 'dependents' && (
          <Ask
            text={QUESTION.dependents()}
            isReady={isReady}
            onReady={() => setReady(true)}
            isValid
            hideContinue
            onSubmit={(e) => e.preventDefault()}
            onBack={() => goTo('city')}
          >
            <QuickChoices
              options={DEPENDENTS_OPTIONS}
              selected={dependentsChoice}
              onChoose={chooseDependents}
            />
          </Ask>
        )}

        {step === 'income' && (
          <Ask
            text={QUESTION.income()}
            isReady={isReady}
            onReady={() => setReady(true)}
            isValid={isIncomeValid}
            onSubmit={submitIncome}
            onBack={() => goTo('dependents')}
          >
            <label className="sr-only" htmlFor="conversational-income">
              Ingreso mensual neto
            </label>

            <div className="flex items-center justify-center gap-2">
              <span className="text-xl text-white/40" aria-hidden="true">$</span>
              <input
                id="conversational-income"
                ref={inputRef}
                value={income}
                onChange={(event) => setIncome(toDigitsDraft(event.target.value))}
                placeholder="0"
                inputMode="numeric"
                autoComplete="off"
                enterKeyHint="go"
                className={FIELD_CLASS}
              />
            </div>
            <p className="mt-3 text-center text-[11px] text-white/30">
              Lo que recibes ya sin impuestos, en pesos al mes
            </p>
          </Ask>
        )}

        {step === 'retirementAge' && (
          <Ask
            text={QUESTION.retirementAge()}
            isReady={isReady}
            onReady={() => setReady(true)}
            isValid={isRetirementAgeValid}
            onSubmit={submitRetirementAge}
            onBack={() => goTo('income')}
          >
            <label className="sr-only" htmlFor="conversational-retirement-age">
              A qué edad te gustaría retirarte
            </label>

            <input
              id="conversational-retirement-age"
              ref={inputRef}
              value={retirementAge}
              onChange={(event) => setRetirementAge(toAgeDraft(event.target.value))}
              placeholder="00"
              inputMode="numeric"
              autoComplete="off"
              enterKeyHint="go"
              aria-describedby="conversational-retirement-help"
              className={`${FIELD_CLASS} tracking-[0.4em]`}
            />
            <p
              id="conversational-retirement-help"
              className="mt-3 text-center text-[11px] text-white/30"
            >
              {`Entre ${retirementMin} y ${RETIREMENT_AGE_MAX} años`}
            </p>
          </Ask>
        )}

        {step === 'medicalInsurance' && (
          <Ask
            text={QUESTION.medicalInsurance()}
            isReady={isReady}
            onReady={() => setReady(true)}
            isValid
            hideContinue
            onSubmit={(e) => e.preventDefault()}
            onBack={() => goTo('retirementAge')}
          >
            <QuickChoices
              options={YES_NO}
              selected={hasMedicalInsurance}
              onChoose={chooseMedicalInsurance}
            />
          </Ask>
        )}

        {step === 'lifeInsurance' && (
          <Ask
            text={QUESTION.lifeInsurance()}
            isReady={isReady}
            onReady={() => setReady(true)}
            isValid
            hideContinue
            onSubmit={(e) => e.preventDefault()}
            onBack={() => goTo('medicalInsurance')}
          >
            <QuickChoices
              options={YES_NO}
              selected={hasLifeInsurance}
              onChoose={chooseLifeInsurance}
            />
          </Ask>
        )}

        {step === 'done' && (
          /*
            Pantalla de cierre. Repite lo contestado como prueba de que se
            recibió: limpiar sin acusar recibo deja la duda de si el toque
            contó.
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
              {`${cleanName}, ${ageNumber} años · ${cleanCity}`}
            </p>

            <p className="mt-3 max-w-xs text-sm leading-relaxed text-white/40">
              Con esto ya tenemos lo esencial de tu diagnóstico. El resto de tu
              plan —gastos, deudas y patrimonio— se puede seguir capturando
              desde la Captura clásica en cualquier momento.
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
