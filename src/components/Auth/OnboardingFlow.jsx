import { useState, useEffect } from 'react';
import { Lock, Loader2 } from 'lucide-react';
import useTypewriter from '../../lib/useTypewriter';
import { EXPERIENCE_LEVELS } from '../../lib/experienceLevels';
import { saveExperienceLevel } from '../../data/profilesRepo';

const WELCOME_TEXT = 'Bienvenido a tu asistente. Nuestro objetivo es simple: que '
  + 'todos los días te vayas a dormir sabiendo que tu negocio creció.';
const PROFILE_TEXT = 'Para adaptar tu experiencia, cuéntanos en qué etapa te encuentras:';
const CONFIRM_TEXT = 'Excelente elección. Tu perfil ha sido registrado con éxito.';
const SECONDARY_TEXT = 'Para mantener la seguridad de la promotoría, un administrador '
  + 'está revisando tu solicitud. Te notificaremos en cuanto tu acceso esté liberado.';

/**
 * Cursor parpadeante compartido por los tres pasos, para no repetir el mismo
 * `<span>` tres veces.
 */
function Caret({ show }) {
  if (!show) return null;
  return <span className="animate-pulse text-indigo-400">|</span>;
}

/**
 * Paso 1 — Bienvenida.
 *
 * El botón nace montado y sólo se enciende con opacidad al terminar de
 * escribirse el texto: aparecer de golpe al final movería el layout, y una
 * animación de entrada aparte competiría con el momento de la máquina de
 * escribir, que es la que debe protagonizar este paso.
 */
function WelcomeStep({ onStart }) {
  const { typed, isTyping } = useTypewriter(WELCOME_TEXT);

  return (
    <div className="flex flex-col items-center px-6 text-center">
      <p className="sr-only">{WELCOME_TEXT}</p>
      <p
        className="max-w-lg text-2xl font-light leading-relaxed text-white sm:text-3xl"
        aria-hidden="true"
      >
        {typed}
        <Caret show={isTyping} />
      </p>

      <button
        type="button"
        onClick={onStart}
        aria-hidden={isTyping}
        tabIndex={isTyping ? -1 : 0}
        className={`mt-10 rounded-full bg-indigo-600 px-8 py-3 text-sm font-semibold
                    text-white shadow-lg shadow-indigo-600/30 transition-opacity
                    duration-700 hover:bg-indigo-500 active:scale-95
                    ${isTyping ? 'pointer-events-none opacity-0' : 'opacity-100'}`}
      >
        Comenzar
      </button>
    </div>
  );
}

/**
 * Una de las tres opciones de etapa profesional del Paso 2.
 *
 * Texto flotante y no una tarjeta con borde: sin caja ni fondo propio, sólo
 * el título y, debajo y más chico, la frase que explica qué significa. El
 * "botón" es el bloque de texto entero —el `<button>` no lleva ningún
 * relleno visual, así que lo único que delata que es tocable es el cursor y
 * el leve resalte de hover—.
 */
function ProfileCard({ level, onSelect, disabled }) {
  return (
    <button
      type="button"
      onClick={() => onSelect(level.value)}
      disabled={disabled}
      className="w-full rounded-lg py-3 text-center transition-opacity
                 hover:opacity-80 active:scale-[0.98] disabled:cursor-wait
                 disabled:opacity-40 focus-visible:outline-none
                 focus-visible:ring-1 focus-visible:ring-white/30"
    >
      <p className="text-lg font-semibold text-white">{level.title}</p>
      <p className="mt-1 text-xs leading-relaxed text-zinc-500">{level.subtitle}</p>
    </button>
  );
}

/**
 * Paso 2 — Selección de perfil.
 *
 * `busyValue` marca qué tarjeta se está guardando: un segundo toque en otra
 * tarjeta mientras la primera guarda dejaría dos escrituras compitiendo por
 * la misma fila, y sólo se sabría cuál ganó por casualidad.
 */
function ProfileSelectionStep({ onSelect, busyValue }) {
  const { typed, isTyping } = useTypewriter(PROFILE_TEXT);

  return (
    <div className="flex w-full flex-col items-center px-6 text-center">
      <p className="sr-only">{PROFILE_TEXT}</p>
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
          {EXPERIENCE_LEVELS.map((level) => (
            <ProfileCard
              key={level.value}
              level={level}
              onSelect={onSelect}
              disabled={Boolean(busyValue)}
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
 * Paso 3 — Sala de espera. Vista terminal: sin botón de salida ni de
 * revisar, a propósito (ver la nota junto a `OnboardingFlow` más abajo).
 *
 * El texto secundario no se escribe letra por letra — el pedido lo dice de
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
 * Flujo de bienvenida para un registro nuevo: tres pasos que terminan en la
 * sala de espera de aprobación.
 *
 * Sólo se le muestra a quien todavía no eligió su etapa profesional
 * (`identity.experienceLevel` vacío) — es `Gate`, en `App.jsx`, quien decide
 * si monta esto o `PendingApproval` directamente, comparando esa misma
 * columna. Así el recorrido completo (Bienvenida → Selección → Sala de
 * espera) ocurre una sola vez, la primera; en cualquier apertura posterior
 * mientras el rol sigue sin aprobar, la persona cae directo en la sala de
 * espera de siempre, sin repetir la bienvenida.
 *
 * El paso 3 de este componente y `PendingApproval.jsx` cuentan la misma
 * historia con distinta puesta en escena (uno la escribe como un momento,
 * el otro la presenta como una pantalla de estado con botón de revisar) —
 * son intencionalmente dos vistas separadas, no una condicionada dentro de
 * la otra, porque el paso 3 es el final de una animación y no debe cargar
 * los controles de "revisar de nuevo" que sí tienen sentido en una vista a
 * la que se puede volver muchas veces.
 */
export default function OnboardingFlow({ userId, onProfileSaved }) {
  const [step, setStep] = useState(1);
  const [busyValue, setBusyValue] = useState(null);

  // Evita seguir aceptando toques o navegación si el componente se
  // desmontara a media escritura (cambio de sesión, por ejemplo).
  const [alive, setAlive] = useState(true);
  useEffect(() => () => setAlive(false), []);

  const chooseLevel = async (value) => {
    setBusyValue(value);
    await saveExperienceLevel(userId, value);
    if (!alive) return;
    // Se refresca la identidad de la sesión aunque el guardado haya fallado
    // en silencio (columna todavía no migrada): no hay nada que reintentar
    // desde aquí, y bloquear el avance dejaría a la persona varada en este
    // paso para siempre por un detalle de infraestructura que no le compete.
    await onProfileSaved?.();
    if (!alive) return;
    setBusyValue(null);
    setStep(3);
  };

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-black px-4 py-10">
      {step === 1 && <WelcomeStep onStart={() => setStep(2)} />}
      {step === 2 && <ProfileSelectionStep onSelect={chooseLevel} busyValue={busyValue} />}
      {step === 3 && <WaitingRoomStep />}
    </div>
  );
}
