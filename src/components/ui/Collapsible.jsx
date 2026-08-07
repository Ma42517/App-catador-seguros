import { useState } from 'react';
import { ChevronDown } from 'lucide-react';

export default function Collapsible({
  title, subtitle, icon: Icon, children, defaultOpen = false, badge,
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-slate-50"
      >
        {Icon && <Icon size={16} className="shrink-0 text-slate-400" />}
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold text-slate-800">{title}</span>
          {subtitle && (
            <span className="block truncate text-[11px] text-slate-400">{subtitle}</span>
          )}
        </span>
        {badge}
        <ChevronDown
          size={16}
          className={`shrink-0 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>
      {open && (
        <div className="border-t border-slate-100 p-4">{children}</div>
      )}
    </div>
  );
}
