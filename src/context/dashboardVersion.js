import { createContext, useContext } from 'react';
import { readPreference, writePreference } from '../lib/uiPreference';

/**
 * Qué versión del diagnóstico se está viendo: la actual o el rediseño.
 *
 * Vive en un contexto y no en el propio tablero porque hay dos sitios que la
 * deciden y están lejos uno del otro: el menú "Ver más" —que la elige antes de
 * navegar— y el interruptor de pruebas que está dentro del tablero. Con un estado
 * local en el tablero, el menú no habría podido tocarlo sin pasar la elección por
 * media docena de componentes que no tienen nada que ver.
 *
 * Es un módulo sin JSX a propósito: aquí sólo viven el contexto, su lectura y las
 * dos opciones. El proveedor se monta en `App.jsx`, que es quien tiene el estado.
 */

/** Las dos versiones, en el orden en que se ofrecen. */
export const DASHBOARD_VERSIONS = [
  { value: 'v1', label: 'Diagnóstico V1 (Actual)', short: 'Versión actual (V1)' },
  { value: 'v2', label: 'Diagnóstico V2 (Nueva Propuesta)', short: 'Rediseño (V2)' },
];

/**
 * Dónde se recuerda la elección.
 *
 * La clave lleva `:v2` porque cambió el valor por omisión. La versión anterior
 * guardaba `v2` en `df360:dashboardView:v1`, así que a quien ya había abierto la
 * app le habría quedado grabado el rediseño —que todavía es un lienzo vacío— y el
 * nuevo arranque en la versión actual no habría surtido efecto para nadie. Con
 * clave nueva, todos empiezan en V1 salvo que elijan lo contrario.
 */
const STORAGE_KEY = 'df360:dashboardVersion:v2';

const VALUES = DASHBOARD_VERSIONS.map((v) => v.value);

/** La versión guardada, o la actual si no hay ninguna válida. */
export function readVersion() {
  return readPreference(STORAGE_KEY, VALUES, 'v1');
}

export function writeVersion(version) {
  writePreference(STORAGE_KEY, version);
}

/*
  El valor por omisión del contexto no es un hueco: es la versión actual y una
  función que no hace nada. Así, un tablero montado por accidente fuera del
  proveedor muestra el diagnóstico de siempre en lugar de romperse, que es el modo
  correcto de fallar para una prueba A/B.
*/
export const DashboardVersionContext = createContext({
  version: 'v1',
  setVersion: () => {},
});

export function useDashboardVersion() {
  return useContext(DashboardVersionContext);
}
