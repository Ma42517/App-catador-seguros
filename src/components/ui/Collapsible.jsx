import { useState } from 'react';
import { ChevronDown } from 'lucide-react';

export default function Collapsible({
  title, subtitle, icon: Icon, children, defaultOpen = false, badge,
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="surface overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-zinc-700/30"
      >
        {Icon && (
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl border border-zinc-700/60 bg-zinc-900/60 text-indigo-400">
            <Icon size={15} />
          </span>
        )}
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold text-zinc-100">{title}</span>
          {subtitle && (
            <span className="mt-0.5 block truncate text-[11px] text-zinc-500">{subtitle}</span>
          )}
        </span>
        {badge}
        <ChevronDown
          size={16}
          className={`shrink-0 text-zinc-500 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </button>
      {open && (
        <div className="animate-rise border-t border-zinc-700/50 p-4">{children}</div>
      )}
    </div>
  );
}
