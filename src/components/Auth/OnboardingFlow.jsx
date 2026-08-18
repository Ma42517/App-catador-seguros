import { useState, useEffect } from 'react';
import { Lock, Loader2 } from 'lucide-react';
import useTypewriter from '../../lib/useTypewriter';
import { EXPERIENCE_LEVELS } from '../../lib/experienceLevels';
import {
  STRENGTH_OPTIONS, CONCERN_OPTIONS, MARKET_OPTIONS,
  AVAILABILITY_OPTIONS, MOTIVATION_OPTIONS, EMPTY_ADVISOR_DATA,
} from '../../lib/advisorOnboarding';
import { saveExperienceLevel, saveAdvisorProfile } from '../../data/profilesRepo';

/** Mínimo de letras para dar por contestado el nombre del Paso 1. */
const MIN_NAME = 2;

const PROFILE_TEXT = 'Para adaptar tu experiencia, cuéntanos en qué etapa te encuentras:';
const CONCERN_TEXT = 'Para que podamos guiarte con precisión, ¿qué es lo que más '
  + 'te inquieta o te impone en esta etapa inicial?';
const MARKET_TEXT = 'Todo gran negocio comienza con un mercado natural. Si revisas '
  + 'tus contactos hoy, ¿a cuántas personas podrías llamarles cómodamente para '
  + 'platicarles de tu nueva etapa?';
const AVAILABILITY_TEXT = 'El éxito requiere constancia. ¿Cómo planeas gestionar tu tiempo?';
const MOTIVATION_TEXT = 'Finalmente, ¿cuál es tu objetivo principal al desarrollar esta carrera?';
const CONFIRM_TEXT = 'Excelente. Tu perfil ha sido registrado con éxito.';
const SECONDARY_TEXT = 'Para mantener la seguridad de la promotoría, un administrador '
  + 'está revisando tu solicitud. Te notificaremos en cuanto tu acceso esté liberado.';

/**
 * Cursor parpadeante compartido por todos los pasos, para no repetir el
 * mismo `<span>` siete veces.
 */
function Caret({ show }) {
  if (!show) return null;
  return <span className="animate-pulse text-indigo-400">|</span>;
}

/**
 * Una opción de una lista de selección: texto flotante y no una tarjeta con
 * borde ni fondo propio, sólo el título y, si lo trae, la frase que lo
 * explica debajo y más chico. El "botón" es el bloque de texto entero —el
 * `<button>` no lleva ningún relleno visual, así que lo único que delata que
 * es tocable es el cursor y el leve resalte de hover—.
 *
 * Sirve tanto para las tres tarjetas del Paso 2 (`{ title, subtitle }`,
 * `EXPERIENCE_LEVELS`) como para las listas de opción simple de los pasos 3
 * a 7 (`{ label }`, `advisorOnboarding.js`): un único componente en vez de
 * uno por cada forma de dato evita que ajustar el hover o el espaciado en
 * un paso deje a los demás desincronizados.
 */
function ChoiceOption({ option, onSelect, disabled }) {
  const title = option.title ?? option.label;

  return (
    <button
      type="button"
      onClick={() => onSelect(option.value)}
      disabled={disabled}
      className="w-full rounded-lg py-3 text-center transition-opacity
                 hover:opacity-80 active:scale-[0.98] disabled:cursor-wait
                 disabled:opacity-40 focus-visible:outline-none
                 focus-visible:ring-1 focus-visible:ring-white/30"
    >
      <p className="text-lg font-semibold text-white">{title}</p>
      {option.subtitle && (
        <p className="mt-1 text-xs leading-relaxed text-zinc-500">{option.subtitle}</p>
      )}
    </button>
  );
}

/**
 * Pregunta con máquina de escribir seguida de una lista de opciones que
 * avanza sola al tocarse: elegir ya es responder, así que no hace falta un
 * segundo toque en "Continuar" para confirmar lo que se acaba de tocar.
 *
 * `busyValue` sólo lo usa el Paso 7 (la única elección de esta pantalla que
 * dispara una escritura real a la base): marca qué opción se está
 * guardando, para que un segundo toque en otra mientras la primera guarda no
 * deje dos escrituras compitiendo por la misma fila.
 */
function ChoiceStep({ text, options, onSelect, busyValue = null }) {
  const { typed, isTyping } = useTypewriter(text);
  const disabled = Boolean(busyValue);

  return (
    <div className="flex w-full flex-col items-center px-6 text-center">
      <p className="sr-only">{text}</p>
      <p
        className="max-w-md text-xl font-light leading-snug text-white sm:text-2xl"
        aria-hidden="true"
      >
        {typed}
        <Caret show={isTyping} />
      </p>

      <div
        className={`mt-10 w-full max-w-sm transition-opacity duration-700
                    ${isTyping ? 'pointer-events-none opacity-0' : 'opacity-100'}`}
        aria-hidden={isTyping}
      >
        <div className="flex flex-col divide-y divide-white/10">
          {options.map((option) => (
            <ChoiceOption
              key={String(option.value)}
              option={option}
              onSelect={onSelect}
              disabled={disabled}
            />
          ))}
        </div>

        {busyValue && (
          <p className="mt-4 flex items-center justify-center gap-1.5 text-xs text-zinc-500">
            <Loader2 size={13} className="animate-spin" aria-hidden="true" />
            Guardando...
          </p>
        )}
      </div>
    </div>
  );
}

