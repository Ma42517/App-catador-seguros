import { ChevronRight } from 'lucide-react';

/**
 * Banner principal del hub: acceso a Prospecta.
 *
 * Es más alto y de esquinas más suaves que las tarjetas de abajo, para que lea
 * como cabecera y no como un elemento más de la lista. Mantiene su aspecto
 * oscuro en ambos temas, igual que el resto de las piezas inmersivas.
 */
export default function ProspectaHero({ onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Abrir Prospecta"
      className="group relative h-40 w-full cursor-pointer overflow-hidden rounded-[2rem]
                 border border-indigo-500/30 bg-gradient-to-br from-indigo-950 via-zinc-900
                 to-black shadow-2xl transition-all duration-300 active:scale-95
                 hover:border-indigo-400/50 hover:shadow-[0_0_44px_rgba(99,102,241,0.4)]
                 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/60"
    >
      {/*
        Dos resplandores borrosos a la deriva, desfasados entre sí, para que el
        movimiento no se sienta cíclico. `blur-3xl` los vuelve luz, no formas.
      */}
      <span
        className="pointer-events-none absolute -left-12 -top-12 h-52 w-52 animate-orb-drift
                   rounded-full bg-indigo-500/30 blur-3xl"
        aria-hidden="true"
      />
      <span
        className="pointer-events-none absolute -bottom-16 -right-8 h-48 w-48 animate-orb-drift
                   rounded-full bg-violet-600/25 blur-3xl [animation-delay:-7s]"
        aria-hidden="true"
      />

      <div className="relative z-10 flex h-full flex-col items-center justify-center px-6">
        <h2
          className="bg-gradient-to-r from-white to-indigo-200 bg-clip-text text-4xl
                     font-extrabold uppercase tracking-widest text-transparent md:text-5xl"
          // El resplandor va como filtro: con el texto en transparente y el
          // relleno recortado del fondo, un text-shadow no se vería.
          style={{ filter: 'drop-shadow(0 0 16px rgba(129,140,248,0.55))' }}
        >
          Prospecta
        </h2>

        <p
          className="mt-2 text-center text-[10px] uppercase leading-relaxed tracking-widest
                     text-indigo-400/80 sm:text-xs"
        >
          Asistente Inteligente de Prospección
        </p>
      </div>

      <ChevronRight
        size={18}
        className="absolute bottom-5 right-6 z-10 text-white/30 transition-transform
                   duration-300 group-hover:translate-x-0.5 group-hover:text-white/60"
        aria-hidden="true"
      />
    </button>
  );
}
