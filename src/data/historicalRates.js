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

  /*
    El PPR no tiene una tasa propia: la tiene el portafolio que se contrató dentro. Su
    sugerencia sale de `PPR_PROFILES`, más abajo, no de esta tabla. El `null` es lo que
    obliga a elegir perfil antes de que aparezca una cifra.
  */
  ppr: null,

  retirement: null,

  /*
    Bienes raíces: 7.5 %, y sólo PLUSVALÍA.

    Dos conversiones que hay que hacer para que este número signifique algo:

    1) DE REAL A NOMINAL. El crecimiento del valor de la vivienda en México se cita como
       3–5 % ANUAL REAL. Esta tabla es nominal —el motor descuenta la inflación por su
       cuenta— así que meter aquí un 4 % descontaría la inflación dos veces y proyectaría
       una casa creciendo por debajo de los precios. Con la inflación de 4.5 % de la app:
       1.03 × 1.045 − 1 ≈ 7.6 %. Se usa 7.5 %, el extremo bajo del rango, que deja una
       tasa real de ~2.9 %.

    2) SIN LA RENTA. La rentabilidad bruta por renta —5–8 %, y 7–10 % en la Ciudad de
       México— NO va aquí. En esta app la renta se captura como ingreso pasivo en el
       módulo de Ingresos, que es donde entra al flujo mensual. Sumarla también a la
       plusvalía contaría el mismo dinero dos veces: una vez como flujo y otra como
       valor del inmueble, y el patrimonio proyectado saldría inflado sin que nada en
       pantalla lo delatara.

    Quien invierta en una ciudad con plusvalía más alta que el promedio la escribe a mano.
  */
  real_estate: 0.075,

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
 * Perfiles de portafolio de un PPR, con su rendimiento histórico nominal.
 *
 * Un PPR es un envase, no una inversión: lo que rinde es lo que se contrató dentro. Un
 * PPR en renta fija y otro en renta variable pueden separarse cuatro o cinco puntos al
 * año, que en un horizonte de veinte años es la mitad del capital final. Sugerir una
 * sola cifra para los tres sería repetir el error del 10.5 % que agrupaba Afore y PPR.
 *
 * Se toma el punto medio de cada rango histórico: renta fija 4–7 %, mixto 6–10 %, renta
 * variable 8–12 %. El punto medio y no el techo: en un diagnóstico que se le entrega al
 * prospecto, pasarse de optimista se paga con un plan que no se cumple.
 *
 * Nota fiscal que esta app todavía no modela: las aportaciones a un PPR son deducibles
 * hasta el límite de la Ley del ISR, así que su rendimiento después de impuestos es
 * mayor que el que se ve aquí. Se captura como el rendimiento del instrumento, sin ese
 * beneficio, y por eso el número queda del lado conservador.
 */
export const PPR_PROFILES = [
  { value: 'fixed', label: 'Renta fija (bonos, CETES)' },
  { value: 'mixed', label: 'Mixto (bonos y acciones)' },
  { value: 'equity', label: 'Renta variable (acciones, ETFs)' },
];

/**
 * Moneda del PPR. Muchos planes de aseguradora se contratan en dólares.
 *
 * NO CONVIERTE MONTOS: el diagnóstico entero se captura y se calcula en pesos. Lo único
 * que cambia con la moneda es el rendimiento sugerido, y cambia porque tiene que
 * cambiar: una tasa nominal lleva dentro la inflación de su divisa, así que el 5.5 % de
 * un fondo de deuda en pesos y el 4 % de uno en dólares no son dos opiniones sobre el
 * mismo instrumento, son dos monedas distintas.
 */
export const PPR_CURRENCIES = [
  { value: 'MXN', label: 'Pesos (MXN)' },
  { value: 'USD', label: 'Dólares (USD)' },
];

/**
 * Rendimiento nominal por moneda y perfil.
 *
 * MXN — puntos medios de los rangos históricos: renta fija 4–7 %, mixto 6–10 %, renta
 * variable 8–12 %.
 *
 * USD — rendimientos de largo plazo del mercado estadounidense, más bajos en nominal
 * porque la inflación del dólar es menor que la del peso. Son estimaciones de mercado,
 * no un dato con fuente citada: deuda ~4 %, cartera equilibrada ~6.5 %, acciones ~9 %.
 *
 * OJO CON LO QUE NO INCLUYE EL RENGLÓN DEL DÓLAR. Es el rendimiento EN dólares. Como el
 * proyectado se muestra en pesos, deja fuera la depreciación histórica del peso frente
 * al dólar, que a un plan en dólares le ha sumado rendimiento medido en pesos. Se
 * excluye a propósito: meter un supuesto de tipo de cambio a treinta años sería
 * inventar la variable más volátil del cálculo. La consecuencia es que un PPR en dólares
 * se proyecta CONSERVADOR, y eso es preferible a lo contrario en un documento que el
 * prospecto se lleva a casa.
 */
const PPR_RATE = {
  MXN: { fixed: 0.055, mixed: 0.08, equity: 0.10 },
  USD: { fixed: 0.04, mixed: 0.065, equity: 0.09 },
};

/** Perfil con el que abre un PPR nuevo: el intermedio, que es el más contratado. */
export const DEFAULT_PPR_PROFILE = 'mixed';

/** Moneda por omisión: la del resto del diagnóstico. */
export const DEFAULT_PPR_CURRENCY = 'MXN';

/** Rendimiento sugerido de un PPR, según su moneda y su perfil de portafolio. */
export function returnForPprProfile(profile, currency = DEFAULT_PPR_CURRENCY) {
  return PPR_RATE[currency]?.[profile] ?? null;
}

/**
 * Tasa sugerida de un activo completo, no sólo de su tipo.
 *
 * Existe porque el PPR necesita mirar dos campos más —moneda y perfil— y quien pregunta
 * no tiene por qué saber cuáles activos son especiales. Un solo punto de entrada evita
 * que una pantalla consulte la tabla por tipo y se salte el perfil.
 */
export function suggestedRateForAsset(asset) {
  if (!asset) return null;
  if (asset.type === 'ppr') {
    return returnForPprProfile(asset.portfolioProfile, asset.pprCurrency);
  }
  return rateForAssetType(asset.type);
}

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
