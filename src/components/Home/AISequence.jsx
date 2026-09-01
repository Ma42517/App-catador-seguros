import { useState, useEffect } from 'react';
import { useEvents } from '../../context/EventContext';
import ActionableCard from '../Activities/ActionableCard';
import PriorityAlerts from './PriorityAlerts';
import useTypewriter from '../../lib/useTypewriter';
import useNow from '../../lib/useNow';
import { buildMessage } from '../../lib/homeMessage';
import { buildSmartMessage } from '../../lib/smartMessage';
import { isHourWithinSchedule } from '../../lib/advisorOnboarding';
import DailyGoalBar from './DailyGoalBar';
import DiagnosticPushNudge from './DiagnosticPushNudge';
import PausedProspectsNudge from './PausedProspectsNudge';
import useDiagnosticInventory from '../../lib/useDiagnosticInventory';
import { readSafeZone } from '../../data/safeZone';

/*
  Cuánto se espera, ya con la interfaz inicial asentada por completo (esto
  es: después de que `isTyping` cae a `false`), antes de reemplazar el
  mensaje central por el inteligente. No se cuenta desde el montaje: si se
  contara desde ahí, en una frase larga el reemplazo podría dispararse a
  mitad de la escritura letra por letra, que es justo el efecto inicial que
  no se debe romper.
*/
const SMART_MESSAGE_DELAY_MS = 6500;

/**
 * Secuencia de inicio del panel principal, en dos fases:
 *
 *  1. Texto vivo: el mensaje se escribe solo, sin avatar, aro ni contenedor.
 *  2. Revelación: al caer la última letra, entran las tarjetas prioritarias
 *     y el contenido (`children`) con un fundido lento.
 *
 * Pasado `SMART_MESSAGE_DELAY_MS` desde que la fase 2 ya asentó, el mensaje
 * central se sustituye por uno inteligente que lee la carga de trabajo del
 * día, los puntos acumulados y si la hora actual cae dentro del `horario`
 * que el asesor marcó en el Onboarding (Paso 7) — también con máquina de
 * escribir, no con un fundido de opacidad: cualquier texto que hable "en voz
 * del asistente" en esta pantalla se escribe letra por letra, es la misma
 * convención en toda la app (`lib/useTypewriter`). Ninguna de las dos fases
 * originales cambia: esto ocurre después, y por completo aparte.
 *
 * El filtro de horario sólo aplica a esta sugerencia de la propia app. Los
 * Avisos del promotor (`PriorityAlerts`, más abajo) son comunicación de la
 * promotoría, no una sugerencia de productividad: se siguen mostrando sin
 * importar la hora, decisión explícita para no esconder algo que alguien
 * más consideró importante avisar.
 */
