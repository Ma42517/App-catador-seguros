import { useState, useEffect, useId, useRef } from 'react';
import Tooltip from './Tooltip';

/** Base compartida por todos los controles de texto del sistema. */
const baseInput =
  'w-full rounded-xl border border-zinc-800 bg-zinc-950/60 px-3 py-2.5 text-sm ' +
  'text-zinc-100 placeholder:text-zinc-500 transition-all duration-150 ' +
  'hover:border-zinc-700 focus:border-indigo-500 focus:bg-zinc-950/80 focus:outline-none ' +
  'focus:ring-2 focus:ring-indigo-500 disabled:cursor-not-allowed ' +
  'disabled:bg-zinc-900/30 disabled:text-zinc-500';

/** Etiqueta + ayuda contextual + control. */
export function Field({ label, hint, help, children, className = '' }) {
  return (
    <label className={`block ${className}`}>
      {label && (
        <span className="mb-1.5 flex items-center gap-1 text-[11px] font-medium uppercase tracking-wide text-zinc-400">
          {label}
          {help && <Tooltip text={help} />}
        </span>
      )}
      {children}
      {hint && (
        <span className="mt-1.5 block text-[11px] leading-relaxed text-zinc-500">{hint}</span>
      )}
    </label>
  );
}

/** Envoltura que posiciona el icono/prefijo a la izquierda y el sufijo a la derecha. */
function Affixed({ icon: Icon, prefix, suffix, children }) {
  const hasLead = !!Icon || !!prefix;
  return (
    <div className="relative">
      {hasLead && (
        <span className="pointer-events-none absolute left-3 top-1/2 z-10 -translate-y-1/2 text-zinc-500">
          {Icon ? <Icon size={15} strokeWidth={2} /> : <span className="text-sm">{prefix}</span>}
        </span>
      )}
      {children}
      {suffix && (
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-zinc-500">
          {suffix}
        </span>
      )}
    </div>
  );
}

/** Clases de relleno según los adornos presentes. */
function padFor(Icon, prefix, suffix) {
  const left = Icon ? 'pl-9' : prefix ? 'pl-7' : '';
  const right = suffix ? 'pr-10' : '';
  return `${left} ${right}`;
}


export function TextInput({
  value, onChange, placeholder, icon, className = '', ...rest
}) {
  return (
    <Affixed icon={icon}>
      <input
        type="text"
        value={value ?? ''}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className={`${baseInput} ${padFor(icon)} ${className}`}
        {...rest}
      />
    </Affixed>
  );
}

export function Select({ value, onChange, options, icon, className = '', ...rest }) {
  return (
    <Affixed icon={icon}>
      <select
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
        className={`${baseInput} ${padFor(icon)} cursor-pointer appearance-none bg-[length:16px] bg-[right_0.6rem_center] bg-no-repeat pr-9 ${className}`}
        style={{
          // Flecha propia: la nativa se ve clara sobre fondo oscuro.
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2.5' stroke-linecap='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")",
        }}
        {...rest}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value} className="bg-zinc-900 text-zinc-100">
            {o.label}
          </option>
        ))}
      </select>
    </Affixed>
  );
}


/**
 * Entrada numérica con borrador local: permite vaciar el campo mientras se
 * escribe sin emitir NaN. Siempre notifica un número finito hacia arriba.
 *
 * El recorte a `min` y `max` ocurre al SALIR del campo, nunca mientras se teclea.
 * Recortar en cada tecla hacía imposible escribir en cualquier campo con mínimo
 * alto: en "Edad actual" (mínimo 16), teclear el 4 de un 45 producía un 4, que se
 * recortaba a 16 al instante, el efecto de resincronía sobreescribía el borrador
 * con "16" y el segundo dígito se pegaba a ese 16. El campo respondía con números
 * que nadie había escrito. En "Edad de retiro" (mínimo 40) y "Años de vida"
 * (mínimo 66) era aún más evidente.
 */
