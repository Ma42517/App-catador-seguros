/**
 * src/components/Home/PointsPill.jsx
 *
 * Ancla visual del "Tracker de 25 Puntos": un anillo de progreso circular.
 * Dos tamaños (`sm` discreto junto a la fecha, `lg` destacado en el centro
 * de la pantalla) del mismo componente. Sólo lectura: no hay botones, no
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

/*
  Dos tamaños y no uno con escala CSS: escalar con `transform` un SVG cuyo
  `strokeWidth` está fijado en unidades de `viewBox` engrosaría o afinaría el
  trazo de forma proporcional al zoom, no al tamaño real en pantalla — el
  anillo grande necesita un trazo más grueso en términos absolutos para no
  verse débil, no el mismo trazo estirado.
*/
const SIZES = {
  sm: { box: 'h-9 w-9', viewBox: 32, radius: 15, stroke: 2, text: 'text-[9px]' },
  lg: { box: 'h-24 w-24', viewBox: 88, radius: 40, stroke: 5, text: 'text-lg' },
};

/**
 * @param {number} puntosActuales - Puntos ya calculados en el fondo. Por ahora
 *   se recibe como prop; cuando exista el contexto de productividad real, el
 *   único cambio es leerlo de ahí en el componente que llama a este anillo.
 * @param {'sm'|'lg'} size - 'sm' (36px, junto a la fecha) o 'lg' (96px, para
 *   destacarlo en el centro de la pantalla). Mismo componente, mismo cálculo
 *   de tramo y color: sólo cambian las medidas del SVG.
 */
export default function PointsPill({ puntosActuales = 0, size = 'sm' }) {
  const points = Math.max(0, Math.min(puntosActuales, META));
  const percent = points / META;
  const dims = SIZES[size];
  const circumference = 2 * Math.PI * dims.radius;
  const offset = circumference * (1 - percent);
  const tone = toneFor(points);
  const center = dims.viewBox / 2;

  return (
    <span
      role="status"
      aria-label={`${points} de ${META} puntos del día`}
      className={`relative inline-grid shrink-0 place-items-center ${dims.box}`}
    >
      <svg
        viewBox={`0 0 ${dims.viewBox} ${dims.viewBox}`}
        className={`-rotate-90 transition-[filter] duration-500 ${dims.box} ${tone.glow}`}
      >
        {/* Riel de fondo: apenas visible, marca el círculo completo como referencia. */}
        <circle
          cx={center}
          cy={center}
          r={dims.radius}
          fill="none"
          strokeWidth={dims.stroke}
          className="stroke-white/10"
        />
        <circle
          cx={center}
          cy={center}
          r={dims.radius}
          fill="none"
          strokeWidth={dims.stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className={`transition-[stroke,stroke-dashoffset] duration-700 ease-out ${tone.stroke}`}
        />
      </svg>

      {/*
        "0/25" completo y no sólo el número: un anillo en 0 sin la meta a la
        vista es indistinguible de un anillo roto — el "/25" es lo que dice
        "esto es un contador, no un ícono que no cargó".
      */}
      <span
        className={`absolute font-bold leading-none tabular-nums transition-colors
                    duration-500 ${dims.text} ${tone.text}`}
      >
        {points}/{META}
      </span>
    </span>
  );
}
