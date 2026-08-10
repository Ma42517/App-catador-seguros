import { useState, useEffect } from 'react';

/** Cada cuánto se relee el reloj. */
const DEFAULT_INTERVAL_MS = 30_000;

/**
 * Reloj que provoca un render cada cierto tiempo.
 *
 * Hace falta porque el estado de una tarjeta —normal, próxima o vencida— no
 * depende de sus datos sino de la hora, y React no vuelve a pintar por su
 * cuenta cuando el reloj avanza. Sin esto, una cita de las 18:00 abierta desde
 * las 17:00 seguiría mostrándose como "normal" toda la tarde.
 *
 * Medio minuto es el equilibrio: el umbral que se vigila son 30 minutos, así
 * que un desfase máximo de 30 segundos es imperceptible, y a la vez son sólo
 * dos renders por minuto en lugar de sesenta.
 */
export default function useNow(intervalMs = DEFAULT_INTERVAL_MS) {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);

  return now;
}