/**
 * Paso 1 — Bautizo. Bienvenida más la única pregunta de texto libre de todo
 * el recorrido: cómo se le quiere llamar a la persona.
 *
 * El campo y el botón nacen montados y sólo se encienden con opacidad al
 * terminar de escribirse el texto, igual que en el resto de los pasos: un
 * control que aparece a mitad de la pregunta invita a contestar algo que
 * todavía no se ha preguntado.
 */
function NameStep({ initialValue, onContinue }) {
  const text = 'Bienvenido a tu asistente. Nuestro objetivo es simple: que todos los '
    + 'días te vayas a dormir sabiendo que tu negocio creció. Para personalizar tu '
    + 'entorno, ¿cómo te gusta que te llamen?';
  const { typed, isTyping } = useTypewriter(text);
  const [name, setName] = useState(initialValue);
  const cleanName = name.trim();
  const isValid = cleanName.length >= MIN_NAME;

  const submit = (event) => {
    event.preventDefault();
    if (!isValid) return;
    onContinue(cleanName);
  };

  return (
    <form onSubmit={submit} className="flex w-full flex-col items-center px-6 text-center">
      <p className="sr-only">{text}</p>
      <p
        className="max-w-lg text-2xl font-light leading-relaxed text-white sm:text-3xl"
        aria-hidden="true"
      >
        {typed}
        <Caret show={isTyping} />
      </p>

      <div
        className={`mt-10 w-full max-w-xs transition-opacity duration-700
                    ${isTyping ? 'pointer-events-none opacity-0' : 'opacity-100'}`}
        aria-hidden={isTyping}
      >
        <label className="sr-only" htmlFor="advisor-name">Cómo te gusta que te llamen</label>
        <input
          id="advisor-name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Escribe tu nombre"
          autoComplete="given-name"
          enterKeyHint="go"
          className="w-full border-b border-white/20 bg-transparent pb-2 text-center
                     text-xl text-white caret-indigo-400 transition-colors
                     placeholder:text-white/25 focus:border-indigo-500 focus:outline-none"
        />

        <button
          type="submit"
          disabled={!isValid}
          className="mt-8 w-full rounded-full bg-indigo-600 px-8 py-3 text-sm
                     font-semibold text-white shadow-lg shadow-indigo-600/30
                     transition-all hover:bg-indigo-500 active:scale-95
                     disabled:cursor-not-allowed disabled:bg-white/[0.06]
                     disabled:text-white/25 disabled:shadow-none"
        >
          Continuar
        </button>
      </div>
    </form>
  );
}

/**
 * Paso final — Sala de espera. Vista terminal: sin botón de salida ni de
 * revisar, a propósito (ver la nota junto a `OnboardingFlow` más abajo).
 *
 * El texto secundario no se escribe letra por letra —el pedido lo dice de
 * forma explícita ("aparece después con fade-in")— así que aquí sí se usa
 * un fundido de opacidad simple, gobernado por el mismo `isTyping` del
 * mensaje principal: cuando el texto de arriba termina de escribirse, el de
 * abajo entra.
 */
function WaitingRoomStep() {
  const { typed, isTyping } = useTypewriter(CONFIRM_TEXT);

  return (
    <div className="flex flex-col items-center px-6 text-center">
      <span
        className="mb-6 grid h-16 w-16 place-items-center rounded-2xl border
                   border-indigo-500/30 bg-indigo-500/10 text-indigo-300"
        aria-hidden="true"
      >
        <Lock size={28} />
      </span>

      <p className="sr-only">{`${CONFIRM_TEXT} ${SECONDARY_TEXT}`}</p>

      <p
        className="max-w-md text-xl font-light leading-snug text-white sm:text-2xl"
        aria-hidden="true"
      >
        {typed}
        <Caret show={isTyping} />
      </p>

      <p
        className={`mt-4 max-w-sm text-sm leading-relaxed text-zinc-400
                    transition-opacity duration-1000 ${isTyping ? 'opacity-0' : 'opacity-100'}`}
        aria-hidden={isTyping}
      >
        {SECONDARY_TEXT}
      </p>
    </div>
  );
}

