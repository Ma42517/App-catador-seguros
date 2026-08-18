import { useState } from 'react';
import { PiggyBank, AlertTriangle, Sunset } from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
import {
  Card, CardTitle, SectionTitle, Field, MoneyInput, PercentInput, Badge,
} from '../ui';
import { ProgressBar, LineChart } from '../charts';
import { RowGrid } from './RowShell';
import AssetCapture from './AssetCapture';
import { SAVINGS_TYPES, isSavingsAsset } from '../../data/assetGroups';
import RetirementInstruments from './RetirementInstruments';
import { DEFAULT_ASSUMPTIONS } from '../../data/defaults';
import { isSuggestedRate } from '../../data/historicalRates';
import RateField from './RateField';
import { fmtMXN, fmtPct } from '../../engine/finance';

/**
 * Ahorro y Afore.
 *
 * Antes esto vivía dentro de una pestaña llamada "Activos", junto con la casa y el auto.
 * El problema no era de orden sino de lectura: "activos" es vocabulario contable, y lo que
 * más importa del diagnóstico —cuánto se está apartando y dónde— quedaba mezclado con
 * bienes que no se pueden gastar. Un asesor tenía que explicar la pestaña antes de poder
 * usarla.
 *
 * Aquí sólo entra dinero: cuentas, fondo de emergencia, inversiones, Afore y PPR.
 *
 * SIGUE SIENDO LA MISMA COLECCIÓN `data.assets` que la pestaña de Patrimonio. Sólo se
 * filtran los tipos. Es lo que mantiene intacto el capital proyectado del módulo de
 * Retiro: el motor recibe el arreglo completo, como siempre.
 */
