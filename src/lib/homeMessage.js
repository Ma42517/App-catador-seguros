/**
 * src/lib/homeMessage.js
 *
 * El mensaje central de la pantalla "Hoy", según cuántos eventos de alta
 * prioridad quedan por confirmar. Vive en su propio módulo sin JSX —y no
 * exportado desde `AISequence.jsx`— porque dos componentes lo necesitan con
 * el mismo criterio: `AISequence` para escribirlo en pantalla, y
 * `AdminLayout` para correr el mismo `useTypewriter` sobre el mismo texto y
 * así saber cuándo revelar la barra de navegación inferior a la vez que el
 * resto del contenido. Exportar una función desde un archivo de componente
 * apaga el fast refresh de ese archivo (el linter ya lo señala), así que la
 * función se aisló aquí en cuanto tuvo un segundo consumidor.
 */
export function buildMessage(pendientes) {
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