/**
 * Flujo de bienvenida para un registro nuevo: siete preguntas que levantan
 * la radiografía del asesor y terminan en la sala de espera de aprobación.
 *
 * Sólo se le muestra a quien todavía no eligió su etapa profesional
 * (`identity.experienceLevel` vacío) — es `Gate`, en `App.jsx`, quien decide
 * si monta esto o `PendingApproval` directamente, comparando esa misma
 * columna. Esa columna, y la radiografía completa en `advisorProfileData`
 * (ver `saveAdvisorProfile` en `profilesRepo.js`), sólo se escriben una vez,
 * al completar el Paso 7 — no en cada paso— para que abandonar el
 * cuestionario a la mitad no deje ni una elección a medias en la base ni a
 * la persona atrapada en la sala de espera sin haber terminado de
 * contestar: si vuelve a entrar antes de terminar, `experience_level` sigue
 * vacía y le toca el recorrido completo desde el Paso 1, igual que la
 * primera vez.
 *
 * El paso final de este componente y `PendingApproval.jsx` cuentan la misma
 * historia con distinta puesta en escena (uno la escribe como un momento,
 * el otro la presenta como una pantalla de estado con botón de revisar) —
 * son intencionalmente dos vistas separadas, no una condicionada dentro de
 * la otra, porque el paso final es el cierre de una animación y no debe
 * cargar los controles de "revisar de nuevo" que sí tienen sentido en una
 * vista a la que se puede volver muchas veces.
 */
export default function OnboardingFlow({ userId, onProfileSaved }) {
  const [step, setStep] = useState(1);
  const [busyValue, setBusyValue] = useState(null);

  /*
    La radiografía completa del recorrido. Vive en un solo objeto —y no en
    siete variables sueltas— porque así es como se guarda al final (ver
    `saveAdvisorProfile`): mantenerla ya con esa forma evita traducirla en el
    último paso.
  */
  const [advisorData, setAdvisorData] = useState(EMPTY_ADVISOR_DATA);

  // Evita seguir aceptando toques o navegación si el componente se
  // desmontara a media escritura (cambio de sesión, por ejemplo).
  const [alive, setAlive] = useState(true);
  useEffect(() => () => setAlive(false), []);

  const answer = (field) => (value) => {
    setAdvisorData((current) => ({ ...current, [field]: value }));
  };

  const submitName = (value) => {
    setAdvisorData((current) => ({ ...current, nombre: value }));
    setStep(2);
  };

  const chooseProfile = (value) => {
    answer('perfil')(value);
    setStep(3);
  };

  const chooseStrength = (value) => {
    answer('fortaleza')(value);
    setStep(4);
  };

  const chooseConcern = (value) => {
    answer('inquietud')(value);
    setStep(5);
  };

  const chooseMarket = (value) => {
    answer('mercado')(value);
    setStep(6);
  };

  const chooseAvailability = (value) => {
    answer('disponibilidad')(value);
    setStep(7);
  };

  /**
   * Cierra el cuestionario: guarda la radiografía completa y la etapa
   * profesional, y sólo entonces avanza a la sala de espera.
   *
   * Se guarda con el objeto armado en el momento (`{ ...advisorData, motor
   * }`) y no con `advisorData` del cierre de esta función: `setAdvisorData`
   * es asíncrono, así que leerlo aquí todavía traería la radiografía sin la
   * última respuesta.
   */
  const finish = async (motor) => {
    const finalData = { ...advisorData, motor };
    setBusyValue(motor);
    await Promise.all([
      saveExperienceLevel(userId, finalData.perfil),
      saveAdvisorProfile(userId, finalData),
    ]);
    if (!alive) return;
    setAdvisorData(finalData);
    // Se refresca la identidad de la sesión aunque el guardado haya fallado
    // en silencio (columna todavía no migrada): no hay nada que reintentar
    // desde aquí, y bloquear el avance dejaría a la persona varada en este
    // paso para siempre por un detalle de infraestructura que no le compete.
    await onProfileSaved?.();
    if (!alive) return;
    setBusyValue(null);
    setStep(8);
  };

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-black px-4 py-10">
      {step === 1 && <NameStep initialValue={advisorData.nombre} onContinue={submitName} />}

      {step === 2 && (
        <ChoiceStep text={PROFILE_TEXT} options={EXPERIENCE_LEVELS} onSelect={chooseProfile} />
      )}

      {step === 3 && (
        <ChoiceStep
          text={`Excelente elección, ${advisorData.nombre}. El autoconocimiento es tu `
            + 'mejor herramienta. Al arrancar este negocio, ¿cuál consideras que es tu '
            + 'mayor ventaja?'}
          options={STRENGTH_OPTIONS}
          onSelect={chooseStrength}
        />
      )}

      {step === 4 && (
        <ChoiceStep text={CONCERN_TEXT} options={CONCERN_OPTIONS} onSelect={chooseConcern} />
      )}

      {step === 5 && (
        <ChoiceStep text={MARKET_TEXT} options={MARKET_OPTIONS} onSelect={chooseMarket} />
      )}

      {step === 6 && (
        <ChoiceStep
          text={AVAILABILITY_TEXT}
          options={AVAILABILITY_OPTIONS}
          onSelect={chooseAvailability}
        />
      )}

      {step === 7 && (
        <ChoiceStep
          text={MOTIVATION_TEXT}
          options={MOTIVATION_OPTIONS}
          onSelect={finish}
          busyValue={busyValue}
        />
      )}

      {step === 8 && <WaitingRoomStep />}
    </div>
  );
}
