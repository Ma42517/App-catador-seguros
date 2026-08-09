/**
 * Tarjeta-logo de la aplicación: recuadro negro con el wordmark PROSPECTA
 * ocupando todo el ancho.
 *
 * El texto se dibuja en SVG con `textLength` + `lengthAdjust`, que fuerza a la
 * palabra a medir exactamente el ancho disponible. Con tipografía normal el
 * ancho depende de la fuente cargada y del tamaño de pantalla, así que las
 * letras nunca llenarían el rectángulo de forma consistente.
 *
 * Sobre fondo negro un recuadro negro sería invisible, por eso lleva borde
 * claro, un halo interior y una veladura superior que lo despegan del fondo.
 */
export default function BrandCard({ onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Abrir Prospecta"
      className="group relative h-32 w-full overflow-hidden rounded-3xl border border-white/15
                 bg-black shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08)]
                 transition-all duration-300 active:scale-95
                 hover:border-white/25 hover:shadow-[0_0_34px_rgba(167,139,250,0.35)]
                 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
    >
      {/* Veladura superior: da volumen al recuadro sin aclarar el negro */}
      <div
        className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/[0.07]
                   via-transparent to-transparent"
        aria-hidden="true"
      />

      {/* Halo tenue detrás de las letras */}
      <div
        className="pointer-events-none absolute inset-0 opacity-70 transition-opacity
                   duration-500 group-hover:opacity-100"
        style={{
          background:
            'radial-gradient(ellipse 70% 55% at 50% 50%, rgba(167,139,250,0.18), transparent 70%)',
        }}
        aria-hidden="true"
      />

      <div className="relative z-10 flex h-full items-center px-3 py-3">
        {/*
          El wordmark tiene proporción natural ≈5:1 y el recuadro ≈3:1, así que
          llenar ambos ejes obliga a estirar la letra. Con `none` y un viewBox
          de ≈4.3:1 el texto ocupa casi todo el rectángulo con un estiramiento
          vertical de ~30%, que en un peso 900 se lee como tipografía display
          extendida y no como deformación.
        */}
        <svg
          viewBox="0 0 1000 230"
          preserveAspectRatio="none"
          className="h-full w-full animate-breathe"
          role="img"
          aria-label="Prospecta"
        >
          <text
            x="500"
            y="196"
            textAnchor="middle"
            textLength="975"
            lengthAdjust="spacingAndGlyphs"
            className="fill-white"
            style={{
              fontSize: '250px',
              fontWeight: 900,
              letterSpacing: '-0.01em',
              // Brillo tenue: dos capas, una cercana y una difusa.
              filter:
                'drop-shadow(0 0 6px rgba(255,255,255,0.45)) '
                + 'drop-shadow(0 0 22px rgba(167,139,250,0.55))',
            }}
          >
            PROSPECTA
          </text>
        </svg>
      </div>
    </button>
  );
}
