/**
 * Traducción de un error de Supabase a un mensaje que se pueda leer en
 * pantalla.
 *
 * Vive aparte porque lo necesitan varios repositorios (comunicados, perfiles) y
 * tenerlo colgado de uno de ellos obligaría a los demás a importar un módulo
 * que no les corresponde.
 *
 * Los errores de Postgres traen `hint` con la instrucción exacta para
 * arreglarlos. Descartarlo obligaría a abrir la consola del navegador para
 * saber qué pasó, así que se muestra completo.
 */
export function describeError(error) {
  if (!error) return '';
  const parts = [error.message || 'Error desconocido'];
  if (error.code) parts.push(`(código ${error.code})`);
  if (error.hint) parts.push(`· Solución: ${error.hint}`);
  return parts.join(' ');
}