export default function SavingsStep() {
  const { data, matrix, diagnosis, setField, patchSection } = useFinance();
  const a = matrix.assets;
  const r = matrix.retirement;

  /*
    El modo de los dos campos de rendimiento se DEDUCE del valor guardado, y sólo se
    fuerza a manual con estos dos interruptores.

    Es distinto de las hojas modales, y tiene que serlo: una hoja se monta al abrirse, así
    que puede decidir su modo una vez y olvidarse. Esta tarjeta vive montada mientras se
    usa la pestaña, y el valor puede cambiarle por debajo —"Cargar Demo" y "Limpiar"
    reescriben el diagnóstico completo sin desmontar nada—. Con el modo guardado en estado,
    después de un "Limpiar" el campo seguiría diciendo "escrito por ti" sobre una cifra que
    acababa de volver a la de por omisión.

    Derivado del valor se corrige solo: si coincide con la sugerencia, es la sugerencia. El
    interruptor sólo cubre el caso de querer teclear a mano un número que resulta ser
    idéntico al sugerido.
  */
  const [preOverride, setPreOverride] = useState(false);
  const [postOverride, setPostOverride] = useState(false);

  const manualPreReturn = preOverride || !isSuggestedRate(
    data.retirement.preRetirementReturn, DEFAULT_ASSUMPTIONS.preRetirementReturn,
  );
  const manualPostReturn = postOverride || !isSuggestedRate(
    data.retirement.postRetirementReturn, DEFAULT_ASSUMPTIONS.postRetirementReturn,
  );

  return (
    <div className="space-y-4">
      <SectionTitle
        eyebrow="Módulos 7 y 8"
        title="Ahorro y Afore"
        description="Todo el dinero que tienes apartado, lo que le aportas cada mes y hacia qué retiro va: cuentas, inversiones, Afore y PPR. Tu casa y tu auto quedaron en el paso anterior."
      />

      <AssetCapture
        types={SAVINGS_TYPES}
        belongsHere={isSavingsAsset}
        defaultType="bank"
        icon={PiggyBank}
        title="Cuentas de ahorro e inversión"
        typeLabel="cuenta"
        namePlaceholder="Fondo de emergencia"
        addLabel="Agregar cuenta"
        emptyTitle="Sin cuentas registradas"
        emptyDescription="Incluye desde tu cuenta de nómina hasta tu Afore y tu plan de retiro."
      />

      <Card>
        <CardTitle
          icon={AlertTriangle}
          help="Comparamos lo que crees que ahorras contra lo que tu flujo de caja permite. Una diferencia grande revela gastos no registrados."
        >
          Verificación de ahorro
        </CardTitle>

        {/*
          Bloque de dos campos fijos, no una lista: se queda como formulario abierto.
          Meterlo en una hoja modal escondería la comparación, que es justamente lo que se
          viene a ver aquí.
        */}
        <RowGrid cols={2}>
          <Field label="¿Cuánto crees que ahorras al mes?">
            <MoneyInput
              value={data.declaredMonthlySavings}
              onChange={(v) => setField('declaredMonthlySavings', v)}
            />
          </Field>
          <Field label="Lo que tu flujo permite" hint="Calculado por el motor, no editable">
            <div className={`flex h-[42px] items-center rounded-xl border border-dashed px-3 text-sm font-bold tabular-nums ${
              a.computedMonthlySavings < 0
                ? 'border-rose-500/40 bg-rose-500/10 text-rose-300'
                : 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300'
            }`}>
              {fmtMXN(a.computedMonthlySavings)}
            </div>
          </Field>
        </RowGrid>

        {a.hasSavingsInconsistency && (
          <div className="mt-3 rounded-lg bg-amber-500/10 p-3 ring-1 ring-amber-500/25">
            <p className="text-xs font-semibold text-amber-200">Inconsistencia financiera detectada</p>
            <p className="mt-1 text-[11px] leading-relaxed text-amber-200">
              Hay una diferencia de {fmtMXN(Math.abs(a.savingsGap))} al mes entre tu ahorro declarado
              y tu flujo real. Revisa si falta registrar algún gasto o si ese ahorro proviene de
              ingresos extraordinarios que no forman parte de tu flujo sostenible.
            </p>
          </div>
        )}

        <div className="mt-4 grid grid-cols-2 gap-3 border-t border-zinc-700/50 pt-3 text-xs">
          <div>
            <p className="text-zinc-400">Tasa de ahorro</p>
            <p className="font-semibold tabular-nums text-zinc-100">{fmtPct(a.savingsRate)}</p>
          </div>
          <div>
            <p className="text-zinc-400">Tasa de inversión</p>
            <p className="font-semibold tabular-nums text-zinc-100">{fmtPct(a.investmentRate)}</p>
          </div>
        </div>
      </Card>

      {/*
        El fondo de emergencia se queda en esta pestaña y no en Patrimonio: mide meses de
        gasto cubiertos con dinero disponible, que es de lo que trata este paso. Al lado
        del valor de una casa no significaría nada, porque una casa no paga la despensa
        del mes que viene.
      */}
      {a.emergencyFund > 0 || a.liquidAssets > 0 ? (
        <Card>
          <CardTitle icon={PiggyBank}>Fondo de emergencia</CardTitle>
          <ProgressBar
            value={a.emergencyMonths / 6}
            tone={a.emergencyMonths < 3 ? 'red' : a.emergencyMonths <= 6 ? 'yellow' : 'green'}
            label={`${a.emergencyMonths.toFixed(1)} de 6 meses recomendados`}
            right={fmtMXN(a.emergencyFund)}
            height={8}
          />
          <p className="mt-2 text-[11px] text-zinc-400">
            Tu gasto esencial es de {fmtMXN(matrix.expenses.essentialMonthly)} al mes. Para cubrir
            6 meses necesitas {fmtMXN(matrix.expenses.essentialMonthly * 6)}.
          </p>
        </Card>
      ) : null}

      <Card>
        <CardTitle
          icon={Sunset}
          help="Todo el cálculo de retiro se hace en pesos de hoy usando la tasa real: (1 + rendimiento) / (1 + inflación) - 1."
          action={
            <Badge status={r.progress >= 0.9 ? 'green' : r.progress >= 0.5 ? 'yellow' : 'red'}>
              {r.progressPct}% de avance
            </Badge>
          }
        >
          Retiro
        </CardTitle>

        {/*
          El retiro no es una lista: son cuatro supuestos de un solo escenario. Se
          queda como formulario abierto, igual que impuestos y la verificación de
          ahorro. El patrón de hoja modal es para lo que se agrega en renglones.
        */}
        <RowGrid cols={2}>
          <Field
            label="Pensión mensual deseada"
            help="Exprésala en pesos de HOY. El motor ajusta la inflación internamente."
          >
            <MoneyInput
              value={data.retirement.desiredMonthlyIncome}
              onChange={(v) => patchSection('retirement', { desiredMonthlyIncome: v })}
            />
          </Field>
          <Field label="Inflación esperada">
            <PercentInput
              value={data.retirement.inflation}
              onChange={(v) => patchSection('retirement', { inflation: v })}
            />
          </Field>
        </RowGrid>

        {/*
          Los dos rendimientos, con el mismo trato que las tasas de metas y activos:
          sugerencia puesta y "ponerla manualmente" debajo.

          Son las dos preguntas más difíciles de todo el diagnóstico. A nadie se le
          ocurre de memoria qué va a rendir su portafolio en los treinta años antes de
          retirarse, y menos aún en los veinte de después. Eran los últimos campos de
          tasa que quedaban como caja vacía.
        */}
        <div className="mt-3.5 grid grid-cols-1 gap-3.5 sm:grid-cols-2">
          <RateField
            label="Rendimiento antes del retiro"
            help="Lo que rinde el ahorro durante los años en que se acumula."
            value={data.retirement.preRetirementReturn}
            suggested={DEFAULT_ASSUMPTIONS.preRetirementReturn}
            note="Supuesto de largo plazo para un portafolio de retiro."
            isManual={manualPreReturn}
            onUseManual={() => setPreOverride(true)}
            onUseSuggested={() => {
              setPreOverride(false);
              patchSection('retirement', {
                preRetirementReturn: DEFAULT_ASSUMPTIONS.preRetirementReturn,
              });
            }}
            onChange={(v) => patchSection('retirement', { preRetirementReturn: v })}
            min={-100}
          />

          <RateField
            label="Rendimiento durante el retiro"
            help="Suele ser menor: el portafolio se vuelve más conservador."
            value={data.retirement.postRetirementReturn}
            suggested={DEFAULT_ASSUMPTIONS.postRetirementReturn}
            note="Más bajo a propósito: al retirarse, el portafolio se vuelve defensivo."
            isManual={manualPostReturn}
            onUseManual={() => setPostOverride(true)}
            onUseSuggested={() => {
              setPostOverride(false);
              patchSection('retirement', {
                postRetirementReturn: DEFAULT_ASSUMPTIONS.postRetirementReturn,
              });
            }}
            onChange={(v) => patchSection('retirement', { postRetirementReturn: v })}
            min={-100}
          />
        </div>

        <div className="mt-4 rounded-xl bg-indigo-500/10 p-3 text-[11px] leading-relaxed text-indigo-200 ring-1 ring-indigo-500/25">
          Tu capital de retiro y tu aportación mensual se toman automáticamente de los activos
          que marcaste como <span className="font-semibold">cuenta de retiro</span> aquí arriba
          ({fmtMXN(r.currentSavings)} acumulados, {fmtMXN(r.monthlyContribution)} al mes).
          Así se evita contar el mismo ahorro dos veces.
        </div>


        <div className="mt-4 grid grid-cols-2 gap-3 text-xs sm:grid-cols-4">
          <div>
            <p className="text-zinc-400">Capital necesario</p>
            <p className="font-semibold tabular-nums text-zinc-100">{fmtMXN(r.requiredCapital)}</p>
          </div>
          <div>
            <p className="text-zinc-400">Proyectado</p>
            <p className="font-semibold tabular-nums text-zinc-100">{fmtMXN(r.projectedCapital)}</p>
          </div>
          <div>
            <p className="text-zinc-400">Brecha</p>
            <p className={`font-semibold tabular-nums ${r.gap > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
              {fmtMXN(r.gap)}
            </p>
          </div>
          <div>
            <p className="text-zinc-400">Aportación faltante</p>
            <p className="font-semibold tabular-nums text-zinc-100">{fmtMXN(r.additionalMonthlyNeeded)}/mes</p>
          </div>
        </div>

        <div className="mt-4 border-t border-zinc-700/50 pt-4">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
            Trayectoria del capital (pesos de hoy)
          </p>
          <LineChart
            points={diagnosis.retirementPath.map((p) => ({ x: p.age, y: p.value }))}
            target={r.requiredCapital}
            targetLabel="Capital necesario"
            xLabel="Edad"
          />
        </div>

        <p className="mt-3 text-[11px] leading-relaxed text-zinc-400">
          Con tu trayectoria actual tu pensión sería de{' '}
          <span className="font-semibold text-zinc-300">{fmtMXN(r.sustainableIncomeAtRetirement)}</span> al mes
          durante {r.yearsInRetirement} años, contra los{' '}
          <span className="font-semibold text-zinc-300">{fmtMXN(r.desiredMonthlyIncome)}</span> que deseas.
          Tasa real de acumulación: {fmtPct(r.preRealRate)}.
        </p>
      </Card>
      <RetirementInstruments />
    </div>
  );
}
