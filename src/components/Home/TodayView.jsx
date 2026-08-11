import AISequence from './AISequence';
import WelcomeGreeting from './WelcomeGreeting';
import PriorityAlerts from './PriorityAlerts';

const DATE_FORMAT = { weekday: 'long', day: 'numeric', month: 'long' };

/**
 * Pantalla de inicio ("Hoy"). Es el punto de entrada de la app: el Diagnóstico
 * 360 ya no ocupa la vista principal, se abre desde "Ver más".
 *
 * El día y el saludo viven arriba; el centro lo ocupa la secuencia de inicio.
 * El saludo entra palabra por palabra, sin vibración: el golpe al tacto se
 * reserva para los botones y los avisos del cronómetro.
 */
export default function TodayView({ name }) {
  const fecha = new Date().toLocaleDateString('es-MX', DATE_FORMAT);
  const saludo = name ? name.charAt(0).toUpperCase() + name.slice(1) : '';

  const greeting = saludo
    ? `Hola, ${saludo}. ¿Cerramos un negocio hoy?`
    : 'Hola. ¿Cerramos un negocio hoy?';

  return (
    <AISequence
      name={name}
      header={(
        <>
          {/*
            Los avisos de la promotoría van antes del saludo: si esperan respuesta,
            son lo único de esta pantalla que no puede posponerse. Cuando no hay
            ninguno el componente no dibuja nada, así que la vista queda igual que
            antes.
          */}
          <PriorityAlerts />

          <div className="mx-auto max-w-2xl px-4 pt-8">
          <p className="text-[11px] font-bold uppercase tracking-widest text-indigo-400">
            {fecha}
          </p>
          <div className="mt-1">
            <WelcomeGreeting text={greeting} accentWords={saludo.split(' ')} />
          </div>
          </div>
        </>
      )}
    />
  );
}
