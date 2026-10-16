/**
 * src/lib/tours.js
 *
 * Definición de los mini-tutoriales tipo "spotlight". Cada tour es una lista de
 * pasos; cada paso apunta a un elemento real de la pantalla por su atributo
 * `data-tour` y lleva el texto de su tarjeta.
 *
 * Está pensado para crecer: hoy sólo existe el de "Hoy", pero añadir el de
 * "Progreso", "Agenda" o "Ver más" es sólo agregar otra lista aquí y marcar sus
 * elementos con `data-tour`. El motor (`GuidedTour`) no cambia.
 *
 * `title` admite `{name}` como marcador: el motor lo reemplaza con el nombre de
 * la persona para que el saludo sea personal.
 */

/*
 * Interruptor general de los mini-tutoriales. En `false` no se muestran solos ni
 * aparece "Ver tutorial de nuevo" en Ver más. Para reactivarlos basta con
 * ponerlo en `true`: el motor, los pasos y la persistencia siguen intactos.
 */
export const TUTORIALS_ENABLED = false;

/*
 * Pasos del tutorial de la pestaña "Hoy".
 *
 * Un paso puede ser de dos clases:
 *  - Normal: ilumina su elemento y avanza con el botón "Entendido".
 *  - `awaitClick: true`: en vez de "Entendido", INVITA a tocar el elemento real
 *    (el motor deja pasar el toque). El tour avanza solo cuando aparece el
 *    elemento del paso siguiente (p. ej. al abrirse el menú del botón "+").
 *    `cue` es la línea de llamada a la acción ("Tócalo para ver...").
 */
export const HOY_TOUR = [
  {
    target: 'hoy-step-1',
    title: '¡Hola, {name}! Este es tu botón principal',
    body: 'Tócalo siempre que quieras agregar una nueva actividad, registrar un '
      + 'cliente o agendar una cita. ¡Es tu punto de partida!',
    awaitClick: true,
    cue: '👇 Tócalo para ver qué puedes crear',
  },
  {
    target: 'hoy-step-menu',
    title: 'Aquí eliges qué crear',
    body: 'Nueva Actividad: bloquea una cita o actividad en tu agenda. '
      + 'Nuevo Recordatorio: un aviso con fecha y hora para no olvidarlo. '
      + 'Nota Rápida: captura una idea ahora y ordénala después.',
  },
  {
    target: 'hoy-step-2',
    title: 'Tu objetivo diario',
    body: 'Cada llamada, cita o seguimiento que hagas suma puntos aquí. Tu meta es '
      + 'llenar esta barra todos los días para hacer crecer tu cartera.',
  },
  {
    target: 'hoy-step-3',
    title: 'Tus pendientes y sugerencias de hoy',
    body: 'Aquí aparecerán las personas a las que debes llamar o visitar hoy. '
      + 'Cuando tengas el día libre, te daremos ideas rápidas aquí mismo para '
      + 'conseguir nuevos clientes.',
  },
];
