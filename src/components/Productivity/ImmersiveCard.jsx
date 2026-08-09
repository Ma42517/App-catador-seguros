import { ChevronRight } from 'lucide-react';

/**
 * Tarjeta ancha de navegación con fondo vivo.
 *
 * Conserva su aspecto oscuro y saturado en ambos temas, igual que las portadas
 * de Apple Music o Fitness: son piezas protagonistas, y aclararlas en tema
 * claro las dejaría lavadas y sin la profundidad que las hace atractivas.
 */
export default function ImmersiveCard({
  title, subtitle, value, icon: Icon, gradient, glow, iconTone, onClick,
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group relative h-32 w-full cursor-pointer overflow-hidden rounded-3xl
                  border border-white/10 transition-all duration-300 active:scale-95
                  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40
                  ${glow}`}
    >
      {/*
        Fondo animado. `bg-[length:200%_200%]` es lo que da recorrido al
        gradiente: sin sobredimensionarlo, animar la posición no movería nada.
      */}
      <div
        className={`absolute inset-0 bg-gradient-to-br bg-[length:200%_200%]
                    animate-gradient-shift ${gradient}`}
        aria-hidden="true"
      />

      {/* Realce al pasar el cursor o mantener pulsado */}
      <div
        className="absolute inset-0 bg-white/0 transition-colors duration-300
                   group-hover:bg-white/[0.06] group-active:bg-white/[0.09]"
        aria-hidden="true"
      />

      <div className="relative z-10 flex h-full flex-col justify-center p-6 pr-20 text-left">
        <p className="text-base font-bold leading-tight text-white">{title}</p>

        {value && (
          <p className="mt-1 text-2xl font-bold tabular-nums text-white">{value}</p>
        )}

        <p className="mt-1 text-xs leading-snug text-white/60">{subtitle}</p>
      </div>

      {/* Ícono flotante a la derecha */}
      {Icon && (
        <span
          className={`absolute right-6 top-1/2 z-10 -translate-y-1/2 transition-transform
                      duration-300 group-hover:scale-110 ${iconTone}`}
          aria-hidden="true"
        >
          <Icon size={34} strokeWidth={1.5} />
        </span>
      )}

      <ChevronRight
        size={16}
        className="absolute bottom-5 right-6 z-10 text-white/30 transition-transform
                   duration-300 group-hover:translate-x-0.5 group-hover:text-white/60"
        aria-hidden="true"
      />
    </button>
  );
}
