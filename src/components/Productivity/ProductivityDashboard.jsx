import { useState } from 'react';
import { Target } from 'lucide-react';
import ImmersiveCard from './ImmersiveCard';
import ProspectaHero from './ProspectaHero';
import ProspectaScreen from '../Prospecta/ProspectaScreen';

/**
 * Definición de las tarjetas del hub. Cada entrada es un destino futuro;
 * `onClick` queda listo para engancharse cuando exista su pantalla.
 */
const CARDS = [
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
export default function ProductivityDashboard() {
  const [isProspectaOpen, setProspectaOpen] = useState(false);

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
        />
      ))}

      <ProspectaScreen
        isOpen={isProspectaOpen}
        onClose={() => setProspectaOpen(false)}
      />
    </div>
  );
}
