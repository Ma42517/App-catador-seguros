import { useState, useEffect } from 'react';
import useTypewriter from '../../lib/useTypewriter';
import { writeSafeZone } from '../../data/safeZone';

/** Cuánto tarda el fundido de salida del Paso 4, en ms — usado tanto en la clase de Tailwind como en el temporizador que espera a que termine antes de desmontar. */
const FADE_OUT_MS = 700;
/** Cuánto se queda en pantalla "+ 1 Punto" antes de empezar a desvanecerse. */
const REWARD_HOLD_MS = 2000;
/** Retraso del subtexto del Paso 2, medido desde que el texto principal termina de escribirse. */
const SUBTEXT_DELAY_MS = 2000;
/** Mínimo de nombres para poder guardar la Zona Segura: basta con uno. */
const MIN_NAMES = 1;

const STEP1_TEXT_TEMPLATE = (name) => `Hola, ${name}. Todo está configurado y listo para que inicies tu camino.`;
const STEP2_TEXT = 'Para asegurar que tu arranque sea fluido, vamos a ir paso a paso. Sabemos '
  + 'que dar el primer salto con tus conocidos puede imponer respeto.';
const STEP2_SUBTEXT = 'Aquí la regla de oro es simple: en esta etapa inicial tu objetivo no es '
  + 'vender nada. Tu única meta es avisarles en qué te estás profesionalizando y compartir tu '
  + 'nueva etapa.';
const STEP3_TEXT = 'Vamos a desbloquear tu agenda ganando tu primer punto. Piensa en 3 personas '
  + 'con las que te tomarías un café mañana mismo sin pensarlo. Tu Zona Segura.';

/**
 * Cursor parpadeante compartido por los tres pasos con máquina de escribir,
 * igual que el de `OnboardingFlow.jsx` — se repite aquí, y no se importa de
 * allá, porque son dos flujos que no comparten ciclo de vida ni deberían
 * acoplarse por un detalle visual tan pequeño.
 */
function Caret({ show }) {
  if (!show) return null;
  return <span className="animate-pulse text-indigo-400">|</span>;
}

/** Campo de una sola línea: sin caja, sólo el subrayado — mismo estilo que el nombre del Paso 1 de `OnboardingFlow.jsx`. */
const FIELD_CLASS = 'w-full border-b border-white/20 bg-transparent pb-2 text-center '
  + 'text-lg text-white caret-indigo-400 transition-colors placeholder:text-white/25 '
  + 'focus:border-indigo-500 focus:outline-none';

/** Paso 1 — Saludo neutral, sin ninguna referencia todavía a la inquietud declarada. */
function GreetingStep({ name, onContinue }) {
  const { typed, isTyping } = useTypewriter(STEP1_TEXT_TEMPLATE(name));

  return (
    <div className="flex flex-col items-center px-6 text-center">
      <p className="sr-only">{STEP1_TEXT_TEMPLATE(name)}</p>
      <p
        className="max-w-lg text-2xl font-light leading-relaxed text-white sm:text-3xl"
        aria-hidden="true"
      >
        {typed}
        <Caret show={isTyping} />
      </p>

      <button
        type="button"
        onClick={onContinue}
        aria-hidden={isTyping}
        tabIndex={isTyping ? -1 : 0}
        className={`mt-10 rounded-full bg-indigo-600 px-8 py-3 text-sm font-semibold text-white
                    shadow-lg shadow-indigo-600/30 transition-opacity duration-700
                    hover:bg-indigo-500 active:scale-95
                    ${isTyping ? 'pointer-events-none opacity-0' : 'opacity-100'}`}
      >
        Continuar
      </button>
    </div>
  );
}

/**
 * Paso 2 — Enfoque empoderador: nombra la inquietud sin insistir en ella
 * (tono de apoyo, no de diagnóstico), y aclara la única regla que importa
 * en esta etapa. El subtexto entra 2 segundos después de que el texto
 * principal termina de escribirse, con un fundido simple — no letra por
 * letra, para no alargar un paso que ya trae dos bloques de texto.
 */
