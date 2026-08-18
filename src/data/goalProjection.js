/**
 * src/data/goalProjection.js
 * La pregunta inversa de una meta: "con lo que puedo aportar, ¿cuánto me falta?".
 *
 * El motor contesta "necesitas $2,460 al mes para lograrla en 5 años". Es correcto y es la
 * pregunta que nadie hace: quien está sentado frente al asesor sabe cuánto puede apartar, no
 * cuánto debería. Aquí se voltea el cálculo —dado lo que aporta, qué alcanza y cuándo— que es
 * lo que permite decir "así no llegas, y esto es lo que falta".
 *
 * SE APOYA EN `analyzeGoal` DEL MOTOR, no en fórmulas propias. Es lo que garantiza que el
 * "requerido" que se muestre aquí sea el mismo número que ya aparece en la tarjeta de la meta:
 * con una copia de la fórmula, cualquier ajuste al motor dejaría las dos pantallas discutiendo
 * entre ellas delante del prospecto.
 */
import {
  analyzeGoal, futureValue, fvAnnuity, toMonthlyRate, num,
} from '../engine/finance.js';

/**
 * Tope de la búsqueda del plazo: cien años.
 *
 * Hace falta un tope porque la meta puede ser inalcanzable de verdad. Si el bien se encarece
 * más rápido de lo que crece el ahorro —una meta al 7 % de inflación financiada en una cuenta
 * al 1.5 %— la brecha nunca cierra, y sin tope el bucle no termina.
 */
const MAX_MONTHS = 1200;

/**
 * Meses que tomaría alcanzar la meta con una aportación dada.
 *
 * Se resuelve iterando mes a mes en lugar de con una fórmula cerrada, y no es pereza: los dos
 * lados de la ecuación crecen con el tiempo —el costo por la inflación del bien, el ahorro por
 * su rendimiento— y despejar el plazo de ahí no tiene solución algebraica. Iterar por mes da
 * exactamente la precisión que se muestra en pantalla ("3 años y 2 meses") y cuesta, en el peor
 * caso, mil doscientas multiplicaciones.
 *
 * Devuelve `null` cuando no se alcanza dentro del tope: es "nunca" dicho con honestidad, y el
 * llamador lo distingue de un cero.
 */
function monthsToReach({ costToday, saved, inflation, expectedReturn, contribution }) {
  const monthlyRate = toMonthlyRate(expectedReturn);

  for (let n = 0; n <= MAX_MONTHS; n += 1) {
    const years = n / 12;
    const need = futureValue(costToday, inflation, years);
    const have = futureValue(saved, expectedReturn, years)
      + fvAnnuity(contribution, monthlyRate, n);

    if (have >= need) return n;
  }

  return null;
}

/**
 * Proyecta una meta con la aportación que la persona puede hacer.
 *
 * @param goal         Meta tal como está en el estado (cost, currentSavings, years, inflation,
 *                     expectedReturn).
 * @param contribution Aportación mensual planeada.
 */
export function projectGoal(goal, contribution) {
  const planned = Math.max(0, num(contribution));
  const analysis = analyzeGoal(goal);

  const {
    costToday, saved, futureCost, projectedSavings, months, monthlyRequired,
    inflation, expectedReturn,
  } = analysis;

  const monthlyRate = toMonthlyRate(expectedReturn);

  /*
    Lo que se tendría el día del vencimiento: el ahorro ya guardado, ya crecido, más lo que
    sumen las aportaciones. Es la misma composición que usa el motor para el requerido, sólo
    que con la aportación real en lugar de la necesaria.
  */
  const accumulated = projectedSavings + fvAnnuity(planned, monthlyRate, months);

  const shortfall = futureCost - accumulated;
  const isEnough = shortfall <= 0;

  const monthsNeeded = monthsToReach({
    costToday, saved, inflation, expectedReturn, contribution: planned,
  });

  return {
    /** Costo del bien al vencimiento, ya inflado. */
    futureCost,
    /** Aportación que el motor pide para lograrla en el plazo elegido. */
    monthlyRequired,
    /** Lo que se acumularía con la aportación planeada. */
    accumulated,
    /** Positivo = falta dinero. Negativo = sobra. */
    shortfall: Math.abs(shortfall),
    isEnough,
    /** Cuánto más habría que aportar cada mes para cerrarla en el plazo. */
    missingMonthly: Math.max(0, monthlyRequired - planned),
    /** Plazo real con esa aportación. `null` si no se alcanza. */
    monthsNeeded,
    /** Proporción del costo futuro que se cubre. */
    coverage: futureCost > 0 ? Math.min(1, accumulated / futureCost) : 1,
    months,
  };
}

/**
 * "3 años y 2 meses". Sin el año cuando no llega, sin el "0 meses" cuando es exacto.
 *
 * Se redacta así y no como "3.17 años" porque un plazo con decimales no se puede visualizar:
 * nadie sabe cuánto es 0.17 de un año, y sí sabe qué son dos meses.
 */
export function formatMonths(months) {
  if (months === null || months === undefined) return null;
  if (months <= 0) return 'ya la tienes cubierta';

  const y = Math.floor(months / 12);
  const m = months % 12;

  const yearPart = y > 0 ? `${y} año${y === 1 ? '' : 's'}` : '';
  const monthPart = m > 0 ? `${m} mes${m === 1 ? '' : 'es'}` : '';

  if (yearPart && monthPart) return `${yearPart} y ${monthPart}`;
  return yearPart || monthPart;
}
