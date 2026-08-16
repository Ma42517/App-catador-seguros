/**
 * src/data/historicalRates.js
 * Tasas sugeridas por tipo de activo, de meta y de vehículo de ahorro.
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
 * ─────────────────────────────────────────────────────────────────────────────
 * `null` SIGNIFICA "NO HAY SUGERENCIA", Y ES UN VALOR DE PRIMERA CLASE.
 *
 * No es un hueco por llenar: es la respuesta correcta cuando el rendimiento no se
 * puede deducir de la etiqueta. "Otro activo" y "Otra meta" son, por definición, lo que
 * no cupo en las demás opciones; "Negocios" va del quiebre al triple del capital. Poner
 * un 8 % ahí no ayuda a capturar, afirma algo que nadie sostiene, y encima lo afirma
 * con la autoridad de venir impreso en verde. En esos casos el campo abre vacío y espera.
 * ─────────────────────────────────────────────────────────────────────────────
 */

/**
 * Rendimiento nominal anual sugerido, por tipo de activo.
 *
 * De dónde sale la única que tiene referencia pública:
 *
 *   AFORE — 7 %. El histórico del SAR desde 1997 ronda el 10.6 % nominal, pero ese
 *   número arrastra los años de inflación alta de los noventa y no sirve para proyectar
 *   hacia adelante: en la última década las siefores básicas promediaron 6.54 % nominal
 *   y 1.90 % real. Se usa 7 % porque es el régimen en el que de verdad va a vivir el
 *   ahorro del prospecto. Con la inflación de 4.5 % de esta app, deja una tasa real de
 *   ~2.4 %, coherente con ese 1.90 % observado.
 *     https://www.eleconomista.com.mx/los-especiales/Afores-ranking-de-rendimientos-para-millennials-20230224-0025.html
 *     https://www.elfinanciero.com.mx/empresas/2026/02/05/afore-xxi-banorte-rendimientos-de-2025-refuerzan-al-sar-como-principal-vehiculo-de-ahorro-a-largo-plazo/
 *
 *   CETES — 7.5 %. Siguen el ciclo de tasas de Banxico, así que el número de hoy no
 *   sirve como supuesto de treinta años: bajos entre 2014 y 2016, máximos en 2023, a la
 *   baja en 2025. Se usa un promedio de ciclo completo, muy por debajo del rendimiento
 *   puntual de un CETE a 28 días.
 *     https://www.rankia.mx/blog/cetes/7061567-evolucion-rendimiento-cetes-mexico
 */
export const ASSET_RATE_BY_TYPE = {
  // El efectivo no rinde. Ponerle cualquier tasa sería el error más caro de la tabla:
  // proyecta como inversión un dinero que la inflación sólo puede encoger.
  cash: 0,
  bank: 0.015,

  /*
    El fondo de emergencia rinde lo que rinda la cuenta donde esté, y casi siempre está
    en una cuenta de banco: tiene que poder sacarse mañana. Antes tenía un 4 % propio,
    que le suponía un instrumento de mayor rendimiento que nadie había dicho que
    existiera.
  */
  emergency_fund: 0.015,

  cetes: 0.075,
  stocks: 0.09,
  etf: 0.08,

  /*
    Las tres cuentas de retiro iban juntas en un solo 10.5 %, y no se parecen: una Afore
    es una siefore con su régimen de inversión publicado, un PPR es el contrato que cada
    aseguradora o casa de bolsa arma aparte, y "otra cuenta de retiro" es lo que quede
    fuera. Sólo la primera tiene un histórico público al que agarrarse.
  */
  afore: 0.07,
  ppr: null,
  retirement: null,

  real_estate: 0.06,

  // Un negocio va del quiebre a multiplicar el capital. No hay promedio que signifique algo.
  business: null,

  // Por definición es lo que no cupo en las opciones anteriores.
  other: null,
};

/**
 * Inflación anual sugerida, por tipo de meta.
 *
 * Son inflaciones del BIEN, no del índice general: lo que sube el precio de aquello que
 * se quiere comprar. Es la razón de que la educación no lleve el mismo número que un viaje.
 */
