/**
 * src/lib/activityTypes.js
 *
 * Catálogo cerrado de tipos de actividad del embudo de ventas.
 *
 * Vivía dentro de `ActivityForm.jsx` como constante privada, y eso obligaba a
 * duplicarlo cada vez que otro módulo necesitaba una de sus etiquetas
 * (`CallFeedbackModal.jsx` ya repetía a mano el valor y el rótulo de "Cita
 * Inicial"). Aquí se comparte sin que nadie tenga que copiarlo, y sin
 * exportarlo desde un archivo de componente —eso dispara
 * `react/only-export-components` en `oxlint` y rompe el Fast Refresh—.
 *
 * `recordatorio_emision` no está en la lista a propósito: es un estado interno
 * que sólo genera el motor (`ProposalCard.jsx`), nunca algo que se pueda
 * elegir a mano en "Nueva Actividad".
 */
export const ACTIVITY_TYPE_OPTIONS = [
  { value: 'llamada', label: 'Llamada' },
  { value: 'seguimiento', label: 'Seguimiento' },
  { value: 'cita', label: 'Cita' },
  { value: 'cita_inicial', label: 'Cita Inicial' },
  { value: 'cita_propuesta', label: 'Cita de Propuesta' },
  { value: 'cita_cierre', label: 'Cita de Cierre' },
  { value: 'entrega_poliza', label: 'Entrega de Póliza' },
  { value: 'cobro', label: 'Cobro' },
];

/** Etiqueta legible de un tipo; respaldo al valor crudo si llega uno fuera de la lista (dato viejo). */
export function activityTypeLabel(value) {
  return ACTIVITY_TYPE_OPTIONS.find((option) => option.value === value)?.label ?? value;
}

/*
  Rótulos del catálogo, más los de estados internos que también acaban como
  título de un evento. Se comparan en minúsculas para no depender de cómo se
  escribieron.
*/
const KNOWN_LABELS = new Set([
  ...ACTIVITY_TYPE_OPTIONS.map((option) => option.label.toLowerCase()),
  'recordatorio de emisión',
]);

/**
 * ¿Este texto es el rótulo de un tipo de actividad y no el nombre de una
 * persona?
 *
 * Existe para un caso muy concreto. `ActivityForm.jsx` guarda el título como
 * `"Etiqueta: Nombre"` sólo cuando se escribió un nombre; sin él guarda la
 * etiqueta sola ("Cita Inicial"). `prospectNameFrom` no tenía forma de
 * distinguir eso de un título viejo que sí era un nombre a secas, así que
 * devolvía "Cita Inicial" como si la persona se llamara así — y de ahí salía a
 * los mensajes de WhatsApp ("Hola Cita Inicial, te confirmo nuestra cita").
 */
export function isActivityTypeLabel(text) {
  return KNOWN_LABELS.has(String(text ?? '').trim().toLowerCase());
}
