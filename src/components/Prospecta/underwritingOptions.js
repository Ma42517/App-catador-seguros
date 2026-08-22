/**
 * src/components/Prospecta/underwritingOptions.js
 *
 * Catálogos de opciones del Expediente Previo a Emisión
 * (`UnderwritingDrawer.jsx`), en un módulo aparte y no exportados desde ese
 * componente: `oxlint` (regla `react/only-export-components`) marca como
 * advertencia exportar constantes desde un archivo que también exporta un
 * componente, porque rompe el Fast Refresh. `LeadsList.jsx` necesita estas
 * mismas listas para traducir a texto legible los valores crudos que el
 * expediente ya guardado trae (`'amateur'`, `'cardiaco'`...) al mostrar su
 * detalle completo — de aquí las toman las dos pantallas, sin duplicar el
 * catálogo ni sumar advertencias nuevas al baseline de lint.
 */

/** Frecuencia/Nivel del sub-formulario de Riesgos y Deportes. */
export const RISK_FREQUENCY_OPTIONS = [
  { value: '', label: 'Selecciona una opción' },
  { value: 'amateur', label: 'Amateur' },
  { value: 'profesional', label: 'Profesional' },
  { value: 'trabajo', label: 'Por trabajo' },
  { value: 'ocasional', label: 'Ocasional' },
];

/** Categorías del sub-formulario médico. */
export const MEDICAL_CATEGORIES = [
  { value: '', label: 'Selecciona una categoría' },
  { value: 'cardiaco', label: 'Cardíaco' },
  { value: 'respiratorio', label: 'Respiratorio' },
  { value: 'oncologico', label: 'Oncológico' },
  { value: 'metabolico', label: 'Metabólico (diabetes, tiroides...)' },
  { value: 'otro', label: 'Otro' },
];

/** Estado de salud actual, para el sub-formulario médico. */
export const HEALTH_STATUS_OPTIONS = [
  { value: '', label: 'Selecciona un estado' },
  { value: 'controlado', label: 'Controlado / en tratamiento' },
  { value: 'resuelto', label: 'Resuelto, sin seguimiento' },
  { value: 'activo', label: 'Activo, sin tratamiento' },
];

/** Tipo de hábito, para el sub-formulario de hábitos/familia. */
export const HABIT_TYPES = [
  { value: '', label: 'Selecciona un tipo' },
  { value: 'tabaco', label: 'Tabaco' },
  { value: 'alcohol', label: 'Alcohol' },
  { value: 'antecedente_familiar', label: 'Antecedente familiar de riesgo' },
];
