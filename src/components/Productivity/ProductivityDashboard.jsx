import { useState, useEffect } from 'react';
import {
  Megaphone, Target, CircleDollarSign, Flame, Hourglass,
} from 'lucide-react';
import BentoCard from './BentoCard';
import ProspectaHero from './ProspectaHero';
import ProspectaScreen from '../Prospecta/ProspectaScreen';
import WorkplaceBoard from '../Workplace/WorkplaceBoard';
import GoalsView from '../Goals/GoalsView';
import TimeBlocksScreen from '../Production/TimeBlocksScreen';
import { readHistory, statsFor, formatDuration } from '../../data/timeBlocks';

/**
 * Acentos de color de cada destino.
 *
 * Tres piezas por acento y las tres hacen falta: el tinte del ícono, su
 * resplandor —que es lo que lo separa del cristal— y el halo difuso del fondo,
 * que es lo único que da color a la tarjeta.
 */
const ACCENTS = {
  cyan: {
    icon: 'text-cyan-300',
    glow: 'shadow-[0_0_15px_rgba(34,211,238,0.45)]',
    halo: 'bg-cyan-500/20',
  },
  amber: {
    icon: 'text-amber-300',
    glow: 'shadow-[0_0_15px_rgba(245,158,11,0.5)]',
    halo: 'bg-amber-500/20',
  },
  indigo: {
    icon: 'text-indigo-300',
    glow: 'shadow-[0_0_15px_rgba(99,102,241,0.5)]',
    halo: 'bg-indigo-500/25',
  },
  emerald: {
    icon: 'text-emerald-300',
    glow: 'shadow-[0_0_15px_rgba(16,185,129,0.5)]',
    halo: 'bg-emerald-500/20',
  },
  orange: {
    icon: 'text-orange-300',
    glow: 'shadow-[0_0_15px_rgba(249,115,22,0.55)]',
    halo: 'bg-orange-500/25',
  },
};

/**
 * Destinos del mosaico, en el orden en que se recorren.
 *
 * `span` define el tejido del mosaico sobre tres columnas: alternar 2 y 1 es lo
 * que rompe la simetría y evita que se lea como una tabla.
 */
const CARDS = [
  {
    key: 'metas',
    title: 'Mis Metas',
    subtitle: 'Tus objetivos con fecha, avance y celebración al cumplirlos',
    icon: Target,
    accent: ACCENTS.amber,
    span: 2,
  },
  {
    key: 'bloques',
    title: 'Bloques de Tiempo',
    subtitle: 'Sesiones de enfoque sin interrupciones',
    icon: Hourglass,
    accent: ACCENTS.indigo,
    span: 1,
  },
  {
    key: 'dinero',
    title: 'Dinero en la Mesa',
    subtitle: '$45,000 MXN en comisiones pausadas',
    icon: CircleDollarSign,
    accent: ACCENTS.emerald,
    span: 1,
  },
  {
    key: 'rachas',
    title: 'Rachas',
    subtitle: '4 días activos. No rompas la cadena',
    icon: Flame,
    accent: ACCENTS.orange,
    span: 2,
  },
];

/** Hub de rendimiento: banner de marca y mosaico de secciones en cristal. */
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
    <div className="relative mx-auto max-w-5xl px-4 pb-28 pt-6">
      {/*
        Luz de ambiente. No es adorno: el cristal necesita algo detrás que
        desenfocar, y sobre un negro plano `backdrop-blur` no tendría nada que
        recoger y las tarjetas se verían como rectángulos grises.

        Va fija al viewport y no dentro del contenedor: recortada al ancho de
        `max-w-5xl`, la luz terminaba en un canto recto y se veía el rectángulo
        del contenedor dibujado sobre el fondo.
      */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden="true">
        <div className="absolute -left-24 top-24 h-72 w-72 rounded-full bg-indigo-600/20 blur-3xl" />
        <div className="absolute -right-20 top-1/3 h-80 w-80 rounded-full bg-violet-600/15 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-64 w-64 rounded-full bg-emerald-600/10 blur-3xl" />
      </div>

      <div className="relative">
        <h1 className="mb-5 text-2xl font-bold tracking-tight text-zinc-900 dark:text-white">
          Tu Rendimiento
        </h1>

        {/*
          Una sola cuadrícula para todo. En celular es una columna; desde tableta
          son tres, y los `span` de cada pieza arman el mosaico.
        */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="col-span-full">
            <ProspectaHero onClick={() => setProspectaOpen(true)} />
          </div>

          <BentoCard
            title="Workplace"
            subtitle="Mensajes y avisos de la Promotoría"
            icon={Megaphone}
            accent={ACCENTS.cyan}
            span="full"
            badge={1}
            badgeLabel="1 aviso nuevo de la promotoría"
            onClick={() => setWorkplaceOpen(true)}
          />

          {CARDS.map((card) => {
            const isBlocks = card.key === 'bloques';
            const hasBlocksToday = isBlocks && today.blocks > 0;

            return (
              <BentoCard
                key={card.key}
                title={card.title}
                subtitle={hasBlocksToday
                  ? `${today.blocks} ${today.blocks === 1 ? 'bloque' : 'bloques'} · ${formatDuration(today.minutes)} de enfoque hoy`
                  : card.subtitle}
                icon={card.icon}
                accent={card.accent}
                span={card.span}
                badge={hasBlocksToday ? today.blocks : undefined}
                badgeLabel={hasBlocksToday ? `${today.blocks} bloques completados hoy` : undefined}
                onClick={destinations[card.key]}
              />
            );
          })}
        </div>
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
