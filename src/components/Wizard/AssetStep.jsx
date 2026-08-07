import { Plus, PiggyBank, Landmark, AlertTriangle } from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
import { createAsset } from '../../data/defaults';
import {
  Card, CardTitle, SectionTitle, Field, TextInput, MoneyInput, PercentInput,
  NumberInput, Select, Button, EmptyState, Badge,
} from '../ui';
import { DonutChart, ProgressBar } from '../charts';
import RowShell, { RowGrid } from './RowShell';
import { ASSET_TYPES, isRetirementType, fmtMXN, fmtPct } from '../../engine/finance';

function AssetRow({ asset, analyzed, onChange, onRemove }) {
  return (
    <RowShell
      title={asset.name || 'Nuevo activo'}
      derived={analyzed ? `Proyectado: ${fmtMXN(analyzed.projectedValue)}` : null}
      onRemove={onRemove}
    >
      <RowGrid cols={2}>
        <Field label="Concepto">
          <TextInput value={asset.name} onChange={(v) => onChange({ name: v })} placeholder="Fondo de emergencia" />
        </Field>
        <Field
          label="Tipo"
          hint={isRetirementType(asset.type)
            ? 'Este activo alimenta tu módulo de retiro automáticamente'
            : undefined}
        >
          <Select value={asset.type} onChange={(v) => onChange({ type: v })} options={ASSET_TYPES} />
        </Field>
      </RowGrid>

      <div className="mt-3">
        <RowGrid cols={4}>
          <Field label="Saldo actual">
            <MoneyInput value={asset.balance} onChange={(v) => onChange({ balance: v })} step="1000" />
          </Field>
          <Field label="Aportación mensual">
            <MoneyInput value={asset.monthlyContribution} onChange={(v) => onChange({ monthlyContribution: v })} />
          </Field>
          <Field label="Rendimiento anual" help="Puede ser negativo para activos que se depre­cian, como un auto.">
            <PercentInput value={asset.annualReturn} onChange={(v) => onChange({ annualReturn: v })} min={-100} />
          </Field>
          <Field label="Horizonte (años)">
            <NumberInput value={asset.horizonYears} onChange={(v) => onChange({ horizonYears: v })} min={0} max={70} />
          </Field>
        </RowGrid>
      </div>
    </RowShell>
  );
}


export default function AssetStep() {
  const { assets, data, matrix, add, update, remove, setField } = useFinance();
  const a = matrix.assets;
  const nw = matrix.netWorth;
  const byId = Object.fromEntries(a.items.map((x) => [x.id, x]));

  return (
    <div className="space-y-4">
      <SectionTitle
        eyebrow="Módulos 6 y 7"
        title="Ahorro, inversiones y patrimonio"
        description="Registra lo que tienes y lo que aportas cada mes. El motor contrastará tu ahorro declarado contra lo que tu flujo realmente permite."
      />

      <Card>
        <CardTitle
          icon={PiggyBank}
          action={
            <Button size="sm" variant="outline" icon={Plus} onClick={() => add('assets', createAsset())}>
              Agregar
            </Button>
          }
        >
          Activos
        </CardTitle>

        {assets.length === 0 ? (
          <EmptyState
            icon={PiggyBank}
            title="Sin activos registrados"
            description="Incluye desde tu cuenta de nómina hasta bienes raíces y tu Afore."
            action={
              <Button size="sm" icon={Plus} onClick={() => add('assets', createAsset())}>
                Agregar activo
              </Button>
            }
          />
        ) : (
          <div className="space-y-3">
            {assets.map((asset) => (
              <AssetRow
                key={asset.id}
                asset={asset}
                analyzed={byId[asset.id]}
                onChange={(patch) => update('assets', asset.id, patch)}
                onRemove={() => remove('assets', asset.id)}
              />
            ))}
          </div>
        )}
      </Card>


      <Card>
        <CardTitle
          icon={AlertTriangle}
          help="Comparamos lo que crees que ahorras contra lo que tu flujo de caja permite. Una diferencia grande revela gastos no registrados."
        >
          Verificación de ahorro
        </CardTitle>

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
                ? 'border-red-500/40 bg-red-500/10 text-red-300'
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

        <div className="mt-4 grid grid-cols-2 gap-3 border-t border-slate-700/50 pt-3 text-xs">
          <div>
            <p className="text-slate-400">Tasa de ahorro</p>
            <p className="font-semibold tabular-nums text-slate-100">{fmtPct(a.savingsRate)}</p>
          </div>
          <div>
            <p className="text-slate-400">Tasa de inversión</p>
            <p className="font-semibold tabular-nums text-slate-100">{fmtPct(a.investmentRate)}</p>
          </div>
        </div>
      </Card>


      {assets.length > 0 && (
        <>
          <Card>
            <CardTitle icon={PiggyBank}>Fondo de emergencia</CardTitle>
            <ProgressBar
              value={a.emergencyMonths / 6}
              tone={a.emergencyMonths < 3 ? 'red' : a.emergencyMonths <= 6 ? 'yellow' : 'green'}
              label={`${a.emergencyMonths.toFixed(1)} de 6 meses recomendados`}
              right={fmtMXN(a.emergencyFund)}
              height={8}
            />
            <p className="mt-2 text-[11px] text-slate-400">
              Tu gasto esencial es de {fmtMXN(matrix.expenses.essentialMonthly)} al mes. Para cubrir
              6 meses necesitas {fmtMXN(matrix.expenses.essentialMonthly * 6)}.
            </p>
          </Card>

          <Card>
            <CardTitle
              icon={Landmark}
              action={
                <Badge status={nw.isNegative ? 'red' : nw.leverageRatio > 0.6 ? 'yellow' : 'green'}>
                  Apalancamiento {fmtPct(nw.leverageRatio)}
                </Badge>
              }
            >
              Patrimonio neto
            </CardTitle>

            <DonutChart
              data={[
                { label: 'Activos líquidos', value: a.liquidAssets, color: 'rgb(16 185 129)' },
                { label: 'Activos no líquidos', value: a.illiquidAssets, color: 'rgb(37 99 235)' },
                { label: 'Pasivos', value: nw.totalLiabilities, color: 'rgb(220 38 38)' },
              ]}
              centerValue={fmtMXN(nw.netWorth)}
              centerLabel="patrimonio"
            />

            <div className="mt-4 grid grid-cols-3 gap-2 border-t border-slate-700/50 pt-3 text-center text-xs">
              <div>
                <p className="text-slate-400">Activos</p>
                <p className="font-semibold tabular-nums text-slate-100">{fmtMXN(nw.totalAssets)}</p>
              </div>
              <div>
                <p className="text-slate-400">Pasivos</p>
                <p className="font-semibold tabular-nums text-red-400">{fmtMXN(nw.totalLiabilities)}</p>
              </div>
              <div>
                <p className="text-slate-400">Neto</p>
                <p className={`font-semibold tabular-nums ${nw.isNegative ? 'text-red-400' : 'text-emerald-400'}`}>
                  {fmtMXN(nw.netWorth)}
                </p>
              </div>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
