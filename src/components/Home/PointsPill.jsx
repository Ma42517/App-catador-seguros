/**
 * src/components/Home/PointsPill.jsx
 *
 * Ancla visual del "Tracker de 25 Puntos". Sólo lectura: no hay botones, no
 * suma nada por su cuenta — refleja `puntosActuales`, que calculará en algún
 * otro lugar la lógica de producto todavía por construir. El día que exista
 * ese cálculo (o un `useProductivity()` real), esta pieza no cambia: sólo
 * cambia quién le pasa el número.
 */

const META = 25;

/*
  Tres tonos por rango, y no una interpolación continua: la meta es un umbral
  binario (se llegó o no), no una escala — un degradado continuo diluiría el
  momento en que se cumplen los 25 puntos, que es justo lo que este color
  tiene que anunciar.
*/
function toneFor(points) {
  if (points >= META) {
    return {
      wrap: 'border-emerald-400/30 bg-emerald-500/10',
      text: 'text-emerald-300',
      flame: 'text-emerald-300',
    };
  }
  if (points >= 10) {
    return {
      wrap: 'border-amber-400/25 bg-amber-500/10',
      text: 'text-amber-300',
      flame: 'text-amber-400',
    };
  }
  return {
    wrap: 'border-white/10 bg-white/[0.04]',
    text: 'text-zinc-400',
    flame: 'text-zinc-500',
  };
}

/**
 * @param {number} puntosActuales - Puntos ya calculados en el fondo. Por ahora
 *   se recibe como prop; cuando exista el contexto de productividad real, el
 *   único cambio es leerlo de ahí en el componente que llama a esta píldora.
 */
export default function PointsPill({ puntosActuales = 0 }) {
  const points = Math.max(0, Math.min(puntosActuales, META));
  const tone = toneFor(points);

  return (
    <div
      role="status"
      aria-label={`${points} de ${META} puntos del día`}
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1
                  text-xs font-semibold tabular-nums backdrop-blur-md
                  transition-colors duration-500 ${tone.wrap} ${tone.text}`}
    >
      <span aria-hidden="true" className={tone.flame}>🔥</span>
      {points}/{META} pts
    </div>
  );
}
