import { useState, useEffect } from 'react';
import BentoCard from './BentoCard';
import ProspectaHero from './ProspectaHero';
import {
  BellVisual, ProgressRingVisual, ClockVisual, FlameVisual, MoneyVisual,
} from './CardVisuals';
import ProspectaScreen from '../Prospecta/ProspectaScreen';
import WorkplaceBoard from '../Workplace/WorkplaceBoard';
import GoalsView from '../Goals/GoalsView';
import TimeBlocksScreen from '../Production/TimeBlocksScreen';
import { readHistory, statsFor, formatDuration } from '../../data/timeBlocks';

/**
 * Hub de rendimiento.
 *
 * Fondo claro y tarjetas blancas. El banner de Prospecta se deja intacto: su
 * negro sobre el gris claro funciona como pieza de portada, y es la única
 * superficie oscura de la vista a propósito.
 *
 * La sección se mantiene clara en los dos temas, igual que antes se mantenía
 * oscura: es una decisión de la pieza, no del tema de la app.
 */
export default function ProductivityDashboard({
  username,
  /*
    Etapa de Prospecta con la que este hub debe abrir de entrada — la usa
    `InitialMeetingCard.jsx` (vía `Shell` en `App.jsx`) al presionar
    "Iniciar Sesión": la persona llega aquí ya con destino, así que
    Prospecta se abre sola, directo en "Cita Inicial", sin que la persona
    tenga que tocar el banner y elegir la etapa otra vez. `null` es la
    entrada normal, la del banner, que sigue abriendo la lista de etapas.
  */
  autoOpenProspectaStage = null,
  onAutoOpenConsumed,
  onRouteToActivity,
}) {
  const [isProspectaOpen, setProspectaOpen] = useState(false);

  /*
    Al enrutar a "Nueva Actividad" (Opción A/B de `PresentationEndModal.jsx`)
    Prospecta se cierra entera y no sólo su etapa interna: quien acaba de
    resolver la cita ya terminó aquí, y `ActivityForm` (montado más arriba,
    en `AdminLayout.jsx`) se abre por encima de lo que quede debajo.
  */
  const handleRouteToActivity = (activityType, client) => {
    setProspectaOpen(false);
    onRouteToActivity?.(activityType, client);
  };
  const [isWorkplaceOpen, setWorkplaceOpen] = useState(false);
  const [isGoalsOpen, setGoalsOpen] = useState(false);
  const [isBlocksOpen, setBlocksOpen] = useState(false);

  /*
    Se abre cada vez que llega una etapa a la que saltar, no sólo la primera
    vez que este panel se monta.

    Antes `autoOpenProspectaStage` sólo se leía como valor inicial de
    `useState(Boolean(autoOpenProspectaStage))`: eso abría Prospecta sola la
    primera vez que la persona entraba a "Productividad" recién llegada
    desde "Iniciar Sesión", pero si ya había estado antes en esta pestaña
    —así que el componente ya estaba montado—, React no vuelve a ejecutar
    ese inicializador nunca más: la prop cambiaba, pero la pantalla nunca se
    abría. Con el efecto, cualquier cambio de la prop (venga del primer
    montaje o de uno ya en pie) abre la pantalla igual.
  */
  useEffect(() => {
    if (autoOpenProspectaStage) setProspectaOpen(true);
  }, [autoOpenProspectaStage]);

  /*
    Resumen del día en la tarjeta de bloques. Se relee al cerrar la pantalla del
    temporizador, que es cuando pudo cambiar: el hub no necesita un contador en
    marcha, sólo reflejar lo que ya se cerró.
  */
  const [today, setToday] = useState(() => statsFor(readHistory(username)));
  useEffect(() => { setToday(statsFor(readHistory(username))); }, [username]);
  const refreshToday = () => setToday(statsFor(readHistory(username)));

  const hasBlocksToday = today.blocks > 0;

  return (
    <div className="relative">
      {/*
        Fondo claro fijo al viewport.

        Con `min-h-screen` sobre el contenedor no bastaba: la carcasa añade su
        propio relleno inferior para dejar sitio a la barra flotante, y ese
        tramo mostraba el fondo de la app —negro en tema oscuro— como una franja
        bajo la sección clara. Fijo, cubre siempre, sea corto o largo el
        contenido.
      */}
      <div className="pointer-events-none fixed inset-0 bg-zinc-50" aria-hidden="true" />

      <div className="relative mx-auto max-w-5xl px-4 pb-28 pt-6">
        <h1 className="mb-5 text-2xl font-bold tracking-tight text-zinc-800">
          Tu Rendimiento
        </h1>

        {/*
          Una sola cuadrícula para todo. En celular es una columna; desde tableta
          son tres, y los `span` de cada pieza arman el mosaico asimétrico.
        */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="col-span-full">
            <ProspectaHero onClick={() => setProspectaOpen(true)} />
          </div>

          <BentoCard
            title="Workplace"
            subtitle="Mensajes y avisos de la Promotoría"
            visual={<BellVisual />}
            span="full"
            badge={1}
            badgeLabel="1 aviso nuevo de la promotoría"
            onClick={() => setWorkplaceOpen(true)}
          />

          <BentoCard
            title="Mis Metas"
            subtitle="Tus objetivos con fecha, avance y celebración al cumplirlos"
            visual={<ProgressRingVisual percent={70} />}
            span={2}
            onClick={() => setGoalsOpen(true)}
          />

          <BentoCard
            title="Bloques de Tiempo"
            subtitle={hasBlocksToday
              ? `${today.blocks} ${today.blocks === 1 ? 'bloque' : 'bloques'} · ${formatDuration(today.minutes)} de enfoque hoy`
              : 'Sesiones de enfoque sin interrupciones'}
            visual={<ClockVisual />}
            span={1}
            badge={hasBlocksToday ? today.blocks : undefined}
            badgeLabel={hasBlocksToday ? `${today.blocks} bloques completados hoy` : undefined}
            onClick={() => setBlocksOpen(true)}
          />

          <BentoCard
            title="Dinero en la Mesa"
            subtitle="Comisiones pausadas que puedes reactivar"
            visual={<MoneyVisual amount="$45,000" />}
            span={1}
          />

          <BentoCard
            title="Rachas"
            subtitle="4 días activos. No rompas la cadena"
            visual={<FlameVisual />}
            span={2}
          />
        </div>
      </div>

      <ProspectaScreen
        isOpen={isProspectaOpen}
        onClose={() => { setProspectaOpen(false); onAutoOpenConsumed?.(); }}
        initialStageKey={autoOpenProspectaStage}
        onRouteToActivity={handleRouteToActivity}
      />

      <WorkplaceBoard
        isOpen={isWorkplaceOpen}
        onClose={() => setWorkplaceOpen(false)}
        username={username}
      />

      <GoalsView isOpen={isGoalsOpen} onClose={() => setGoalsOpen(false)} />

      <TimeBlocksScreen
        isOpen={isBlocksOpen}
        onClose={() => { setBlocksOpen(false); refreshToday(); }}
        username={username}
      />
    </div>
  );
}
