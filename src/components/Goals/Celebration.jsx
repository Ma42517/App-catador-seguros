import { useEffect, useMemo, useState } from 'react';

/**
 * Confeti de celebración al completar una meta.
 *
 * Se hace con CSS y no con `react-confetti` a propósito: esa librería arrastra
 * un canvas y su propio bucle de animación para un efecto que dura dos segundos
 * y aparece una vez cada varios meses. No vale 40 KB en el bundle de una app
 * que se abre desde el celular con datos móviles.
 *
 * Se retira solo. Y respeta `prefers-reduced-motion`: para quien pidió menos
 * movimiento se muestra el cartel sin las piezas cayendo.
 */
const PIECES = 60;

const COLORS = [
  'bg-amber-400', 'bg-emerald-400', 'bg-indigo-400',
  'bg-rose-400', 'bg-cyan-300', 'bg-violet-400',
];

const DURATION_MS = 3200;

export default function Celebration({ isActive, title, onDone }) {
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    const query = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    setReduceMotion(Boolean(query?.matches));
  }, []);

  // Las posiciones se sortean una sola vez por celebración: recalcularlas en
  // cada render haría saltar las piezas a mitad de la caída.
  const pieces = useMemo(() => Array.from({ length: PIECES }, (_, index) => ({
    id: index,
    left: Math.random() * 100,
    delay: Math.random() * 900,
    duration: 2200 + Math.random() * 1400,
    drift: (Math.random() - 0.5) * 140,
    size: 6 + Math.random() * 7,
    color: COLORS[index % COLORS.length],
    rotation: Math.random() * 360,
  })), [isActive]);

  useEffect(() => {
    if (!isActive) return undefined;
    const timer = setTimeout(onDone, DURATION_MS);
    return () => clearTimeout(timer);
  }, [isActive, onDone]);

  if (!isActive) return null;

  return (
    <div
      className="pointer-events-none fixed inset-0 z-[90] overflow-hidden"
      role="status"
      aria-live="assertive"
    >
      {!reduceMotion && pieces.map((piece) => (
        <span
          key={piece.id}
          className={`absolute top-0 rounded-[2px] ${piece.color}`}
          style={{
            left: `${piece.left}%`,
            width: `${piece.size}px`,
            height: `${piece.size * 1.6}px`,
            animation: `goal-confetti ${piece.duration}ms linear ${piece.delay}ms forwards`,
            '--drift': `${piece.drift}px`,
            '--spin': `${piece.rotation + 540}deg`,
          }}
        />
      ))}

      <div className="flex h-full items-center justify-center px-6">
        <div
          className="animate-celebrate rounded-3xl border border-amber-400/40
                     bg-zinc-950/90 px-7 py-6 text-center shadow-2xl backdrop-blur-sm"
        >
          <p className="text-4xl" aria-hidden="true">🏆</p>
          <p className="mt-2 text-lg font-bold text-white">¡Meta cumplida!</p>
          <p className="mt-1 max-w-xs text-sm text-amber-200">{title}</p>
        </div>
      </div>
    </div>
  );
}