function EmpowermentStep({ onContinue }) {
  const { typed, isTyping } = useTypewriter(STEP2_TEXT);
  const [showSubtext, setShowSubtext] = useState(false);

  useEffect(() => {
    if (isTyping) return undefined;
    const timer = setTimeout(() => setShowSubtext(true), SUBTEXT_DELAY_MS);
    return () => clearTimeout(timer);
  }, [isTyping]);

  return (
    <div className="flex flex-col items-center px-6 text-center">
      <p className="sr-only">{`${STEP2_TEXT} ${STEP2_SUBTEXT}`}</p>
      <p
        className="max-w-lg text-xl font-light leading-snug text-white sm:text-2xl"
        aria-hidden="true"
      >
        {typed}
        <Caret show={isTyping} />
      </p>

      <p
        className={`mt-5 max-w-md text-sm leading-relaxed text-zinc-400
                    transition-opacity duration-1000 ${showSubtext ? 'opacity-100' : 'opacity-0'}`}
        aria-hidden={!showSubtext}
      >
        {STEP2_SUBTEXT}
      </p>

      <button
        type="button"
        onClick={onContinue}
        aria-hidden={!showSubtext}
        tabIndex={showSubtext ? 0 : -1}
        className={`mt-8 rounded-full bg-indigo-600 px-8 py-3 text-sm font-semibold text-white
                    shadow-lg shadow-indigo-600/30 transition-opacity duration-700
                    hover:bg-indigo-500 active:scale-95
                    ${showSubtext ? 'opacity-100' : 'pointer-events-none opacity-0'}`}
      >
        Entendido
      </button>
    </div>
  );
}

/**
 * Paso 3 — La tarea rompehielo: 3 campos de texto libre, cero fricción
 * (nombres sueltos, no un formulario de contacto completo). El botón se
 * enciende con un solo nombre — no hace falta llenar los tres para
 * desbloquear el punto, que es justo la idea de "cero fricción" del pedido.
 */
function SafeZoneStep({ onSave }) {
  const { typed, isTyping } = useTypewriter(STEP3_TEXT);
  const [names, setNames] = useState(['', '', '']);

  const cleanNames = names.map((n) => n.trim()).filter(Boolean);
  const isValid = cleanNames.length >= MIN_NAMES;

  const setName = (index) => (event) => {
    setNames((current) => current.map((n, i) => (i === index ? event.target.value : n)));
  };

  const submit = (event) => {
    event.preventDefault();
    if (!isValid) return;
    onSave(cleanNames);
  };

  return (
    <form onSubmit={submit} className="flex w-full flex-col items-center px-6 text-center">
      <p className="sr-only">{STEP3_TEXT}</p>
      <p
        className="max-w-lg text-xl font-light leading-snug text-white sm:text-2xl"
        aria-hidden="true"
      >
        {typed}
        <Caret show={isTyping} />
      </p>

      <div
        className={`mt-8 w-full max-w-xs space-y-4 transition-opacity duration-700
                    ${isTyping ? 'pointer-events-none opacity-0' : 'opacity-100'}`}
        aria-hidden={isTyping}
      >
        {names.map((value, index) => (
          <div key={index}>
            <label className="sr-only" htmlFor={`safe-zone-name-${index}`}>
              {`Persona ${index + 1} de tu Zona Segura`}
            </label>
            <input
              id={`safe-zone-name-${index}`}
              value={value}
              onChange={setName(index)}
              placeholder={`Persona ${index + 1}`}
              autoComplete="off"
              enterKeyHint="next"
              className={FIELD_CLASS}
            />
          </div>
        ))}

        <button
          type="submit"
          disabled={!isValid}
          className="w-full rounded-full bg-indigo-600 px-8 py-3 text-sm font-semibold
                     text-white shadow-lg shadow-indigo-600/30 transition-all
                     hover:bg-indigo-500 active:scale-95
                     disabled:cursor-not-allowed disabled:bg-white/[0.06]
                     disabled:text-white/25 disabled:shadow-none"
        >
          Guardar mi Zona Segura
        </button>
      </div>
    </form>
  );
}

