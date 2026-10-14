import { useEffect, useState } from 'react';
import AISequence from './AISequence';
import WelcomeGreeting from './WelcomeGreeting';
import FirstLoginIntro from './FirstLoginIntro';
import GuidedTour from '../Tour/GuidedTour';
import { HOY_TOUR } from '../../lib/tours';
import { useDailyPoints } from '../../store/gamificationStore';
import { useSession } from '../../context/SessionContext';
import { saveTutorialHoySeen } from '../../data/profilesRepo';
import {
  hasCompletedFirstLoginIntro, markFirstLoginIntroCompleted,
} from '../../data/firstLoginIntro';
import { hasSeenTutorialHoy, markTutorialHoySeen } from '../../data/tutorialHoy';

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
  onOpenDiagnostic, onStartSession, onReportResult, onOpenRequirements, onRouteToActivity,
}) {
  const fecha = new Date().toLocaleDateString('es-MX', DATE_FORMAT);
  const saludo = name ? name.charAt(0).toUpperCase() + name.slice(1) : '';
  const greeting = saludo ? `Hola, ${saludo}.` : 'Hola.';
  const points = useDailyPoints(username);
  const { identity } = useSession();
  const [introCompleted, setIntroCompleted] = useState(
    () => hasCompletedFirstLoginIntro(username),
  );

  useEffect(() => {
    setIntroCompleted(hasCompletedFirstLoginIntro(username));
  }, [username]);

  const showFirstLoginIntro = Boolean(inquietud) && !introCompleted;

  /*
    ── Mini-tutorial de "Hoy" ──
    Se muestra una sola vez, en la primera visita a esta pantalla ya con la
    interfaz normal a la vista (es decir, NO durante el intro de primer ingreso).
    Se considera "ya visto" si lo dice la memoria local de este navegador O el
    perfil en Supabase (`identity.tutorialHoySeen`), para que no reaparezca al
    entrar desde otro dispositivo. Al cerrarlo —terminar u omitir— se marca en
    ambos sitios.
  */
  const [showTour, setShowTour] = useState(false);

  useEffect(() => {
    if (showFirstLoginIntro) return; // Espera a que termine el intro de primer ingreso.
    const alreadySeen = hasSeenTutorialHoy(username) || Boolean(identity?.tutorialHoySeen);
    if (!alreadySeen) setShowTour(true);
  }, [showFirstLoginIntro, username, identity?.tutorialHoySeen]);

  /*
    Relanzamiento manual desde "Ver más → Ver tutorial de nuevo": AdminLayout
    navega a "Hoy" y emite este evento. Se fuerza el tour aunque ya esté marcado
    como visto, porque es una petición explícita de la persona.
  */
  useEffect(() => {
    const replay = () => setShowTour(true);
    window.addEventListener('expandia:replay-tour', replay);
    return () => window.removeEventListener('expandia:replay-tour', replay);
  }, []);

  const finishTour = () => {
    setShowTour(false);
    markTutorialHoySeen(username);
    saveTutorialHoySeen(identity?.key); // sincroniza con Supabase (silencioso si falla)
  };

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
    <>
      <AISequence
        puntosActuales={points}
        horario={horario}
        username={username}
        onOpenDiagnostic={onOpenDiagnostic}
        onStartSession={onStartSession}
        onReportResult={onReportResult}
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

      {/* Mini-tutorial de "Hoy": terminar y omitir cierran y marcan como visto. */}
      <GuidedTour
        isOpen={showTour}
        steps={HOY_TOUR}
        name={saludo}
        onFinish={finishTour}
        onSkip={finishTour}
      />
    </>
  );
}
