import {
  Phone, CalendarCheck, Calendar, FileText, Handshake, FileSignature,
  Package, DollarSign, RefreshCw, Bell,
} from 'lucide-react';

/*
  Umbral de agrupamiento. A partir de MÁS de este número de actividades del
  mismo tipo, se colapsan en una sola tarjeta de grupo. Pedido explícito del
  usuario: la pantalla principal nunca debe mostrar más de 4 tarjetas de un
  mismo tipo, para que la app no se "trabe" ni se sienta abrumadora. Con 4 o
  menos se muestran sueltas; con 5 o más, se agrupan.
*/
export const GROUP_THRESHOLD = 4;

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
  Fallback para recordatorios y eventos viejos sin `tipo_actividad`. Nunca se
  agrupan entre sí (no son etapas del embudo), pero necesitan una entrada para
  que el agrupador los reconozca y los deje pasar sueltos.
*/
const FALLBACK_META = { singular: 'Actividad', plural: 'Actividades', icon: Bell };

/** Devuelve la etiqueta/ícono de un tipo, o el fallback si no se reconoce. */
export function metaForType(tipo) {
  return ACTIVITY_TYPE_META[tipo] ?? FALLBACK_META;
}

/*
  Clave de agrupamiento de un evento. Sólo las actividades del embudo (con
  `tipo_actividad` reconocido) pueden agruparse; todo lo demás —recordatorios,
  eventos sin tipo— recibe una clave única por `id` para que jamás se agrupe
  con otro, aunque haya muchos.
*/
function groupKey(event) {
  /*
    Sólo las actividades del embudo VIVAS se agrupan. Una ya completada se deja
    suelta (clave única por `id`) porque en la agenda se pinta tachada con su
    propia fila —no con la tarjeta del embudo que lleva el grupo—, así que
    meterla al grupo la mandaría a `ActionableCard`, que asume una tarea por
    resolver. En "Hoy" los completados ni siquiera llegan (la lista los filtra),
    de modo que esta guarda sólo cambia algo en la agenda, que es donde conviven
    vivos y completados.
  */
  if (event.tipo_actividad && ACTIVITY_TYPE_META[event.tipo_actividad] && !event.completed) {
    return event.tipo_actividad;
  }
  return `__solo__${event.id}`;
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
    const tipo = items[0].tipo_actividad;
    const groupable = Boolean(tipo && ACTIVITY_TYPE_META[tipo]);

    if (groupable && items.length > threshold) {
      cells.push({ kind: 'group', tipo, events: items });
    } else {
      items.forEach((event) => cells.push({ kind: 'single', event }));
    }
  });

  return cells;
}
