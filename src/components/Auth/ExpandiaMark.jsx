/**
 * src/components/Auth/ExpandiaMark.jsx
 *
 * Wordmark de EXPANDIA, fiel al manual de identidad: "Expandia" con la "i" sin
 * punto y, en su lugar, una CHISPA inclinada —el acento de la marca— que apunta
 * hacia arriba (crecimiento). El color de la letra y de la chispa cambia con el
 * tema elegido, igual que las cuatro versiones del logo del manual:
 *
 *   negro  → letra crema,  chispa cyan   (versión nocturna, con cyan por consistencia)
 *   blanco → letra carbón, chispa cyan   (versión monocromo)
 *   crema  → letra navy,   chispa azul   (versión editorial)
 *
 * Se arma con el texto en la tipografía de la app (redondeada, como el manual) más
 * la chispa en SVG absolutamente posicionada sobre el hueco de la "i": recrear la
 * tipografía como paths sería frágil y perdería nitidez al escalar, mientras que la
 * fuente ya instalada da el mismo trazo redondo a cualquier tamaño.
 */

/** Colores de letra y chispa por tema, tomados del manual de identidad. */
const MARK_COLORS = {
  dark: { text: '#F5EFE6', spark: '#38BDF8' },
  light: { text: '#0F172A', spark: '#38BDF8' },
  cream: { text: '#0B1A30', spark: '#2563EB' },
};

export default function ExpandiaMark({ theme = 'dark', className = '', size = 'text-5xl' }) {
  const c = MARK_COLORS[theme] ?? MARK_COLORS.dark;

  return (
    <span
      className={`relative inline-flex items-start font-black tracking-tight ${size} ${className}`}
      style={{ color: c.text }}
      aria-label="Expandia"
      role="img"
    >
      {/* "Expand" + "a", con un hueco donde va la "i" sin punto. */}
      <span aria-hidden="true">Expand</span>
      {/* La "i" sin punto: sólo el asta. La chispa la pone el SVG de encima. */}
      <span aria-hidden="true" className="relative mx-[0.03em]">
        ı
        {/* Chispa inclinada sobre el asta, en lugar del punto de la i. */}
        <svg
          viewBox="0 0 24 36"
          className="absolute -top-[0.42em] left-1/2 h-[0.5em] w-[0.34em] -translate-x-1/2"
          aria-hidden="true"
        >
          <path
            d="M20 2 L8 20 Q6 23 9 24 L16 26 Q19 27 18 23 Z"
            fill={c.spark}
          />
        </svg>
      </span>
      <span aria-hidden="true">a</span>
    </span>
  );
}
