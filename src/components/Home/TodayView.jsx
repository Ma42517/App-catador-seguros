import AISequence from './AISequence';
import WelcomeGreeting from './WelcomeGreeting';
import FirstLoginIntro from './FirstLoginIntro';
import useAdvisorPoints from '../../lib/useAdvisorPoints';

const DATE_FORMAT = { weekday: 'long', day: 'numeric', month: 'long' };

/**
 * Pantalla de inicio ("Hoy"). Es el punto de entrada de la app: el Diagnóstico
 * 360 ya no ocupa la vista principal, se abre desde "Ver más".
 *
 * El día y el saludo viven arriba; el centro lo ocupa la secuencia de inicio.
 * El saludo entra palabra por palabra, sin vibración: el golpe al tacto se
 * reserva para los botones y los avisos del cronómetro.
 *
 * `horario` viaja hasta `AISequence` sin usarse aquí: es la única parada
 * intermedia entre `Gate` (que lo lee de `identity.advisorProfileData`) y
 * el mensaje inteligente que sí lo necesita.
 *
 * `inquietud`, `mercado`, `perfil` y `username` sí se usan aquí, y sólo
 * aquí: decidir si toca mostrar `FirstLoginIntro` es la razón por la que
 * este componente deja de ser una simple parada intermedia como con
 * `horario`. La condición exacta —inquietud declarada como "miedo al
 * rechazo" Y puntos todavía en 0— vive en este único lugar para que no
 * haya dos sitios de la app que puedan discrepar sobre cuándo le toca a
 * alguien ver esta introducción. `mercado` y `perfil` viajan hasta
 * `FirstLoginIntro` sin decidir nada aquí: sólo calibran si el Paso 3 de
 * esa introducción captura prospectos o tareas, y cuántos slots pide en
 * cada caso (ver `FirstLoginIntro.jsx`).
 */
export default function TodayView({
  name, puntosActuales, horario = [], inquietud = '', mercado = '', perfil = '', username,
  onOpenDiagnostic, onStartSession, onOpenRequirements, onRouteToActivity,
}) {
  const fecha = new Date().toLocaleDateString('es-MX', DATE_FORMAT);
  const saludo = name ? name.charAt(0).toUpperCase() + name.slice(1) : '';

  /*
    Arriba sólo la fecha y el nombre. La pregunta del día ("¿cerramos un negocio
    hoy?") ya la hace el texto del centro, y repetirla aquí sonaba a eco: se leía
    dos veces la misma invitación antes de llegar a la agenda.
  */
  const greeting = saludo ? `Hola, ${saludo}.` : 'Hola.';

  /*
    Fuente real de los puntos: `useAdvisorPoints` lee y persiste por
    `username`, con el mismo patrón de `localStorage` que ya usan las metas y
    la agenda. `puntosActuales`, si alguien lo pasa desde fuera, ya no tiene
    ningún consumidor propio — se conserva como prop opcional únicamente
    para no romper una llamada externa que todavía no se haya actualizado,
    pero el valor real que gobierna tanto `FirstLoginIntro` como
    `AISequence`/`DailyGoalBar` es siempre el de este hook.
  */
  const [points, addPoints] = useAdvisorPoints(username);
  const effectivePoints = puntosActuales ?? points;

  /*
    Sólo se muestra la primera vez: alguna inquietud declarada en el
    Onboarding (cualquiera de las cuatro de `CONCERN_OPTIONS` en
    `advisorOnboarding.js` — `FirstLoginIntro` ya trae un mensaje del Paso 2
    calibrado para cada una) y puntos en 0. En cuanto `addPoints(1)` corre,
    `effectivePoints` deja de ser 0 y esta pantalla no vuelve a montarse
    jamás para esa persona — es justo la condición que pide la
    especificación ("tener 1 punto o más es la condición para que esta
    pantalla no vuelva a aparecer").

    No se compara contra `'rejection'` a secas: eso dejaba fuera a quien
    eligió "Falta de dominio técnico", "La falta de organización" o "Por el
    momento, ninguna" — las tres inquietudes que también tienen su propio
    mensaje en `STEP2_TEXT_BY_CONCERN` (`FirstLoginIntro.jsx`) y nunca
    llegaban a mostrarlo. Basta con que `inquietud` no esté vacía: un
    Onboarding sin completar (columna vacía) sigue sin disparar esta
    pantalla, como antes.
  */
  const showFirstLoginIntro = Boolean(inquietud) && effectivePoints === 0;

  if (showFirstLoginIntro) {
    return (
      <FirstLoginIntro
        name={saludo || 'Asesor'}
        username={username}
        inquietud={inquietud}
        mercado={mercado}
        perfil={perfil}
        onComplete={(pointsEarned) => addPoints(pointsEarned)}
      />
    );
  }

  return (
    <AISequence
      puntosActuales={effectivePoints}
      horario={horario}
      username={username}
      onOpenDiagnostic={onOpenDiagnostic}
      /*
        Único punto de entrada real al marcador de puntos del asesor: lo
        que gana el feedback de una llamada (`CallActivityCard.jsx`, vía
        `ActionableCard.jsx`) viaja hasta aquí y se suma con el mismo
        `addPoints` que ya usa `FirstLoginIntro`, nunca con una copia
        propia del contador.
      */
      onEarnPoints={addPoints}
      onStartSession={onStartSession}
      onOpenRequirements={onOpenRequirements}
      onRouteToActivity={onRouteToActivity}
      header={(
        <div className="mx-auto max-w-2xl px-4 pt-8">
          {/*
            La cabecera queda limpia: sólo la fecha. El Tracker de puntos se
            mudó al cuerpo del tablero (`DailyGoalBar`, dentro de
            `AISequence.jsx`), donde tiene su propia etiqueta y una barra de
            progreso — ya no comparte línea con la fecha.
          */}
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
