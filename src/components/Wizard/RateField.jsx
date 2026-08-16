import { PercentInput } from '../ui';
import { fmtPct } from '../../engine/finance';
import SuggestedField from './SuggestedField';

/**
 * Campo de tasa con sugerencia. Es `SuggestedField` con el formato de porcentaje puesto.
 *
 * Se conserva como envoltorio en lugar de sustituirlo en las cinco pantallas que lo usan:
 * ahí lo que se captura son tasas, y decir `RateField` en la pantalla de metas explica más
 * que repetir el formateador y el texto del botón en cada sitio.
 *
 * El femenino de los textos —"Ponerla manualmente", "Usar la sugerida"— vive aquí, porque
 * en el molde genérico el valor no tiene género: unos campos llevan una tasa y otros un
 * número de años.
 */
export default function RateField({
  label, help, value, suggested, note, isManual,
  onUseManual, onUseSuggested, onChange, min,
}) {
  return (
    <SuggestedField
      label={label}
      help={help}
      suggested={suggested}
      format={fmtPct}
      note={note}
      isManual={isManual}
      onUseManual={onUseManual}
      onUseSuggested={onUseSuggested}
      manualLabel="Ponerla manualmente"
      manualNote="Tasa escrita por ti. "
      chipLabel="Sugerida"
      restoreLabel={(v) => `Usar la sugerida (${v})`}
    >
      {(id) => (
        <PercentInput id={id} value={value} onChange={onChange} min={min} />
      )}
    </SuggestedField>
  );
}
