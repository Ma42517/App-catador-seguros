import { useState, useEffect } from 'react';

/**
 * src/store/pipelineStore.js
 *
 * "Motor de Embudo de Ventas": store global con la misma forma de API que
 * Zustand (`usePipelineStore()`, `getPipelineState()`, `upsertProspect()`)
 * pero sin la dependencia — el proyecto no trae `zustand` en
 * `package.json`, y el resto de la app resuelve el estado global con
 * Context (`EventContext.jsx`, `AccessContext.jsx`...). En vez de instalar
 * una librería nueva sólo para este módulo, se implementa el mismo patrón
 * con un puñado de líneas: un estado en memoria, un conjunto de
 * suscriptores, y un hook que se re-renderiza al cambiar. El día que se
 * instale `zustand` de verdad, este archivo es el único que hay que
 * reescribir — nada que lo consume conoce la diferencia, porque ya usa el
 * mismo contrato (`create()` de Zustand también expone un hook que
 * devuelve el estado completo).
 *
 * No persiste en `localStorage` a propósito: es un tablero en memoria de
 * "por dónde va cada prospecto hoy", útil mientras la pestaña está abierta
 * (la Prima Anual capturada en "Cierre Exitoso", por ejemplo, vive aquí
 * para que quien complete el Kit de Entrega pueda leerla). El estatus
 * definitivo de "descartado" sigue viviendo en `data/prospectStatus.js`,
 * que sí persiste — este store es el tablero en vivo, no el archivo.
 */

const listeners = new Set();

/** `{ [prospectId]: { id, name, phone, status, primaAnual? } }` */
let state = { prospects: {} };

function setState(patch) {
  state = { ...state, ...(typeof patch === 'function' ? patch(state) : patch) };
  listeners.forEach((listener) => listener(state));
}

/** Lectura no reactiva, para código que no es un componente (pruebas, funciones puras). */
export function getPipelineState() {
  return state;
}

