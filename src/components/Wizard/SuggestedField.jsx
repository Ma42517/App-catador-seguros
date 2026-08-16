import { useId } from 'react';
import { Tooltip } from '../ui';

/**
 * Campo con dos caminos: el valor sugerido, o el que escriba el asesor.
 *
 * Es el molde que ya usaban las tasas de metas, activos y retiro, sacado a su propio
 * archivo para que también lo puedan usar campos que no son porcentajes —los años de vida,
 * el primero—. Un segundo componente parecido habría bastado para que el verde de una
 * pantalla dejara de ser el mismo verde que el de la otra en el primer ajuste.
 *
 * En modo sugerido NO se dibuja un input deshabilitado, y la diferencia importa: un campo
 * gris apagado se lee como "no puedes cambiar esto" y ahí termina la conversación. Es una
 * cifra afirmada, con su procedencia debajo y la puerta de salida a la vista.
 *
 * `children` es una función que recibe el `id`, no un elemento ya hecho: el `id` nace aquí
 * y la etiqueta tiene que apuntar al input real para que un clic en el texto lo enfoque.
 */
export default function SuggestedField({
  label, help, suggested, format, note, isManual,
  onUseManual, onUseSuggested, children,
  manualLabel = 'Ponerlo manualmente',
  manualNote = 'Valor escrito por ti. ',
  /*
    El género de las etiquetas se pasa desde fuera. En el molde el valor no tiene género
    —unos campos llevan una tasa y otros un número de años— y en español eso no se puede
    resolver con una sola cadena sin acabar escribiendo "Sugerido/a".
  */
  chipLabel = 'Sugerido',
  restoreLabel = (v) => `Usar el sugerido (${v})`,
}) {
  const id = useId();

  /*
    Sin sugerencia no hay dos caminos, sólo uno: el campo abre vacío y sin botón. Un
    "usar la sugerida" que llevara a un cero sería peor que no estar —parecería un dato y
    sería un hueco—.
  */
  const hasSuggestion = suggested !== null && suggested !== undefined;
  const showInput = isManual || !hasSuggestion;

  const heading = (
    <>
      {label}
      {help && <Tooltip text={help} />}
    </>
  );

  const headingClass = 'mb-1.5 flex items-center gap-1 text-[11px] font-medium '
    + 'uppercase tracking-wide text-zinc-400';

  return (
    <div>
      {/*
        `label` cuando hay un input al que apuntar, y `span` cuando lo que se muestra es la
        cifra afirmada. Un `htmlFor` hacia un `div` no enfoca nada y deja el árbol de
        accesibilidad prometiendo un control que no existe.
      */}
      {showInput
        ? <label htmlFor={id} className={headingClass}>{heading}</label>
        : <span className={headingClass}>{heading}</span>}

      {showInput ? children(id) : (
        <div
          className="flex h-[42px] items-center justify-between rounded-xl border
                     border-dashed border-emerald-500/40 bg-emerald-500/[0.07] px-3"
        >
          <span className="text-sm font-bold tabular-nums text-emerald-300">
            {format(suggested)}
          </span>
          <span className="text-[9px] font-bold uppercase tracking-widest text-emerald-500/70">
            {chipLabel}
          </span>
        </div>
      )}

      <p className="mt-1.5 text-[11px] leading-relaxed text-zinc-500">
        {!hasSuggestion ? note : isManual ? manualNote : `${note} `}

        {hasSuggestion && (
          <button
            type="button"
            onClick={isManual ? onUseSuggested : onUseManual}
            className="font-semibold text-indigo-400 underline-offset-2 transition-colors
                       hover:text-indigo-300 hover:underline focus-visible:outline-none
                       focus-visible:underline"
          >
            {isManual ? restoreLabel(format(suggested)) : manualLabel}
          </button>
        )}
      </p>
    </div>
  );
}
