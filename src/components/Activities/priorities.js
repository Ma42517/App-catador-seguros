/** Niveles de prioridad de actividades y recordatorios. */
export const PRIORITIES = [
  {
    key: 'baja',
    label: 'Baja',
    idle: 'border-emerald-500/30 text-emerald-600 dark:text-emerald-400/80',
    active: 'border-emerald-500 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300',
  },
  {
    key: 'importante',
    label: 'Importante',
    idle: 'border-amber-500/30 text-amber-600 dark:text-amber-400/80',
    active: 'border-amber-500 bg-amber-500/10 text-amber-600 dark:text-amber-300',
  },
  {
    key: 'maxima',
    label: 'Máxima',
    // La urgencia máxima lleva fondo propio incluso sin estar seleccionada.
    idle: 'border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300',
    active: 'border-rose-500 bg-rose-500/25 text-rose-800 dark:text-rose-100',
  },
];

export const DEFAULT_PRIORITY = 'importante';
