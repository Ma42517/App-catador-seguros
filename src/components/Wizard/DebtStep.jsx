import { Plus, CreditCard, TrendingDown, Zap } from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
import { createDebt } from '../../data/defaults';
import {
  Card, CardTitle, SectionTitle, Field, TextInput, MoneyInput, PercentInput,
  Select, Button, EmptyState, Badge,
} from '../ui';
import { BarList } from '../charts';
import RowShell, { RowGrid } from './RowShell';
import { DEBT_TYPES, fmtMXN, fmtPct } from '../../engine/finance';

function monthsLabel(months) {
  if (months === null || months === undefined) return 'Nunca se liquida';
  if (months === 0) return 'Liquidada';
  if (months < 12) return `${months} meses`;
  const y = Math.floor(months / 12);
  const m = months % 12;
  return m === 0 ? `${y} año${y > 1 ? 's' : ''}` : `${y}a ${m}m`;
}

function DebtRow({ debt, analyzed, onChange, onRemove }) {
  const a = analyzed;
  const isCard = debt.type === 'credit_card';

  return (
    <RowShell
      title={debt.name || 'Nueva deuda'}
      derived={a ? monthsLabel(a.payoffMonths) : null}
      onRemove={onRemove}
    >
      <RowGrid cols={2}>
        <Field label="Concepto">
          <TextInput value={debt.name} onChange={(v) => onChange({ name: v })} placeholder="Tarjeta de crédito" />
        </Field>
        <Field label="Tipo">
          <Select value={debt.type} onChange={(v) => onChange({ type: v })} options={DEBT_TYPES} />
        </Field>
      </RowGrid>

      <div className="mt-3">
        <RowGrid cols={4}>
          <Field label="Saldo actual">
            <MoneyInput value={debt.balance} onChange={(v) => onChange({ balance: v })} step="1000" />
          </Field>
          <Field label="Tasa anual" help="Tasa de interés anual efectiva del crédito.">
            <PercentInput value={debt.interestRate} onChange={(v) => onChange({ interestRate: v })} />
          </Field>
          <Field label="Pago mínimo">
            <MoneyInput value={debt.minPayment} onChange={(v) => onChange({ minPayment: v })} />
          </Field>
          <Field label="Pago real" hint="Lo que efectivamente pagas">
            <MoneyInput value={debt.actualPayment} onChange={(v) => onChange({ actualPayment: v })} />
          </Field>
        </RowGrid>
      </div>


      <div className="mt-3">
        <RowGrid cols={2}>
          {isCard && (
            <Field label="Línea de crédito" help="Necesaria para calcular tu porcentaje de utilización.">
              <MoneyInput value={debt.creditLimit} onChange={(v) => onChange({ creditLimit: v })} step="1000" />
            </Field>
          )}
          <Field label="Activo vinculado" hint="Opcional: qué bien respalda esta deuda">
            <TextInput value={debt.linkedAsset} onChange={(v) => onChange({ linkedAsset: v })} placeholder="Casa, auto..." />
          </Field>
        </RowGrid>
      </div>

      {a && (
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-zinc-700/50 pt-2.5 text-[11px] text-zinc-400">
          <span>Interés mensual: <span className="font-semibold text-zinc-300">{fmtMXN(a.monthlyInterest)}</span></span>
          <span>A capital: <span className="font-semibold text-zinc-300">{fmtMXN(a.principalPortion)}</span></span>
          {a.totalInterest !== null && (
            <span>Interés total: <span className="font-semibold text-zinc-300">{fmtMXN(a.totalInterest)}</span></span>
          )}
          {isCard && a.utilization !== null && (
            <Badge status={a.utilization > 0.7 ? 'red' : a.utilization > 0.3 ? 'yellow' : 'green'}>
              Utilización {fmtPct(a.utilization)}
            </Badge>
          )}
          {a.isNeverPaidOff && a.balance > 0 && (
            <Badge status="red">
              El pago no cubre el interés de {fmtMXN(a.monthlyInterest)}
            </Badge>
          )}
        </div>
      )}
    </RowShell>
  );
}


export default function DebtStep() {
  const { debts, matrix, add, update, remove } = useFinance();
  const d = matrix.debts;
  const plans = matrix.payoffPlans;
  const byId = Object.fromEntries(d.items.map((x) => [x.id, x]));

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
            <Button size="sm" variant="outline" icon={Plus} onClick={() => add('debts', createDebt())}>
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
              <Button size="sm" icon={Plus} onClick={() => add('debts', createDebt())}>
                Agregar deuda
              </Button>
            }
          />
        ) : (
          <div className="space-y-3">
            {debts.map((debt) => (
              <DebtRow
                key={debt.id}
                debt={debt}
                analyzed={byId[debt.id]}
                onChange={(patch) => update('debts', debt.id, patch)}
                onRemove={() => remove('debts', debt.id)}
              />
            ))}
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
    </div>
  );
}
