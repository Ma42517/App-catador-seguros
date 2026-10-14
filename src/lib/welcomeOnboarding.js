/**
 * src/lib/welcomeOnboarding.js
 *
 * Recuerda si la persona ya vio la bienvenida breve que va ANTES del registro.
 *
 * Es un momento, no una pantalla de estado: se muestra una sola vez por
 * dispositivo —la primera— y después se va directo al login. Volver a mostrarla
 * en cada apertura cansaría justo a quien quisimos no frustrar.
 *
 * Vive en `localStorage` y no en la sesión porque esto ocurre ANTES de que haya
 * cuenta: no hay a quién atarlo en la base, así que lo recuerda el aparato. Si el
 * navegador bloquea el almacenamiento, la bienvenida se mostrará otra vez la
 * próxima vez, y no pasa nada grave: es saludable, no un dato que se pierda.
 */

const STORAGE_KEY = 'expandia:welcomeSeen:v1';

export function hasSeenWelcome() {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

export function markWelcomeSeen() {
  try {
    localStorage.setItem(STORAGE_KEY, 'true');
  } catch {
    // Sin almacenamiento, se volverá a mostrar. Aceptable para una bienvenida.
  }
}
