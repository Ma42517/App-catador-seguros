import {
  createContext, useContext, useState, useEffect, useCallback, useMemo, useRef,
} from 'react';
import {
  readGoals, writeGoals, makeGoal, withProgress, withoutLastEntry,
} from '../data/goals';

/**
 * Estado global de las metas.
 *
 * Vive en un contexto y no dentro de la vista porque estos datos están pensados
 * para consumirse desde fuera: el sistema de avisos necesitará leer fechas
 * límite y porcentajes sin que la pantalla de metas esté abierta. Cualquier
 * pieza futura los obtiene con `useGoals()` en lugar de volver a leer
 * localStorage por su cuenta.
 *
 * Se persiste por usuario en cada cambio.
 */
const GoalsContext = createContext(null);

export function GoalsProvider({ username, children }) {
  const [goals, setGoals] = useState(() => readGoals(username));

  // Evita que el primer efecto sobrescriba lo guardado con el estado inicial
  // cuando todavía no hay usuario resuelto.
  const loadedFor = useRef(username);

  useEffect(() => {
    loadedFor.current = username;
    setGoals(readGoals(username));
  }, [username]);

  useEffect(() => {
    if (loadedFor.current !== username) return;
    writeGoals(username, goals);
  }, [username, goals]);

  const addGoal = useCallback((draft) => {
    const goal = makeGoal(draft);
    if (!goal) return null;
    // Las nuevas arriba: es la que se acaba de crear y la que se quiere ver.
    setGoals((prev) => [goal, ...prev]);
    return goal;
  }, []);

  const updateGoal = useCallback((id, draft) => {
    setGoals((prev) => prev.map((goal) => {
      if (goal.id !== id) return goal;
      // Se conservan `entries` y `createdAt`: editar el enunciado de una meta no
      // borra el avance que ya se registró.
      const rebuilt = makeGoal({ ...goal, ...draft });
      if (!rebuilt) return goal;
      return {
        ...rebuilt,
        id: goal.id,
        entries: goal.entries ?? [],
        createdAt: goal.createdAt,
        completedAt: goal.completedAt,
      };
    }));
  }, []);

  const removeGoal = useCallback((id) => {
    setGoals((prev) => prev.filter((goal) => goal.id !== id));
  }, []);

  /**
   * Registra un avance y devuelve la meta ya actualizada, para que quien lo
   * llama pueda decidir el mensaje sin esperar al siguiente render.
   */
  const addProgress = useCallback((id, amount) => {
    let updated = null;
    setGoals((prev) => prev.map((goal) => {
      if (goal.id !== id) return goal;
      updated = withProgress(goal, amount);
      return updated;
    }));
    return updated;
  }, []);

  const undoLastProgress = useCallback((id) => {
    setGoals((prev) => prev.map(
      (goal) => (goal.id === id ? withoutLastEntry(goal) : goal),
    ));
  }, []);

  const value = useMemo(() => ({
    goals,
    addGoal,
    updateGoal,
    removeGoal,
    addProgress,
    undoLastProgress,
  }), [goals, addGoal, updateGoal, removeGoal, addProgress, undoLastProgress]);

  return <GoalsContext.Provider value={value}>{children}</GoalsContext.Provider>;
}

export function useGoals() {
  const ctx = useContext(GoalsContext);
  if (!ctx) throw new Error('useGoals debe usarse dentro de <GoalsProvider>');
  return ctx;
}
