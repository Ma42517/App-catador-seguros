/**
 * Tarjeta cuadrada del hub, para cuadrícula de dos columnas.
 *
 * El ícono arriba y el texto abajo, con el espacio libre en medio. El
 * subtítulo reserva siempre la altura de dos líneas: sin eso, una tarjeta con
 * subtítulo de una sola línea sube su título y los deja desnivelados respecto
 * a la tarjeta de al lado.
 *
 * Conserva su aspecto oscuro y saturado en ambos temas, igual que el resto de
 * las piezas inmersivas.
 */
export default function SquareCard({
  title, subtitle, icon: Icon, gradient, glow, iconTone, onClick, badge, badgeLabel,
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group relative flex aspect-square w-full cursor-pointer flex-col
                  overflow-hidden rounded-3xl border border-white/10 p-4 text-left
                  transition-all duration-300 active:scale-95 focus-visible:outline-none
                  focus-visible:ring-2 focus-visible:ring-white/40 ${glow}`}
    >
      {/* Fondo vivo: el 200% de tamaño es lo que da recorrido al gradiente */}
      <div
        className={`absolute inset-0 bg-gradient-to-br bg-[length:200%_200%]
                    animate-gradient-shift ${gradient}`}
        aria-hidden="true"
      />

      {/* Realce al pasar el cursor o mantener pulsado */}
      <div
        className="absolute inset-0 transition-colors duration-300 group-hover:bg-white/[0.06]
                   group-active:bg-white/[0.09]"
        aria-hidden="true"
      />

      <div className="relative z-10 flex h-full flex-col">
        <div className="flex items-start justify-between">
          <span
            className={`grid h-10 w-10 place-items-center rounded-xl bg-white/10 backdrop-blur-sm
                        transition-transform duration-300 group-hover:scale-110 ${iconTone}`}
            aria-hidden="true"
          >
            <Icon size={20} strokeWidth={1.75} />
          </span>

          {/*
            El indicador va en el flujo, no en absoluto: así nunca se solapa
            con el ícono ni se sale del recorte de la tarjeta.
          */}
          {badge && (
            <span
              role="status"
              aria-label={badgeLabel}
              className="grid h-5 min-w-[1.25rem] animate-pulse place-items-center rounded-full
                         bg-rose-500 px-1 text-[10px] font-bold leading-none text-white
                         shadow-lg shadow-rose-500/40"
            >
              {badge}
            </span>
          )}
        </div>

        <div className="flex-grow" />

        <div>
          <p className="mb-1 text-sm font-bold leading-tight text-white">{title}</p>
          <p className="line-clamp-2 min-h-[2.5em] text-[10px] leading-tight text-white/60">
            {subtitle}
          </p>
        </div>
      </div>
    </button>
  );
}
