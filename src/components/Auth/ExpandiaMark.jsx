/**
 * src/components/Auth/ExpandiaMark.jsx
 *
 * Wordmark de EXPANDIA en la letra manuscrita de la marca (Caveat, `font-hand`),
 * la misma cursiva cálida que firma el resto de la app. "Expandia" se escribe de
 * corrido, como una firma, sin la antigua chispa sobre la "i": en una cursiva
 * manuscrita ese truco quedaba forzado, y la firma limpia comunica mejor la
 * calidez buscada. El color de la letra cambia con el tema elegido:
 *
 *   negro  → letra crema   (versión nocturna)
 *   blanco → letra carbón  (versión monocromo)
 *   crema  → letra navy    (versión editorial)
 */

/** Color de la letra por tema, tomado del manual de identidad. */
const MARK_COLORS = {
  dark: { text: '#F5EFE6' },
  light: { text: '#0F172A' },
  cream: { text: '#0B1A30' },
};

export default function ExpandiaMark({ theme = 'dark', className = '', size = 'text-5xl' }) {
  const c = MARK_COLORS[theme] ?? MARK_COLORS.dark;

  return (
    <span
      className={`inline-flex items-baseline font-hand leading-none tracking-tight ${size} ${className}`}
      style={{ color: c.text }}
      aria-label="Expandia"
      role="img"
    >
      Expandia
    </span>
  );
}
