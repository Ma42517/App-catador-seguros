/**
 * src/components/Activities/CircleActionButton.jsx
 *
 * Botón de acción circular de las tarjetas del embudo. Cada tarjeta lo
 * repetía con la misma cadena de 6 clases de Tailwind y la misma lógica de
 * "deshabilitado pero visible", así que un cambio de tamaño o de tono
 * obligaba a editar seis archivos y a esperar que ninguno se quedara atrás.
 *
 * ## `href` no es un detalle de estilo
 * Cuando se pasa `href`, se dibuja un `<a target="_blank">` real y no un
 * `<button>` con `window.open`: en computadora los navegadores bloquean en
 * silencio un `window.open` que no venga de un enlace de verdad —el botón
 * parecía "no hacer nada"—, aunque en celular casi siempre lo dejaban
 * pasar. Es un bug que ya se reportó y se corrigió a mano en
 * `CallActivityCard.jsx` e `InitialMeetingCard.jsx`; centralizarlo aquí es
 * lo que evita que vuelva a colarse en la próxima tarjeta que alguien
 * escriba.
 *
 * ## Deshabilitado
 * Un botón sin dato (teléfono vacío) se dibuja atenuado y sin acción, no se
 * deja de dibujar: la acción existe, sólo le falta el dato — a diferencia
 * de los botones que no tienen absolutamente nada que abrir (ubicación sin
 * dirección), que sus tarjetas omiten por completo.
 */

/** Tonos disponibles; el fondo siempre al 10% para que el ícono mande. */
const TONES = {
  emerald: 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20',
  indigo: 'bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20',
  sky: 'bg-sky-500/10 text-sky-400 hover:bg-sky-500/20',
  amber: 'bg-amber-500/10 text-amber-400 hover:bg-amber-500/20',
  slate: 'bg-slate-500/10 text-slate-300 hover:bg-slate-500/20',
};

const BASE = 'grid h-10 w-10 shrink-0 place-items-center rounded-full transition-colors '
  + 'active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500';

export default function CircleActionButton({
  icon: Icon, label, tone = 'indigo', href, onClick, disabled = false, children,
}) {
  const toneClass = TONES[tone] ?? TONES.indigo;
  const className = `${BASE} ${toneClass} ${disabled ? 'cursor-not-allowed opacity-30' : ''}`;

  // `children` deja pasar un glifo propio (el logo de WhatsApp, que
  // `lucide-react` no trae); `icon` cubre el caso normal.
  const content = children ?? (Icon ? <Icon size={16} aria-hidden="true" /> : null);

  if (href !== undefined) {
    return (
      <a
        href={disabled ? undefined : href}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={label}
        aria-disabled={disabled}
        onClick={(e) => { if (disabled) e.preventDefault(); }}
        className={className}
      >
        {content}
      </a>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className={className}
    >
      {content}
    </button>
  );
}
