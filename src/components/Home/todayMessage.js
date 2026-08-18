/**
 * src/components/Home/todayMessage.js
 *
 * Mensaje central de la pantalla de inicio, según cuántos eventos de alta
 * prioridad quedan por confirmar hoy.
 *
 * Vive en su propio módulo, separado de dónde se muestra, porque dos piezas
 * distintas lo necesitan con el mismo criterio: el prólogo cinematográfico
 * de `TodayView.jsx` lo presenta en pantalla negra al abrir la app, y antes
 * vivía escrito letra por letra dentro del cuerpo del tablero
 * (`AISequence.jsx`) — con el prólogo ya diciendo la frase, repetirla ahí
 * habría sido decir lo mismo dos veces en la misma respiración.
 *
 * Preparado para ser dinámico: hoy sólo distingue "hay pendientes" de
 * "agenda libre", pero esta es la única función que hay que tocar el día
 * que el mensaje dependa de más señales (la hora del día, el nombre, una
 * racha, etc.) — nadie que llama a esta función necesita saber cómo se
 * decide el texto.
 */
export function buildTodayMessage(pendientes) {
  if (pendientes > 0) {
    // Se cuida el singular: "1 evento pendiente", no "1 eventos pendientes".
    const cuenta = pendientes === 1
      ? '1 evento pendiente'
      : `${pendientes} eventos pendientes`;
    return `Tienes ${cuenta} para hoy. Empecemos por aquí...`;
  }
  return 'La agenda está libre. '
    + '¿Cerramos algún negocio pendiente hoy? Empieza por aquí...';
}
