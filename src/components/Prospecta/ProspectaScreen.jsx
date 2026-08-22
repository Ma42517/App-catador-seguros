import { useState, useEffect } from 'react';
import {
  ArrowLeft, Snowflake, Handshake, FileSignature, ChevronRight, Hammer,
} from 'lucide-react';
import CitaInicialWizard from './CitaInicialWizard';
import CierreCuestionarioMedico from './CierreCuestionarioMedico';

/** Duración de la entrada y salida de la pantalla. */
const ANIM_MS = 300;

/**
 * Las tres etapas del ciclo de prospección.
 *
 * `Component` es opcional: la etapa que lo trae abre su propia herramienta y la
 * que no, cae en el marcador de "guion en construcción". Es lo que permite ir
 * sustituyendo etapas de una en una sin tocar el resto de la pantalla —ni el hub
 * de Productividad, ni la barra inferior, ni el enrutamiento—.
 */
const STAGES = [
  {
    key: 'frio',
    label: 'Acercamiento en Frío',
    description: 'Primer contacto con un prospecto nuevo',
    Icon: Snowflake,
    gradient: 'from-zinc-900 via-blue-950 to-blue-900',
    glow: 'hover:shadow-[0_0_28px_rgba(59,130,246,0.35)]',
    iconTone: 'text-blue-300/80',
  },
  {
    key: 'cita',
    label: 'Cita Inicial',
    description: 'Análisis de Necesidades (ANF)',
    Icon: Handshake,
    Component: CitaInicialWizard,
    gradient: 'from-zinc-900 via-indigo-950 to-indigo-900',
    glow: 'hover:shadow-[0_0_28px_rgba(99,102,241,0.35)]',
    iconTone: 'text-indigo-300/80',
  },
  {
    key: 'cierre',
    label: 'Cierre',
    description: 'Presentación de propuesta y firma',
    Icon: FileSignature,
    Component: CierreCuestionarioMedico,
    gradient: 'from-zinc-900 via-emerald-950 to-emerald-900',
    glow: 'hover:shadow-[0_0_28px_rgba(16,185,129,0.35)]',
    iconTone: 'text-emerald-300/80',
  },
];

