/**
 * Estado temporal de un evento y los tonos con que se pinta.
 *
 * Vive junto a `priorities.js` y con la misma forma: la lógica y las clases de
 * Tailwind en un solo módulo, para que la tarjeta de inicio y la fila de la
 * agenda no puedan divergir en el color con que muestran lo mismo.
 */

export const EVENT_STATUS = {
  NORMAL: 'normal',
  UPCOMING: 'upcoming',
  OVERDUE: 'overdue',
};

/** Antelación con la que un evento empieza a considerarse próximo. */
export const UPCOMING_WINDOW_MIN = 30;

/**
 * Estado de un evento comparando su horario con el reloj.
 *
 * `eventTime` llega como texto de 24 horas, tal como lo guarda el formulario
 * (`"18:00"`).
 *
 * La fecha es un parámetro y no un detalle opcional: la agenda muestra días
 * enteros por delante, y comparando sólo la hora del día una cita de mañana a
 * las 18:00 se vería vencida a las 19:00 de hoy. Cuando no se pasa fecha se
 * asume hoy, que es el caso de la pantalla de inicio.
 *
 * Una tarea completada nunca se marca: cumplirla es justo lo que apaga la
 * alarma, y seguir señalando en rojo algo ya hecho entrena a ignorar el color.
 *
 * @param {string} eventTime  Hora del evento en formato `"HH:MM"`.
 * @param {object} [options]
 * @param {string} [options.date]       Fecha del evento en `"YYYY-MM-DD"`.
 * @param {boolean} [options.completed] Si ya se completó.
 * @param {Date} [options.now]          Reloj a usar; se inyecta para poder probarlo.
 * @returns {'normal'|'upcoming'|'overdue'}
 */
export function getEventStatus(eventTime, { date, completed = false, now = new Date() } = {}) {
  if (completed) return EVENT_STATUS.NORMAL;

  // Sin hora no hay nada que comparar: un evento "Sin hora" no puede vencer.
  const match = /^(\d{1,2}):(\d{2})$/.exec(String(eventTime ?? '').trim());
  if (!match) return EVENT_STATUS.NORMAL;

  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return EVENT_STATUS.NORMAL;

  /*
    La fecha se descompone a mano en lugar de pasar el texto a `new Date()`:
    `new Date('2026-08-10')` se interpreta como UTC y en México adelantaría el
    evento varias horas, moviéndolo de día. Con los números por separado, el
    resultado siempre queda en la zona local.
  */
  const target = new Date(now);
  if (date) {
    const parts = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
    if (!parts) return EVENT_STATUS.NORMAL;
    target.setFullYear(Number(parts[1]), Number(parts[2]) - 1, Number(parts[3]));
  }
  target.setHours(hours, minutes, 0, 0);

  const minutesLeft = (target.getTime() - now.getTime()) / 60_000;

  if (minutesLeft < 0) return EVENT_STATUS.OVERDUE;
  if (minutesLeft <= UPCOMING_WINDOW_MIN) return EVENT_STATUS.UPCOMING;
  return EVENT_STATUS.NORMAL;
}

/**
 * Tonos de cada estado.
 *
 * Se usan ámbar y rosa, no naranja y rojo puros, porque son los colores con los
 * que el resto de la app ya nombra "atención" y "urgente" —las etiquetas de
 * prioridad y el aviso de la barra inferior—. En la agenda una fila puede
 * llevar a la vez la etiqueta rosa de prioridad máxima y el borde de vencido:
 * con rojo al lado del rosa, esa diferencia se lee como un descuido.
 *
 * El brillo del estado próximo va como sombra del color del borde y no como
 * anillo: un anillo desplazaría la fila un píxel al aparecer, y la lista
 * entera daría un salto al cruzar el umbral.
 */
export const EVENT_STATUS_STYLES = {
  [EVENT_STATUS.NORMAL]: {
    label: null,
    container: 'border-zinc-200 dark:border-white/10',
    icon: 'text-zinc-400 dark:text-zinc-500',
    time: 'text-zinc-500 dark:text-zinc-400',
    showDot: false,
  },
  [EVENT_STATUS.UPCOMING]: {
    label: 'Próximo',
    container: 'border-amber-500/50 shadow-md shadow-amber-500/20 dark:border-amber-400/50',
    // El latido no lleva `motion-reduce:animate-none`: `index.css` ya anula
    // `.animate-pulse` dentro de su bloque de `prefers-reduced-motion`, así que
    // repetirlo aquí sólo añadiría ruido. El color sigue comunicando el estado
    // cuando el latido se apaga.
    icon: 'text-amber-500 dark:text-amber-400 animate-pulse',
    time: 'font-semibold text-amber-600 dark:text-amber-300',
    showDot: false,
  },
  [EVENT_STATUS.OVERDUE]: {
    label: 'Vencido',
    container: 'border-rose-500/40 dark:border-rose-400/40',
    icon: 'text-rose-500 dark:text-rose-400',
    time: 'font-semibold text-rose-600 dark:text-rose-300',
    showDot: true,
  },
};

/** Tonos del estado, con caída a `normal` si llega una clave desconocida. */
export function eventStatusStyles(status) {
  return EVENT_STATUS_STYLES[status] ?? EVENT_STATUS_STYLES[EVENT_STATUS.NORMAL];
}
