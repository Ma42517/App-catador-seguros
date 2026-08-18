/**
 * src/components/Home/PointsPill.jsx
 *
 * Ancla visual del "Tracker de 25 Puntos": un anillo de progreso circular,
 * discreto (w-7 h-7), junto a la fecha. Sólo lectura: no hay botones, no
 * suma nada por su cuenta — refleja `puntosActuales`, que calculará en algún
 * otro lugar la lógica de producto todavía por construir. El día que exista
 * ese cálculo (o un `useProductivity()` real), esta pieza no cambia: sólo
 * cambia quién le pasa el número.
 *
 * El anillo sigue el mismo patrón SVG que `ProgressRingVisual`
 * (Productivity/CardVisuals.jsx): circunferencia fija, `strokeDasharray` al
 * largo total y `strokeDashoffset` al recorte según el porcentaje — así el
 * relleno no depende de generar una clase de Tailwind por cada valor
 * posible. Aquí se rota con `-rotate-90` para que el trazo arranque arriba,
 * como en un reloj, y no a la derecha del círculo.
 */

const META = 25;
const RADIUS = 11;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

/*
  Tres tramos y no una interpolación continua: la meta es un umbral binario
  (se llegó o no), y un degradado continuo diluiría el momento exacto en que
  se cumplen los 25 puntos — que es justo lo que el resplandor fuerte del
  tramo final tiene que anunciar.

  El resplandor vive en `glow` como filtro `drop-shadow` de Tailwind: sobre
  un trazo de SVG, un `box-shadow` no pintaría nada (no hay caja), así que
  tiene que ser `drop-shadow`, que sí sigue la silueta del trazo.
*/
function toneFor(points) {
  if (points >= META) {
    return {
      stroke: 'stroke-emerald-400',
      glow: 'drop-shadow-[0_0_8px_rgba(34,197,94,0.8)]',
      text: 'text-emerald-300',
    };
  }
  if (points >= 10) {
    return {
      stroke: 'stroke-amber-500',
      glow: 'drop-shadow-[0_0_5px_rgba(245,158,11,0.6)]',
      text: 'text-amber-300',
    };
  }
  return {
    stroke: 'stroke-sky-200/70',
    glow: 'drop-shadow-[0_0_3px_rgba(186,230,253,0.35)]',
    text: 'text-zinc-300',
  };
}

/**
 * @param {number} puntosActuales - Puntos ya calculados en el fondo. Por ahora
 *   se recibe como prop; cuando exista el contexto de productividad real, el
 *   único cambio es leerlo de ahí en el componente que llama a este anillo.
 */
export default function PointsPill({ puntosActuales = 0 }) {
  const points = Math.max(0, Math.min(puntosActuales, META));
  const percent = points / META;
  const offset = CIRCUMFERENCE * (1 - percent);
  const tone = toneFor(points);

  return (
    <span
      role="status"
      aria-label={`${points} de ${META} puntos del día`}
      className="relative inline-grid h-7 w-7 shrink-0 place-items-center"
    >
      <svg
        viewBox="0 0 24 24"
        className={`h-7 w-7 -rotate-90 transition-[filter] duration-500 ${tone.glow}`}
      >
        {/* Riel de fondo: apenas visible, marca el círculo completo como referencia. */}
        <circle
          cx="12"
          cy="12"
          r={RADIUS}
          fill="none"
          strokeWidth="2"
          className="stroke-white/10"
        />
        <circle
          cx="12"
          cy="12"
          r={RADIUS}
          fill="none"
          strokeWidth="2"
          strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={offset}
          className={`transition-[stroke,stroke-dashoffset] duration-700 ease-out ${tone.stroke}`}
        />
      </svg>

      {/*
        "0/25" completo y no sólo el número: un anillo en 0 sin la meta a la
        vista es indistinguible de un anillo roto — el "/25" es lo que dice
        "esto es un contador, no un ícono que no cargó". `text-[7px]` es lo
        que permite que las cuatro cifras quepan sin desbordar el círculo
        de 28px.
      */}
      <span
        className={`absolute text-[7px] font-bold leading-none tabular-nums
                    transition-colors duration-500 ${tone.text}`}
      >
        {points}/{META}
      </span>
    </span>
  );
}
