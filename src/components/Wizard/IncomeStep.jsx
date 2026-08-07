import { Plus, Wallet, Receipt, TrendingUp } from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
import { createIncome } from '../../data/defaults';
import {
  Card, CardTitle, SectionTitle, Field, TextInput, MoneyInput, Select,
  Button, EmptyState, Badge, Collapsible,
} from '../ui';
import RowShell, { RowGrid } from './RowShell';
import {
  INCOME_GROUPS, INCOME_TYPES, STABILITY, FREQUENCY_OPTIONS,
  fmtMXN, fmtPct, toMonthly,
} from '../../engine/finance';

function IncomeRow({ income, onChange, onRemove, variabilityFactor }) {
  const monthly = toMonthly(income.amount, income.frequency);
  const factor = income.stability === 'stable' ? 1
    : income.stability === 'variable' ? variabilityFactor : 0;
  const typeOptions = INCOME_TYPES[income.group] || INCOME_TYPES.other;

  return (
    <RowShell
      title={income.name || 'Nuevo ingreso'}
      derived={income.frequency === 'one-time'
        ? `${fmtMXN(income.amount)} única vez`
        : `${fmtMXN(monthly * factor)} sostenible/mes`}
      onRemove={onRemove}
    >
      <RowGrid cols={3}>
        <Field label="Concepto">
          <TextInput value={income.name} onChange={(v) => onChange({ name: v })} placeholder="Sueldo principal" />
        </Field>
        <Field label="Categoría">
          <Select
            value={income.group}
            onChange={(v) => onChange({
              group: v,
              // El subtipo debe pertenecer al grupo elegido.
              type: (INCOME_TYPES[v] || [])[0]?.value ?? 'other',
            })}
            options={INCOME_GROUPS}
          />
        </Field>
        <Field label="Tipo">
          <Select value={income.type} onChange={(v) => onChange({ type: v })} options={typeOptions} />
        </Field>
      </RowGrid>


      <div className="mt-3">
        <RowGrid cols={3}>
          <Field label="Monto">
            <MoneyInput value={income.amount} onChange={(v) => onChange({ amount: v })} />
          </Field>
          <Field label="Frecuencia">
            <Select
              value={income.frequency}
              onChange={(v) => onChange({ frequency: v })}
              options={FREQUENCY_OPTIONS}
            />
          </Field>
          <Field
            label="Estabilidad"
            hint={income.stability === 'stable' ? 'Se usa al 100%'
              : income.stability === 'variable' ? `Se usa al ${Math.round(variabilityFactor * 100)}%`
              : 'Excluido del ingreso sostenible'}
          >
            <Select value={income.stability} onChange={(v) => onChange({ stability: v })} options={STABILITY} />
          </Field>
        </RowGrid>
      </div>
    </RowShell>
  );
}

