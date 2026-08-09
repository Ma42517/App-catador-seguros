import { ChevronRight } from 'lucide-react';

/**
 * Tarjeta del hub, en estilo claro.
 *
 * Blanca sobre fondo gris muy claro, con esquinas muy redondeadas y una sombra
 * difusa. El color ya no llena el fondo: cada destino se reconoce por su visual
 * animado, que llega como `visual` en lugar de un ícono.
 *
 * Al interactuar la tarjeta flota: sube dos píxeles y su sombra crece. Sube en
 * lugar de oscurecerse porque la sombra es lo único que la separa del fondo, y
 * agrandarla es lo que da la sensación de que se despega.
 *
 * La forma cambia con el ancho, no sólo el tamaño:
 *  - En celular es una fila horizontal compacta. Una lista vertical de tarjetas
 *    cuadradas obligaría a recorrer tres pantallas para ver cuatro destinos.
 *  - Desde tableta se despliega en vertical y ocupa su celda del mosaico, con
 *    el texto abajo y el visual arriba.
 */
export default function BentoCard({
  title, subtitle, visual, span = 1, badge, badgeLabel, onClick,
}) {
  const isWide = span === 'full';

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={title}
      className={`group relative overflow-hidden rounded-3xl border border-zinc-100 bg-white
                  p-4 text-left shadow-lg shadow-zinc-200/50 transition-all duration-300
                  hover:-translate-y-2 hover:shadow-xl hover:shadow-zinc-300/50
                  active:translate-y-0 active:shadow-md
                  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400
                  md:p-5
                  ${isWide ? 'col-span-full' : ''}
                  ${span === 2 ? 'md:col-span-2' : ''}
                  ${isWide ? 'md:min-h-0' : 'md:min-h-[12.5rem]'}`}
    >
      <div
        className={`relative flex h-full items-center gap-4
                    ${isWide ? '' : 'md:flex-col md:items-start md:gap-0'}`}
      >
        <span className="relative shrink-0">
          {visual}

          {badge ? (
            <span
              className="absolute -right-1.5 -top-1.5 grid h-5 min-w-5 place-items-center
                         rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white
                         ring-2 ring-white"
            >
              {badge}
              <span className="sr-only">{badgeLabel ?? `${badge} nuevos`}</span>
            </span>
          ) : null}
        </span>

        {/*
          `flex-1` sirve en celular, donde el texto va a la derecha del visual y
          debe ocupar el resto de la fila. En el mosaico hay que anularlo: con
          `flex-1` el bloque crece hasta el fondo y el texto se queda pegado
          arriba, con un hueco muerto debajo. Sin él, `mt-auto` sí lo baja al pie.
        */}
        <span className={`min-w-0 flex-1 ${isWide ? '' : 'md:mt-auto md:flex-none md:pt-6'}`}>
          <span className="block truncate text-lg font-semibold leading-tight text-zinc-800">
            {title}
          </span>
          <span className="mt-0.5 block text-sm leading-snug text-zinc-500 md:line-clamp-2">
            {subtitle}
          </span>
        </span>

        <ChevronRight
          size={18}
          className={`shrink-0 text-zinc-300 transition-all duration-300
                      group-hover:translate-x-0.5 group-hover:text-zinc-500
                      ${isWide ? '' : 'md:absolute md:right-0 md:top-1'}`}
          aria-hidden="true"
        />
      </div>
    </button>
  );
}
