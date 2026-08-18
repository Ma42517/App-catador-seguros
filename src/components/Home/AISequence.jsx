import { useState, useEffect } from 'react';
import { useEvents } from '../../context/EventContext';
import ActionableCard from '../Activities/ActionableCard';
import PriorityAlerts from './PriorityAlerts';
import useTypewriter from '../../lib/useTypewriter';
import { buildMessage } from '../../lib/homeMessage';
import { buildSmartMessage } from '../../lib/smartMessage';
import DailyGoalBar from './DailyGoalBar';

/*
  Cuánto se espera, ya con la interfaz inicial asentada por completo (esto
  es: después de que `isTyping` cae a `false`), antes de reemplazar el
  mensaje central por el inteligente. No se cuenta desde el montaje: si se
  contara desde ahí, en una frase larga el reemplazo podría dispararse a
  mitad de la escritura letra por letra, que es justo el efecto inicial que
  no se debe romper.
*/
const SMART_MESSAGE_DELAY_MS = 6500;
/*
  Duración del cruce de salida/entrada del mensaje central. Un solo valor
  gobierna las dos mitades del cruce (la transición de opacidad del párrafo
  central, más abajo en el JSX) para que fundido de salida y fundido de
  entrada se sientan como el mismo gesto y no como dos animaciones distintas
  encadenadas.
*/
const SMART_MESSAGE_FADE_MS = 400;

/**
 * Secuencia de inicio del panel principal, en dos fases:
 *
 *  1. Texto vivo: el mensaje se escribe solo, sin avatar, aro ni contenedor.
 *  2. Revelación: al caer la última letra, entran las tarjetas prioritarias
 *     y el contenido (`children`) con un fundido lento.
 *
 * Pasado `SMART_MESSAGE_DELAY_MS` desde que la fase 2 ya asentó, el mensaje
 * central se sustituye —con un cruce de opacidad, no con una segunda pasada
 * de máquina de escribir— por un mensaje inteligente que lee la carga de
 * trabajo del día y los puntos acumulados. Ninguna de las dos fases
 * originales cambia: esto ocurre después, y por completo aparte.
 */
export default function AISequence({ header, children, puntosActuales = 0 }) {
  const { highPriorityToday, activeToday } = useEvents();

  const text = buildMessage(highPriorityToday.length);

  /*
    La máquina de escribir vive en `lib/useTypewriter`: la comparten esta pantalla y
    el flujo de enfoque, y dos copias del mismo intervalo se habrían desviado en
    cuanto alguien tocara el ritmo o la regla de "reducir movimiento" en una sola.
  */
  const { typed, isTyping } = useTypewriter(text);

  /*
    `null` mientras se muestra el mensaje original; se llena una sola vez,
    justo cuando toca cruzar. No se recalcula en cada render con la carga
    actual: el mensaje inteligente describe el momento en que apareció, y
    recalcularlo mientras sigue en pantalla haría que un evento que se cierra
    a media lectura cambiara el texto por debajo, sin ningún cruce que lo
    anuncie.
  */
  const [smartText, setSmartText] = useState(null);
  /*
    'idle' -> 'out' (arrancó el fundido de salida) -> 'in' (ya con el texto
    nuevo, fundiendo hacia adentro). El swap de contenido ocurre en la
    transición 'out' -> 'in', a medio cruce, cuando el texto viejo ya está
    invisible y el nuevo todavía no se pinta.
  */
  const [crossfadePhase, setCrossfadePhase] = useState('idle');

  useEffect(() => {
    if (isTyping) return undefined;
    const timer = setTimeout(() => setCrossfadePhase('out'), SMART_MESSAGE_DELAY_MS);
    return () => clearTimeout(timer);
  }, [isTyping]);

  useEffect(() => {
    if (crossfadePhase !== 'out') return undefined;
    const timer = setTimeout(() => {
      setSmartText(buildSmartMessage(activeToday.length, puntosActuales));
      setCrossfadePhase('in');
    }, SMART_MESSAGE_FADE_MS);
    return () => clearTimeout(timer);
    // Sólo reacciona a la fase, no a `activeToday`/`puntosActuales`: son la
    // instantánea que se congela al momento del cruce, no un valor que deba
    // reprogramar el temporizador cada vez que la agenda cambia.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [crossfadePhase]);

  // El encabezado y el contenido comparten el mismo fundido de la revelación.
  const revealClass = `transition-opacity duration-1000 ${isTyping ? 'opacity-0' : 'opacity-100'}`;

  const displayText = smartText ?? typed;
  const isCrossfadingOut = crossfadePhase === 'out';

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

        {/*
          La duración del cruce va como estilo inline y no como clase de
          Tailwind (`duration-[Nms]`): una clase con un valor interpolado en
          tiempo de ejecución no existe en la hoja generada por el JIT de
          Tailwind —sólo reconoce los valores que ve como texto literal
          durante el build—, así que la transición simplemente no habría
          aplicado ninguna duración.
        */}
        <p
          className={`max-w-md text-center text-xl font-light text-zinc-800 dark:text-white
                      transition-opacity
                      ${isCrossfadingOut ? 'opacity-0' : 'opacity-100'}`}
          style={{ transitionDuration: `${SMART_MESSAGE_FADE_MS}ms` }}
          aria-hidden="true"
        >
          {displayText}
          {isTyping && <span className="animate-pulse text-amber-400">|</span>}
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
                <ActionableCard event={event} />
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