/** Suscripción cruda; el hook de abajo es la forma normal de usar esto desde un componente. */
export function subscribePipeline(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/**
 * Hook de lectura reactiva. Sin selector, a propósito: ningún componente de
 * este proyecto lee tantos prospectos a la vez como para que un
 * re-render de más importe, y un selector habría sido complejidad sin
 * beneficio real hoy.
 */
export function usePipelineStore() {
  const [, forceRender] = useState(0);
  useEffect(() => subscribePipeline(() => forceRender((n) => n + 1)), []);
  return state;
}

/** Registra o actualiza el estatus de un prospecto dentro del embudo. */
export function upsertProspect(prospect) {
  if (!prospect?.id) return;
  setState((current) => ({
    prospects: {
      ...current.prospects,
      [prospect.id]: { ...current.prospects[prospect.id], ...prospect },
    },
  }));
}

/**
 * Las etapas del embudo. Los valores son exactamente los mismos
 * `tipo_actividad` que escribe `ActivityForm.jsx` y que leen las tarjetas
 * de `ActionableCard.jsx`: una sola nomenclatura para el motor y para la
 * agenda, así el resultado del router se puede pasar tal cual como
 * `tipo_actividad` del evento nuevo sin ninguna traducción intermedia.
 *
 * `EMISION` es la única que no aparece en el catálogo de "Nueva Actividad":
 * es un estado interno que sólo genera el propio motor (ver
 * `ProposalCard.jsx`), nunca algo que el asesor pueda teclear.
 */
export const PIPELINE_STAGES = {
  CITA: 'cita',
  CITA_INICIAL: 'cita_inicial',
  PROPUESTA: 'cita_propuesta',
  EMISION: 'recordatorio_emision',
  CIERRE: 'cita_cierre',
  ENTREGA: 'entrega_poliza',
  COBRO: 'cobro',
  SEGUIMIENTO: 'seguimiento',
};

/** Las tres resoluciones posibles al cerrar cualquier etapa del embudo. */
export const PIPELINE_RESOLUTIONS = {
  ADVANCE: 'advance',
  MORE_TIME: 'more_time',
  DISQUALIFY: 'disqualify',
};

/**
 * A qué etapa avanza cada una cuando se resuelve como "avanza".
 *
 * Mapa y no `switch`: las 6 transiciones del embudo se leen de un vistazo,
 * en orden, y agregar una etapa nueva es una línea más aquí en vez de otro
 * `case` perdido entre la lógica. `SEGUIMIENTO` queda fuera del mapa a
 * propósito — es el único puente universal y su destino no es fijo, lo
 * elige quien resuelve (ver `resolvePipelineStage`).
 */
const ADVANCE_MAP = {
  [PIPELINE_STAGES.CITA]: PIPELINE_STAGES.CITA_INICIAL,
  [PIPELINE_STAGES.CITA_INICIAL]: PIPELINE_STAGES.PROPUESTA,
  [PIPELINE_STAGES.PROPUESTA]: PIPELINE_STAGES.EMISION,
  [PIPELINE_STAGES.EMISION]: PIPELINE_STAGES.CIERRE,
  [PIPELINE_STAGES.CIERRE]: PIPELINE_STAGES.COBRO,
  [PIPELINE_STAGES.ENTREGA]: PIPELINE_STAGES.COBRO,
};

/**
 * Etapas a las que puede saltar un Seguimiento.
 *
 * El Seguimiento es el puente universal del embudo: ahí aterriza cualquier
 * "pidió más tiempo", venga de la etapa que venga, así que al retomarlo el
 * prospecto puede entrar a cualquier fase — no necesariamente a la que
 * seguía cuando se pausó. `COBRO` y `EMISION` quedan fuera: el primero
 * sólo nace de una póliza ya entregada y el segundo es un estado interno
 * que el motor genera solo, ninguno de los dos es un destino que tenga
 * sentido elegir a mano desde un Seguimiento.
 */
export const FOLLOW_UP_TARGETS = [
  PIPELINE_STAGES.CITA_INICIAL,
  PIPELINE_STAGES.PROPUESTA,
  PIPELINE_STAGES.CIERRE,
  PIPELINE_STAGES.ENTREGA,
  PIPELINE_STAGES.SEGUIMIENTO,
];

/**
 * Router de ventas puro: dado en qué etapa se resolvió una cita y qué
 * botón se tocó, decide qué debe abrirse después — el "Efecto Dominó".
 * No toca `localStorage`, no llama a `EventContext`, no sabe de React: es
 * la regla de negocio aislada, para poder leerla (o probarla) sin montar
 * ningún componente. Quien la llama —`ClosingCard.jsx`,
 * `FollowUpResolutionModal.jsx`, `PresentationEndModal.jsx`— es
 * responsable de ejecutar el resultado:
 * abrir el formulario de actividad pre-llenado con `tipoActividad`
 * (`ActivityForm.jsx`, vía `onRouteToActivity`), o archivar al prospecto
 * (`onDiscardClient`).
 *
 * Reglas, en orden de precedencia:
 *  - "No califica" (`DISQUALIFY`) siempre archiva, sin importar la etapa.
 *  - "Pide más tiempo" (`MORE_TIME`) siempre crea un Seguimiento — es el
 *    embudo entero desembocando en el mismo puente.
 *  - "Avanza" (`ADVANCE`) sigue `ADVANCE_MAP`, salvo desde un Seguimiento,
 *    donde el destino lo elige quien resuelve (`payload.targetStage`).
 *
 * @param {string} stage Una de `PIPELINE_STAGES`.
 * @param {'advance'|'more_time'|'disqualify'} resolution
 * @param {{ primaAnual?: number, targetStage?: string }} [payload]
 * @returns {{ type: 'schedule', tipoActividad: string, primaAnual?: number } | { type: 'discard' }}
 */
export function resolvePipelineStage(stage, resolution, payload = {}) {
  if (resolution === PIPELINE_RESOLUTIONS.DISQUALIFY) return { type: 'discard' };

  if (resolution === PIPELINE_RESOLUTIONS.MORE_TIME) {
    return { type: 'schedule', tipoActividad: PIPELINE_STAGES.SEGUIMIENTO };
  }

  /*
    Puente universal: un Seguimiento no tiene una única etapa siguiente, así
    que su destino viaja en el payload. Sin `targetStage` se cae a otro
    Seguimiento —nunca a una etapa inventada—: "lo retomé y sigue sin
    concretarse" es un desenlace legítimo y frecuente.
  */
  if (stage === PIPELINE_STAGES.SEGUIMIENTO) {
    const target = FOLLOW_UP_TARGETS.includes(payload.targetStage)
      ? payload.targetStage
      : PIPELINE_STAGES.SEGUIMIENTO;
    return { type: 'schedule', tipoActividad: target, primaAnual: payload.primaAnual };
  }

  const next = ADVANCE_MAP[stage];
  // Una etapa desconocida no archiva al prospecto por su cuenta: se cae al
  // Seguimiento, que es el destino seguro —nunca se pierde el contacto por
  // un valor que el motor no supo interpretar.
  if (!next) return { type: 'schedule', tipoActividad: PIPELINE_STAGES.SEGUIMIENTO };

  return { type: 'schedule', tipoActividad: next, primaAnual: payload.primaAnual };
}
