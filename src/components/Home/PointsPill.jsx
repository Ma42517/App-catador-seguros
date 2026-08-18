/**
 * src/components/Home/PointsPill.jsx
 *
 * Ancla visual del "Tracker de 25 Puntos". Sólo lectura: no hay botones, no
 * suma nada por su cuenta — refleja `puntosActuales`, que calculará en algún
 * otro lugar la lógica de producto todavía por construir. El día que exista
 * ese cálculo (o un `useProductivity()` real), esta pieza no cambia: sólo
 * cambia quién le pasa el número.
 *
 * Tipografía tipo "stat" de app deportiva (Nike Run Club): el número manda,
 * grande y condensado; la meta y la etiqueta van chicas y en mayúsculas
 * separadas, como unidad de medida y no como parte del número. Nada de
 * emoji — el punto de color hace ese trabajo con menos ruido visual.
 */

const META = 25;

/*
  El punto es siempre negro relleno — es la base fija del indicador, no la
  parte que reacciona. Sólo el número cambia de tono por tramo, y en tres
  pasos y no una interpolación continua: la meta es un umbral binario (se
  llegó o no), y un degradado continuo diluiría el momento exacto en que se
  cumplen los 25 puntos.
*/
function toneFor(points) {
  if (points >= META) return 'text-emerald-400';
  if (points >= 10) return 'text-orange-400';
  return 'text-zinc-500';
}

/**
 * @param {number} puntosActuales - Puntos ya calculados en el fondo. Por ahora
 *   se recibe como prop; cuando exista el contexto de productividad real, el
 *   único cambio es leerlo de ahí en el componente que llama a esta píldora.
 */
export default function PointsPill({ puntosActuales = 0 }) {
  const points = Math.max(0, Math.min(puntosActuales, META));
  const numberTone = toneFor(points);

  return (
    <div
      role="status"
      aria-label={`${points} de ${META} puntos del día`}
      className="inline-flex items-center gap-2 rounded-full border border-white/10
                 bg-black/40 py-1 pl-1 pr-3 backdrop-blur-md"
    >
      {/* El círculo: relleno negro sólido, sin brillo ni anillo. Es la marca fija del indicador. */}
      <span aria-hidden="true" className="h-5 w-5 shrink-0 rounded-full bg-black" />
      <span className="flex items-baseline gap-1 font-black leading-none tracking-tight">
        <span className={`text-base tabular-nums transition-colors duration-500 ${numberTone}`}>
          {points}
        </span>
        <span className="text-[11px] font-bold tabular-nums text-zinc-500">/{META}</span>
        <span className="ml-0.5 text-[9px] font-bold uppercase tracking-widest text-zinc-500">
          pts
        </span>
      </span>
    </div>
  );
}
