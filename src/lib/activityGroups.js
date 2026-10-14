import {
  Phone, CalendarCheck, Calendar, FileText, Handshake, FileSignature,
  Package, DollarSign, RefreshCw, Bell,
} from 'lucide-react';

/*
  Umbral de agrupamiento. A partir de MÁS de este número de elementos del mismo
  tipo, se colapsan en una sola tarjeta de grupo. Pedido explícito del usuario:
  la pantalla principal nunca debe llenarse de tarjetas de un mismo tipo, para
  que la app no se "trabe" ni se sienta abrumadora. Con 3 o menos se muestran
  sueltas; con 4 o más, se agrupan. El mismo umbral vale para actividades,
  avisos de la promotoría y recordatorios.
*/
export const GROUP_THRESHOLD = 3;

/*
  Metadatos por `tipo_actividad`: etiqueta en singular/plural e ícono. La
  etiqueta de la tarjeta de grupo se arma con el plural ("5 Citas Iniciales"),
  y el ícono es el mismo lenguaje visual que usa cada tarjeta del embudo. El
  orden de las claves fija el orden en que aparecen los grupos en pantalla:
  sigue el recorrido natural del embudo (primer contacto → cobro).
*/
export const ACTIVITY_TYPE_META = {
  llamada: { singular: 'Llamada', plural: 'Llamadas', icon: Phone },
  cita_inicial: { singular: 'Cita Inicial', plural: 'Citas Iniciales', icon: CalendarCheck },
  cita: { singular: 'Cita', plural: 'Citas', icon: Calendar },
  cita_propuesta: { singular: 'Cita de Propuesta', plural: 'Citas de Propuesta', icon: FileText },
  cita_cierre: { singular: 'Cita de Cierre', plural: 'Citas de Cierre', icon: Handshake },
  recordatorio_emision: { singular: 'Emisión', plural: 'Emisiones', icon: FileSignature },
  entrega_poliza: { singular: 'Entrega de Póliza', plural: 'Entregas de Póliza', icon: Package },
  cobro: { singular: 'Cobro', plural: 'Cobros', icon: DollarSign },
  seguimiento: { singular: 'Seguimiento', plural: 'Seguimientos', icon: RefreshCw },
};

/*
  Clave especial de la familia "recordatorios". Los recordatorios y los eventos
  viejos sin `tipo_actividad` no son etapas del embudo, pero sí deben agruparse
  entre sí cuando hay demasiados —pedido del usuario—, así que comparten esta
  única clave en lugar de una por `id`. La tarjeta de grupo que les corresponde
  usa su propia etiqueta ("4 Recordatorios").
*/
export const REMINDER_GROUP_KEY = 'recordatorio';

/*
  Metadatos de la familia de recordatorios: la tarjeta de grupo necesita una
  etiqueta e ícono igual que cualquier tipo del embudo.
*/
const REMINDER_META = { singular: 'Recordatorio', plural: 'Recordatorios', icon: Bell };

/** Devuelve la etiqueta/ícono de un tipo (o de la familia de recordatorios). */
export function metaForType(tipo) {
  if (tipo === REMINDER_GROUP_KEY) return REMINDER_META;
  return ACTIVITY_TYPE_META[tipo] ?? REMINDER_META;
}

/*
  ¿Es este evento un recordatorio (o un evento viejo sin tipo de embudo)? Son
  los que no tienen un `tipo_actividad` reconocido del catálogo. Se agrupan
  aparte, en su propia familia.
*/
export function isReminderEvent(event) {
  return !(event.tipo_actividad && ACTIVITY_TYPE_META[event.tipo_actividad]);
}

/*
  Clave de agrupamiento de un evento.

  - Actividad del embudo VIVA → su `tipo_actividad` (se agrupa con las de su
    tipo). Una ya completada se deja suelta (clave única por `id`) porque en la
    agenda se pinta tachada con su propia fila —no con la tarjeta del embudo que
    lleva el grupo—, así que meterla al grupo la mandaría a `ActionableCard`,
    que asume una tarea por resolver. En "Hoy" los completados ni llegan.
  - Recordatorio/evento sin tipo VIVO → la familia común de recordatorios, para
    que varios se colapsen juntos cuando pasan de tres. Completado → suelto.
*/
function groupKey(event) {
  if (event.completed) return `__solo__${event.id}`;
  if (event.tipo_actividad && ACTIVITY_TYPE_META[event.tipo_actividad]) {
    return event.tipo_actividad;
  }
  return REMINDER_GROUP_KEY;
}

/**
 * Agrupa una lista de eventos por `tipo_actividad` y decide cuáles se colapsan.
 *
 * Conserva el orden de llegada de la lista (que ya viene ordenada por hora):
 * el primer evento de cada tipo marca la posición del grupo en el resultado,
 * así una pantalla con pocos tipos no reordena nada visible.
 *
 * Devuelve un arreglo de "casillas" en orden, donde cada casilla es:
 *   - `{ kind: 'single', event }`  → una actividad suelta, se pinta normal.
 *   - `{ kind: 'group', tipo, events }` → un grupo colapsado (más de
 *     GROUP_THRESHOLD del mismo tipo), se pinta como tarjeta-resumen.
 *
 * Con esto, "Hoy" y la "Agenda" (dentro de cada día) nunca muestran más de
 * GROUP_THRESHOLD tarjetas de un mismo tipo: el excedente vive detrás de la
 * tarjeta de grupo, en su propia pantalla con scroll.
 */
export function groupActivities(events, threshold = GROUP_THRESHOLD) {
  const buckets = new Map();
  const order = [];

  events.forEach((event) => {
    const key = groupKey(event);
    if (!buckets.has(key)) {
      buckets.set(key, []);
      order.push(key);
    }
    buckets.get(key).push(event);
  });

  const cells = [];
  order.forEach((key) => {
    const items = buckets.get(key);
    /*
      Agrupables: los tipos del embudo y la familia de recordatorios. Las
      claves `__solo__<id>` (eventos completados) nunca se agrupan — son una
      por evento, así que jamás pasarían del umbral de todos modos.
    */
    const groupable = key === REMINDER_GROUP_KEY || Boolean(ACTIVITY_TYPE_META[key]);
    const isReminderGroup = key === REMINDER_GROUP_KEY;

    if (groupable && items.length > threshold) {
      /*
        `tipo` lleva la clave del grupo (un `tipo_actividad` del embudo, o la
        clave de recordatorios): `metaForType` sabe traducir ambas a su
        etiqueta e ícono. `isReminder` le dice a la pantalla de grupo que estas
        tarjetas van con su fila propia (deslizable), no con `ActionableCard`.
      */
      cells.push({ kind: 'group', tipo: key, isReminder: isReminderGroup, events: items });
    } else {
      items.forEach((event) => cells.push({ kind: 'single', event }));
    }
  });

  return cells;
}