/** Botón de etapa: rectángulo ancho con el mismo lenguaje del hub. */
function StageButton({ stage, onClick }) {
  const { label, description, Icon, gradient, glow, iconTone } = stage;
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group relative h-28 w-full overflow-hidden rounded-3xl border border-white/10
                  transition-all duration-300 active:scale-95 focus-visible:outline-none
                  focus-visible:ring-2 focus-visible:ring-white/40 ${glow}`}
    >
      <div
        className={`absolute inset-0 bg-gradient-to-br bg-[length:200%_200%]
                    animate-gradient-shift ${gradient}`}
        aria-hidden="true"
      />
      <div
        className="absolute inset-0 transition-colors duration-300 group-hover:bg-white/[0.06]
                   group-active:bg-white/[0.09]"
        aria-hidden="true"
      />

      <div className="relative z-10 flex h-full flex-col justify-center p-6 pr-20 text-left">
        <p className="text-base font-bold leading-tight text-white">{label}</p>
        <p className="mt-1 text-xs leading-snug text-white/60">{description}</p>
      </div>

      <span
        className={`absolute right-6 top-1/2 z-10 -translate-y-1/2 transition-transform
                    duration-300 group-hover:scale-110 ${iconTone}`}
        aria-hidden="true"
      >
        <Icon size={32} strokeWidth={1.5} />
      </span>

      <ChevronRight
        size={16}
        className="absolute bottom-5 right-6 z-10 text-white/30 transition-transform
                   duration-300 group-hover:translate-x-0.5 group-hover:text-white/60"
        aria-hidden="true"
      />
    </button>
  );
}

/** Detalle de la etapa. El guion con los datos del cliente vendrá después. */
function StageDetail({ stage, onBack }) {
  return (
    <div className="animate-rise">
      <button
        type="button"
        onClick={onBack}
        className="mb-6 flex items-center gap-2 text-sm font-semibold text-zinc-500
                   transition-colors hover:text-zinc-800 dark:hover:text-zinc-200"
      >
        <ArrowLeft size={16} />
        Etapas
      </button>

      <h2 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white">
        {stage.label}
      </h2>
      <p className="mt-1 text-sm text-zinc-500">{stage.description}</p>

      <div
        className="mt-8 rounded-2xl border border-zinc-200 bg-zinc-50 p-8 text-center
                   dark:border-zinc-800 dark:bg-zinc-900"
      >
        <span
          className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-xl border
                     border-zinc-200 bg-white text-zinc-400
                     dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-500"
          aria-hidden="true"
        >
          <Hammer size={22} />
        </span>
        <p className="text-sm font-semibold text-zinc-700 dark:text-zinc-200">
          Guion en construcción
        </p>
        <p className="mx-auto mt-1 max-w-sm text-xs leading-relaxed text-zinc-500">
          Aquí irá el agradecimiento y los siguientes pasos, armados con los datos
          que capturaste del cliente.
        </p>
      </div>
    </div>
  );
}

/**
 * Pantalla completa de Prospecta: cubre por encima de todo, incluida la barra
 * inferior, y presenta las tres etapas del ciclo.
 *
 * Se monta y desmonta con retardo para poder animar entrada y salida.
 */
export default function ProspectaScreen({
  isOpen, onClose, initialStageKey = null, client = null, onRouteToActivity,
}) {
  const [isMounted, setIsMounted] = useState(isOpen);
  const [isShown, setIsShown] = useState(false);
  const [selected, setSelected] = useState(null);

  /*
    Si a la Cita Inicial se llegó automáticamente desde la notificación
    ("Iniciar Sesión" de `InitialMeetingCard.jsx`, vía `initialStageKey`) o
    a mano, eligiéndola de la lista de etapas. `PresentationEndModal.jsx`
    ("Terminar cita") sólo debe interrumpir en el primer caso: es el cierre
    obligatorio de una cita que de verdad se está reportando en vivo. Quien
    entra por su cuenta a repasar el guion o probar la herramienta —sin
    que haya una cita real en curso— no debe tropezar con un formulario que
    le exige elegir una resolución de ventas.
  */
  const [cameFromNotification, setCameFromNotification] = useState(false);

  useEffect(() => {
    if (isOpen) {
      /*
        `initialStageKey` deja abrir la pantalla directo en una etapa —lo usa
        `InitialMeetingCard.jsx` al presionar "Iniciar Sesión": la persona ya
        sabe que va a una Cita Inicial, así que no debe volver a elegirla en
        la lista de etapas. Sin ese valor (entrada normal desde
        `ProspectaHero`), se abre en la lista como siempre.
      */
      setSelected(STAGES.find((stage) => stage.key === initialStageKey) ?? null);
      setCameFromNotification(Boolean(initialStageKey));
      setIsMounted(true);
      const raf = requestAnimationFrame(() => setIsShown(true));
      return () => cancelAnimationFrame(raf);
    }
    setIsShown(false);
    const timer = setTimeout(() => setIsMounted(false), ANIM_MS);
    return () => clearTimeout(timer);
    // Sólo reacciona a `isOpen`: `initialStageKey` se lee en el instante de
    // abrir, no debe reprogramar la selección si el padre re-renderiza con
    // el mismo valor de apertura.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // Escape cierra, y el fondo no debe poder desplazarse detrás.
  useEffect(() => {
    if (!isOpen) return undefined;
    const onKeyDown = (e) => { if (e.key === 'Escape') onClose(); };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen, onClose]);

  if (!isMounted) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Prospecta"
      className={`fixed inset-0 z-[70] overflow-y-auto bg-white transition-all duration-300
                  ease-out dark:bg-black
                  ${isShown ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}
    >
      {/* Iluminación ambiental de marca */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-grid-fade"
        aria-hidden="true"
      />

      {/*
        El ancho se amplía sólo cuando la etapa trae herramienta. El cuestionario
        médico es de dos columnas en escritorio y en `max-w-md` no caben; la lista
        de etapas, en cambio, se diseñó para esa medida y ensancharla dejaría tres
        botones estirados en medio de la nada.
      */}
      <div
        className={`relative mx-auto px-4 pb-16 pt-6
                    ${selected?.Component ? 'max-w-md md:max-w-3xl' : 'max-w-md'}`}
      >
        <button
          type="button"
          onClick={onClose}
          className="mb-8 flex items-center gap-2 text-sm font-semibold text-zinc-500
                     transition-colors hover:text-zinc-800 dark:hover:text-zinc-200"
        >
          <ArrowLeft size={16} />
          Cerrar
        </button>

        {selected ? (
          /*
            La etapa con herramienta la monta directamente; la que no la tiene
            sigue mostrando el marcador. El `onBack` es el mismo en los dos casos,
            así que el camino de vuelta no cambia según dónde estés.
          */
          selected.Component ? (
            <selected.Component
              onBack={() => setSelected(null)}
              onRouteToActivity={onRouteToActivity}
              requireResolution={cameFromNotification}
              client={cameFromNotification ? client : null}
            />
          ) : (
            <StageDetail stage={selected} onBack={() => setSelected(null)} />
          )
        ) : (
          <>
            <h1 className="text-3xl font-black tracking-tight text-zinc-900 dark:text-white">
              PROSPECTA
            </h1>
            <p className="mt-1 text-sm text-zinc-500">
              Elige la etapa en la que está tu prospecto.
            </p>

            <div className="mt-8 flex flex-col gap-5">
              {STAGES.map((stage) => (
                <StageButton
                  key={stage.key}
                  stage={stage}
                  /*
                    Entrada manual: nunca exige el cierre obligatorio, sin
                    importar cómo se haya llegado a esta lista antes.
                  */
                  onClick={() => { setSelected(stage); setCameFromNotification(false); }}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
