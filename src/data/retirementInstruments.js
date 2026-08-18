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

/** Inflación de largo plazo con la que se descuenta el poder de compra. */
export const LONG_RUN_INFLATION = 0.045;

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
    nominalRate: (1 + LONG_RUN_INFLATION) * (1 + 0.02) - 1,
    parts: [
      { label: 'Inflación cubierta', value: LONG_RUN_INFLATION },
      { label: 'Rendimiento real', value: 0.02 },
    ],
    tone: 'emerald',
    note: 'La UDI sigue a la inflación, así que tu dinero conserva su poder de compra y el '
      + 'rendimiento real se suma encima.',
  },
  {
    key: 'usd',
    label: 'Inversión en dólares',
    short: 'Portafolio equilibrado en USD',
    nominalRate: (1 + 0.025) * (1 + 0.06) - 1,
    parts: [
      { label: 'Depreciación del peso', value: 0.025 },
      { label: 'Rendimiento en dólares', value: 0.06 },
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
      + 'lo proyectado. Es el escenario con más riesgo de los tres.',
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
