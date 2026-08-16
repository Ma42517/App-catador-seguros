import { useId } from 'react';
import { PercentInput, Tooltip } from '../ui';
import { fmtPct } from '../../engine/finance';

/**
 * Campo de tasa con dos caminos: la sugerida, o la que escriba el asesor.
 *
 * Abre en modo sugerido, con la cifra ya puesta y en verde, porque la fricción que se
 * viene a quitar es la de una pregunta sin respuesta posible: nadie sabe de memoria qué
 * inflación esperar para una carrera universitaria. Escribirla es la excepción, así que
 * la excepción es la que va detrás de un toque.
 *
 * En modo sugerido el campo NO es un input deshabilitado, y la diferencia importa: un
 * input gris apagado se lee como "no puedes cambiar esto" y ahí termina la
 * conversación. Es una cifra afirmada, con su procedencia debajo y la puerta de salida
 * a la vista.
 *
 * El botón de cambiar de modo vive FUERA del `label`. Dentro, cada toque en el texto de
 * ayuda activaría el botón en lugar de enfocar el campo, y en el teléfono eso convierte
 * un dedo mal puesto en un cambio de modo que nadie pidió.
 */
export default function RateField({
  label, help, value, suggested, note, isManual,
  onUseManual, onUseSuggested, onChange, min,
}) {
  const id = useId();

  return (
    <div>
      <label
        className="mb-1.5 flex items-center gap-1 text-[11px] font-medium uppercase
                   tracking-wide text-zinc-400"
        htmlFor={id}
      >
        {label}
        {help && <Tooltip text={help} />}
      </label>

      {isManual ? (
        <PercentInput id={id} value={value} onChange={onChange} min={min} />
      ) : (
        <div
          id={id}
          className="flex h-[42px] items-center justify-between rounded-xl border
                     border-dashed border-emerald-500/40 bg-emerald-500/[0.07] px-3"
        >
          <span className="text-sm font-bold tabular-nums text-emerald-300">
            {fmtPct(suggested)}
          </span>
          <span className="text-[9px] font-bold uppercase tracking-widest text-emerald-500/70">
            Sugerida
          </span>
        </div>
      )}

      <p className="mt-1.5 text-[11px] leading-relaxed text-zinc-500">
        {isManual ? 'Tasa escrita por ti. ' : `${note} `}
        <button
          type="button"
          onClick={isManual ? onUseSuggested : onUseManual}
          className="font-semibold text-indigo-400 underline-offset-2 transition-colors
                     hover:text-indigo-300 hover:underline focus-visible:outline-none
                     focus-visible:underline"
        >
          {isManual ? `Usar la sugerida (${fmtPct(suggested)})` : 'Ponerla manualmente'}
        </button>
      </p>
    </div>
  );
}
