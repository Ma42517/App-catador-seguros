import { useState, useEffect, useId } from 'react';
import Tooltip from './Tooltip';

const baseInput =
  'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 ' +
  'placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 ' +
  'focus:ring-blue-500/20 disabled:bg-slate-50 disabled:text-slate-500';

/** Etiqueta + ayuda contextual + control. */
export function Field({ label, hint, help, children, className = '' }) {
  return (
    <label className={`block ${className}`}>
      {label && (
        <span className="mb-1 flex items-center gap-1 text-xs font-medium text-slate-600">
          {label}
          {help && <Tooltip text={help} />}
        </span>
      )}
      {children}
      {hint && <span className="mt-1 block text-[11px] text-slate-400">{hint}</span>}
    </label>
  );
}

export function TextInput({ value, onChange, placeholder, className = '', ...rest }) {
  return (
    <input
      type="text"
      value={value ?? ''}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      className={`${baseInput} ${className}`}
      {...rest}
    />
  );
}

export function Select({ value, onChange, options, className = '', ...rest }) {
  return (
    <select
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value)}
      className={`${baseInput} ${className}`}
      {...rest}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  );
}


/**
 * Entrada numérica con borrador local: permite vaciar el campo mientras se
 * escribe sin emitir NaN. Siempre notifica un número finito hacia arriba.
 */
export function NumberInput({
  value, onChange, prefix, suffix, min = 0, max, step = 'any',
  placeholder = '0', className = '', ...rest
}) {
  const [draft, setDraft] = useState(() => (value === 0 ? '' : String(value ?? '')));

  // Resincroniza cuando el valor externo cambia (demo, reset, escenario).
  useEffect(() => {
    const parsed = parseFloat(draft);
    const current = Number.isFinite(parsed) ? parsed : 0;
    if (current !== (value ?? 0)) {
      setDraft(value === 0 || value === null || value === undefined ? '' : String(value));
    }
    // Sólo debe reaccionar al valor externo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const commit = (raw) => {
    setDraft(raw);
    if (raw === '' || raw === '-') { onChange(0); return; }
    const parsed = parseFloat(raw);
    if (!Number.isFinite(parsed)) return;
    let next = parsed;
    if (min !== undefined && next < min) next = min;
    if (max !== undefined && next > max) next = max;
    onChange(next);
  };

  return (
    <div className="relative">
      {prefix && (
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">
          {prefix}
        </span>
      )}
      <input
        type="number"
        inputMode="decimal"
        value={draft}
        step={step}
        placeholder={placeholder}
        onChange={(e) => commit(e.target.value)}
        onBlur={() => { if (draft === '') setDraft(''); }}
        className={`${baseInput} ${prefix ? 'pl-7' : ''} ${suffix ? 'pr-9' : ''} ${className}`}
        {...rest}
      />
      {suffix && (
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">
          {suffix}
        </span>
      )}
    </div>
  );
}


/** Monto en pesos. */
export function MoneyInput(props) {
  return <NumberInput prefix="$" step="100" {...props} />;
}

/**
 * Porcentaje editable. El estado se guarda como decimal (0.085) pero el
 * usuario escribe en puntos porcentuales (8.5).
 */
export function PercentInput({ value, onChange, ...rest }) {
  return (
    <NumberInput
      value={Math.round((value ?? 0) * 1000) / 10}
      onChange={(v) => onChange(v / 100)}
      suffix="%"
      step="0.1"
      min={-100}
      {...rest}
    />
  );
}

export function Checkbox({ checked, onChange, label, help }) {
  const id = useId();
  return (
    <div className="flex items-start gap-2">
      <input
        id={id}
        type="checkbox"
        checked={!!checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
      />
      <label htmlFor={id} className="flex items-center gap-1 text-sm text-slate-700">
        {label}
        {help && <Tooltip text={help} />}
      </label>
    </div>
  );
}

/** Selector segmentado, ideal para 2-3 opciones en móvil. */
export function SegmentedControl({ value, onChange, options, className = '' }) {
  return (
    <div className={`inline-flex rounded-lg bg-slate-100 p-1 ${className}`}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={`flex-1 whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
            value === o.value
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
