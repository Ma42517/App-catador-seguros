/**
 * Campana de fin de bloque, sintetizada con Web Audio.
 *
 * No se usa un archivo de audio a propósito: serían decenas de kilobytes que
 * viajan en cada carga para un sonido de un segundo, y un `<audio>` con `src`
 * remoto puede tardar más que el propio aviso. Dos osciladores con caída
 * exponencial suenan a campana y no pesan nada.
 *
 * El contexto se crea al arrancar el temporizador, no al terminar: Safari e iOS
 * sólo permiten abrir audio durante un gesto del usuario, y a los 45 minutos ya
 * no hay ningún gesto que aprovechar.
 */
let context = null;

/** Abre o reanuda el contexto de audio. Llamar desde un manejador de evento. */
export function primeAudio() {
  try {
    const AudioContextClass = window.AudioContext ?? window.webkitAudioContext;
    if (!AudioContextClass) return false;

    if (!context) context = new AudioContextClass();
    // Los navegadores lo dejan suspendido hasta que un gesto lo reanuda.
    if (context.state === 'suspended') context.resume();
    return true;
  } catch {
    // Sin audio disponible el aviso visual sigue funcionando.
    return false;
  }
}

/** Una nota con caída exponencial, que es lo que da la sensación de campana. */
function strike(frequency, startAt, duration, gainPeak) {
  const oscillator = context.createOscillator();
  const gain = context.createGain();

  oscillator.type = 'sine';
  oscillator.frequency.value = frequency;

  gain.gain.setValueAtTime(0, startAt);
  gain.gain.linearRampToValueAtTime(gainPeak, startAt + 0.01);
  // A cero exacto no se puede rampar de forma exponencial; 0.0001 es inaudible.
  gain.gain.exponentialRampToValueAtTime(0.0001, startAt + duration);

  oscillator.connect(gain).connect(context.destination);
  oscillator.start(startAt);
  oscillator.stop(startAt + duration);
}

/**
 * Toca la campana. Silencioso y sin lanzar si el navegador no lo permite: que
 * falle el sonido no debe impedir que se muestre el aviso.
 */
export function playChime() {
  try {
    if (!primeAudio() || !context) return;

    const now = context.currentTime;
    // Dos golpes: el segundo un poco más agudo y más corto, como un repique.
    strike(880, now, 1.5, 0.22);
    strike(1320, now + 0.16, 1.1, 0.14);
  } catch {
    // Ignorado a propósito.
  }
}
