import { PiggyBank, AlertTriangle } from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
import {
  Card, CardTitle, SectionTitle, Field, MoneyInput,
} from '../ui';
import { ProgressBar } from '../charts';
import { RowGrid } from './RowShell';
import AssetCapture from './AssetCapture';
import { SAVINGS_TYPES, isSavingsAsset } from '../../data/assetGroups';
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
  const { data, matrix, setField } = useFinance();
  const a = matrix.assets;

  return (
    <div className="space-y-4">
      <SectionTitle
        eyebrow="Módulo 7"
        title="Ahorro y Afore"
        description="Todo el dinero que tienes apartado y lo que le aportas cada mes: cuentas, inversiones, Afore y planes de retiro. Tu casa y tu auto quedaron en el paso anterior."
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
    </div>
  );
}
