import Tooltip from './Tooltip';

/*
  Formateador de moneda, creado una sola vez.

  `Intl.NumberFormat` es caro de construir y esto se vuelve a pintar en cada pixel que se
  arrastra el deslizador: instanciarlo dentro del render sería fabricar y tirar un
  formateador por fotograma, con cinco palancas a la vez.

  Con dos decimales a propósito, y es lo contrario de lo que hace el resto de la app: aquí
  el número se mueve mientras la mano arrastra, y sin decimales fijos el ancho del texto
  cambia de un fotograma a otro y la cifra da saltos laterales.
*/
const MXN = new Intl.NumberFormat('es-MX', {
  style: 'currency',
  currency: 'MXN',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const currency = (v) => MXN.format(Number.isFinite(v) ? v : 0);

const TRACKS = {
  indigo: 'rgb(99 102 241)',
  emerald: 'rgb(16 185 129)',
  amber: 'rgb(245 158 11)',
};

/**
 * Deslizador para el Scenario Engine. Recalcula en cada movimiento:
 * el valor se propaga en cada `change`, no al soltar.
 */
export default function Slider({
  label, value, onChange, min = 0, max = 100, step = 1,
  format = (v) => v, help, tone = 'indigo',
  /*
    Traducción a pesos de lo que hace la palanca. `null` cuando todavía no mueve nada.

    Es la razón de ser de este bloque: un "+15 %" no dice nada sobre la propia economía, y
    los tres escenarios se veían iguales porque nadie relacionaba el porcentaje con su
    dinero. Al lado, "+$4,200 de ingreso al mes" sí se compara con lo que se gana.
  */
  money = null, moneyNote, moneyGood = true,
}) {
  const pct = max === min ? 0 : ((value - min) / (max - min)) * 100;
  const color = TRACKS[tone] ?? TRACKS.indigo;
  const active = pct > 0;

  /*
    El signo y el color dicen dos cosas distintas, y por eso son dos props.

    El signo sigue a la CIFRA: subir el ingreso es "+", recortar el gasto es "−", porque es
    lo que le pasa a ese número. El color dice si eso te CONVIENE, y no siempre coincide: un
    "−$1,200" de gasto es una buena noticia y va en verde, mientras que un "+$3,000" de
    ingreso requerido por más inflación es una mala y va en rojo. Amarrar el color al signo
    habría pintado de rojo justamente los recortes que se buscan.
  */
  const hasMoney = money !== null && money !== undefined && Math.abs(money) >= 1;

  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between gap-2">
        <span className="flex items-center gap-1 text-[11px] font-medium uppercase tracking-wide text-zinc-400">
          {label}
          {help && <Tooltip text={help} />}
        </span>
        <span
          className={`rounded-lg px-2 py-0.5 text-xs font-bold tabular-nums transition-colors ${
            active ? 'bg-indigo-500/15 text-indigo-300' : 'text-zinc-500'
          }`}
        >
          {format(value)}
        </span>
      </div>

      {/*
        El monto va ENCIMA del riel y no debajo: al arrastrar con el dedo, la mano tapa
        justamente la franja de abajo, que es donde se habría puesto por costumbre.
      */}
      {hasMoney && (
        <div className="mb-1.5 flex items-baseline gap-1.5">
          <span
            className={`text-base font-extrabold tabular-nums leading-none ${
              moneyGood ? 'text-emerald-400' : 'text-rose-400'
            }`}
          >
            {money > 0 ? '+' : '−'}{currency(Math.abs(money))}
          </span>
          {moneyNote && (
            <span className="text-[10px] leading-none text-zinc-500">{moneyNote}</span>
          )}
        </div>
      )}
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="range-dark"
        style={{
          background:
            `linear-gradient(to right, ${color} ${pct}%, rgb(51 65 85) ${pct}%)`,
        }}
      />
    </div>
  );
}
