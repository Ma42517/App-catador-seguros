import { Users, CalendarCheck, FileCheck2, Percent } from 'lucide-react';

/**
 * Resumen del equipo.
 *
 * En móvil es una fila que se arrastra en horizontal y en escritorio una
 * cuadrícula. `snap-x` con `snap-start` en cada tarjeta es lo que hace que el
 * arrastre se detenga encajado en una tarjeta y no a media pieza, que es la
 * diferencia entre un carrusel y una fila que se desborda.
 *
 * `[&::-webkit-scrollbar]:hidden` quita la barra en móvil: ahí se arrastra con el
 * dedo y la barra sólo roba tres píxeles de alto a la tarjeta.
 */
export default function TeamStats({ total, pendingCount }) {
  /*
    Las tres primeras cifras son reales —salen de contar las filas que devolvió la
    consulta—. Las dos últimas no existen todavía en ninguna tabla, así que van
    con un guion en lugar de un número inventado.

    Un promotor mirando "38 citas del equipo" tomaría decisiones sobre una cifra
    que nadie calculó. El guion no informa, pero tampoco engaña, y deja el sitio
    reservado para cuando haya de dónde sacarlo.
  */
  const stats = [
    { key: 'total', label: 'Asesores', value: String(total), Icon: Users, real: true },
    {
      key: 'pending',
      label: 'Por aprobar',
      value: String(pendingCount),
      Icon: Users,
      real: true,
      highlight: pendingCount > 0,
    },
    { key: 'citas', label: 'Citas del equipo', value: '—', Icon: CalendarCheck, real: false },
    { key: 'polizas', label: 'Pólizas del mes', value: '—', Icon: FileCheck2, real: false },
    { key: 'cierre', label: 'Tasa de cierre', value: '—', Icon: Percent, real: false },
  ];

  return (
    <div className="mb-6">
      <div
        className="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-1
                   [scrollbar-width:none] [&::-webkit-scrollbar]:hidden
                   sm:grid sm:grid-cols-3 sm:snap-none sm:overflow-visible
                   lg:grid-cols-5"
      >
        {stats.map(({ key, label, value, Icon, real, highlight }) => (
          <div
            key={key}
            className={`min-w-[8.5rem] shrink-0 snap-start rounded-xl border p-3 sm:min-w-0
              ${highlight
                ? 'border-amber-500/40 bg-amber-500/10'
                : 'border-white/10 bg-[#1a1a1a]'}`}
          >
            <Icon
              size={15}
              strokeWidth={1.9}
              className={highlight ? 'text-amber-400' : 'text-indigo-400'}
              aria-hidden="true"
            />
            <p className={`mt-2 text-2xl font-bold leading-none tabular-nums
              ${real ? 'text-white' : 'text-zinc-600'}`}
            >
              {value}
            </p>
            <p className="mt-1 text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
              {label}
            </p>
          </div>
        ))}
      </div>

      <p className="mt-2 text-[11px] leading-relaxed text-zinc-600">
        Las cifras en gris todavía no existen en la base: las citas viven en el
        teléfono de cada asesor y de pólizas no hay tabla. El sitio ya está listo.
      </p>
    </div>
  );
}
