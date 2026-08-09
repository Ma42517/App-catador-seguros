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
        className="text-zinc-500 transition-colors hover:text-indigo-400"
      >
        {children || <HelpCircle size={13} />}
      </button>
      {open && (
        <span
          role="tooltip"
          className="animate-rise absolute bottom-full left-1/2 z-50 mb-2 w-60 -tranzinc-x-1/2
                     rounded-xl border border-zinc-700 bg-zinc-900/95 px-3 py-2.5 text-[11px]
                     font-normal normal-case leading-relaxed tracking-normal text-zinc-300
                     shadow-2xl shadow-zinc-950/80 backdrop-blur"
        >
          {text}
        </span>
      )}
    </span>
  );
}
