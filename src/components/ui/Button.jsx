const VARIANTS = {
  primary: 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm',
  secondary: 'bg-slate-100 text-slate-700 hover:bg-slate-200',
  outline: 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50',
  success: 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm',
  danger: 'bg-red-50 text-red-600 hover:bg-red-100',
  ghost: 'text-slate-500 hover:bg-slate-100 hover:text-slate-700',
};

const SIZES = {
  sm: 'px-2.5 py-1.5 text-xs gap-1',
  md: 'px-4 py-2 text-sm gap-1.5',
  lg: 'px-5 py-2.5 text-sm gap-2',
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
      className={`inline-flex items-center justify-center rounded-lg font-medium transition-colors
        disabled:cursor-not-allowed disabled:opacity-40
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
    ghost: 'text-slate-400 hover:bg-slate-100 hover:text-slate-600',
    danger: 'text-slate-400 hover:bg-red-50 hover:text-red-600',
  };
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={`grid h-7 w-7 shrink-0 place-items-center rounded-md transition-colors ${tones[tone]}`}
    >
      <Icon size={14} />
    </button>
  );
}
