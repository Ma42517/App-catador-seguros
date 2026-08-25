/**
 * src/lib/reactivationSchedule.js
 *
 * Calendario de reactivación de un prospecto en pausa: cuándo la app puede
 * volver a proponerlo y cuándo debe dejar de insistir.
 *
 * La primera versión de la recomendación (`PausedProspectsNudge.jsx`)
 * mostraba el pausado más antiguo en cada entrada a "Hoy", para siempre.
 * Eso hostigaba: alguien que acababa de no contestar una llamada aparecía
 * de inmediato, y seguía apareciendo indefinidamente aunque el asesor ya
 * hubiera decidido en la práctica no retomarlo. Aquí vive la regla que lo
 * vuelve una insistencia acotada y con fecha de caducidad.
 *
 * ## Las reglas
 *
 *  1. **Nada durante los primeros 3 días.** Un prospecto recién pausado no
 *     se propone: el asesor todavía lo tiene fresco y no necesita que la app
 *     se lo recuerde.
 *  2. **Tres oportunidades**, a los días 3, 5 y 10 de haber entrado en pausa
 *     (`REACTIVATION_MILESTONES_DAYS`).
 *  3. **Cada oportunidad dura 24 horas.** Si el asesor no decide nada en ese
 *     plazo, la propuesta se retira sola y el prospecto espera al siguiente
 *     hito. No decidir es una respuesta válida: significa "no ahora".
 *  4. **Agotadas las tres, se descarta solo.** Tres avisos ignorados en diez
 *     días son una decisión de hecho, y seguir preguntando lo mismo para
 *     siempre es justo lo que vuelve ruido a las sugerencias.
 *
 * Los hitos se miden desde que el prospecto entró en pausa (`archivedAt`) y
 * no desde la última oferta: así el ciclo completo siempre termina el día 10,
 * sin importar en qué momento el asesor abrió la app.
 *
 * Módulo puro, sin React ni `localStorage`: recibe un registro y un reloj, y
 * devuelve en qué punto del calendario está. Eso permite leer la regla
 * completa de un vistazo —y probarla— sin montar ningún componente.
 */

/** Días desde la pausa en que se ofrece retomar al prospecto. */
export const REACTIVATION_MILESTONES_DAYS = [3, 5, 10];

/** Cuánto sigue en pantalla una oportunidad antes de retirarse sola. */
export const OFFER_WINDOW_MS = 24 * 60 * 60 * 1000;

const DAY_MS = 86400000;

/**
 * En qué punto del calendario está un prospecto en pausa.
 *
 * @param {{archivedAt?: number, offersShown?: number, lastOfferAt?: number}} record
 * @param {number} [now] Reloj a usar; se inyecta para poder probarlo.
 * @returns {{status: 'waiting'|'due'|'showing'|'exhausted', offersShown: number, attempt: number, totalAttempts: number, daysUntilNext?: number}}
 *   - `waiting`: todavía no le toca; `daysUntilNext` dice cuántos días faltan.
 *   - `due`: le toca ahora y nadie se lo ha propuesto en este hito.
 *   - `showing`: tiene una oportunidad abierta, dentro de sus 24 horas.
 *   - `exhausted`: usó sus tres oportunidades sin respuesta; toca descartarlo.
 */
export function evaluateReactivation(record, now = Date.now()) {
  const totalAttempts = REACTIVATION_MILESTONES_DAYS.length;
  const offersShown = Number(record?.offersShown) || 0;
  const lastOfferAt = Number(record?.lastOfferAt) || 0;
  /*
    Sin `archivedAt` se asume "ahora": un registro sin fecha (dato viejo,
    escrito antes de que existiera este calendario) queda en espera en vez de
    proponerse de golpe o descartarse por sorpresa.
  */
  const pausedAt = Number(record?.archivedAt) || now;

  const base = { offersShown, attempt: offersShown, totalAttempts };

  // Hay una oportunidad abierta: sigue en pantalla hasta cumplir sus 24 horas.
  if (lastOfferAt && now - lastOfferAt < OFFER_WINDOW_MS) {
    return { ...base, status: 'showing' };
  }

  // Si ya se usaron las tres y la última expiró sin respuesta, se acabó.
  if (offersShown >= totalAttempts) {
    return { ...base, status: 'exhausted' };
  }

  const milestoneDays = REACTIVATION_MILESTONES_DAYS[offersShown];
  const daysPaused = (now - pausedAt) / DAY_MS;

  if (daysPaused >= milestoneDays) {
    // `attempt` es 1-based de cara a quien lo muestre ("Intento 2 de 3").
    return { ...base, status: 'due', attempt: offersShown + 1 };
  }

  return {
    ...base,
    status: 'waiting',
    attempt: offersShown + 1,
    daysUntilNext: Math.max(1, Math.ceil(milestoneDays - daysPaused)),
  };
}
