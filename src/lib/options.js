/**
 * src/lib/options.js
 * Ayudas para las listas de opciones `{ value, label }` del motor financiero.
 *
 * Vive aparte de los componentes a propósito: un archivo que exporta a la vez un
 * componente y una función suelta rompe el refresco en caliente de Vite, y el aviso
 * del linter que lo señala es el mismo que ya arrastran otros archivos del proyecto.
 */

/** Etiqueta legible de un valor. Cadena vacía si no está en la lista. */
export function labelOf(options, value) {
  return options.find((o) => o.value === value)?.label || '';
}
