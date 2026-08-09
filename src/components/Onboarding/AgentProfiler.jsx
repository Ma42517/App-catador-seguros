import { useState, useEffect, useRef } from 'react';

/**
 * Guion del onboarding. Cada paso aporta una clave a `answers`.
 * El orden importa: experiencia → desafío → visión.
 */
const STEPS = [
  {
    key: 'experience',
    question: '¿Cuál es tu nivel de experiencia actual?',
    options: [
      { value: 'nuevo', label: 'Nuevo', subtitle: '0 a 1 años' },
      { value: 'profesional', label: 'Profesional', subtitle: 'Más de 1 año' },
      { value: 'consolidado', label: 'Consolidado', subtitle: 'Más de 3 años' },
    ],
  },
  {
    key: 'challenge',
    question: '¿Cuál es tu mayor desafío en este momento?',
    options: [
      { value: 'prospeccion', label: 'Flujo constante de prospectos' },
      { value: 'seguimiento', label: 'Seguimiento y organización' },
      { value: 'cierre', label: 'Cierre de negocios' },
    ],
  },
  {
    key: 'goal',
    question: '¿Qué visión tienes para tu carrera?',
    options: [
      { value: 'bases', label: 'Consolidar mis bases comerciales' },
      { value: 'mdrt', label: 'Calificar a MDRT o Convenciones' },
      { value: 'promotoria', label: 'Desarrollar mi propia promotoría' },
    ],
  },
];

/** Milisegundos que dura la animación de salida antes de cambiar de pregunta. */
const EXIT_MS = 500;
/** Pausa de cierre en la pantalla final, antes de entrar a la app. */
const OUTRO_MS = 2000;

/**
 * Onboarding del asesor: tres preguntas encadenadas con transiciones suaves,
 * en una estética minimalista y tipográfica sobre negro puro.
 *
 * Entrega las respuestas completas al padre mediante `onComplete`. No toca los
 * contexts ni el motor financiero.
 */
export default function AgentProfiler({ onComplete }) {
  const [currentStep, setCurrentStep] = useState(1);
  const [answers, setAnswers] = useState({ experience: '', challenge: '', goal: '' });
  const [visible, setVisible] = useState(false);
  // Se guardan para poder limpiarlos si el componente se desmonta a medias.
  const timers = useRef([]);

  const isFinalScreen = currentStep > STEPS.length;
  const step = STEPS[currentStep - 1];

  const track = (id) => {
    timers.current.push(id);
    return id;
  };

  // Limpieza global de temporizadores pendientes.
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  // Cada cambio de paso reinicia la animación de entrada (fade-in desde abajo).
  useEffect(() => {
    setVisible(false);
    const id = track(setTimeout(() => setVisible(true), 60));
    return () => clearTimeout(id);
  }, [currentStep]);

  // Pantalla final: pausa de cortesía y entrega de respuestas.
  useEffect(() => {
    if (!isFinalScreen) return undefined;
    const id = track(setTimeout(() => onComplete?.(answers), OUTRO_MS));
    return () => clearTimeout(id);
  }, [isFinalScreen, answers, onComplete]);

  const handleSelect = (value) => {
    if (!visible) return; // evita dobles clics durante la transición
    setAnswers((prev) => ({ ...prev, [step.key]: value }));
    setVisible(false); // dispara la animación de salida
    track(setTimeout(() => setCurrentStep((s) => s + 1), EXIT_MS));
  };

  const fade = visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6';

  return (
    <div className="flex min-h-screen w-full max-w-full flex-col items-center justify-center overflow-hidden bg-white p-6 dark:bg-black">
      {isFinalScreen ? (
        <p
          className={`text-center font-serif text-3xl tracking-wide text-zinc-900 dark:text-white transition-all duration-1000 ease-in-out md:text-5xl ${fade}`}
        >
          Preparando tu entorno Prospecta...
        </p>
      ) : (
        <div
          key={currentStep}
          className={`w-full max-w-2xl transition-all duration-1000 ease-in-out ${fade}`}
        >
          <h1 className="text-center font-serif text-3xl tracking-wide text-zinc-900 dark:text-white md:text-5xl">
            {step.question}
          </h1>

          <div
            role="group"
            aria-label={step.question}
            className="mt-16 flex flex-col items-center gap-10"
          >
            {step.options.map(({ value, label, subtitle }) => (
              <button
                key={value}
                type="button"
                onClick={() => handleSelect(value)}
                className="group cursor-pointer text-center font-light text-2xl text-zinc-500 transition-all duration-500 hover:scale-105 hover:text-white focus-visible:text-white focus-visible:outline-none md:text-3xl"
              >
                {label}
                {subtitle && (
                  <span className="mt-1 block text-sm italic text-zinc-600 transition-colors duration-500 group-hover:text-zinc-400">
                    {subtitle}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