export default function AISequence({
  header, children, puntosActuales = 0, horario = [], username = '', onOpenDiagnostic,
  onStartSession, onOpenRequirements, onRouteToActivity,
}) {
  const { highPriorityToday, activeToday } = useEvents();

  /*
    "Push" de Diagnósticos 360 (`DiagnosticPushNudge.jsx`): siempre que la
    agenda de hoy esté vacía, cruza el inventario con la Zona Segura (los
    apoyos capturados al entrar por primera vez, `FirstLoginIntro.jsx` →
    `data/safeZone.js`) para sugerir algo — el propio componente decide qué,
    según haya o no Diagnósticos y prospectos. `readSafeZone` no es
    reactivo —es una simple lectura de localStorage—, pero aquí basta: la
    lista sólo cambia en el Paso 3 del primer ingreso, que ya terminó para
    cualquiera que esté viendo "Hoy".
  */
  const [diagnosticsCount] = useDiagnosticInventory(username);
  const [safeZoneProspects] = useState(() => readSafeZone(username));

  /*
    Congelado en el primer render con `useState(() => ...)`, y no recalculado
    en cada uno: antes era `buildMessage(highPriorityToday.length)` directo,
    así que completar o eliminar cualquier actividad de la lista (una
    notificación, la Cita Inicial, cualquier tarea) cambiaba el conteo de
    pendientes, `text` cambiaba, y como el efecto de `useTypewriter` depende
    de `text`, volvía a escribir el mensaje completo desde cero — `isTyping`
    se ponía en `true` otra vez y `revealClass` ocultaba de golpe el
    encabezado, la barra de puntos, los avisos y la agenda entera, dando la
    sensación de que la app se reiniciaba. Con el valor fijo desde el
    montaje, tachar o quitar una notificación ya no vuelve a disparar esa
    máquina de escribir: sólo desaparece la notificación, tal como se pidió.
  */
  const [text] = useState(() => buildMessage(highPriorityToday.length));

  /*
    Reloj vivo para el mensaje inteligente: sin él, alguien que abre la app
    dos minutos antes del corte de su horario vería el mismo mensaje
    "dentro de horario" durante todo el rato que se queda en la pantalla,
    en vez de que el mensaje respete el instante real en que se dispara
    (pasado `SMART_MESSAGE_DELAY_MS`). El mismo hook que ya usan
    `PriorityAlerts.jsx` y `ActionableCard.jsx`.
  */
  const now = useNow();

  /*
    La máquina de escribir vive en `lib/useTypewriter`: la comparten esta pantalla y
    el flujo de enfoque, y dos copias del mismo intervalo se habrían desviado en
    cuanto alguien tocara el ritmo o la regla de "reducir movimiento" en una sola.
  */
  const { typed, isTyping } = useTypewriter(text);

  /*
    `null` mientras se muestra el mensaje original; se llena una sola vez,
    pasado el retraso. No se recalcula en cada render con la carga actual:
    el mensaje inteligente describe el momento en que apareció, y
    recalcularlo mientras sigue en pantalla haría que un evento que se cierra
    a media lectura cambiara el texto por debajo sin ningún aviso.
  */
  const [smartText, setSmartText] = useState(null);

  /*
    Segunda máquina de escribir, independiente de la del mensaje base. Vive
    aparte —y no se reutiliza el mismo `typed`/`isTyping` de arriba
    cambiándole el texto— porque `isTyping` del mensaje base gobierna
    `revealClass`: si el mismo hook volviera a escribir para el mensaje
    inteligente, `isTyping` se pondría en `true` otra vez y ocultaría de
    nuevo el encabezado, los avisos y la agenda que ya se habían revelado.
    Con dos instancias separadas, sólo el párrafo central vuelve a
    "escribirse"; el resto de la pantalla se queda quieto.

    Mientras `smartText` es `null` se le pasa `''` con `instant: true`: así
    no arranca ningún intervalo de escritura hasta que de verdad haya un
    mensaje que mostrar.
  */
  const { typed: smartTyped, isTyping: isSmartTyping } = useTypewriter(
    smartText ?? '',
    { instant: smartText === null },
  );

  useEffect(() => {
    if (isTyping) return undefined;
    const timer = setTimeout(() => {
      const isWithinSchedule = isHourWithinSchedule(horario, now);
      setSmartText(buildSmartMessage(activeToday.length, puntosActuales, isWithinSchedule));
    }, SMART_MESSAGE_DELAY_MS);
    return () => clearTimeout(timer);
    // Sólo reacciona a `isTyping`: `activeToday`/`puntosActuales`/`horario`/`now`
    // se leen en el instante en que el temporizador se cumple, no deben
    // reprogramarlo cada vez que la agenda cambia o el reloj avanza
    // mientras se espera.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isTyping]);

  // El encabezado y el contenido comparten el mismo fundido de la revelación.
  const revealClass = `transition-opacity duration-1000 ${isTyping ? 'opacity-0' : 'opacity-100'}`;

  const hasSmartMessage = smartText !== null;
  const displayText = hasSmartMessage ? smartTyped : typed;
  // El cursor parpadeante acompaña a la máquina de escribir que esté activa
  // en cada instante: la del mensaje base mientras no haya mensaje
  // inteligente, y la del mensaje inteligente en cuanto aparece.
  const isAssistantTyping = hasSmartMessage ? isSmartTyping : isTyping;

  return (
    <>
      {/* Encabezado (saludo y día): se revela junto con el contenido para no
          romper el momento de texto puro de la primera fase. */}
      {header && (
        <div className={revealClass} aria-hidden={isTyping}>
          {header}
        </div>
      )}

      {/* Fase 1 — texto vivo, sin contenedor */}
      <div className="flex min-h-[60vh] flex-col items-center justify-center px-6">
        {/* El mensaje visible en cada instante, para lectores de pantalla. */}
        <p className="sr-only">{smartText ?? text}</p>

        <p
          className="max-w-md text-center text-xl font-light text-zinc-800 dark:text-white"
          aria-hidden="true"
        >
          {displayText}
          {isAssistantTyping && <span className="animate-pulse text-amber-400">|</span>}
        </p>

        {/*
          La barra de "Objetivo Diario" comparte exactamente `revealClass`
          con los avisos y la lista de citas de abajo: es la misma Fase 2
          —el fundido lento tras el texto blanco inicial—, no una animación
          nueva. Va antes que los avisos y la agenda, en el espacio
          intermedio que describe el pedido, con su propio margen para no
          heredar el `mt-10` que separa la lista de eventos.
        */}
        <div className={`mt-8 w-full max-w-md ${revealClass}`} aria-hidden={isTyping}>
          <DailyGoalBar puntosActuales={puntosActuales} />
        </div>

        {/*
          El "push" de Diagnósticos 360, justo debajo del Objetivo Diario y
          antes de los Avisos: mismo `revealClass`, mismo fundido de
          Fase 2 que el resto de esta pantalla — no es una animación aparte
          que compita con la coreografía ya establecida. Sólo se oculta con
          `activeToday.length > 0` (ya hay algo agendado hoy); mientras la
          agenda esté libre, siempre hay algo que sugerir (`resolveState`
          dentro de `DiagnosticPushNudge`).
        */}
        <div className={`mt-4 w-full max-w-md ${revealClass}`} aria-hidden={isTyping}>
          <DiagnosticPushNudge
            prospects={safeZoneProspects}
            diagnosticsCount={diagnosticsCount}
            hasAgendaToday={activeToday.length > 0}
            onUseDiagnostic={onOpenDiagnostic}
          />
        </div>

        {/*
          Recomendación de recontacto: la app vuelve a proponer a los
          prospectos que quedaron en pausa sin seguimiento —todos, menos los
          que se descartaron a propósito—. Mismo `revealClass` y mismo peso
          visual de fila delgada que el push de arriba, para que la
          coreografía de la Fase 2 no cambie.

          A diferencia de ese push, no se oculta cuando hay agenda: un
          prospecto olvidado no deja de estarlo porque hoy haya trabajo, y el
          componente ya se limita a mostrar uno a la vez para no competir con
          la lista de citas.
        */}
        <div className={`mt-3 w-full max-w-md ${revealClass}`} aria-hidden={isTyping}>
          <PausedProspectsNudge />
        </div>

        {/*
          Los avisos que esperan confirmación van justo aquí: después del texto que
          acaba de decir "empecemos por aquí" y antes de la agenda del día. Ese
          "aquí" señala al primer elemento de la lista, y esto es lo primero.

          Encima del saludo interrumpían la entrada a la app; en el encabezado
          quedaban separados de la lista que encabezan. El diseño de la tarjeta no
          cambia, sólo su lugar en el orden de lectura.

          El ancho lo pone este envoltorio y no el componente: el contenedor centra
          a sus hijos, así que sin `w-full` la tarjeta se encogería al tamaño de su
          texto y dejaría de alinearse con los eventos de abajo.
        */}
        <div className={`w-full max-w-md ${revealClass}`} aria-hidden={isTyping}>
          <PriorityAlerts />
        </div>

        {/* Eventos de máxima prioridad para hoy, accionables al tocarlos */}
        {highPriorityToday.length > 0 && (
          <ul className={`mt-10 w-full max-w-md ${revealClass}`} aria-hidden={isTyping}>
            {highPriorityToday.map((event) => (
              <li key={event.id} className="mb-3">
                <ActionableCard
                  event={event}
                  onStartSession={onStartSession}
                  onOpenRequirements={onOpenRequirements}
                  onRouteToActivity={onRouteToActivity}
                />
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Fase 2 — revelación del contenido */}
      {children && (
        <div className={revealClass} aria-hidden={isTyping}>
          {children}
        </div>
      )}

    </>
  );
}
