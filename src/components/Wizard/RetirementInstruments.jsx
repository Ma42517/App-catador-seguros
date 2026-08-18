import { useState } from 'react';
import { TrendingUp, ChevronDown, Info } from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
import { Card, CardTitle, Field, MoneyInput } from '../ui';
import {
  RETIREMENT_INSTRUMENTS, projectInstrument, LONG_RUN_INFLATION,
} from '../../data/retirementInstruments';
import { fmtMXN, fmtPct } from '../../engine/finance';

/*
  Formateador de moneda, creado una vez.

  Aquí sí con decimales a cero: son cifras de siete dígitos proyectadas a veinticuatro años, y
  los centavos en un número así sugieren una precisión que ninguna proyección tiene.
*/
const MXN = new Intl.NumberFormat('es-MX', {
  style: 'currency',
  currency: 'MXN',
  maximumFractionDigits: 0,
});

const TONES = {
  rose: {
    ring: 'border-rose-500/30 bg-rose-500/[0.06]',
    value: 'text-rose-300',
    bar: 'bg-rose-500',
    chip: 'text-rose-400/80',
  },
  emerald: {
    ring: 'border-emerald-500/40 bg-emerald-500/[0.08]',
    value: 'text-emerald-300',
    bar: 'bg-emerald-500',
    chip: 'text-emerald-400/80',
  },
  indigo: {
    ring: 'border-indigo-500/30 bg-indigo-500/[0.06]',
    value: 'text-indigo-300',
    bar: 'bg-indigo-500',
    chip: 'text-indigo-400/80',
  },
};

/**
 * Tarjeta de un instrumento, con su desglose desplegable.
 *
 * El desglose empieza cerrado. El titular es el monto final —es lo que se quiere comparar de
 * un vistazo entre las tres— y abrir los tres a la vez llenaría la pantalla de barras antes de
 * que nadie haya comparado nada. Quien quiere saber de dónde salió el número, lo pide.
 */
