import AISequence from './AISequence';
import WelcomeGreeting from './WelcomeGreeting';

const DATE_FORMAT = { weekday: 'long', day: 'numeric', month: 'long' };

/**
 * Pantalla de inicio ("Hoy"). Es el punto de entrada de la app: el Diagnóstico
 * 360 ya no ocupa la vista principal, se abre desde "Ver más".
 *
 * El día y el saludo viven arriba; el centro lo ocupa la secuencia de inicio.
 * El saludo entra palabra por palabra, sin vibración: el golpe al tacto se
 * reserva para los botones y los avisos del cronómetro.
 *
 * El Tracker de 25 Puntos ya no vive aquí. Se probaron dos anillos (uno junto
 * a la fecha, otro grande centrado) y no convencieron: el ancla definitiva es
 * el botón "Productividad" de la barra inferior (`BottomTabBar.jsx`), con su
 * efecto de luz LED recorriendo el borde. `PointsPill.jsx` queda sin usar por
 * ahora — no se borra por si el anillo circular se retoma en otro sitio.
 */
export default function TodayView({ name }) {
  const fecha = new Date().toLocaleDateString('es-MX', DATE_FORMAT);
  const saludo = name ? name.charAt(0).toUpperCase() + name.slice(1) : '';

  /*
    Arriba sólo la fecha y el nombre. La pregunta del día ("¿cerramos un negocio
    hoy?") ya la hace el texto del centro, y repetirla aquí sonaba a eco: se leía
    dos veces la misma invitación antes de llegar a la agenda.
  */
  const greeting = saludo ? `Hola, ${saludo}.` : 'Hola.';

  return (
    <AISequence
      header={(
        <div className="mx-auto max-w-2xl px-4 pt-8">
          <p className="text-[11px] font-bold uppercase tracking-widest text-indigo-400">
            {fecha}
          </p>
          <div className="mt-1">
            <WelcomeGreeting text={greeting} accentWords={saludo.split(' ')} />
          </div>
        </div>
      )}
    />
  );
}
