import { useEvents } from '../../context/EventContext';
import ActionableCard from '../Activities/ActionableCard';
import PriorityAlerts from './PriorityAlerts';
import useTypewriter from '../../lib/useTypewriter';

/**
 * El mensaje cambia según lo que haya en la agenda de hoy.
 *
 * Sin saludo ni nombre: de eso ya se encarga el encabezado, tres líneas más
 * arriba. Aquí se saludaba por segunda vez a alguien que acababa de leer su
 * nombre, y el texto tardaba en llegar a lo único que importa, que es cuántos
 * pendientes tiene.
 */
function buildMessage(pendientes) {
  if (pendientes > 0) {
    // Se cuida el singular: "1 evento pendiente", no "1 eventos pendientes".
    const cuenta = pendientes === 1
      ? '1 evento pendiente'
      : `${pendientes} eventos pendientes`;
    return `Tienes ${cuenta} para hoy. Empecemos por aquí...`;
  }
  return 'La agenda está libre. '
    + '¿Cerramos algún negocio pendiente hoy? Empieza por aquí...';
}

/**
 * Secuencia de inicio del panel principal, en dos fases:
 *
 *  1. Texto vivo: el mensaje se escribe solo, sin avatar, aro ni contenedor.
 *  2. Revelación: al caer la última letra, entran las tarjetas prioritarias
 *     y el contenido (`children`) con un fundido lento.
 */
export default function AISequence({ header, children }) {
  const { highPriorityToday } = useEvents();

  const text = buildMessage(highPriorityToday.length);

  /*
    La máquina de escribir vive en `lib/useTypewriter`: la comparten esta pantalla y
    el flujo de enfoque, y dos copias del mismo intervalo se habrían desviado en
    cuanto alguien tocara el ritmo o la regla de "reducir movimiento" en una sola.
  */
  const { typed, isTyping } = useTypewriter(text);

  // El encabezado y el contenido comparten el mismo fundido de la revelación.
  const revealClass = `transition-opacity duration-1000 ${isTyping ? 'opacity-0' : 'opacity-100'}`;

  return (
    <>
      {/*
        Encabezado (saludo y día): visible desde el primer fotograma, sin
        esperar a que el mensaje central termine de escribirse. Ocultarlo
        detrás de `isTyping` competía con la coreografía del Tracker de 25
        Puntos, que necesita el saludo ya en su posición final para poder
        "teletransportarse" hacia él cuando acaba su propia entrada — no
        tiene sentido saltar hacia un lugar que todavía no se ve.
      */}
      {header}

      {/* Fase 1 — texto vivo, sin contenedor */}
      <div className="flex min-h-[60vh] flex-col items-center justify-center px-6">
        {/* El mensaje completo, para lectores de pantalla. */}
        <p className="sr-only">{text}</p>

        <p
          className="max-w-md text-center text-xl font-light text-zinc-800 dark:text-white"
          aria-hidden="true"
        >
          {typed}
          {isTyping && <span className="animate-pulse text-amber-400">|</span>}
        </p>

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

          Visible de entrada, igual que el encabezado: la lista de eventos es
          parte de "la base" de la pantalla, no de la revelación por fase.
        */}
        <div className="w-full max-w-md">
          <PriorityAlerts />
        </div>

        {/* Eventos de máxima prioridad para hoy, accionables al tocarlos */}
        {highPriorityToday.length > 0 && (
          <ul className="mt-10 w-full max-w-md">
            {highPriorityToday.map((event) => (
              <li key={event.id} className="mb-3">
                <ActionableCard event={event} />
              </li>
            ))}
          </ul>
        )}
      </div>

      {/*
        Fase 2 — revelación del contenido adicional (`children`), si lo hay.
        Sigue detrás del typewriter: a diferencia del encabezado y la lista
        de eventos, esto es contenido extra que ningún llamador pasa hoy, y
        no forma parte de "la base" que el pedido de la coreografía exige
        visible desde el principio.
      */}
      {children && (
        <div className={revealClass} aria-hidden={isTyping}>
          {children}
        </div>
      )}

    </>
  );
}
