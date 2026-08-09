const VARIANTS = {
  primary:
    'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30 hover:bg-indigo-500 ' +
    'hover:shadow-indigo-600/45 active:bg-indigo-700',
  secondary:
    'border border-zinc-800 bg-zinc-900/70 text-zinc-300 hover:border-zinc-700 ' +
    'hover:bg-zinc-800/70 hover:text-zinc-100',
  outline:
    'border border-zinc-800 bg-zinc-900/40 text-zinc-300 hover:border-indigo-500/50 ' +
    'hover:bg-zinc-800/70 hover:text-zinc-100',
  success:
    'bg-emerald-500 text-zinc-950 shadow-lg shadow-emerald-500/25 hover:bg-emerald-400 ' +
    'hover:shadow-emerald-500/40',
  danger:
    'border border-rose-500/30 bg-rose-500/10 text-rose-300 hover:bg-rose-500/20 hover:text-rose-200',
  ghost:
    'text-zinc-400 hover:bg-zinc-800/70 hover:text-zinc-100',
};

const SIZES = {
  sm: 'px-2.5 py-1.5 text-xs gap-1.5 rounded-lg',
  md: 'px-4 py-2 text-xs gap-1.5 rounded-xl sm:text-sm',
  lg: 'px-5 py-2.5 text-sm gap-2 rounded-xl',
};

export default function Button({
  children, onClick, variant = 'primary', size = 'md', icon: Icon,
  iconRight: IconRight, disabled, type = 'button', className = '', full = false,
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center justify-center font-semibold transition-all duration-150
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500
        disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none
        ${VARIANTS[variant]} ${SIZES[size]} ${full ? 'w-full' : ''} ${className}`}
    >
      {Icon && <Icon size={size === 'sm' ? 13 : 15} className="shrink-0" />}
      {children}
      {IconRight && <IconRight size={size === 'sm' ? 13 : 15} className="shrink-0" />}
    </button>
  );
}

/** Botón de acción sobre una fila (eliminar, duplicar). */
export function IconButton({ icon: Icon, onClick, label, tone = 'ghost' }) {
  const tones = {
    ghost: 'text-zinc-500 hover:bg-zinc-700/60 hover:text-zinc-200',
    danger: 'text-zinc-500 hover:bg-rose-500/15 hover:text-rose-400',
  };
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={`grid h-7 w-7 shrink-0 place-items-center rounded-lg transition-colors
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50 ${tones[tone]}`}
    >
      <Icon size={14} />
    </button>
  );
}
