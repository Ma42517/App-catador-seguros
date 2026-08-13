/**
 * Preferencias de interfaz que sobreviven a la navegación.
 *
 * Existe porque ya van dos elecciones que se recuerdan igual —qué versión del
 * tablero se ve y qué versión de la captura— y las dos por la misma razón: estas
 * pantallas se desmontan al cambiar de sección, así que sin guardar la elección
 * habría que repetirla cada vez que se entra. Comparar dos diseños es justamente
 * entrar y salir muchas veces.
 *
 * No guarda datos de la persona, sólo su preferencia de vista. Si el navegador
 * bloquea el almacenamiento, la elección dura lo que dure la sesión y nada falla.
 */

/**
 * Lee una preferencia y la valida contra la lista de valores aceptados.
 *
 * La validación no es adorno: un valor viejo o manipulado a mano dejaría a la
 * interfaz eligiendo una rama que ya no existe.
 */
export function readPreference(key, allowed, fallback) {
  try {
    const saved = localStorage.getItem(key);
    return allowed.includes(saved) ? saved : fallback;
  } catch {
    return fallback;
  }
}

export function writePreference(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Sin almacenamiento —modo privado, permisos—, se pierde al recargar.
  }
}
