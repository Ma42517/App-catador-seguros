import { useState } from 'react';
import { Target, Megaphone } from 'lucide-react';
import ImmersiveCard from './ImmersiveCard';
import ProspectaHero from './ProspectaHero';
import ProspectaScreen from '../Prospecta/ProspectaScreen';
import WorkplaceBoard from '../Workplace/WorkplaceBoard';

/**
 * Definición de las tarjetas del hub. Cada entrada es un destino futuro;
 * `onClick` queda listo para engancharse cuando exista su pantalla.
 */
const CARDS = [
  {
    key: 'workplace',
    title: 'Workplace',
    subtitle: 'Mensajes y avisos de la Promotoría',
    icon: Megaphone,
    gradient: 'from-zinc-900 via-blue-950 to-blue-900',
    glow: 'hover:shadow-[0_0_28px_rgba(59,130,246,0.35)]',
    iconTone: 'text-cyan-300/80',
    // Simula un aviso nuevo del promotor.
    badge: 1,
    badgeLabel: '1 aviso nuevo de la promotoría',
  },
  {
    key: 'metas',
    title: 'Mis Metas',
    subtitle: 'Calculadora de comisiones y sueños',
    icon: Target,
    gradient: 'from-zinc-900 via-amber-950 to-orange-900',
    glow: 'hover:shadow-[0_0_28px_rgba(245,158,11,0.35)]',
    iconTone: 'text-amber-300/80',
  },
];

/** Hub de rendimiento: accesos apilados a las secciones de análisis. */
export default function ProductivityDashboard({ username }) {
  const [isProspectaOpen, setProspectaOpen] = useState(false);
  const [isWorkplaceOpen, setWorkplaceOpen] = useState(false);

  return (
    <div className="mx-auto flex max-w-md flex-col gap-5 px-4 pb-24 pt-6">
      <h1 className="mb-2 text-2xl font-bold tracking-tight text-zinc-900 dark:text-white">
        Tu Rendimiento
      </h1>

      {/* Banner principal: acceso a las tres etapas de prospección */}
      <ProspectaHero onClick={() => setProspectaOpen(true)} />

      {CARDS.map((card) => (
        <ImmersiveCard
          key={card.key}
          title={card.title}
          subtitle={card.subtitle}
          value={card.value}
          icon={card.icon}
          gradient={card.gradient}
          glow={card.glow}
          iconTone={card.iconTone}
          badge={card.badge}
          badgeLabel={card.badgeLabel}
          onClick={card.key === 'workplace' ? () => setWorkplaceOpen(true) : undefined}
        />
      ))}

      <ProspectaScreen
        isOpen={isProspectaOpen}
        onClose={() => setProspectaOpen(false)}
      />

      <WorkplaceBoard
        isOpen={isWorkplaceOpen}
        onClose={() => setWorkplaceOpen(false)}
        username={username}
      />
    </div>
  );
}