/**
 * Paso 4 — La recompensa. Sin máquina de escribir —es un logro que se
 * anuncia, no una pregunta que se lee—: aparece con un fundido simple y se
 * queda `REWARD_HOLD_MS` en pantalla antes de que el propio componente
 * inicie su fundido de salida (ver `closing` en `FirstLoginIntro`).
 */
function RewardStep({ visible }) {
  return (
    <div
      className={`flex flex-col items-center px-6 text-center transition-opacity duration-700
                  ${visible ? 'opacity-100' : 'opacity-0'}`}
    >
      <p
        className="text-2xl font-bold text-amber-400 drop-shadow-[0_0_12px_rgba(245,158,11,0.5)]
                   sm:text-3xl"
      >
        Excelente. + 1 Punto
      </p>
    </div>
  );
}

/**
 * Introducción de la primera entrada a la app, sólo para quien declaró
 * "El miedo al rechazo o a contactar conocidos" (`inquietud === 'rejection'`,
 * ver `advisorOnboarding.js`) en el Onboarding, y sólo mientras sus puntos
 * sigan en 0 — es `TodayView.jsx` quien decide esas dos condiciones antes de
 * montar este componente, no algo que se compruebe aquí adentro.
 *
 * Cuatro pasos en un único estado local (`step`), sin enrutador ni pila de
 * historial: es un recorrido lineal, sin "Atrás", porque el objetivo es
 * cruzar el primer bloqueo emocional en un solo sentido, no dar vueltas
 * sobre él.
 *
 * `onComplete` se llama una vez, al terminar el fundido de salida del Paso
 * 4 —no antes—: quien llama a este componente (`TodayView`) usa esa señal
 * para sumar el punto de verdad (`useAdvisorPoints`), y hacerlo antes de que
 * la pantalla termine de desvanecerse no cambiaría nada visible, pero sí
 * arriesgaría a que un componente que reaccione a los puntos (como
 * `DailyGoalBar`, montado detrás de este overlay) se actualice mientras
 * todavía se ve la recompensa, duplicando el aviso de "ya tienes 1 punto".
 */
export default function FirstLoginIntro({ name, username, onComplete }) {
  const [step, setStep] = useState(1);
  const [rewardVisible, setRewardVisible] = useState(false);
  const [closing, setClosing] = useState(false);

  const saveSafeZone = (cleanNames) => {
    writeSafeZone(username, cleanNames);
    setStep(4);
  };

  // Paso 4: entra con fundido, se queda un rato, y luego arranca su propio
  // fundido de salida antes de avisar al padre que ya puede sumar el punto.
  useEffect(() => {
    if (step !== 4) return undefined;

    const showTimer = setTimeout(() => setRewardVisible(true), 50);
    const closeTimer = setTimeout(() => setClosing(true), REWARD_HOLD_MS);
    const completeTimer = setTimeout(onComplete, REWARD_HOLD_MS + FADE_OUT_MS);

    return () => {
      clearTimeout(showTimer);
      clearTimeout(closeTimer);
      clearTimeout(completeTimer);
    };
    // `onComplete` es estable en la única llamada real (`useAdvisorPoints`
    // devuelve una función memoizada con `useCallback`); no hace falta
    // reprogramar los temporizadores si el padre se re-renderiza por otra
    // razón mientras este paso ya está en curso.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  return (
    <div
      className={`fixed inset-0 z-[95] flex min-h-screen w-full items-center justify-center
                  bg-slate-950 transition-opacity duration-700
                  ${closing ? 'opacity-0' : 'opacity-100'}`}
      role="dialog"
      aria-modal="true"
      aria-label="Bienvenida a tu primer punto"
    >
      {step === 1 && <GreetingStep name={name} onContinue={() => setStep(2)} />}
      {step === 2 && <EmpowermentStep onContinue={() => setStep(3)} />}
      {step === 3 && <SafeZoneStep onSave={saveSafeZone} />}
      {step === 4 && <RewardStep visible={rewardVisible} />}
    </div>
  );
}
