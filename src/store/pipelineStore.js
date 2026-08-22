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

/** Las tres etapas que hoy tienen tarjeta propia en la agenda. */
export const PIPELINE_STAGES = {
  CITA_INICIAL: 'cita_inicial',
  PROPUESTA: 'cita_propuesta',
  CIERRE: 'cita_cierre',
};

/** Las tres resoluciones posibles al cerrar cualquier etapa del embudo. */
export const PIPELINE_RESOLUTIONS = {
  ADVANCE: 'advance',
  MORE_TIME: 'more_time',
  DISQUALIFY: 'disqualify',
};

/**
 * Router de ventas puro: dado en qué etapa se resolvió una cita y qué
 * botón se tocó, decide qué debe abrirse después — el "Efecto Dominó".
 * No toca `localStorage`, no llama a `EventContext`, no sabe de React: es
 * la regla de negocio aislada, para poder leerla (o probarla) sin montar
 * ningún componente. Quien la llama —`PipelineCard.jsx`,
 * `PresentationEndModal.jsx`— es responsable de ejecutar el resultado:
 * abrir el `SchedulerModal` (`ActivityForm.jsx`, vía `onRouteToActivity`)
 * pre-llenado con `tipoActividad`, o archivar al prospecto
 * (`onDiscardClient`).
 *
 * Reglas:
 *  - "No califica" (`DISQUALIFY`) siempre archiva, sin importar la etapa.
 *  - "Pide más tiempo" (`MORE_TIME`) siempre crea un Seguimiento.
 *  - "Avanza" (`ADVANCE`) depende de la etapa que se está cerrando:
 *      Cita Inicial → Recordatorio de Propuesta
 *      Propuesta    → Cita de Cierre (con la Prima Anual ya validada)
 *      Cierre       → Recordatorio de Cobro
 *
 * @param {'cita_inicial'|'cita_propuesta'|'cita_cierre'} stage
 * @param {'advance'|'more_time'|'disqualify'} resolution
 * @param {{ primaAnual?: number }} [payload]
 * @returns {{ type: 'schedule', tipoActividad: string, primaAnual?: number } | { type: 'discard' }}
 */
export function resolvePipelineStage(stage, resolution, payload = {}) {
  if (resolution === PIPELINE_RESOLUTIONS.DISQUALIFY) return { type: 'discard' };

  if (resolution === PIPELINE_RESOLUTIONS.MORE_TIME) {
    return { type: 'schedule', tipoActividad: 'seguimiento' };
  }

  switch (stage) {
    case PIPELINE_STAGES.CITA_INICIAL:
      return { type: 'schedule', tipoActividad: PIPELINE_STAGES.PROPUESTA };
    case PIPELINE_STAGES.PROPUESTA:
      return {
        type: 'schedule',
        tipoActividad: PIPELINE_STAGES.CIERRE,
        primaAnual: payload.primaAnual,
      };
    case PIPELINE_STAGES.CIERRE:
      return { type: 'schedule', tipoActividad: 'cobro' };
    default:
      return { type: 'discard' };
  }
}
