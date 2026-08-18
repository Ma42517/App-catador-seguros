import { useEvents } from '../../context/EventContext';
import ActionableCard from '../Activities/ActionableCard';
import PriorityAlerts from './PriorityAlerts';

/**
 * Cuerpo de la pantalla de inicio: los avisos que esperan confirmación y la
 * agenda del día, debajo del encabezado (`header`: fecha + saludo).
 *
 * El mensaje "La agenda está libre..." que antes se escribía aquí letra por
 * letra ya no vive en este componente. Ahora lo dice el prólogo
 * cinematográfico de `TodayView.jsx` —pantalla negra, fade-in, 2.5s, fade-
 * out— antes de revelar todo esto de golpe. Repetir la misma frase aquí,
 * animada otra vez, habría sido decirla dos veces en cuestión de segundos.
 */
export default function AISequence({ header, children }) {
  const { highPriorityToday } = useEvents();

  return (
    <>
      {header}

      <div className="px-6 pt-6">
        {/*
          Los avisos que esperan confirmación van antes de la agenda del día:
          es lo primero que hay que atender al abrir la app.
        */}
        <div className="mx-auto w-full max-w-md">
          <PriorityAlerts />
        </div>

        {/* Eventos de máxima prioridad para hoy, accionables al tocarlos */}
        {highPriorityToday.length > 0 && (
          <ul className="mx-auto mt-6 w-full max-w-md">
            {highPriorityToday.map((event) => (
              <li key={event.id} className="mb-3">
                <ActionableCard event={event} />
              </li>
            ))}
          </ul>
        )}
      </div>

      {children}
    </>
  );
}
