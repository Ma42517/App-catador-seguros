import { Plus, PiggyBank, Landmark, AlertTriangle } from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
import { useState } from 'react';
import { createAsset } from '../../data/defaults';
import { rateForAssetType, isSuggestedRate, rateOrBlank } from '../../data/historicalRates';
import RateField from './RateField';
import {
  Card, CardTitle, SectionTitle, Field, TextInput, MoneyInput,
  NumberInput, Select, Button, EmptyState, Badge,
} from '../ui';
import { DonutChart, ProgressBar } from '../charts';
import { RowGrid } from './RowShell';
import CompactRow from './CompactRow';
import RowSheet from './RowSheet';
import useRowSheet, { newestFirst } from './useRowSheet';
import { labelOf } from '../../lib/options';
import { ASSET_TYPES, isRetirementType, fmtMXN, fmtPct } from '../../engine/finance';

export default function AssetStep() {
  const { assets, data, matrix, add, update, remove, setField } = useFinance();
  const a = matrix.assets;
  const nw = matrix.netWorth;
  const byId = Object.fromEntries(a.items.map((x) => [x.id, x]));

  const sheet = useRowSheet({ collection: 'assets', create: createAsset, add, update });
  const { draft } = sheet;

  /*
    ¿La tasa la manda el tipo de activo, o la escribió el asesor?

    Mientras sea sugerida, cambiar el tipo la actualiza. En cuanto alguien la escribe a
    mano deja de moverse: sobreescribir un dato que la persona acaba de teclear, porque
    después tocó otro campo, es la clase de cosa que hace desconfiar de la herramienta.
  */
  const [manualRate, setManualRate] = useState(false);

  const suggestedRate = rateForAssetType(draft.type);

  const openNewAsset = () => {
    setManualRate(false);
    sheet.openNew();
  };

  /*
    Al corregir un activo ya guardado se deduce en qué modo abrir: si su tasa coincide
    con la sugerida de su tipo, nadie la tocó y sigue siendo sugerida. Abrir siempre en
    manual convertiría en "escrita a mano" cada tasa que sólo venía por omisión.
  */
  const openEditAsset = (asset) => {
    setManualRate(!isSuggestedRate(asset.annualReturn, rateForAssetType(asset.type)));
    sheet.openEdit(asset);
  };

  /**
   * Cambiar el tipo arrastra la tasa, salvo que sea manual.
   *
   * Si el tipo nuevo no tiene sugerencia, la tasa se va a cero, que en el formulario se
   * dibuja como campo vacío. Conservar la del tipo anterior sería peor: quien pasa de
   * Afore a "Negocios" se quedaría con un 7 % heredado que nadie eligió para un negocio.
   */
  const changeType = (type) => {
    sheet.patch(manualRate
      ? { type }
      : { type, annualReturn: rateOrBlank(rateForAssetType(type)) });
  };

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
            <Button size="sm" variant="outline" icon={Plus} onClick={openNewAsset}>
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
              <Button size="sm" icon={Plus} onClick={openNewAsset}>
                Agregar activo
              </Button>
            }
          />
        ) : (
          <div className="space-y-2">
            {newestFirst(assets).map((asset) => {
              const analyzed = byId[asset.id];

              /*
                Que un activo alimente el módulo de retiro cambia cómo lo lee el
                motor, así que se dice en la tarjeta. Sin esa marca, dos activos con
                saldos parecidos se ven iguales y pesan distinto en el diagnóstico.
              */
              const flag = isRetirementType(asset.type)
                ? <Badge status="neutral">Retiro</Badge>
                : null;

              return (
                <CompactRow
                  key={asset.id}
                  title={asset.name || 'Activo sin nombre'}
                  badge={flag}
                  subtitle={[
                    labelOf(ASSET_TYPES, asset.type),
                    asset.monthlyContribution > 0
                      ? `+${fmtMXN(asset.monthlyContribution)}/mes`
                      : '',
                  ].filter(Boolean).join(' · ')}
                  amount={fmtMXN(asset.balance)}
                  note={analyzed
                    ? `proyectado ${fmtMXN(analyzed.projectedValue)}`
                    : 'saldo'}
                  onEdit={() => openEditAsset(asset)}
                  onRemove={() => remove('assets', asset.id)}
                />
              );
            })}
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

        {/*
          Bloque de dos campos fijos, no una lista: se queda como formulario abierto.
          Meterlo en una hoja modal escondería la comparación, que es justamente lo
          que se viene a ver aquí.
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
            <p className="mt-2 text-[11px] text-zinc-400">
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

            <div className="mt-4 grid grid-cols-3 gap-2 border-t border-zinc-700/50 pt-3 text-center text-xs">
              <div>
                <p className="text-zinc-400">Activos</p>
                <p className="font-semibold tabular-nums text-zinc-100">{fmtMXN(nw.totalAssets)}</p>
              </div>
              <div>
                <p className="text-zinc-400">Pasivos</p>
                <p className="font-semibold tabular-nums text-rose-400">{fmtMXN(nw.totalLiabilities)}</p>
              </div>
              <div>
                <p className="text-zinc-400">Neto</p>
                <p className={`font-semibold tabular-nums ${nw.isNegative ? 'text-rose-400' : 'text-emerald-400'}`}>
                  {fmtMXN(nw.netWorth)}
                </p>
              </div>
            </div>
          </Card>
        </>
      )}

      <RowSheet
        isOpen={sheet.isOpen}
        onClose={sheet.close}
        onSave={sheet.save}
        isEditing={sheet.isEditing}
        title="activo"
        hint="Registra el saldo actual, la aportación mensual, o ambos."
        canSave={(draft.name || '').trim() !== ''
          && (draft.balance > 0 || draft.monthlyContribution > 0)}
        saveLabel="Agregar activo"
      >
        <Field label="Concepto">
          <TextInput
            value={draft.name}
            onChange={(v) => sheet.patch({ name: v })}
            placeholder="Fondo de emergencia"
          />
        </Field>

        <Field
          label="Tipo"
          hint={isRetirementType(draft.type)
            ? 'Este activo alimenta tu módulo de retiro automáticamente'
            : undefined}
        >
          <Select value={draft.type} onChange={changeType} options={ASSET_TYPES} />
        </Field>

        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
          <Field label="Saldo actual">
            <MoneyInput
              value={draft.balance}
              onChange={(v) => sheet.patch({ balance: v })}
              step="1000"
            />
          </Field>

          <Field label="Aportación mensual">
            <MoneyInput
              value={draft.monthlyContribution}
              onChange={(v) => sheet.patch({ monthlyContribution: v })}
            />
          </Field>
        </div>

        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
          <RateField
            label="Rendimiento anual"
            help="Puede ser negativo para activos que se deprecian, como un auto."
            value={draft.annualReturn}
            suggested={suggestedRate}
            note={suggestedRate === null
              ? `El rendimiento de ${labelOf(ASSET_TYPES, draft.type)} depende del caso: escríbelo.`
              : `Promedio histórico para ${labelOf(ASSET_TYPES, draft.type)}.`}
            isManual={manualRate}
            onUseManual={() => setManualRate(true)}
            onUseSuggested={() => {
              setManualRate(false);
              sheet.patch({ annualReturn: suggestedRate });
            }}
            onChange={(v) => sheet.patch({ annualReturn: v })}
            min={-100}
          />

          <Field label="Horizonte (años)">
            <NumberInput
              value={draft.horizonYears}
              onChange={(v) => sheet.patch({ horizonYears: v })}
              min={0}
              max={70}
            />
          </Field>
        </div>
      </RowSheet>
    </div>
  );
}
