import { DAILY_POINTS_GOAL } from '../../store/gamificationStore';

/**
 * src/components/Home/PointsPill.jsx
 *
 * Ancla visual del "Sistema de 20 Puntos", junto a la fecha. Sólo lectura: no
 * hay botones, no suma nada por su cuenta — refleja `puntosActuales`, que
 * calculará en algún otro lugar la lógica de producto todavía por construir.
 *
 * Sin anillo de progreso ni resplandor en el contorno: la versión anterior
 * dibujaba un círculo SVG con `drop-shadow` alrededor del texto, y el pedido
 * fue explícito en quitar cualquier borde o brillo del contenedor. El efecto
 * ahora vive *dentro* de los caracteres: el texto es transparente
 * (`bg-clip-text text-transparent`) sobre un degradado animado que se
 * desplaza de un lado a otro (`animate-shimmer`, ya definida en
 * `tailwind.config.js` — el mismo reflejo que usa el cristal de "About Me" en
 * `Productivity/CardVisuals.jsx`, reutilizado tal cual y no duplicado).
 */

function shimmerFor(points) {
  if (points >= DAILY_POINTS_GOAL) return 'from-emerald-700 via-lime-300 to-emerald-700';
  if (points >= 10) return 'from-orange-700 via-yellow-300 to-orange-700';
  return 'from-zinc-500 via-zinc-300 to-zinc-500';
}

/**
 * @param {number} puntosActuales - Puntos ya calculados en el fondo. Por ahora
 *   se recibe como prop; cuando exista el contexto de productividad real, el
 *   único cambio es leerlo de ahí en el componente que llama a esta pieza.
 */
export default function PointsPill({ puntosActuales = 0 }) {
  const displayPoints = Math.max(0, Number(puntosActuales) || 0);
  const gradient = shimmerFor(displayPoints);

  return (
    <span
      role="status"
      aria-label={`${displayPoints} de ${DAILY_POINTS_GOAL} puntos del día`}
      className={`bg-gradient-to-r ${gradient} bg-[length:200%_auto] bg-clip-text
                  text-sm font-bold tabular-nums text-transparent
                  animate-shimmer transition-[background-image] duration-500`}
    >
      {displayPoints}/{DAILY_POINTS_GOAL}
    </span>
  );
}
