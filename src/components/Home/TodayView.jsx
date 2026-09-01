import { useEffect, useState } from 'react';
import AISequence from './AISequence';
import WelcomeGreeting from './WelcomeGreeting';
import FirstLoginIntro from './FirstLoginIntro';
import { useDailyPoints } from '../../store/gamificationStore';
import {
  hasCompletedFirstLoginIntro, markFirstLoginIntroCompleted,
} from '../../data/firstLoginIntro';

const DATE_FORMAT = { weekday: 'long', day: 'numeric', month: 'long' };

/**
 * Pantalla de inicio ("Hoy"). Es el punto de entrada de la app: el Diagnóstico
 * 360 ya no ocupa la vista principal, se abre desde "Ver más".
 *
 * Los puntos vienen exclusivamente del store diario de Zustand. La introducción
 * inicial tiene su propia bandera persistente: terminarla ya no inventa un punto
 * ni vuelve a aparecer cuando el marcador se reinicia al día siguiente.
 */
export default function TodayView({
  name, horario = [], inquietud = '', mercado = '', perfil = '', username,
  onOpenDiagnostic, onStartSession, onOpenRequirements, onRouteToActivity,
}) {
  const fecha = new Date().toLocaleDateString('es-MX', DATE_FORMAT);
  const saludo = name ? name.charAt(0).toUpperCase() + name.slice(1) : '';
  const greeting = saludo ? `Hola, ${saludo}.` : 'Hola.';
  const points = useDailyPoints(username);
  const [introCompleted, setIntroCompleted] = useState(
    () => hasCompletedFirstLoginIntro(username),
  );

  useEffect(() => {
    setIntroCompleted(hasCompletedFirstLoginIntro(username));
  }, [username]);

  const showFirstLoginIntro = Boolean(inquietud) && !introCompleted;

  if (showFirstLoginIntro) {
    return (
      <FirstLoginIntro
        name={saludo || 'Asesor'}
        username={username}
        inquietud={inquietud}
        mercado={mercado}
        perfil={perfil}
        onComplete={() => {
          markFirstLoginIntroCompleted(username);
          setIntroCompleted(true);
        }}
      />
    );
  }

  return (
    <AISequence
      puntosActuales={points}
      horario={horario}
      username={username}
      onOpenDiagnostic={onOpenDiagnostic}
      onStartSession={onStartSession}
      onOpenRequirements={onOpenRequirements}
      onRouteToActivity={onRouteToActivity}
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