export default function IncomeStep() {
  const { incomes, data, taxes, matrix, add, update, remove, patchSection } = useFinance();
  const inc = matrix.income;

  return (
    <div className="space-y-4">
      <SectionTitle
        eyebrow="Módulos 2 y 3"
        title="Ingresos e impuestos"
        description="Clasifica cada flujo según su confiabilidad. El ingreso extraordinario nunca se usa como base para comprometer gasto fijo."
      />

      <Card>
        <CardTitle
          icon={Wallet}
          help="El ingreso sostenible es el único que el motor usa para calcular tu capacidad real de compromiso."
          action={
            <Button size="sm" variant="outline" icon={Plus}
              onClick={() => add('incomes', createIncome({ frequency: data.profile.inputFrequency }))}>
              Agregar
            </Button>
          }
        >
          Fuentes de ingreso
        </CardTitle>


        {incomes.length === 0 ? (
          <EmptyState
            icon={Wallet}
            title="Sin ingresos registrados"
            description="Agrega al menos una fuente para que el motor pueda calcular tu capacidad financiera."
            action={
              <Button size="sm" icon={Plus} onClick={() => add('incomes', createIncome())}>
                Agregar ingreso
              </Button>
            }
          />
        ) : (
          <div className="space-y-3">
            {incomes.map((income) => (
              <IncomeRow
                key={income.id}
                income={income}
                variabilityFactor={data.variabilityFactor}
                onChange={(patch) => update('incomes', income.id, patch)}
                onRemove={() => remove('incomes', income.id)}
              />
            ))}
          </div>
        )}

        {incomes.length > 0 && (
          <div className="surface-sunken mt-4 space-y-2 p-3 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-400">Ingreso bruto recurrente</span>
              <span className="tabular-nums font-medium text-slate-200">{fmtMXN(inc.grossMonthly)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Ingreso sostenible</span>
              <span className="tabular-nums font-semibold text-emerald-300">{fmtMXN(inc.sustainableMonthly)}</span>
            </div>
            {inc.extraordinaryAnnual > 0 && (
              <div className="flex justify-between">
                <span className="text-slate-400">Extraordinario anual (excluido)</span>
                <span className="tabular-nums font-medium text-slate-400">{fmtMXN(inc.extraordinaryAnnual)}</span>
              </div>
            )}
            <div className="flex items-center justify-between border-t border-slate-700/50 pt-2">
              <span className="text-slate-400">Concentración de ingreso</span>
              <Badge status={inc.concentrationRisk === 'high' ? 'red'
                : inc.concentrationRisk === 'medium' ? 'yellow' : 'green'}>
                {fmtPct(inc.concentrationRatio)}{inc.topSourceName ? ` · ${inc.topSourceName}` : ''}
              </Badge>
            </div>
          </div>
        )}
      </Card>


      <Collapsible
        icon={Receipt}
        title="Impuestos"
        subtitle={data.profile.incomeType === 'net'
          ? 'Informativo: tu ingreso ya es neto'
          : 'Se descontarán de tu flujo'}
        badge={
          <Badge status={data.profile.incomeType === 'net' ? 'neutral' : 'yellow'}>
            Tasa efectiva {fmtPct(matrix.taxes.effectiveRate)}
          </Badge>
        }
      >
        <p className="mb-4 rounded-xl bg-indigo-500/10 p-3 text-[11px] leading-relaxed text-indigo-200 ring-1 ring-indigo-500/25">
          {data.profile.incomeType === 'net'
            ? 'Como tu ingreso se captura NETO, estos montos sólo sirven para estimar tu tasa efectiva. El motor no los resta otra vez: así se evita la doble deducción.'
            : 'Como tu ingreso se captura BRUTO, estos montos se descuentan de tu flujo disponible una sola vez.'}
          {' '}Ningún parámetro fiscal está preprogramado: todo es editable.
        </p>

        <RowGrid cols={2}>
          <Field label="Impuesto retenido">
            <MoneyInput value={taxes.withheld} onChange={(v) => patchSection('taxes', { withheld: v })} />
          </Field>
          <Field label="Frecuencia de los montos">
            <Select
              value={taxes.frequency}
              onChange={(v) => patchSection('taxes', { frequency: v })}
              options={FREQUENCY_OPTIONS.filter((f) => f.value !== 'one-time')}
            />
          </Field>
          <Field label="Impuestos adicionales pagados">
            <MoneyInput value={taxes.additionalPaid} onChange={(v) => patchSection('taxes', { additionalPaid: v })} />
          </Field>
          <Field label="Pagos provisionales">
            <MoneyInput value={taxes.provisionalPayments} onChange={(v) => patchSection('taxes', { provisionalPayments: v })} />
          </Field>
          <Field
            label="Devoluciones recibidas (anual)"
            help="Las devoluciones se tratan siempre como entrada extraordinaria anual, nunca como ingreso mensual sostenible."
          >
            <MoneyInput value={taxes.refunds} onChange={(v) => patchSection('taxes', { refunds: v })} />
          </Field>
          <Field label="Saldo fiscal anual estimado" hint="Positivo = a cargo · Negativo = a favor">
            <div className="flex h-[42px] items-center rounded-xl border border-dashed border-slate-700 bg-slate-900/40 px-3 text-sm font-semibold tabular-nums text-slate-300">
              {fmtMXN(matrix.taxes.balanceAnnual)}
            </div>
          </Field>
        </RowGrid>
      </Collapsible>

      <div className="surface-sunken flex items-center gap-2 px-3 py-2.5 text-[11px] text-slate-400">
        <TrendingUp size={13} className="shrink-0 text-slate-500" />
        Exposición a ingreso no garantizado: {fmtPct(inc.variableExposure)} de tu ingreso bruto.
      </div>
    </div>
  );
}
