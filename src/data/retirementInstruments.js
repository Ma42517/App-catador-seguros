/**
 * src/data/retirementInstruments.js
 * Proyección del ahorro para el retiro en tres instrumentos.
 *
 * Responde la pregunta que de verdad mueve una venta: no "cuánto te falta", sino "con lo
 * mismo que puedes aportar, cuánto tendrías según dónde lo pongas". La brecha sola deja al
 * prospecto sin salida; esto le pone tres salidas al lado.
 *
 * Las cuentas usan las primitivas del motor —`toMonthlyRate`, `futureValue`, `fvAnnuity`— y
 * no fórmulas nuevas: son las mismas con las que se calcula el resto del diagnóstico, así que
 * una cifra de aquí no puede contradecir una de allá.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * SOBRE EL SUPUESTO DEL DÓLAR, QUE ES EL FRÁGIL.
 *
 * "El peso se deprecia contra el dólar" parece un hecho y es una elección de ventana. La
 * depreciación anualizada del tipo de cambio, calculada hasta 2026:
 *
 *     desde 1994   →  +5.23 % anual   (arrastra el "error de diciembre")
 *     desde 2000   →  +2.35 % anual
 *     desde 2008   →  +2.53 % anual
 *     desde 2015   →  +0.82 % anual
 *     desde 2020   →  −3.46 % anual   (el peso se APRECIÓ)
 *
 * Y en los doce meses previos a enero de 2026 el peso se apreció alrededor del 16 %.
 *
 * Se usa 2.5 %: es donde se juntan las ventanas de dos décadas, excluye la crisis del 94 y no
 * da por hecho que la apreciación reciente se revierta. Elegir el 5.23 % habría doblado la
 * proyección en dólares con un número igual de "histórico" y mucho menos honesto.
 * ─────────────────────────────────────────────────────────────────────────────
 */
import { toMonthlyRate, futureValue, fvAnnuity } from '../engine/finance.js';

/** Inflación mexicana de largo plazo con la que se descuenta el poder de compra. */
export const LONG_RUN_INFLATION = 0.045;

/**
 * Inflación de largo plazo en Estados Unidos.
 *
 * El objetivo de la Reserva Federal es 2 %, y su presidencia lo ha reiterado como compromiso
 * irrestricto. Se usa 2.5 % para no suponer que lo cumple exactamente todos los años durante
 * veinticuatro.
 */
export const US_INFLATION = 0.025;

/**
 * Depreciación del peso frente al dólar: SE DERIVA, no se elige.
 *
 * Es el número más manipulable de todo el archivo, y por eso no se escribe a mano. La
 * depreciación anualizada observada depende por completo de la ventana:
 *
 *     desde 1994  →  +5.23 %      desde 2015  →  +0.82 %
 *     desde 2000  →  +2.35 %      desde 2020  →  −3.46 %  (el peso se APRECIÓ)
 *     desde 2008  →  +2.53 %
 *
 * Y a agosto de 2026 el peso cotiza cerca de 17.06 por dólar, su nivel más fuerte en 26 meses.
 * Con ese abanico, cualquier cifra "histórica" es una elección disfrazada de dato.
 *
 * Así que se calcula por paridad de poder de compra relativa, que es el marco estándar para el
 * largo plazo: a treinta años el tipo de cambio sigue al DIFERENCIAL DE INFLACIÓN entre los dos
 * países. Con los supuestos que ya usa esta app —4.5 % en México, 2.5 % en Estados Unidos—
 * salen ~1.95 % anual.
 *
 * Dos ventajas sobre un número fijo: es defendible con teoría en lugar de con una ventana
 * elegida, y si alguien ajusta la inflación de la app, la depreciación se ajusta con ella en
 * lugar de quedarse contradiciéndola.
 */
export const PESO_DEPRECIATION = (1 + LONG_RUN_INFLATION) / (1 + US_INFLATION) - 1;

/**
 * Rendimiento REAL de los UDIBONOS. Aquí hubo una corrección importante.
 *
 * Se venía usando 2 %, que es el ejemplo con el que se planteó la función, y subestimaba el
 * instrumento a la mitad. Los UDIBONOS son deuda del gobierno federal indizada a la inflación,
 * y sus tasas reales observadas andan bastante más arriba: el bono a 30 años se ha citado en
 * 5.21 % real, y Hacienda colocó su referencia real a 3 años en 5.015 %.
 *
 * Se usa 4 %: por debajo de lo observado, dejando margen para comisiones de la casa de bolsa o
 * de la afore, que es lo que el prospecto no ve en la tasa de subasta.
 *
 * La consecuencia importa y va en contra de lo que se esperaría de una herramienta de venta:
 * con el dato real, los UDIS proyectan POR ENCIMA de un portafolio equilibrado en dólares, y con
 * mucho menos riesgo. El 2 % anterior hacía ver mejor al dólar sólo porque castigaba a las UDIS.
 */
