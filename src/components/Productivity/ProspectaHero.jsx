import { ChevronRight } from 'lucide-react';

/**
 * Banner principal del hub: acceso a Prospecta.
 *
 * Paleta neutra a propósito —negro con filo claro y letra en degradado de
 * blanco a gris—: sin color de acento, la pieza se lee como material noble en
 * lugar de como un botón más de la interfaz.
 *
 * Es más alto que las tarjetas de abajo para que funcione como cabecera, y
 * mantiene su aspecto oscuro en ambos temas.
 */
export default function ProspectaHero({ onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Abrir Prospecta"
      className="group relative h-28 w-full cursor-pointer overflow-hidden rounded-[1.75rem]
                 border border-white/15 bg-gradient-to-br from-zinc-800 via-zinc-950 to-black
                 shadow-2xl transition-all duration-300 active:scale-95
                 hover:border-white/30 hover:shadow-[0_0_40px_rgba(255,255,255,0.12)]
                 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
    >
      {/*
        Resplandores neutros a la deriva, desfasados entre sí para que el
        movimiento no se sienta cíclico. Son luz, no formas.
      */}
      <span
        className="pointer-events-none absolute -left-12 -top-12 h-52 w-52 animate-orb-drift
                   rounded-full bg-white/[0.07] blur-3xl"
        aria-hidden="true"
      />
      <span
        className="pointer-events-none absolute -bottom-16 -right-8 h-48 w-48 animate-orb-drift
                   rounded-full bg-zinc-400/10 blur-3xl [animation-delay:-7s]"
        aria-hidden="true"
      />

      {/* Filo superior iluminado: le da canto al negro */}
      <span
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r
                   from-transparent via-white/25 to-transparent"
        aria-hidden="true"
      />

      <div className="relative z-10 flex h-full items-center justify-center px-6">
        <h2
          className="bg-gradient-to-r from-white via-zinc-200 to-zinc-400 bg-clip-text text-3xl
                     font-extrabold uppercase tracking-widest text-transparent md:text-4xl"
          // El resplandor va como filtro: con el texto en transparente y el
          // relleno recortado del fondo, un text-shadow no se vería.
          style={{ filter: 'drop-shadow(0 0 14px rgba(255,255,255,0.3))' }}
        >
          Prospecta
        </h2>
      </div>

      <ChevronRight
        size={16}
        className="absolute bottom-3.5 right-5 z-10 text-white/25 transition-transform
                   duration-300 group-hover:translate-x-0.5 group-hover:text-white/55"
        aria-hidden="true"
      />
    </button>
  );
}
