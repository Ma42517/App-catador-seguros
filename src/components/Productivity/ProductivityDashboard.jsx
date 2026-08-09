import { useState } from 'react';
import { Layers, Target, Flame, Zap } from 'lucide-react';
import ImmersiveCard from './ImmersiveCard';
import ProspectaScreen from '../Prospecta/ProspectaScreen';

/**
 * Cifras del hub. Concentradas aquí a propósito: cuando se conecten al motor
 * real (cierres, citas ANF del mes, racha de días con actividad), sólo cambia
 * este objeto.
 */
const STATS = {
  moneyOnTable: '$45,000 MXN',
  streakDays: 4,
};

/**
 * Definición de las tarjetas. Cada entrada es un destino futuro; `onClick`
 * queda listo para engancharse cuando exista su pantalla.
 */
const CARDS = [
  {
    key: 'ciclo',
    title: 'Ciclo de Ventas',
    subtitle: 'Acercamiento, Presentaciones y Cierres',
    icon: Layers,
    gradient: 'from-zinc-900 via-indigo-950 to-indigo-900',
    glow: 'hover:shadow-[0_0_28px_rgba(99,102,241,0.35)]',
    iconTone: 'text-indigo-300/80',
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
  {
    key: 'dinero',
    title: 'Dinero en la Mesa',
    value: STATS.moneyOnTable,
    subtitle: 'Comisiones en pausa',
    gradient: 'from-zinc-900 via-emerald-950 to-emerald-900',
    glow: 'hover:shadow-[0_0_28px_rgba(16,185,129,0.4)]',
  },
  {
    key: 'rachas',
    title: 'Rachas y Stats',
    subtitle: `${STATS.streakDays} Días prospectando. No rompas la cadena`,
    icon: Flame,
    gradient: 'from-zinc-900 via-rose-950 to-rose-900',
    glow: 'hover:shadow-[0_0_28px_rgba(244,63,94,0.35)]',
    iconTone: 'text-rose-300/80',
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

      {/* Acceso de marca, hasta arriba: abre el ciclo de prospección */}
      <ImmersiveCard
        title="PROSPECTA"
        subtitle="Acercamiento en frío, cita inicial y cierre"
        icon={Zap}
        gradient="from-indigo-950 via-violet-950 to-indigo-900"
        glow="hover:shadow-[0_0_32px_rgba(139,92,246,0.45)]"
        iconTone="text-violet-300/80"
        onClick={() => setProspectaOpen(true)}
      />

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
