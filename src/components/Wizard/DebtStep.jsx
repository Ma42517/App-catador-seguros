import { Plus, CreditCard, TrendingDown, Zap } from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
import { createDebt } from '../../data/defaults';
import {
  Card, CardTitle, SectionTitle, Field, TextInput, MoneyInput, PercentInput,
  Select, Button, EmptyState, Badge,
} from '../ui';
import { BarList } from '../charts';
import CompactRow from './CompactRow';
import RowSheet from './RowSheet';
import useRowSheet, { newestFirst } from './useRowSheet';
import { labelOf } from '../../lib/options';
import { DEBT_TYPES, fmtMXN, fmtPct } from '../../engine/finance';

function monthsLabel(months) {
  if (months === null || months === undefined) return 'Nunca se liquida';
  if (months === 0) return 'Liquidada';
  if (months < 12) return `${months} meses`;
  const y = Math.floor(months / 12);
  const m = months % 12;
  return m === 0 ? `${y} año${y > 1 ? 's' : ''}` : `${y}a ${m}m`;
}

export default function DebtStep() {
  const { debts, matrix, add, update, remove } = useFinance();
  const d = matrix.debts;
  const plans = matrix.payoffPlans;
  const byId = Object.fromEntries(d.items.map((x) => [x.id, x]));

  const sheet = useRowSheet({ collection: 'debts', create: createDebt, add, update });
  const { draft } = sheet;

  const isCard = draft.type === 'credit_card';

  /*
    El análisis de la fila que se está editando, si ya existe en el diagnóstico.
    Sirve para mostrar dentro de la hoja lo que el motor calculó —interés mensual,
    utilización, si el pago no cubre el interés— en lugar de recalcularlo aquí, que
    sería duplicar el motor y arriesgarse a que las dos cuentas discrepen.
  */
  const analyzed = byId[draft.id];

  return (
    <div className="space-y-4">
      <SectionTitle
        eyebrow="Módulo 5"
        title="Deudas"
        description="Aquí van todos tus créditos con su pago mensual. Liquidar una deuda libera su pago de tu flujo de forma inmediata."
      />

      <Card>
        <CardTitle
          icon={CreditCard}
          action={
            <Button size="sm" variant="outline" icon={Plus} onClick={() => sheet.openNew()}>
              Agregar
            </Button>
          }
        >
          Créditos activos
        </CardTitle>

        {debts.length === 0 ? (
          <EmptyState
            icon={CreditCard}
            title="Sin deudas registradas"
            description="Si no tienes deuda, puedes avanzar al siguiente paso."
            action={
              <Button size="sm" icon={Plus} onClick={() => sheet.openNew()}>
                Agregar deuda
              </Button>
            }
          />
        ) : (
          <div className="space-y-2">
            {newestFirst(debts).map((debt) => {
              const a = byId[debt.id];

              /*
                Una deuda cuyo pago no alcanza a cubrir el interés no se termina
                nunca, y es el hallazgo más grave del módulo. Va en la tarjeta
                compacta y no sólo dentro de la hoja: escondido tras un toque,
                nadie lo vería hasta abrir la deuda que ya daba por revisada.
              */
              const flag = a?.isNeverPaidOff && a.balance > 0
                ? <Badge status="red">No amortiza</Badge>
                : null;

              return (
                <CompactRow
                  key={debt.id}
                  title={debt.name || 'Deuda sin nombre'}
                  badge={flag}
                  subtitle={[
                    labelOf(DEBT_TYPES, debt.type),
                    debt.interestRate > 0 ? `${fmtPct(debt.interestRate)} anual` : '',
                  ].filter(Boolean).join(' · ')}
                  amount={fmtMXN(debt.balance)}
                  note={a ? monthsLabel(a.payoffMonths) : 'saldo'}
                  onEdit={() => sheet.openEdit(debt)}
                  onRemove={() => remove('debts', debt.id)}
                />
              );
            })}
          </div>
        )}
      </Card>


      {debts.length > 0 && (
        <>
          <Card>
            <CardTitle
              icon={TrendingDown}
              action={
                <Badge status={d.debtToIncomeRatio > 0.5 ? 'red' : d.debtToIncomeRatio >= 0.3 ? 'yellow' : 'green'}>
                  {fmtPct(d.debtToIncomeRatio)} de tu ingreso
                </Badge>
              }
            >
              Carga de deuda
            </CardTitle>

            <div className="mb-4 grid grid-cols-2 gap-3 text-xs sm:grid-cols-4">
              <div>
                <p className="text-zinc-400">Saldo total</p>
                <p className="font-semibold tabular-nums text-zinc-100">{fmtMXN(d.totalBalance)}</p>
              </div>
              <div>
                <p className="text-zinc-400">Pago mensual</p>
                <p className="font-semibold tabular-nums text-zinc-100">{fmtMXN(d.monthlyService)}</p>
              </div>
              <div>
                <p className="text-zinc-400">Interés mensual</p>
                <p className="font-semibold tabular-nums text-rose-400">{fmtMXN(d.monthlyInterest)}</p>
              </div>
              <div>
                <p className="text-zinc-400">Del pago es interés</p>
                <p className="font-semibold tabular-nums text-zinc-100">{fmtPct(d.interestShareOfService)}</p>
              </div>
            </div>

            <BarList
              items={d.items.map((x) => ({
                label: x.name || x.typeLabel,
                value: x.balance,
                color: x.annualRate > 0.35 ? 'rgb(220 38 38)'
                  : x.annualRate > 0.15 ? 'rgb(234 88 12)' : 'rgb(37 99 235)',
                note: `${fmtPct(x.annualRate)} anual · ${fmtMXN(x.payment)}/mes · ${monthsLabel(x.payoffMonths)}`,
              }))}
            />
          </Card>


          <Card>
            <CardTitle
              icon={Zap}
              help="Ambos métodos aplican tu excedente mensual a una deuda a la vez. Cuando una se liquida, su pago se suma al ataque de la siguiente (efecto bola de nieve)."
            >
              Estrategias de liquidación acelerada
            </CardTitle>

            <p className="mb-3 text-[11px] text-zinc-400">
              Simulación con tu excedente actual de{' '}
              <span className="font-semibold text-zinc-300">{fmtMXN(plans.accelerator)}</span> al mes.
            </p>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {[
                { key: 'avalanche', title: 'Avalancha', sub: 'Ataca la tasa más alta primero', plan: plans.avalanche },
                { key: 'snowball', title: 'Bola de nieve', sub: 'Ataca el saldo más chico primero', plan: plans.snowball },
              ].map(({ key, title, sub, plan }) => (
                <div key={key} className="rounded-lg border border-zinc-700/50 p-3">
                  <p className="text-xs font-semibold text-zinc-200">{title}</p>
                  <p className="mb-2 text-[10px] text-zinc-500">{sub}</p>
                  <p className="text-lg font-bold tabular-nums text-zinc-100">
                    {monthsLabel(plan.months)}
                  </p>
                  <p className="text-[11px] text-zinc-400">
                    Interés total: <span className="font-medium">{fmtMXN(plan.totalInterest)}</span>
                  </p>
                  <p className="mt-1 text-[11px] text-emerald-300">
                    Libera {fmtMXN(plan.freedCashflow)}/mes al terminar
                  </p>
                </div>
              ))}
            </div>

            {plans.avalanche.months !== null && plans.snowball.months !== null
              && plans.avalanche.totalInterest < plans.snowball.totalInterest && (
              <p className="mt-3 rounded-xl bg-emerald-500/10 p-2.5 text-[11px] text-emerald-200 ring-1 ring-emerald-500/25">
                El método avalancha te ahorra{' '}
                <span className="font-semibold">
                  {fmtMXN(plans.snowball.totalInterest - plans.avalanche.totalInterest)}
                </span>{' '}
                en intereses.
              </p>
            )}
          </Card>
        </>
      )}

      <RowSheet
        isOpen={sheet.isOpen}
        onClose={sheet.close}
        onSave={sheet.save}
        isEditing={sheet.isEditing}
        title="deuda"
        hint="El concepto y el saldo son obligatorios."
        canSave={(draft.name || '').trim() !== '' && draft.balance > 0}
        saveLabel="Agregar deuda"
      >
        <Field label="Concepto">
          <TextInput
            value={draft.name}
            onChange={(v) => sheet.patch({ name: v })}
            placeholder="Tarjeta de crédito"
          />
        </Field>

        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
          <Field label="Saldo actual">
            <MoneyInput
              value={draft.balance}
              onChange={(v) => sheet.patch({ balance: v })}
              step="1000"
            />
          </Field>

          <Field label="Tipo">
            <Select
              value={draft.type}
              onChange={(v) => sheet.patch({ type: v })}
              options={DEBT_TYPES}
            />
          </Field>
        </div>

        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
          <Field label="Tasa anual" help="Tasa de interés anual efectiva del crédito.">
            <PercentInput
              value={draft.interestRate}
              onChange={(v) => sheet.patch({ interestRate: v })}
            />
          </Field>

          <Field label="Pago mínimo">
            <MoneyInput
              value={draft.minPayment}
              onChange={(v) => sheet.patch({ minPayment: v })}
            />
          </Field>
        </div>

        <Field label="Pago real" hint="Lo que efectivamente pagas">
          <MoneyInput
            value={draft.actualPayment}
            onChange={(v) => sheet.patch({ actualPayment: v })}
          />
        </Field>

        {isCard && (
          <Field label="Línea de crédito" help="Necesaria para calcular tu porcentaje de utilización.">
            <MoneyInput
              value={draft.creditLimit}
              onChange={(v) => sheet.patch({ creditLimit: v })}
              step="1000"
            />
          </Field>
        )}

        <Field label="Activo vinculado" hint="Opcional: qué bien respalda esta deuda">
          <TextInput
            value={draft.linkedAsset}
            onChange={(v) => sheet.patch({ linkedAsset: v })}
            placeholder="Casa, auto..."
          />
        </Field>

        {/* Lo que el motor ya calculó de esta deuda. Sólo al corregir una existente. */}
        {sheet.isEditing && analyzed && (
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t
                          border-zinc-700/50 pt-3 text-[11px] text-zinc-400"
          >
            <span>
              Interés mensual:{' '}
              <span className="font-semibold text-zinc-300">{fmtMXN(analyzed.monthlyInterest)}</span>
            </span>
            <span>
              A capital:{' '}
              <span className="font-semibold text-zinc-300">{fmtMXN(analyzed.principalPortion)}</span>
            </span>
            {analyzed.totalInterest !== null && (
              <span>
                Interés total:{' '}
                <span className="font-semibold text-zinc-300">{fmtMXN(analyzed.totalInterest)}</span>
              </span>
            )}
            {isCard && analyzed.utilization !== null && (
              <Badge status={analyzed.utilization > 0.7 ? 'red' : analyzed.utilization > 0.3 ? 'yellow' : 'green'}>
                Utilización {fmtPct(analyzed.utilization)}
              </Badge>
            )}
            {analyzed.isNeverPaidOff && analyzed.balance > 0 && (
              <Badge status="red">
                El pago no cubre el interés de {fmtMXN(analyzed.monthlyInterest)}
              </Badge>
            )}
          </div>
        )}
      </RowSheet>
    </div>
  );
}
