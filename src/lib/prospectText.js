/**
 * src/lib/prospectText.js
 *
 * Dos ayudantes de texto que ya usaba `CallActivityCard.jsx` y que ahora
 * también necesita `InitialMeetingCard.jsx`: se comparten desde aquí en vez
 * de mantener dos copias que podrían desalinearse con una edición futura.
 */

/** Sólo dígitos y el `+` inicial, que es lo que `wa.me`/`tel:` esperan. */
export function digits(value) {
  return String(value ?? '').replace(/[^\d+]/g, '');
}

/**
 * Nombre del prospecto a partir del título del evento. `ActivityForm.jsx`
 * guarda el título como `"Cita Inicial: Manuel Ruiz"` cuando hay un nombre
 * escrito — se toma la parte después de los dos puntos; si el título no
 * trae ese patrón, se usa el título completo tal cual.
 */
export function prospectNameFrom(title) {
  const [, afterColon] = String(title ?? '').split(/:\s*/);
  return (afterColon || title || 'tu prospecto').trim();
}
