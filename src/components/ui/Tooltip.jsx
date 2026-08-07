import { useState } from 'react';
import { HelpCircle } from 'lucide-react';

/**
 * Ayuda contextual. Funciona con hover en escritorio y con tap en móvil,
 * por eso el estado es explícito y no depende sólo de :hover.
 */
export default function Tooltip({ text, children }) {
  const [open, setOpen] = useState(false);

  return (
    <span className="relative inline-flex">
      <button
        type="button"
        aria-label="Más información"
        onClick={(e) => { e.preventDefault(); setOpen((v) => !v); }}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onBlur={() => setOpen(false)}
        className="text-slate-400 transition-colors hover:text-slate-600"
      >
        {children || <HelpCircle size={13} />}
      </button>
      {open && (
        <span
          role="tooltip"
          className="absolute bottom-full left-1/2 z-50 mb-1.5 w-56 -translate-x-1/2 rounded-lg bg-slate-900 px-3 py-2 text-[11px] font-normal leading-relaxed text-white shadow-xl"
        >
          {text}
        </span>
      )}
    </span>
  );
}
