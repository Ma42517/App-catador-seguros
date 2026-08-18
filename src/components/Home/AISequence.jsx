import { useState, useEffect } from 'react';
import { useEvents } from '../../context/EventContext';
import ActionableCard from '../Activities/ActionableCard';
import PriorityAlerts from './PriorityAlerts';
import useTypewriter from '../../lib/useTypewriter';
import { buildMessage } from '../../lib/homeMessage';
import { buildProductivityMessage } from '../../lib/productivityMessage';
import { hasSeenIntro, markIntroSeen } from '../../lib/homeIntroMemory';

/**
 * Termómetro de productividad: mensaje contextual y sutil, después de la
 * agenda del día, que refleja los puntos acumulados sin exigir ninguna
 * acción — es sólo lectura, igual que el resto de las piezas del Tracker.
 *
 * `key={message}` fuerza un remontaje cuando el texto cambia según
 * `puntosActuales`, y es lo que dispara de nuevo `animate-rise` (ya definido
 * en `index.css`, el mismo fundido corto que usa el resto de la app para
 * entradas discretas) a modo de cruce entre el mensaje anterior y el nuevo.
 * No es una segunda máquina de escribir: dos textos escribiéndose letra por
 * letra en la misma pantalla competirían por la misma atención, y aquí sólo
 * el mensaje central la necesita.
 */
function ProductivityMessage({ puntosActuales }) {
  const message = buildProductivityMessage(puntosActuales);

  return (
    <p
      key={message}
      className="animate-rise text-center text-sm font-light italic
                 text-zinc-500 dark:text-zinc-400"
    >
      {message}
    </p>
  );
}

/**
 * Secuencia de inicio del panel principal, en dos fases:
 *
 *  1. Texto vivo: el mensaje se escribe solo, sin avatar, aro ni contenedor.
 *  2. Revelación: al caer la última letra, entran las tarjetas prioritarias,
 *     el termómetro de productividad y el contenido (`children`) con un
 *     fundido lento.
 *
 * Con la intro ya vista esta sesión, las dos fases colapsan en una: el
 * texto aparece completo desde el primer render y todo lo demás se revela
 * junto con él, sin demora. Es `useTypewriter` con `instant: true` quien
 * resuelve esto —arranca con `isTyping` ya en `false`—, así que el resto de
 * este componente no necesita una rama aparte para el caso "ya visto".
 */
export default function AISequence({ header, children, puntosActuales = 0 }) {
  const { highPriorityToday } = useEvents();

  const text = buildMessage(highPriorityToday.length);

  /*
    Se lee una sola vez, al montar: si el valor cambiara a mitad de la vida
    del componente (otra pestaña lo acaba de escribir) no se quiere cortar a
    medio camino una animación que ya está corriendo.
  */
  const [skipIntro] = useState(hasSeenIntro);

  /*
    La máquina de escribir vive en `lib/useTypewriter`: la comparten esta pantalla y
    el flujo de enfoque, y dos copias del mismo intervalo se habrían desviado en
    cuanto alguien tocara el ritmo o la regla de "reducir movimiento" en una sola.
  */
  const { typed, isTyping } = useTypewriter(text, { instant: skipIntro });

  // Se marca en cuanto la animación termina —de golpe si se saltó, letra a
  // letra si no— para que la próxima vez que este componente se monte ya
  // la encuentre vista.
  useEffect(() => {
    if (!isTyping) markIntroSeen();
  }, [isTyping]);

  // El encabezado y el contenido comparten el mismo fundido de la revelación.
  const revealClass = `transition-opacity duration-1000 ${isTyping ? 'opacity-0' : 'opacity-100'}`;

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

        {/*
          Termómetro de productividad. Siempre presente —no depende de que
          haya eventos—, con su propio margen y no encadenado al `mt-10` de
          la lista de arriba: así el espaciado no cambia según haya o no
          eventos pendientes.
        */}
        <div className={`mt-10 w-full max-w-md ${revealClass}`} aria-hidden={isTyping}>
          <ProductivityMessage puntosActuales={puntosActuales} />
        </div>
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
