import { useState, useEffect } from 'react';

/** Cada cuánto se revisa el reloj de arena — tal como pide el pedido: cada minuto. */
const CHECK_INTERVAL_MS = 60_000;

/** Minutos de gracia tras terminar la cita, antes del auto-archivo. */
export const PENALTY_GRACE_MIN = 30;

/** Últimos minutos antes del castigo en los que la tarjeta avisa con el borde ámbar. */
const WARNING_WINDOW_MIN = 10;

const PENALTY_GRACE_MS = PENALTY_GRACE_MIN * 60_000;
const WARNING_WINDOW_MS = WARNING_WINDOW_MIN * 60_000;

/**
 * src/lib/useHourglassTimer.js
 *
 * "Reloj de Arena" de la Cita Inicial: vigila si ya pasaron los 30 minutos
 * de gracia después de `endTime` sin que el asesor haya iniciado la sesión
 * de presentación (`sessionStarted`).
 *
 * "Seguro de Vida": en cuanto `sessionStarted` es `true`, el reloj se apaga
 * por completo —ni siquiera sigue corriendo el `setInterval`— e `isExpired`
 * se queda en `false` para siempre. Es una pausa permanente: este hook no
 * vuelve a vigilar aunque `sessionStarted` regresara a `false` más adelante,
 * que es justo lo que pide "dejarlo trabajar si la cita se alarga".
 *
 * `endTime` puede llegar como `null` (evento sin fecha/hora válida, ver
 * `computeEndTime` en `appointmentTime.js`): sin una hora de fin no hay nada
 * que vigilar, así que tampoco expira nunca.
 *
 * Se revisa cada minuto y no en cada render —misma decisión que ya
 * documenta `useNow.js`, con un intervalo más corto porque aquí el umbral
 * que importa avisar (los últimos 10 minutos antes del castigo) es más
 * ajustado que el de aquel reloj general.
 *
 * @param {number|null} endTime Marca de tiempo (ms) en la que termina la cita.
 * @param {boolean} sessionStarted Si el asesor ya inició la sesión de presentación.
 * @returns {{isExpired: boolean, isWarning: boolean, minutesUntilPenalty: number|null}}
 */
export default function useHourglassTimer(endTime, sessionStarted) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (sessionStarted || !endTime) return undefined;
    const id = setInterval(() => setNow(Date.now()), CHECK_INTERVAL_MS);
    return () => clearInterval(id);
  }, [sessionStarted, endTime]);

  if (sessionStarted || !endTime) {
    return { isExpired: false, isWarning: false, minutesUntilPenalty: null };
  }

  const deadline = endTime + PENALTY_GRACE_MS;
  const isExpired = now > deadline;
  const isWarning = !isExpired && now > deadline - WARNING_WINDOW_MS;
  const minutesUntilPenalty = isExpired ? 0 : Math.max(0, Math.ceil((deadline - now) / 60_000));

  return { isExpired, isWarning, minutesUntilPenalty };
}
