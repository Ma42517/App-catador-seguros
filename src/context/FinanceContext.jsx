import {
  createContext, useContext, useReducer, useMemo, useEffect, useCallback,
} from 'react';
import { runDiagnosis, NEUTRAL_SCENARIO } from '../engine/finance';
import { createEmptyState } from '../data/defaults';
import { createDemoState } from '../data/demoData';

const STORAGE_KEY = 'df360:state:v1';

// ─── Estado raíz ────────────────────────────────────────────────────────────

function createInitialState(seed = {}) {
  const empty = createEmptyState();
  const saved = seed?.data && typeof seed.data === 'object' ? seed.data : {};
  return {
    data: {
      ...empty,
      ...saved,
      profile: { ...empty.profile, ...(saved.profile || {}) },
      taxes: { ...empty.taxes, ...(saved.taxes || {}) },
      retirement: { ...empty.retirement, ...(saved.retirement || {}) },
    },
    scenario: { ...NEUTRAL_SCENARIO, ...(seed?.scenario || {}) },
    activeMode: seed?.activeMode || 'current',
    isDemo: !!seed?.isDemo,
  };
}

/** Carga desde localStorage, tolerante a datos corruptos o de versión previa. */
function loadPersisted() {
  const fresh = createInitialState();
  if (typeof window === 'undefined') return fresh;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return fresh;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return fresh;
    return createInitialState(parsed);
  } catch {
    return fresh;
  }
}


// ─── Reducer ────────────────────────────────────────────────────────────────

/** Actualiza un campo de un objeto anidado dentro de `data`. */
function patchSection(state, section, patch) {
  return {
    ...state,
    data: { ...state.data, [section]: { ...state.data[section], ...patch } },
  };
}

/** Operaciones sobre colecciones (incomes, expenses, debts, assets, goals). */
function collectionAdd(state, key, item) {
  return { ...state, data: { ...state.data, [key]: [...state.data[key], item] } };
}
function collectionUpdate(state, key, id, patch) {
  return {
    ...state,
    data: {
      ...state.data,
      [key]: state.data[key].map((row) => (row.id === id ? { ...row, ...patch } : row)),
    },
  };
}
function collectionRemove(state, key, id) {
  return {
    ...state,
    data: { ...state.data, [key]: state.data[key].filter((row) => row.id !== id) },
  };
}

function reducer(state, action) {
  switch (action.type) {
    case 'PATCH_SECTION':
      return patchSection(state, action.section, action.patch);

    case 'SET_FIELD':
      return { ...state, data: { ...state.data, [action.field]: action.value } };

    case 'ADD':
      return collectionAdd(state, action.key, action.item);
    case 'UPDATE':
      return collectionUpdate(state, action.key, action.id, action.patch);
    case 'REMOVE':
      return collectionRemove(state, action.key, action.id);

    case 'SET_SCENARIO':
      return { ...state, scenario: { ...state.scenario, ...action.patch } };
    case 'RESET_SCENARIO':
      return { ...state, scenario: { ...NEUTRAL_SCENARIO } };
    case 'SET_MODE':
      return { ...state, activeMode: action.mode };

    case 'LOAD_DEMO':
      return { data: createDemoState(), scenario: { ...NEUTRAL_SCENARIO }, activeMode: 'current', isDemo: true };
    case 'RESET':
      return createInitialState();
    case 'IMPORT':
      return {
        data: { ...createEmptyState(), ...action.data },
        scenario: { ...NEUTRAL_SCENARIO },
        activeMode: 'current',
        isDemo: false,
      };

    default:
      return state;
  }
}


// ─── Contexto ───────────────────────────────────────────────────────────────

const FinanceContext = createContext(undefined);

export function FinanceProvider({
  children, initialState = null, persist = true, onStateChange,
}) {
  const [state, dispatch] = useReducer(
    reducer,
    initialState,
    (seed) => (seed ? createInitialState(seed) : loadPersisted()),
  );

  // La ruta pública usa `persist={false}`: sus respuestas pertenecen al pase,
  // no a la clave local compartida por el asesor en este navegador.
  useEffect(() => {
    if (!persist) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch { /* modo privado o cuota excedida: se ignora */ }
  }, [state, persist]);

  useEffect(() => {
    onStateChange?.(state);
  }, [state, onStateChange]);

  /**
   * MOTOR DE RECÁLCULO EN TIEMPO REAL.
   * Cualquier cambio en `data`, `scenario` o `activeMode` recalcula
   * la matriz completa. Es la única vía por la que la UI obtiene cifras.
   */
  const diagnosis = useMemo(
    () => runDiagnosis(state.data, state.scenario, state.activeMode),
    [state.data, state.scenario, state.activeMode]
  );

  // ── Acciones ─────────────────────────────────────────────────────────────
  const patchSectionAction = useCallback(
    (section, patch) => dispatch({ type: 'PATCH_SECTION', section, patch }), []);
  const setField = useCallback(
    (field, value) => dispatch({ type: 'SET_FIELD', field, value }), []);

  const add = useCallback((key, item) => dispatch({ type: 'ADD', key, item }), []);
  const update = useCallback(
    (key, id, patch) => dispatch({ type: 'UPDATE', key, id, patch }), []);
  const remove = useCallback((key, id) => dispatch({ type: 'REMOVE', key, id }), []);

  const setScenario = useCallback(
    (patch) => dispatch({ type: 'SET_SCENARIO', patch }), []);
  const resetScenario = useCallback(() => dispatch({ type: 'RESET_SCENARIO' }), []);
  const setMode = useCallback((mode) => dispatch({ type: 'SET_MODE', mode }), []);

  const loadDemoData = useCallback(() => dispatch({ type: 'LOAD_DEMO' }), []);
  const resetAll = useCallback(() => dispatch({ type: 'RESET' }), []);
  const importState = useCallback((data) => dispatch({ type: 'IMPORT', data }), []);


  const value = useMemo(() => ({
    // Datos crudos
    data: state.data,
    profile: state.data.profile,
    incomes: state.data.incomes,
    taxes: state.data.taxes,
    expenses: state.data.expenses,
    debts: state.data.debts,
    assets: state.data.assets,
    goals: state.data.goals,
    retirement: state.data.retirement,

    // Vista
    scenario: state.scenario,
    activeMode: state.activeMode,
    isDemo: state.isDemo,

    // Resultado del motor (siempre fresco)
    diagnosis,
    matrix: diagnosis.matrix,
    scenarios: diagnosis.scenarios,
    findings: diagnosis.findings,
    recommendations: diagnosis.recommendations,

    // Acciones
    patchSection: patchSectionAction,
    setField,
    add,
    update,
    remove,
    setScenario,
    resetScenario,
    setMode,
    loadDemoData,
    resetAll,
    importState,
  }), [state, diagnosis, patchSectionAction, setField, add, update, remove,
    setScenario, resetScenario, setMode, loadDemoData, resetAll, importState]);

  return (
    <FinanceContext.Provider value={value}>{children}</FinanceContext.Provider>
  );
}

export function useFinance() {
  const ctx = useContext(FinanceContext);
  if (ctx === undefined) {
    throw new Error('useFinance debe usarse dentro de un FinanceProvider');
  }
  return ctx;
}
