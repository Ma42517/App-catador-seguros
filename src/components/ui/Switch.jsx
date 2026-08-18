import { useId } from 'react';

/**
 * Interruptor de encendido/apagado.
 *
 * Existe aparte de `Checkbox` porque las dos cosas se leen distinto. Una casilla dice "esto
 * es cierto de mí" —tengo GMM, tengo seguro de vida—; un interruptor dice "haz esto con mi
 * dinero". Incluir una prima en el presupuesto de gastos fijos cambia una cifra del
 * diagnóstico, y una palanca comunica esa consecuencia mejor que una marca de verificación.
 *
 * Se dibuja con un `input type="checkbox"` de verdad, sólo escondido: hereda la
 * navegación por teclado, la barra espaciadora, el foco y el papel de casilla en los
 * lectores de pantalla. Un `div` con `onClick` habría necesitado reimplementar las cuatro
 * cosas, y normalmente se implementan tres.
 */
export default function Switch({ checked, onChange, label, hint }) {
  const id = useId();

  return (
    <div>
      <label htmlFor={id} className="flex cursor-pointer items-start gap-3">
        <span className="relative mt-0.5 inline-flex shrink-0">
          <input
            id={id}
            type="checkbox"
            checked={!!checked}
            onChange={(e) => onChange(e.target.checked)}
            className="peer sr-only"
          />
          {/* Riel */}
          <span
            aria-hidden="true"
            className="block h-5 w-9 rounded-full bg-zinc-700 transition-colors
                       peer-checked:bg-indigo-500 peer-focus-visible:ring-2
                       peer-focus-visible:ring-indigo-500 peer-focus-visible:ring-offset-2
                       peer-focus-visible:ring-offset-zinc-950"
          />
          {/* Perilla */}
          <span
            aria-hidden="true"
            className="pointer-events-none absolute left-0.5 top-0.5 h-4 w-4 rounded-full
                       bg-white shadow transition-transform peer-checked:translate-x-4"
          />
        </span>

        <span className="min-w-0 text-xs leading-snug text-zinc-300">{label}</span>
      </label>

      {hint && (
        <p className="ml-12 mt-1 text-[11px] leading-relaxed text-zinc-500">{hint}</p>
      )}
    </div>
  );
}