export const GOAL_INFLATION_BY_PRESET = {
  /*
    La educación se encarece más rápido que el índice general, y es la meta que más se
    captura en esta app. Usar el 4.5 % general para la universidad de un hijo subestima
    el costo futuro justo donde el error se paga con más años de ahorro.
  */
  education: 0.07,
  home: 0.06,
  car: 0.05,
  travel: 0.05,
  investment: 0.045,
  business: 0.045,
  retirement: 0.045,

  // "Otra meta" puede ser una boda, una cirugía o un terreno. No se sabe qué se infla.
  other: null,
};

/** Inflación general de largo plazo. El suelo de la tabla de metas. */
export const GENERAL_INFLATION = 0.045;

/**
 * Dónde se guarda el ahorro de una meta, y lo que rinde cada sitio.
 *
 * El rendimiento de una meta no lo decide la meta: lo decide el instrumento donde se
 * aparta el dinero. Antes había un 8 % fijo para todas, que daba por hecho un portafolio
 * diversificado incluso cuando el ahorro iba a una cuenta de nómina al 1.5 %.
 *
 * Puestas una al lado de la otra son, además, la conversación completa: la diferencia
 * entre juntar para la universidad en el banco y hacerlo en un plan de ahorro se ve en
 * la aportación mensual que el motor calcula, sin que nadie tenga que argumentarla.
 */
export const SAVINGS_VEHICLES = [
  { value: 'bank', label: 'Cuenta bancaria', rate: 0.015 },
  { value: 'savings_plan', label: 'Plan de ahorro', rate: 0.05 },
  { value: 'cetes', label: 'CETES / Bonos', rate: 0.075 },
  { value: 'fund', label: 'Fondo de inversión / ETF', rate: 0.08 },
  { value: 'other', label: 'Otro instrumento', rate: null },
];

const VEHICLE_RATE = Object.fromEntries(SAVINGS_VEHICLES.map((v) => [v.value, v.rate]));

/** Vehículo con el que abre una meta nueva: el más conservador de la lista. */
export const DEFAULT_SAVINGS_VEHICLE = 'bank';

/**
 * Tasa sugerida de un tipo de activo. `null` si no hay una que signifique algo.
 *
 * Un tipo desconocido —dato viejo, o una opción añadida al motor y no a esta tabla—
 * devuelve `null` y no el genérico de antes: ante la duda, campo vacío y que lo llene
 * quien sepa, en lugar de una cifra inventada con cara de dato.
 */
export function rateForAssetType(type) {
  return ASSET_RATE_BY_TYPE[type] ?? null;
}

/** Inflación sugerida de un tipo de meta. `null` si no hay referencia. */
export function inflationForGoalPreset(preset) {
  return GOAL_INFLATION_BY_PRESET[preset] ?? null;
}

/** Rendimiento sugerido del vehículo donde se guarda el ahorro de una meta. */
export function returnForSavingsVehicle(vehicle) {
  return VEHICLE_RATE[vehicle] ?? null;
}

/**
 * Valor que se guarda cuando no hay sugerencia.
 *
 * Cero y no `null`: el motor espera números y `null` se colaría hasta una multiplicación.
 * En el formulario, un cero se dibuja como campo vacío —`NumberInput` trata el 0 como
 * borrador en blanco— así que se ve como lo que es, una pregunta sin contestar.
 */
export function rateOrBlank(rate) {
  return rate ?? 0;
}

/**
 * ¿La tasa guardada es la sugerida para ese tipo, o la escribió alguien?
 *
 * Decide con qué cara abre el campo al corregir un registro. Sin sugerencia, siempre
 * manual: no hay nada a lo que volver.
 *
 * Se compara con holgura porque son decimales de coma flotante: `0.045` guardado y
 * recalculado puede diferir en el último bit, y una comparación exacta marcaría como
 * "manual" una tasa que nadie tocó, dejando de seguir al tipo sin motivo.
 */
export function isSuggestedRate(value, suggested) {
  if (suggested === null || suggested === undefined) return false;
  return Math.abs((value ?? 0) - suggested) < 1e-9;
}