const UDIS_REAL_RETURN = 0.04;

/**
 * Rendimiento nominal de un portafolio equilibrado en dólares.
 *
 * Es el supuesto más blando de los tres: no hay una tasa de subasta que citar, depende de la
 * mezcla contratada, y es el único que además carga riesgo de mercado y de tipo de cambio.
 */
const USD_PORTFOLIO_RETURN = 0.06;

/**
 * Los tres instrumentos, con su tasa nominal compuesta.
 *
 * Se compone en lugar de sumar: 4.5 % de inflación más 2 % real no son 6.5 %, son
 * (1.045 × 1.02) − 1 = 6.59 %. La diferencia es pequeña en un año y no lo es en veinticuatro.
 */
export const RETIREMENT_INSTRUMENTS = [
  {
    key: 'cash',
    label: 'Ahorro tradicional',
    short: 'En pesos, bajo el colchón o en cuenta de nómina',
    nominalRate: 0,
    parts: [],
    tone: 'rose',
    note: 'No genera rendimiento: sólo se acumula lo que aportas. La inflación se lo come '
      + 'año con año.',
  },
  {
    key: 'udis',
    label: 'Inversión en UDIS',
    short: 'Instrumentos indizados a la inflación',
    nominalRate: (1 + LONG_RUN_INFLATION) * (1 + UDIS_REAL_RETURN) - 1,
    parts: [
      { label: 'Inflación cubierta', value: LONG_RUN_INFLATION },
      { label: 'Rendimiento real', value: UDIS_REAL_RETURN },
    ],
    tone: 'emerald',
    note: 'La UDI sigue a la inflación, así que tu dinero conserva su poder de compra y el '
      + 'rendimiento real se suma encima.',
  },
  {
    key: 'usd',
    label: 'Inversión en dólares',
    short: 'Portafolio equilibrado en USD',
    nominalRate: (1 + PESO_DEPRECIATION) * (1 + USD_PORTFOLIO_RETURN) - 1,
    parts: [
      { label: 'Depreciación del peso', value: PESO_DEPRECIATION },
      { label: 'Rendimiento en dólares', value: USD_PORTFOLIO_RETURN },
    ],
    tone: 'indigo',
    /*
      El aviso de riesgo va en el instrumento, no en una nota al pie.

      Es el único de los tres que depende de dos variables fuera de control —el tipo de cambio
      y el mercado estadounidense— y el único que puede rendir MENOS que su proyección si el
      peso se fortalece, como lleva haciendo desde 2020. Presentarlo sin eso al lado sería
      vender un rendimiento como si fuera un dato.
    */
    note: 'Depende del tipo de cambio y del mercado: si el peso se fortalece, rinde menos de '
      + 'lo proyectado, y lleva haciéndolo desde 2020. Es el escenario con más riesgo de los '
      + 'tres y, con estos supuestos, proyecta por debajo de las UDIS.',
  },
];

/**
 * Proyecta un instrumento a la fecha de retiro.
 *
 * @param instrument         Uno de `RETIREMENT_INSTRUMENTS`.
 * @param monthlyContribution Aportación mensual.
 * @param currentSavings     Lo ya acumulado hoy.
 * @param months             Meses hasta el retiro.
 */
export function projectInstrument(instrument, monthlyContribution, currentSavings, months) {
  const monthly = toMonthlyRate(instrument.nominalRate);

  const total = futureValue(currentSavings, monthly, months)
    + fvAnnuity(monthlyContribution, monthly, months);

  /*
    Lo aportado de su bolsillo, que es la cifra con la que se compara todo lo demás: incluye
    el saldo que ya tenía, porque también salió de su bolsillo en su momento.
  */
  const contributed = currentSavings + monthlyContribution * months;

  /*
    Se recorta a cero por si acaso. Con tasa cero, `total` y `contributed` son iguales y la
    resta puede dar un negativo de coma flotante que se dibujaría como "-$0" de rendimiento.
  */
  const earned = Math.max(0, total - contributed);

  /*
    El mismo monto, en pesos de hoy. Es lo que hace visible el costo de no invertir: el ahorro
    tradicional termina con un número grande que compra bastante menos de lo que parece.
  */
  const years = months / 12;
  const realValue = total / (1 + LONG_RUN_INFLATION) ** years;

  return {
    total, contributed, earned, realValue, share: total > 0 ? earned / total : 0,
  };
}
