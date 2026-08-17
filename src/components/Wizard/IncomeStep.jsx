import { Plus, Wallet, Receipt, TrendingUp } from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
import { createIncome } from '../../data/defaults';
import {
  Card, CardTitle, SectionTitle, Field, TextInput, MoneyInput, Select,
  Button, EmptyState, Badge, Collapsible,
} from '../ui';
import { RowGrid } from './RowShell';
import CompactRow from './CompactRow';
import RowSheet from './RowSheet';
import useRowSheet, { newestFirst } from './useRowSheet';
import { labelOf } from '../../lib/options';
import {
  INCOME_GROUPS, INCOME_TYPES, STABILITY, FREQUENCY_OPTIONS,
  fmtMXN, fmtPct, toMonthly,
} from '../../engine/finance';

/** Cuánto de este ingreso cuenta como sostenible, según su estabilidad. */
function sustainableFactor(stability, variabilityFactor) {
  if (stability === 'stable') return 1;
  if (stability === 'variable') return variabilityFactor;
  return 0;
}

export default function IncomeStep() {
  const {
    incomes, data, taxes, matrix, add, update, remove, patchSection,
  } = useFinance();
  const inc = matrix.income;

  const sheet = useRowSheet({
    collection: 'incomes', create: createIncome, add, update,
  });
  const { draft } = sheet;

  const typeOptions = INCOME_TYPES[draft.group] || INCOME_TYPES.other;
  const draftMonthly = toMonthly(draft.amount, draft.frequency)
    * sustainableFactor(draft.stability, data.variabilityFactor);

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
            <Button
              size="sm"
              variant="outline"
              icon={Plus}
              onClick={() => sheet.openNew({ frequency: data.profile.inputFrequency })}
            >
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
              <Button size="sm" icon={Plus} onClick={() => sheet.openNew()}>
                Agregar ingreso
              </Button>
            }
          />
        ) : (
          <div className="space-y-2">
            {newestFirst(incomes).map((income) => {
              const isOneTime = income.frequency === 'one-time';
              const monthly = toMonthly(income.amount, income.frequency)
                * sustainableFactor(income.stability, data.variabilityFactor);

              return (
                <CompactRow
                  key={income.id}
                  title={income.name || 'Ingreso sin nombre'}
                  subtitle={[
                    labelOf(INCOME_GROUPS, income.group),
                    labelOf(STABILITY, income.stability),
                  ].filter(Boolean).join(' · ')}
                  amount={isOneTime ? fmtMXN(income.amount) : fmtMXN(monthly)}
                  note={isOneTime ? 'única vez' : 'sostenible/mes'}
                  onEdit={() => sheet.openEdit(income)}
                  onRemove={() => remove('incomes', income.id)}
                />
              );
            })}
          </div>
        )}

        {incomes.length > 0 && (
          <div className="surface-sunken mt-4 space-y-2 p-3 text-xs">
            <div className="flex justify-between">
              <span className="text-zinc-400">Ingreso bruto recurrente</span>
              <span className="tabular-nums font-medium text-zinc-200">{fmtMXN(inc.grossMonthly)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-400">Ingreso sostenible</span>
              <span className="tabular-nums font-semibold text-emerald-300">{fmtMXN(inc.sustainableMonthly)}</span>
            </div>
            {inc.extraordinaryAnnual > 0 && (
              <div className="flex justify-between">
                <span className="text-zinc-400">Extraordinario anual (excluido)</span>
                <span className="tabular-nums font-medium text-zinc-400">{fmtMXN(inc.extraordinaryAnnual)}</span>
              </div>
            )}
            <div className="flex items-center justify-between border-t border-zinc-700/50 pt-2">
              <span className="text-zinc-400">Concentración de ingreso</span>
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

        {/*
          Los impuestos se quedan como formulario abierto, y no es una omisión: son
          seis campos fijos de un mismo bloque, no una lista a la que se agregan
          renglones. La hoja modal existe para no tener veinte formularios a la vez;
          aquí sólo hay uno, y ya vive dentro de un desplegable.
        */}
        <RowGrid cols={2}>
          <Field label="Impuesto retenido">
            <MoneyInput value={taxes.withheld} onChange={(v) => patchSection('taxes', { withheld: v })} />
          </Field>
          <Field label="Frecuencia de los montos">
            <Select
              value={taxes.frequency}
              onChange={(v) => patchSection('taxes', { frequency: v })}
              /*
                Sin 'one-time' ni 'weekly'. La semanal se añadió para gastos —despensa,
                transporte— y todavía no se ha decidido ofrecerla aquí. El motor ya sabe
                normalizarla, así que habilitarla es borrar una condición de este filtro.
              */
              options={FREQUENCY_OPTIONS.filter(
                (f) => f.value !== 'one-time' && f.value !== 'weekly',
              )}
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
            <div className="flex h-[42px] items-center rounded-xl border border-dashed border-zinc-700 bg-zinc-900/40 px-3 text-sm font-semibold tabular-nums text-zinc-300">
              {fmtMXN(matrix.taxes.balanceAnnual)}
            </div>
          </Field>
        </RowGrid>
      </Collapsible>

      <div className="surface-sunken flex items-center gap-2 px-3 py-2.5 text-[11px] text-zinc-400">
        <TrendingUp size={13} className="shrink-0 text-zinc-500" />
        Exposición a ingreso no garantizado: {fmtPct(inc.variableExposure)} de tu ingreso bruto.
      </div>

      <RowSheet
        isOpen={sheet.isOpen}
        onClose={sheet.close}
        onSave={sheet.save}
        isEditing={sheet.isEditing}
        title="ingreso"
        hint="Sólo el concepto y el monto son obligatorios."
        badge={draft.amount > 0 && draft.frequency !== 'one-time'
          ? `${fmtMXN(draftMonthly)}/mes`
          : null}
        canSave={(draft.name || '').trim() !== '' && draft.amount > 0}
        saveLabel="Agregar ingreso"
      >
        <Field label="Concepto">
          <TextInput
            value={draft.name}
            onChange={(v) => sheet.patch({ name: v })}
            placeholder="Sueldo principal"
          />
        </Field>

        <Field label="Monto">
          <MoneyInput value={draft.amount} onChange={(v) => sheet.patch({ amount: v })} />
        </Field>

        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
          <Field label="Frecuencia">
            <Select
              value={draft.frequency}
              onChange={(v) => sheet.patch({ frequency: v })}
              /*
                La frecuencia semanal se pidió para gastos y aquí no se ofrece todavía,
                aunque el motor ya la normaliza. Quitar este filtro la habilita para
                ingresos —un sueldo semanal es de lo más común— cuando se decida.
              */
              options={FREQUENCY_OPTIONS.filter((f) => f.value !== 'weekly')}
            />
          </Field>

          <Field label="Categoría">
            <Select
              value={draft.group}
              onChange={(v) => sheet.patch({
                group: v,
                // El subtipo debe pertenecer al grupo elegido.
                type: (INCOME_TYPES[v] || [])[0]?.value ?? 'other',
              })}
              options={INCOME_GROUPS}
            />
          </Field>
        </div>

        <Field label="Tipo">
          <Select
            value={draft.type}
            onChange={(v) => sheet.patch({ type: v })}
            options={typeOptions}
          />
        </Field>

        <Field
          label="Estabilidad"
          hint={draft.stability === 'stable' ? 'Se usa al 100%'
            : draft.stability === 'variable'
              ? `Se usa al ${Math.round(data.variabilityFactor * 100)}%`
              : 'Excluido del ingreso sostenible'}
        >
          <Select
            value={draft.stability}
            onChange={(v) => sheet.patch({ stability: v })}
            options={STABILITY}
          />
        </Field>
      </RowSheet>
    </div>
  );
}
