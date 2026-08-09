import { ChevronRight } from 'lucide-react';

/**
 * Tarjeta del mosaico del hub, en cristal translúcido.
 *
 * El color ya no llena el fondo: cada destino se distingue por un acento —el
 * ícono teñido, su resplandor y un halo difuso detrás—. Con seis tarjetas de
 * fondo saturado la pantalla competía consigo misma; con el mismo cristal en
 * todas, lo que distingue es el acento y el conjunto se lee como una sola pieza.
 *
 * La forma cambia con el ancho, no sólo el tamaño:
 *  - En celular es una fila horizontal compacta. Una lista vertical de tarjetas
 *    cuadradas obligaría a recorrer tres pantallas para ver cuatro destinos.
 *  - Desde tableta se despliega en vertical y ocupa su celda del mosaico, con
 *    el texto abajo y el ícono arriba.
 */
export default function BentoCard({
  title, subtitle, icon: Icon, accent, span = 1, badge, badgeLabel, onClick,
}) {
  const isWide = span === 'full';

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={title}
      className={`group relative overflow-hidden rounded-3xl border border-white/10
                  bg-zinc-900/50 p-4 text-left backdrop-blur-md transition-all duration-300
                  hover:border-white/20 hover:bg-zinc-900/70 active:scale-[0.98]
                  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40
                  md:p-5
                  ${isWide ? 'col-span-full' : ''}
                  ${span === 2 ? 'md:col-span-2' : ''}
                  ${isWide ? 'md:min-h-0' : 'md:min-h-[12.5rem]'}`}
    >
      {/*
        Halo de acento. Va detrás del ícono y desenfocado: es lo que da color a
        la tarjeta sin teñir el cristal, y lo que el desenfoque del fondo tiene
        que recoger para que el efecto se note.
      */}
      <span
        className={`pointer-events-none absolute -left-8 -top-10 h-36 w-36 rounded-full
                    blur-3xl transition-opacity duration-300 group-hover:opacity-100
                    opacity-70 ${accent.halo}`}
        aria-hidden="true"
      />

      {/* Filo superior iluminado: le da canto al cristal */}
      <span
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r
                   from-transparent via-white/20 to-transparent"
        aria-hidden="true"
      />

      <div
        className={`relative flex h-full items-center gap-4
                    ${isWide ? '' : 'md:flex-col md:items-start md:gap-0'}`}
      >
        <span className="relative shrink-0">
          <span
            className={`grid h-12 w-12 place-items-center rounded-full bg-white/10
                        ring-1 ring-white/15 transition-transform duration-300
                        group-hover:scale-105 ${accent.icon} ${accent.glow}`}
            aria-hidden="true"
          >
            <Icon size={24} strokeWidth={1.9} />
          </span>

          {badge ? (
            <span
              className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center
                         rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white
                         ring-2 ring-zinc-900"
            >
              {badge}
              <span className="sr-only">{badgeLabel ?? `${badge} nuevos`}</span>
            </span>
          ) : null}
        </span>

        {/*
          `flex-1` sirve en celular, donde el texto va a la derecha del ícono y
          debe ocupar el resto de la fila. En el mosaico hay que anularlo: con
          `flex-1` el bloque crece hasta el fondo y el texto se queda pegado
          arriba, con un hueco muerto debajo. Sin él, `mt-auto` sí lo baja al pie.
        */}
        <span className={`min-w-0 flex-1 ${isWide ? '' : 'md:mt-auto md:flex-none md:pt-6'}`}>
          <span className="block truncate text-lg font-semibold leading-tight text-white">
            {title}
          </span>
          <span className="mt-0.5 block text-sm leading-snug text-zinc-400 md:line-clamp-2">
            {subtitle}
          </span>
        </span>

        <ChevronRight
          size={18}
          className={`shrink-0 text-white/25 transition-all duration-300
                      group-hover:translate-x-0.5 group-hover:text-white/60
                      ${isWide ? '' : 'md:absolute md:right-0 md:top-1'}`}
          aria-hidden="true"
        />
      </div>
    </button>
  );
}
