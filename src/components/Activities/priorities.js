/** Niveles de prioridad de actividades y recordatorios. */
export const PRIORITIES = [
  {
    key: 'baja',
    label: 'Baja',
    idle: 'border-emerald-500/30 text-emerald-600 dark:text-emerald-400/80',
    active: 'border-emerald-500 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300',
    // Relleno sólido del aviso de la barra inferior. El texto va oscuro sobre
    // verde y ámbar: a 9 px, blanco sobre esos fondos claros no se lee.
    badge: 'bg-emerald-500 text-zinc-950 shadow-emerald-500/40 dark:bg-emerald-400',
  },
  {
    key: 'importante',
    label: 'Importante',
    idle: 'border-amber-500/30 text-amber-600 dark:text-amber-400/80',
    active: 'border-amber-500 bg-amber-500/10 text-amber-600 dark:text-amber-300',
    badge: 'bg-amber-500 text-zinc-950 shadow-amber-500/40 dark:bg-amber-400',
  },
  {
    key: 'maxima',
    label: 'Máxima',
    // La urgencia máxima lleva fondo propio incluso sin estar seleccionada.
    idle: 'border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300',
    active: 'border-rose-500 bg-rose-500/25 text-rose-800 dark:text-rose-100',
    badge: 'bg-rose-500 text-white shadow-rose-500/40 dark:bg-rose-400 dark:text-zinc-950',
  },
];

export const DEFAULT_PRIORITY = 'importante';

/**
 * Severidad de cada nivel, de menor a mayor.
 *
 * Vive aparte del arreglo porque el orden en que se muestran los botones y el
 * orden de gravedad no tienen por qué coincidir: si mañana se reordena la
 * lista del formulario, el aviso seguiría eligiendo bien el color.
 */
const SEVERITY = { baja: 0, importante: 1, maxima: 2 };

/** Busca un nivel por su clave. Devuelve `null` si la clave no existe. */
export function priorityByKey(key) {
  return PRIORITIES.find((priority) => priority.key === key) ?? null;
}

/**
 * Clave de la prioridad más alta de una lista de eventos.
 *
 * Es lo que decide el color del aviso de la pestaña Agenda: manda lo más
 * urgente que haya en el día, no lo más frecuente ni lo más reciente. Con una
 * actividad baja y una importante el aviso sale ámbar; en cuanto aparece una
 * máxima, sale rojo. Así el color responde a la única pregunta que importa de
 * un vistazo: qué es lo más grave que tengo hoy.
 *
 * Un evento sin prioridad, o con una que no se reconoce, cuenta como
 * `DEFAULT_PRIORITY`: es el nivel que el formulario asigna por omisión, así que
 * tratarlo como el más bajo escondería actividades que sí importan.
 */
export function highestPriorityOf(events) {
  if (!events?.length) return null;

  let winnerKey = null;
  let winnerSeverity = -1;

  events.forEach((event) => {
    const key = event.priority in SEVERITY ? event.priority : DEFAULT_PRIORITY;
    const severity = SEVERITY[key];
    if (severity > winnerSeverity) {
      winnerSeverity = severity;
      winnerKey = key;
    }
  });

  return winnerKey;
}
