/**
 * Semana de ejemplo de un asesor de promotoría.
 *
 * Las fechas se calculan relativas al día en que se carga, para que la demo
 * siempre caiga "esta semana" y nunca se vea vencida. El día 0 es hoy.
 */

/** Devuelve la fecha en formato YYYY-MM-DD desplazada N días desde hoy. */
function dayKey(offset) {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/**
 * Guion de la semana: [díaOffset, hora, título, tipo, prioridad].
 * Mezcla el ciclo comercial completo: prospección → cita inicial (ANF) →
 * cierre → entrega → seguimiento y referidos.
 */
const SCRIPT = [
  // Hoy: planeación y confirmaciones
  [0, '09:00', 'Planear la semana y revisar cartera', 'actividad', 'baja'],
  [0, '11:30', 'Confirmar citas de mañana por WhatsApp', 'recordatorio', 'maxima'],
  [0, '18:00', 'Cita inicial ANF · Laura Méndez', 'actividad', 'maxima'],

  // Día 1
  [1, '08:00', 'Junta semanal de promotoría', 'actividad', 'importante'],
  [1, '10:30', 'Cita inicial ANF · Jorge Salinas', 'actividad', 'maxima'],
  [1, '12:00', 'Seguimiento telefónico · Pedro Ramírez', 'actividad', 'importante'],
  [1, '17:00', 'Entrega de póliza · Familia Ruiz', 'actividad', 'maxima'],

  // Día 2
  [2, '09:30', 'Enviar Diagnóstico 360 a Laura Méndez', 'recordatorio', 'importante'],
  [2, '13:00', 'Prospección en cámara de comercio', 'actividad', 'baja'],
  [2, '16:30', 'Cierre de negocio · Jorge Salinas', 'actividad', 'maxima'],

  // Día 3
  [3, '09:00', 'Pago de prima · Sra. Álvarez', 'recordatorio', 'maxima'],
  [3, '11:00', 'Cita inicial ANF · Familia Torres', 'actividad', 'maxima'],
  [3, '16:00', 'Capacitación de producto GMM', 'actividad', 'baja'],

  // Día 4
  [4, '10:00', 'Seguimiento · Marcela Díaz', 'actividad', 'importante'],
  [4, '12:30', 'Cierre · Familia Torres', 'actividad', 'maxima'],
  [4, '15:00', 'Revisión de cartera y renovaciones', 'actividad', 'importante'],

  // Día 5
  [5, '08:30', 'Felicitar cumpleaños · cliente Vega', 'recordatorio', 'baja'],
  [5, '11:00', 'Cita de cortesía · referidos de Laura', 'actividad', 'importante'],
  [5, '17:30', 'Reporte semanal a la promotoría', 'actividad', 'importante'],

  // Día 6
  [6, '09:00', 'Curso MDRT en línea', 'actividad', 'baja'],
  [6, '12:00', 'Prospectar zona norte', 'actividad', 'baja'],
];

/** Notas de ejemplo, con antigüedad escalonada para que se vean reales. */
const NOTES = [
  [2, 'Laura preguntó por un seguro educativo para su hija de 6 años.'],
  [8, 'Jorge quiere comparar GMM con un deducible más bajo antes de firmar.'],
  [26, 'Pedir referidos a la familia Ruiz cuando les entregue la póliza.'],
  [50, 'Revisar si la Sra. Álvarez califica para PPR antes del cierre de año.'],
];

const HOUR_MS = 60 * 60 * 1000;

function newId(prefix, index) {
  return `${prefix}-demo-${index}-${Math.random().toString(36).slice(2, 7)}`;
}

/** Construye la semana de ejemplo lista para guardarse. */
export function buildDemoWeek() {
  const now = Date.now();

  const activities = SCRIPT.map(([offset, time, title, type, priority], i) => ({
    id: newId('act', i),
    // Se registran como capturadas en días previos, no todas en el mismo instante.
    createdAt: now - (SCRIPT.length - i) * HOUR_MS,
    type,
    title,
    date: dayKey(offset),
    time,
    priority,
  }));

  const notes = NOTES.map(([hoursAgo, text], i) => ({
    id: newId('note', i),
    text,
    createdAt: now - hoursAgo * HOUR_MS,
    processed: false,
  }));

  return { activities, notes };
}