export function NumberInput({
  value, onChange, prefix, suffix, icon, min = 0, max, step = 'any',
  placeholder = '0', className = '', ...rest
}) {
  const [draft, setDraft] = useState(() => (value === 0 ? '' : String(value ?? '')));

  /*
    Mientras el campo tiene el cursor dentro, manda el borrador. Es lo que impide
    que un valor de vuelta del estado —el propio, ya recortado, o el de otro
    campo— pise a media palabra lo que se está escribiendo.
  */
  const isEditing = useRef(false);

  // Resincroniza cuando el valor externo cambia (demo, reset, escenario).
  useEffect(() => {
    if (isEditing.current) return;
    const parsed = parseFloat(draft);
    const current = Number.isFinite(parsed) ? parsed : 0;
    if (current !== (value ?? 0)) {
      setDraft(value === 0 || value === null || value === undefined ? '' : String(value));
    }
    // Sólo debe reaccionar al valor externo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  /** Cada tecla: se informa el número tal cual, sin recortarlo. */
  const handleChange = (raw) => {
    setDraft(raw);
    if (raw === '' || raw === '-') { onChange(0); return; }
    const parsed = parseFloat(raw);
    if (!Number.isFinite(parsed)) return;
    onChange(parsed);
  };

  /**
   * Al salir se aplica el rango y el campo se deja en su forma final.
   *
   * Aquí sí corresponde: la persona terminó de escribir, así que corregirle un 8
   * a 66 es una ayuda y no un forcejeo. Los totales en vivo pudieron ver un valor
   * fuera de rango durante unos segundos, y eso no rompe nada: el motor sólo
   * necesita que sea un número.
   */
  const applyRange = () => {
    isEditing.current = false;

    if (draft === '' || draft === '-') {
      setDraft('');
      onChange(0);
      return;
    }

    const parsed = parseFloat(draft);
    if (!Number.isFinite(parsed)) {
      setDraft(value === 0 || value === null || value === undefined ? '' : String(value));
      return;
    }

    let next = parsed;
    if (min !== undefined && next < min) next = min;
    if (max !== undefined && next > max) next = max;

    setDraft(next === 0 ? '' : String(next));
    if (next !== value) onChange(next);
  };

  return (
    <Affixed icon={icon} prefix={prefix} suffix={suffix}>
      <input
        type="number"
        inputMode="decimal"
        value={draft}
        step={step}
        placeholder={placeholder}
        onFocus={() => { isEditing.current = true; }}
        onChange={(e) => handleChange(e.target.value)}
        onBlur={applyRange}
        // Enter confirma sin tener que tocar otro campo.
        onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }}
        className={`${baseInput} ${padFor(icon, prefix, suffix)} tabular-nums ${className}`}
        {...rest}
      />
    </Affixed>
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
    <div className="flex items-start gap-2.5">
      <input
        id={id}
        type="checkbox"
        checked={!!checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer rounded border-zinc-600 bg-zinc-900
                   text-indigo-500 transition-colors focus:ring-2 focus:ring-indigo-500/40
                   focus:ring-offset-0"
      />
      <label htmlFor={id} className="flex cursor-pointer items-center gap-1 text-xs leading-snug text-zinc-300">
        {label}
        {help && <Tooltip text={help} />}
      </label>
    </div>
  );
}

/**
 * Interruptor segmentado. La opción activa se eleva con fondo índigo
 * para que la selección sea inequívoca sobre fondo oscuro.
 */
export function SegmentedControl({ value, onChange, options, className = '' }) {
  return (
    <div
      role="tablist"
      className={`inline-flex gap-1 rounded-xl border border-zinc-700/60 bg-zinc-900/70 p-1 ${className}`}
    >
      {options.map((o) => {
        const active = value === o.value;
        return (
          <button
            key={o.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(o.value)}
            className={`flex-1 whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-semibold transition-all duration-150 ${
              active
                ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/25'
                : 'text-zinc-400 hover:bg-zinc-800/70 hover:text-zinc-200'
            }`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
