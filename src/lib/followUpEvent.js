import { prospectNameFrom } from './prospectText';
import { PIPELINE_STAGES } from '../store/pipelineStore';

/**
 * src/lib/followUpEvent.js
 *
 * Constructor único del evento de "Seguimiento".
 *
 * El Seguimiento es el puente universal del embudo: cualquier etapa que no
 * se concrete desemboca en uno, y por eso lo crean muchos sitios distintos
 * —el menú de opciones de cualquier tarea (`TaskOptionsSheet.jsx`), el
 * feedback de una llamada (`CallFeedbackModal.jsx`), y las tarjetas de
 * Emisión, Entrega y Cobro cuando el trámite se atora—. Con cada uno
 * armando el objeto a mano, bastaba que a alguno se le olvidara
 * `followUpReason` o escribiera el título con otro formato para que
 * `FollowUpCard.jsx` mostrara "Seguimiento pendiente" sin decir de dónde
 * venía, o para que `prospectNameFrom` no pudiera recuperar el nombre.
 *
 * Aquí se garantizan las cuatro cosas que esa tarjeta necesita: el
 * `tipo_actividad` correcto, el título en el formato `"Etiqueta: Nombre"`
 * que usa toda la agenda, el teléfono heredado del evento de origen —para
 * que llamar y escribir por WhatsApp funcionen desde el primer momento, sin
 * volver a capturarlo— y el motivo que se lee como subtítulo.
 *
 * @param {object} sourceEvent Evento del que nace el seguimiento; de él se heredan nombre, teléfono y prima.
 * @param {{date: string, time: string, reason?: string}} options
 * @returns {object} Evento listo para `addEvent` de `EventContext`.
 */
export function buildFollowUpEvent(sourceEvent, { date, time, reason } = {}) {
  const name = prospectNameFrom(sourceEvent?.title);

  return {
    type: 'actividad',
    tipo_actividad: PIPELINE_STAGES.SEGUIMIENTO,
    title: `Seguimiento: ${name}`,
    telefono: sourceEvent?.telefono ?? '',
    date,
    time,
    /*
      Prioridad máxima, igual que toda "Nueva Actividad"
      (`ACTIVITY_PRIORITY` en `ActivityForm.jsx`): un seguimiento es un paso
      del embudo que la propia persona decidió agendar, no una nota
      opcional — y sólo lo de prioridad máxima llega a la pantalla de "Hoy"
      (`highPriorityToday`, `EventContext.jsx`), que es justo donde tiene
      que aparecer para que no se olvide.
    */
    priority: 'maxima',
    followUpReason: reason?.trim() || 'Seguimiento pendiente',
    // La prima ya validada sigue viajando: si este prospecto vuelve al
    // embudo más adelante, el monto acordado no se perdió en el camino.
    ...(sourceEvent?.primaAnual && { primaAnual: sourceEvent.primaAnual }),
  };
}

/**
 * Motivo por omisión según de qué etapa viene, para que el subtítulo diga
 * algo útil incluso si la persona no escribe nada. Se deja aquí y no en
 * cada componente para que las frases no se contradigan entre sí.
 */
export const FOLLOW_UP_REASONS = {
  [PIPELINE_STAGES.CITA]: 'La cita no se concretó',
  [PIPELINE_STAGES.CITA_INICIAL]: 'Pidió más tiempo tras la Cita Inicial',
  [PIPELINE_STAGES.PROPUESTA]: 'Pidió ajustes a su propuesta',
  [PIPELINE_STAGES.EMISION]: 'La emisión de la póliza sigue pendiente',
  [PIPELINE_STAGES.CIERRE]: 'El cierre no se concretó',
  [PIPELINE_STAGES.ENTREGA]: 'La entrega de la póliza sigue pendiente',
  [PIPELINE_STAGES.COBRO]: 'El cobro de la prima sigue pendiente',
  [PIPELINE_STAGES.SEGUIMIENTO]: 'Sigue sin concretarse',
  llamada: 'Contestó, pero pidió más tiempo',
};

/** Motivo por omisión de una etapa; cae a un texto neutro si no está en el mapa. */
export function followUpReasonFor(stage) {
  return FOLLOW_UP_REASONS[stage] ?? 'Seguimiento pendiente';
}
