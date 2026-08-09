import { useState, useEffect } from 'react';
import { Megaphone, Target, CircleDollarSign, Flame, Hourglass } from 'lucide-react';
import SquareCard from './SquareCard';
import WideCard from './WideCard';
import ProspectaHero from './ProspectaHero';
import ProspectaScreen from '../Prospecta/ProspectaScreen';
import WorkplaceBoard from '../Workplace/WorkplaceBoard';
import GoalsView from '../Goals/GoalsView';
import TimeBlocksScreen from '../Production/TimeBlocksScreen';
import { readHistory, statsFor, formatDuration } from '../../data/timeBlocks';

/**
 * Tarjetas de la cuadrícula. Los subtítulos son deliberadamente cortos: en
 * formato cuadrado sólo caben dos líneas antes de recortarse.
 *
 * `onClick` se resuelve en el componente; hoy sólo Workplace tiene destino.
 */
/** Workplace conserva el formato ancho: es el canal de la promotoría. */
const WORKPLACE = {
  title: 'Workplace',
  subtitle: 'Mensajes y avisos de la Promotoría',
  icon: Megaphone,
  gradient: 'from-zinc-900 via-blue-950 to-blue-900',
  glow: 'hover:shadow-[0_0_28px_rgba(59,130,246,0.35)]',
  iconTone: 'text-cyan-300/80',
  badge: 1,
  badgeLabel: '1 aviso nuevo de la promotoría',
};

const CARDS = [
  {
    key: 'metas',
    title: 'Mis Metas',
    subtitle: 'Calculadora de comisiones y sueños',
    icon: Target,
    gradient: 'from-zinc-900 via-amber-950 to-orange-900',
    glow: 'hover:shadow-[0_0_28px_rgba(245,158,11,0.35)]',
    iconTone: 'text-amber-300',
  },
  {
    key: 'bloques',
    title: 'Bloques de Tiempo',
    subtitle: 'Sesiones de enfoque sin interrupciones',
    icon: Hourglass,
    gradient: 'from-zinc-900 via-indigo-950 to-indigo-900',
    glow: 'hover:shadow-[0_0_28px_rgba(99,102,241,0.35)]',
    iconTone: 'text-indigo-300',
  },
  {
    key: 'dinero',
    title: 'Dinero en la Mesa',
    subtitle: '$45,000 MXN en comisiones pausadas',
    icon: CircleDollarSign,
    gradient: 'from-zinc-900 via-emerald-950 to-emerald-900',
    glow: 'hover:shadow-[0_0_28px_rgba(16,185,129,0.4)]',
    iconTone: 'text-emerald-300',
  },
  {
    key: 'rachas',
    title: 'Rachas',
    subtitle: '4 días activos. No rompas la cadena',
    icon: Flame,
    gradient: 'from-zinc-900 via-rose-950 to-rose-900',
    glow: 'hover:shadow-[0_0_28px_rgba(244,63,94,0.35)]',
    iconTone: 'text-rose-300',
  },
];

/** Hub de rendimiento: banner de acceso y cuadrícula de secciones. */
export default function ProductivityDashboard({ username }) {
  const [isProspectaOpen, setProspectaOpen] = useState(false);
  const [isWorkplaceOpen, setWorkplaceOpen] = useState(false);
  const [isGoalsOpen, setGoalsOpen] = useState(false);
  const [isBlocksOpen, setBlocksOpen] = useState(false);

  // Sólo las tarjetas con destino son pulsables; el resto siguen inertes.
  const destinations = {
    metas: () => setGoalsOpen(true),
    bloques: () => setBlocksOpen(true),
  };

  /*
    Resumen del día en la tarjeta de bloques. Se relee al cerrar la pantalla del
    temporizador, que es cuando pudo cambiar: el hub no necesita un contador en
    marcha, sólo reflejar lo que ya se cerró.
  */
  const [today, setToday] = useState(() => statsFor(readHistory(username)));
  useEffect(() => { setToday(statsFor(readHistory(username))); }, [username]);
  const refreshToday = () => setToday(statsFor(readHistory(username)));

  return (
    <div className="mx-auto max-w-md px-4 pb-24 pt-6">
      <h1 className="mb-5 text-2xl font-bold tracking-tight text-zinc-900 dark:text-white">
        Tu Rendimiento
      </h1>

      {/* Banner de ancho completo: acceso a las tres etapas de prospección */}
      <ProspectaHero onClick={() => setProspectaOpen(true)} />

      {/* Workplace a ancho completo, con su tamaño original */}
      <div className="mt-5">
        <WideCard
          title={WORKPLACE.title}
          subtitle={WORKPLACE.subtitle}
          icon={WORKPLACE.icon}
          gradient={WORKPLACE.gradient}
          glow={WORKPLACE.glow}
          iconTone={WORKPLACE.iconTone}
          badge={WORKPLACE.badge}
          badgeLabel={WORKPLACE.badgeLabel}
          onClick={() => setWorkplaceOpen(true)}
        />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-4">
        {CARDS.map((card) => (
          <SquareCard
            key={card.key}
            title={card.title}
            subtitle={card.key === 'bloques' && today.blocks > 0
              ? `${today.blocks} ${today.blocks === 1 ? 'bloque' : 'bloques'} · ${formatDuration(today.minutes)} hoy`
              : card.subtitle}
            badge={card.key === 'bloques' && today.blocks > 0 ? today.blocks : card.badge}
            badgeLabel={card.key === 'bloques' && today.blocks > 0
              ? `${today.blocks} bloques completados hoy`
              : card.badgeLabel}
            icon={card.icon}
            gradient={card.gradient}
            glow={card.glow}
            iconTone={card.iconTone}
            onClick={destinations[card.key]}
          />
        ))}
      </div>

      <ProspectaScreen
        isOpen={isProspectaOpen}
        onClose={() => setProspectaOpen(false)}
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
