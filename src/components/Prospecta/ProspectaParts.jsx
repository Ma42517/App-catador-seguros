import { Check, X } from 'lucide-react';

/**
 * Piezas compartidas por la Cita Inicial y el Cierre.
 *
 * Viven aparte porque las dos pantallas las usan con la misma forma, y una cifra
 * grande o un interruptor de sí/no que se vean distintos en cada paso obligan al
 * prospecto a volver a aprender la interfaz a media conversación.
 */

/**
 * El resultado de un cálculo, en grande.
 *
 * Es la pieza central de todo el ejercicio: la cifra existe para provocar una
 * reacción, así que ocupa el ancho completo y lleva el acento índigo del
 * proyecto. `tabular-nums` es obligatorio aquí —convención del repo— porque sin
 * ella los dígitos cambian de ancho al teclear y el número entero baila.
 */
export function BigResult({ label, value, hint, tone = 'indigo' }) {
  const tones = {
    indigo: 'border-indigo-500/30 bg-indigo-500/10 text-indigo-200',
    emerald: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200',
    rose: 'border-rose-500/30 bg-rose-500/10 text-rose-200',
  };

  return (
    <div className={`rounded-2xl border p-4 text-center ${tones[tone]}`}>
      <p className="text-[11px] font-bold uppercase tracking-widest opacity-80">
        {label}
      </p>
      <p className="mt-1.5 text-3xl font-black leading-none tracking-tight tabular-nums">
        {value}
      </p>
      {hint && (
        <p className="mt-2 text-[11px] leading-relaxed text-zinc-400">{hint}</p>
      )}
    </div>
  );
}

/**
 * Dato derivado, en pequeño. Acompaña a la cifra grande sin competir con ella.
 */
export function MiniStat({ label, value }) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/70 p-3">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
        {label}
      </p>
      <p className="mt-1 text-lg font-bold leading-none tabular-nums text-zinc-100">
        {value}
      </p>
    </div>
  );
}

/**
 * Interruptor de sí/no en dos botones.
 *
 * No es un `switch` de un solo toque a propósito: un interruptor tiene estado
 * inicial, y aquí la diferencia entre "dijo que no" y "todavía no contesta"
 * cambia la conversación. Con dos botones, sin respuesta no hay ninguno
 * encendido y el asesor ve al instante qué le falta preguntar.
 */
export function YesNoRow({ question, value, onChange, detail }) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-xl border border-zinc-800
                    bg-zinc-900/60 p-3"
    >
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium leading-snug text-zinc-200">{question}</p>
        {detail && <p className="mt-1 text-[11px] leading-snug text-zinc-500">{detail}</p>}
      </div>

      <div className="flex shrink-0 gap-1.5" role="group" aria-label={question}>
        <button
          type="button"
          aria-pressed={value === true}
          onClick={() => onChange(value === true ? null : true)}
          className={`grid h-8 w-9 place-items-center rounded-lg text-xs font-bold
                      transition-all active:scale-95 focus-visible:outline-none
                      focus-visible:ring-2 focus-visible:ring-indigo-500
                      ${value === true
            ? 'bg-emerald-500 text-zinc-950 shadow-lg shadow-emerald-500/25'
            : 'border border-zinc-700 text-zinc-500 hover:border-zinc-600 hover:text-zinc-300'}`}
        >
          <Check size={14} strokeWidth={3} aria-hidden="true" />
          <span className="sr-only">Sí</span>
        </button>

        <button
          type="button"
          aria-pressed={value === false}
          onClick={() => onChange(value === false ? null : false)}
          className={`grid h-8 w-9 place-items-center rounded-lg text-xs font-bold
                      transition-all active:scale-95 focus-visible:outline-none
                      focus-visible:ring-2 focus-visible:ring-indigo-500
                      ${value === false
            ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/25'
            : 'border border-zinc-700 text-zinc-500 hover:border-zinc-600 hover:text-zinc-300'}`}
        >
          <X size={14} strokeWidth={3} aria-hidden="true" />
          <span className="sr-only">No</span>
        </button>
      </div>
    </div>
  );
}

/** Encabezado de un paso: número, título y la frase que lo justifica. */
export function StepHeading({ eyebrow, title, subtitle }) {
  return (
    <header className="mb-5">
      <p className="text-[11px] font-bold uppercase tracking-widest text-indigo-400">
        {eyebrow}
      </p>
      <h3 className="mt-1 text-xl font-bold leading-tight tracking-tight text-white">
        {title}
      </h3>
      {subtitle && (
        <p className="mt-1.5 text-xs leading-relaxed text-zinc-400">{subtitle}</p>
      )}
    </header>
  );
}
