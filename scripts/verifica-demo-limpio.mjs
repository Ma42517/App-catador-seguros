/**
 * scripts/verifica-demo-limpio.mjs
 *
 * Comprueba las dos reglas nuevas sin abrir un navegador:
 *
 *   1. Los datos de ejemplo NO sobreviven una recarga.
 *   2. Los datos capturados a mano SÍ sobreviven.
 *
 * La segunda es la que de verdad hay que vigilar: una limpieza demasiado ansiosa
 * borraría media hora de captura de un asesor, y el síntoma sería idéntico al bug
 * que se venía a arreglar.
 *
 *   node scripts/verifica-demo-limpio.mjs
 */
import { purgeDemoState } from '../src/lib/demoSession.js';
import { createEmptyState, hasCapturedData } from '../src/data/defaults.js';
import { createDemoState } from '../src/data/demoData.js';

/** localStorage de mentira, con lo mínimo que usa purgeDemoState. */
function fakeStorage(entries = {}) {
  const map = new Map(Object.entries(entries));
  return {
    get length() { return map.size; },
    key(i) { return [...map.keys()][i] ?? null; },
    getItem(k) { return map.has(k) ? map.get(k) : null; },
    removeItem(k) { map.delete(k); },
    setItem(k, v) { map.set(k, v); },
    _keys() { return [...map.keys()]; },
  };
}

const STATE_KEY = 'df360:state:v1';
let fallos = 0;

function check(nombre, condicion) {
  console.log(`${condicion ? '  ok  ' : ' FALLA'}  ${nombre}`);
  if (!condicion) fallos += 1;
}

function conStorage(entries, fn) {
  const store = fakeStorage(entries);
  global.window = { localStorage: store };
  fn(store);
  delete global.window;
}

console.log('\nLimpieza del estado de ejemplo\n');

// 1. El ejemplo se borra.
conStorage(
  { [STATE_KEY]: JSON.stringify({ data: createDemoState(), isDemo: true }) },
  (store) => {
    purgeDemoState();
    check('el estado de ejemplo se borra al arrancar', store.getItem(STATE_KEY) === null);
  },
);

// 2. Lo capturado a mano se queda. Esta es la que protege el trabajo real.
const capturado = { ...createEmptyState(), profile: { ...createEmptyState().profile, name: 'Luis Ramírez' } };
conStorage(
  { [STATE_KEY]: JSON.stringify({ data: capturado, isDemo: false }) },
  (store) => {
    purgeDemoState();
    check('lo capturado a mano NO se borra', store.getItem(STATE_KEY) !== null);
  },
);

// 3. Sobrevive a una subida de versión de la clave.
conStorage(
  { 'df360:state:v7': JSON.stringify({ data: createDemoState(), isDemo: true }) },
  (store) => {
    purgeDemoState();
    check('encuentra el ejemplo aunque la clave suba de versión',
      store.getItem('df360:state:v7') === null);
  },
);

// 4. Una entrada corrupta no impide limpiar las demás.
conStorage(
  {
    'df360:state:roto': '{{{ no es json',
    [STATE_KEY]: JSON.stringify({ data: createDemoState(), isDemo: true }),
  },
  (store) => {
    purgeDemoState();
    check('un JSON corrupto no aborta la limpieza', store.getItem(STATE_KEY) === null);
  },
);

// 5. No toca claves ajenas.
conStorage(
  { 'df360:captureMode:v1': 'v2', 'otra:cosa': 'x' },
  (store) => {
    purgeDemoState();
    check('no toca preferencias ni claves ajenas', store._keys().length === 2);
  },
);

// 6. Sin window (SSR) no truena.
try {
  delete global.window;
  purgeDemoState();
  check('sin window no lanza', true);
} catch {
  check('sin window no lanza', false);
}

console.log('\n¿Hay datos capturados?\n');

check('un estado vacío NO cuenta como capturado', hasCapturedData(createEmptyState()) === false);
check('el ejemplo SÍ cuenta como capturado', hasCapturedData(createDemoState()) === true);
check('un nombre escrito cuenta', hasCapturedData(capturado) === true);
check('sólo espacios en el nombre no cuentan',
  hasCapturedData({ ...createEmptyState(), profile: { name: '   ' } }) === false);
check('un ingreso cuenta',
  hasCapturedData({ ...createEmptyState(), incomes: [{ id: 'a', amount: 100 }] }) === true);
check('un dato indefinido no truena', hasCapturedData(undefined) === false);

console.log(fallos === 0 ? '\nTodo en orden.\n' : `\n${fallos} comprobación(es) fallando.\n`);
process.exit(fallos === 0 ? 0 : 1);
