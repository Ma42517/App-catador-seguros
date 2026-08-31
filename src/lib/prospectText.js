import { isActivityTypeLabel } from './activityTypes';

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
export function prospectNameFrom(title, fallback = 'tu prospecto') {
  const raw = String(title ?? '').trim();
  const [, afterColon] = raw.split(/:\s*/);
  const name = (afterColon || raw).trim();

  /*
    Sin nombre capturado, `ActivityForm.jsx` guarda sólo la etiqueta del tipo
    ("Cita Inicial"), y devolverla aquí hacía que la app tratara el rótulo como
    si fuera la persona: el modal decía "Pregúntale a Cita Inicial" y el
    mensaje de WhatsApp salía como "Hola Cita Inicial". Se detecta contra el
    catálogo (`isActivityTypeLabel`) y no por la ausencia de dos puntos, porque
    un evento viejo puede tener el nombre suelto como título, sin etiqueta —y
    ése sí es un nombre de verdad.
  */
  if (!name || isActivityTypeLabel(name)) return fallback;
  return name;
}
