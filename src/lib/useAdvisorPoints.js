import { useState, useEffect, useRef, useCallback } from 'react';
import { readPoints, writePoints } from '../data/advisorPoints';

/**
 * Puntos del asesor, reactivos y persistidos por usuario.
 *
 * Calcado del patrón de `GoalsContext.jsx` (leer al montar, releer si cambia
 * `username`, y un `useRef` que evita escribir con el estado inicial antes de
 * que `username` esté resuelto) pero sin un contexto propio: hoy sólo `Gate`
 * y `OnboardingPreview` (`App.jsx`) necesitan este valor, y ambos ya son el
 * punto de partida de la cadena de props que baja hasta `TodayView`. Si en el
 * futuro una pantalla más profunda necesita leer los puntos sin que se los
 * pasen, este hook se puede envolver en un contexto sin tocar
 * `data/advisorPoints.js`.
 *
 * @param {string} username - Clave de la persona (`identity.key` o `PREVIEW_KEY`).
 * @returns {[number, (amount: number) => void]} Puntos actuales y una función
 *   para sumarles una cantidad (puede ser fraccionada en el futuro; hoy sólo
 *   se usa con `1`, ver `FirstLoginIntro.jsx`).
 */
export default function useAdvisorPoints(username) {
  const [points, setPoints] = useState(() => readPoints(username));
  const loadedFor = useRef(username);

  useEffect(() => {
    loadedFor.current = username;
    setPoints(readPoints(username));
  }, [username]);

  const addPoints = useCallback((amount) => {
    setPoints((current) => {
      const next = current + amount;
      // Mismo resguardo que `GoalsContext`: no persistir si el usuario ya
      // cambió entre el momento en que se llamó y el momento en que se
      // aplica, porque estaríamos escribiendo en la cuenta equivocada.
      if (loadedFor.current === username) writePoints(username, next);
      return next;
    });
  }, [username]);

  return [points, addPoints];
}