function InstrumentCard({ instrument, projection, months }) {
  const [open, setOpen] = useState(false);
  const tone = TONES[instrument.tone];
  const hasEarnings = projection.earned >= 1;

  return (
    <div className={`rounded-xl border p-3.5 ${tone.ring}`}>
      <p className="text-[11px] font-bold uppercase tracking-widest text-zinc-300">
        {instrument.label}
      </p>
      <p className="mt-0.5 text-[10px] leading-snug text-zinc-500">{instrument.short}</p>

      <p className={`mt-2.5 text-xl font-extrabold tabular-nums ${tone.value}`}>
        {MXN.format(projection.total)}
      </p>

      {/*
        El poder de compra va debajo del monto y no escondido en el desglose.

        Es la cifra que desarma la ilusión del ahorro tradicional: termina con un número
        grande que compra mucho menos. Puesta al lado del total, la comparación se hace sola.
      */}
      <p className="mt-1 text-[10px] leading-snug text-zinc-500">
        Equivale a {MXN.format(projection.realValue)} de hoy
      </p>

      {/* Composición del resultado: aportación contra rendimiento. */}
      {hasEarnings && (
        <div className="mt-3">
          <div className="flex h-2 overflow-hidden rounded-full bg-zinc-800">
            <div
              className="bg-zinc-600"
              style={{ width: `${(1 - projection.share) * 100}%` }}
              aria-hidden="true"
            />
            <div className={tone.bar} style={{ width: `${projection.share * 100}%` }} aria-hidden="true" />
          </div>
          <p className={`mt-1.5 text-[10px] font-semibold ${tone.chip}`}>
            {fmtPct(projection.share)} de ese monto es rendimiento
          </p>
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="mt-2.5 flex w-full items-center justify-between gap-2 rounded-lg py-1
                   text-[11px] font-semibold text-zinc-400 transition-colors
                   hover:text-zinc-100 focus-visible:outline-none focus-visible:text-zinc-100"
      >
        Ver desglose
        <ChevronDown
          size={13}
          className={`shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div className="animate-rise mt-1 space-y-2 border-t border-zinc-700/50 pt-2.5">
          <div className="flex items-baseline justify-between gap-2 text-[11px]">
            <span className="text-zinc-400">Lo que tú aportaste</span>
            <span className="font-semibold tabular-nums text-zinc-200">
              {MXN.format(projection.contributed)}
            </span>
          </div>
          <div className="flex items-baseline justify-between gap-2 text-[11px]">
            <span className="text-zinc-400">Lo que ganaste por rendimiento</span>
            <span className={`font-semibold tabular-nums ${tone.value}`}>
              {MXN.format(projection.earned)}
            </span>
          </div>

          {/* Los supuestos, a la vista: quien compara tiene derecho a saber con qué se calculó. */}
          {instrument.parts.length > 0 && (
            <div className="border-t border-zinc-700/50 pt-2">
              {instrument.parts.map((p) => (
                <div key={p.label} className="flex items-baseline justify-between gap-2 text-[10px]">
                  <span className="text-zinc-500">{p.label}</span>
                  <span className="tabular-nums text-zinc-400">{fmtPct(p.value)} anual</span>
                </div>
              ))}
              <div className="mt-1 flex items-baseline justify-between gap-2 text-[10px]">
                <span className="font-semibold text-zinc-400">Tasa nominal usada</span>
                <span className="font-semibold tabular-nums text-zinc-300">
                  {fmtPct(instrument.nominalRate)} anual
                </span>
              </div>
            </div>
          )}

          <p className="border-t border-zinc-700/50 pt-2 text-[10px] leading-relaxed text-zinc-500">
            {instrument.note}
          </p>
          <p className="text-[10px] text-zinc-600">
            {months} aportaciones mensuales
          </p>
        </div>
      )}
    </div>
  );
}

/**
 * Comparativa de instrumentos para el retiro.
 *
 * ES UN SIMULADOR, NO PARTE DE LA CAPTURA. La aportación que se escribe aquí vive en estado
 * local y no toca el diagnóstico: se puede jugar con ella delante del prospecto —"¿y si le
 * subes mil pesos?"— sin alterar ni una cifra de lo que ya capturó. Si escribiera en el
 * estado, cada prueba reescribiría su plan y el número al que llegó dejaría de ser el suyo.
 */
export default function RetirementInstruments() {
  const { matrix } = useFinance();
  const r = matrix.retirement;

  /*
    Arranca con lo que de verdad aporta hoy, tomado de sus cuentas de retiro. Empezar en cero
    obligaría a teclear antes de ver nada, y el valor por omisión ya es la respuesta a "¿y si
    sigo como voy?".
  */
  const [contribution, setContribution] = useState(() => Math.round(r.monthlyContribution));

  const months = r.monthsToRetirement;

  const projections = RETIREMENT_INSTRUMENTS.map((instrument) => ({
    instrument,
    projection: projectInstrument(instrument, contribution, r.currentSavings, months),
  }));

  const udis = projections.find((p) => p.instrument.key === 'udis');
  const cash = projections.find((p) => p.instrument.key === 'cash');

  /* Cuánto más termina teniendo en UDIS que debajo del colchón, con el mismo esfuerzo. */
  const advantage = udis.projection.total - cash.projection.total;

  if (months <= 0) {
    return (
      <Card>
        <CardTitle icon={TrendingUp}>Proyección por instrumento</CardTitle>
        <p className="text-[11px] leading-relaxed text-zinc-400">
          Tu edad de retiro ya llegó o pasó, así que no hay años de acumulación que proyectar.
          Ajusta la edad de retiro en este mismo paso para ver la comparativa.
        </p>
      </Card>
    );
  }

  return (
    <Card>
      <CardTitle
        icon={TrendingUp}
        help="Proyecciones con interés compuesto sobre tu saldo actual más tu aportación mensual. Son estimaciones con supuestos de largo plazo, no rendimientos garantizados."
      >
        Con lo mismo que aportas, ¿cuánto tendrías?
      </CardTitle>

      <Field
        label="¿Cuánto puedes aportar al mes?"
        hint={`Sobre tus ${fmtMXN(r.currentSavings)} ya acumulados, durante ${r.yearsToRetirement} años `
          + `hasta tus ${r.retirementAge}. Muévelo para comparar: no altera tu diagnóstico.`}
      >
        <MoneyInput value={contribution} onChange={setContribution} step="500" />
      </Field>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        {projections.map(({ instrument, projection }) => (
          <InstrumentCard
            key={instrument.key}
            instrument={instrument}
            projection={projection}
            months={months}
          />
        ))}
      </div>

      {/*
        El cierre persuasivo se construye con SUS números, no con adjetivos.

        Y dice "facilitando llegar con un esfuerzo menor" porque es literalmente lo que muestra
        la comparación: la misma aportación, tres resultados distintos. La diferencia no la
        puso más disciplina, la puso el instrumento.
      */}
      {advantage >= 1 && (
        <p className="mt-4 rounded-xl bg-emerald-500/10 p-3 text-[11px] leading-relaxed
                      text-emerald-200 ring-1 ring-emerald-500/25"
        >
          Te jubilarías con{' '}
          <span className="font-bold">{MXN.format(udis.projection.total)}</span>{' '}
          porque al invertir en UDIS proteges tu dinero de la inflación:{' '}
          <span className="font-bold">{MXN.format(advantage)}</span> más que guardándolo en
          pesos, con exactamente la misma aportación de {MXN.format(contribution)} al mes. El
          esfuerzo es el mismo; lo que cambia es dónde lo pones.
        </p>
      )}

      {/*
        Aviso obligatorio, no letra chica.

        Este bloque es el que un prospecto se lleva a casa, y son proyecciones con supuestos
        elegidos. Sin decirlo, tres tarjetas con cifras a siete dígitos se leen como una
        promesa, y ninguna de las tres lo es.
      */}
      <p className="mt-3 flex items-start gap-1.5 text-[10px] leading-relaxed text-zinc-500">
        <Info size={12} className="mt-0.5 shrink-0" />
        Estimaciones con supuestos de largo plazo —inflación de {fmtPct(LONG_RUN_INFLATION)} anual—
        y no rendimientos garantizados. El resultado real depende del instrumento que contrates,
        de sus comisiones y del plazo que efectivamente mantengas.
      </p>
    </Card>
  );
}
