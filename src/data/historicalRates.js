/**
 * src/data/historicalRates.js
 * Tasas sugeridas por tipo de activo y por tipo de meta.
 *
 * SON SUPUESTOS POR OMISIÓN, EDITABLES, NO UN DATO EN VIVO.
 *
 * La app no consulta ninguna fuente al abrir el formulario: son promedios de largo
 * plazo escritos aquí a mano. Se dicen así en pantalla —"promedio histórico"— y el
 * asesor puede sustituir cualquiera por la cifra del instrumento concreto que esté
 * vendiendo. Presentarlas como una consulta a Banxico o a CONSAR sería mentir sobre su
 * origen, y en un diagnóstico que el prospecto se lleva impreso eso importa.
 *
 * Todas son NOMINALES y anuales, en pesos. El motor descuenta la inflación por su
 * cuenta con la tasa real, así que meter aquí cifras ya descontadas contaría el efecto
 * dos veces.
 *
 * De dónde salen las dos que sí tienen referencia pública:
 *
 *  - Retiro (Afore / PPR): el rendimiento histórico nominal del SAR ronda el 10.7 %
 *    según Afore XXI Banorte, y el 10.62 % según el recuento de El Economista de 2023.
 *    Se usa 10.5 % para no quedar por encima de ninguno de los dos.
 *    https://www.elfinanciero.com.mx/empresas/2026/02/05/afore-xxi-banorte-rendimientos-de-2025-refuerzan-al-sar-como-principal-vehiculo-de-ahorro-a-largo-plazo/
 *    https://www.eleconomista.com.mx/los-especiales/Afores-ranking-de-rendimientos-para-millennials-20230224-0025.html
 *
 *  - CETES: siguen el ciclo de tasas de Banxico, así que su número de hoy no sirve
 *    como supuesto de treinta años: estuvieron bajos entre 2014 y 2016, tocaron máximos
 *    en 2023 y volvieron a bajar en 2025. Se usa 7.5 % como promedio de ciclo completo,
 *    bastante por debajo del rendimiento puntual de un CETE a 28 días.
 *
 * El resto son supuestos de mercado razonables y conservadores. El asesor los cambia
 * en un toque; el objetivo es que la captura no se detenga, no acertarle al decimal.
 */

/** Rendimiento nominal anual sugerido, por tipo de activo. */
export const ASSET_RATE_BY_TYPE = {
  // El efectivo no rinde. Ponerle cualquier tasa sería el error más caro de la tabla:
  // proyecta como inversión un dinero que la inflación sólo puede encoger.
  cash: 0,
  bank: 0.015,
  // Tiene que estar disponible mañana, así que vive en instrumentos de liquidez
  // inmediata: rinde algo, pero no se le pide el rendimiento de una inversión.
  emergency_fund: 0.04,
  cetes: 0.075,
  stocks: 0.09,
  etf: 0.08,
  retirement: 0.105,
  real_estate: 0.06,
  business: 0.10,
  other: 0.08,
};

/** Inflación anual sugerida, por tipo de meta. */
export const GOAL_INFLATION_BY_PRESET = {
  /*
    La educación se infla más rápido que el índice general, y es la meta que más se
    captura en esta app. Usar el 4.5 % general para la universidad de un hijo subestima
    el costo futuro justo en el caso donde el error se paga con más años de ahorro.
  */
  education: 0.07,
  home: 0.06,
  car: 0.05,
  travel: 0.05,
  investment: 0.045,
  business: 0.045,
  retirement: 0.045,
  other: 0.045,
};

/** Inflación general de largo plazo: el suelo de la tabla de metas. */
export const GENERAL_INFLATION = GOAL_INFLATION_BY_PRESET.other;

/** Rendimiento sugerido para el ahorro de una meta: portafolio diversificado. */
export const GOAL_EXPECTED_RETURN = 0.08;

/** Tasa sugerida de un tipo de activo. Cae al genérico si el tipo no está en la tabla. */
export function rateForAssetType(type) {
  const rate = ASSET_RATE_BY_TYPE[type];
  return rate === undefined ? ASSET_RATE_BY_TYPE.other : rate;
}

/** Inflación sugerida de un tipo de meta. */
export function inflationForGoalPreset(preset) {
  const rate = GOAL_INFLATION_BY_PRESET[preset];
  return rate === undefined ? GENERAL_INFLATION : rate;
}

/**
 * ¿La tasa guardada es la sugerida para ese tipo, o la escribió alguien?
 *
 * Decide con qué cara abre el campo al corregir un registro. Se compara con holgura
 * porque son decimales de coma flotante: `0.045` guardado y recalculado puede diferir
 * en el último bit, y una comparación exacta marcaría como "manual" una tasa que nadie
 * tocó, dejando de seguir al tipo sin motivo.
 */
export function isSuggestedRate(value, suggested) {
  return Math.abs((value ?? 0) - suggested) < 1e-9;
}
