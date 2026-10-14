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

/** Pasos del tutorial de la pestaña "Hoy". */
export const HOY_TOUR = [
  {
    target: 'hoy-step-1',
    title: '¡Hola, {name}! Este es tu botón principal',
    body: 'Tócalo siempre que quieras agregar una nueva actividad, registrar un '
      + 'cliente o agendar una cita. ¡Es tu punto de partida!',
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
