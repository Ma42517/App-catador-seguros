import { Plus, ShoppingCart, AlertTriangle } from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
import { createExpense } from '../../data/defaults';
import {
  Card, CardTitle, SectionTitle, Field, TextInput, MoneyInput, Select,
  Button, EmptyState, Badge,
} from '../ui';
import { DonutChart } from '../charts';
import RowShell, { RowGrid } from './RowShell';
import {
  EXPENSE_CATEGORIES, EXPENSE_PRIORITIES, FREQUENCY_OPTIONS,
  fmtMXN, fmtPct, toMonthly,
} from '../../engine/finance';

function ExpenseRow({ expense, onChange, onRemove }) {
  const monthly = toMonthly(expense.amount, expense.frequency);

  return (
    <RowShell
      title={expense.name || 'Nuevo gasto'}
      derived={expense.frequency === 'one-time'
        ? `${fmtMXN(expense.amount)} única vez`
        : `${fmtMXN(monthly)}/mes`}
      onRemove={onRemove}
    >
      <RowGrid cols={2}>
        <Field label="Concepto">
          <TextInput value={expense.name} onChange={(v) => onChange({ name: v })} placeholder="Despensa" />
        </Field>
        <Field label="Categoría">
          <Select value={expense.category} onChange={(v) => onChange({ category: v })} options={EXPENSE_CATEGORIES} />
        </Field>
      </RowGrid>
      <div className="mt-3">
        <RowGrid cols={3}>
          <Field label="Monto">
            <MoneyInput value={expense.amount} onChange={(v) => onChange({ amount: v })} />
          </Field>
          <Field label="Frecuencia">
            <Select value={expense.frequency} onChange={(v) => onChange({ frequency: v })} options={FREQUENCY_OPTIONS} />
          </Field>
          <Field
            label="Prioridad"
            help="Determina qué tan comprimible es este gasto. Lo esencial nunca se recorta en los escenarios."
          >
            <Select value={expense.priority} onChange={(v) => onChange({ priority: v })} options={EXPENSE_PRIORITIES} />
          </Field>
        </RowGrid>
      </div>
    </RowShell>
  );
}


export default function ExpenseStep() {
  const { expenses, data, matrix, add, update, remove } = useFinance();
  const exp = matrix.expenses;

  const priorityData = EXPENSE_PRIORITIES.map((p) => ({
    label: p.label,
    value: exp.byPriority[p.value] || 0,
    color: p.color,
  }));

  return (
    <div className="space-y-4">
      <SectionTitle
        eyebrow="Módulo 4"
        title="Gastos"
        description="Clasifica cada gasto por destino y por prioridad. La prioridad define qué puede recortarse cuando optimicemos tu plan."
      />

      <div className="flex items-start gap-2.5 rounded-xl bg-amber-500/10 p-3 ring-1 ring-amber-500/25">
        <AlertTriangle size={15} className="mt-0.5 shrink-0 text-amber-400" />
        <p className="text-[11px] leading-relaxed text-amber-200">
          <span className="font-semibold">Importante:</span> no registres aquí los pagos de créditos
          (hipoteca, auto, tarjetas). Esos van en el paso de Deudas. Registrarlos en ambos lados
          duplicaría el monto y distorsionaría todo tu diagnóstico.
        </p>
      </div>

      <Card>
        <CardTitle
          icon={ShoppingCart}
          action={
            <Button size="sm" variant="outline" icon={Plus}
              onClick={() => add('expenses', createExpense({ frequency: data.profile.inputFrequency }))}>
              Agregar
            </Button>
          }
        >
          Gastos registrados
        </CardTitle>

        {expenses.length === 0 ? (
          <EmptyState
            icon={ShoppingCart}
            title="Sin gastos registrados"
            description="Captura tus gastos para conocer tu flujo real y tu capacidad de ahorro."
            action={
              <Button size="sm" icon={Plus} onClick={() => add('expenses', createExpense())}>
                Agregar gasto
              </Button>
            }
          />
        ) : (
          <div className="space-y-3">
            {expenses.map((expense) => (
              <ExpenseRow
                key={expense.id}
                expense={expense}
                onChange={(patch) => update('expenses', expense.id, patch)}
                onRemove={() => remove('expenses', expense.id)}
              />
            ))}
          </div>
        )}
      </Card>


      {expenses.length > 0 && (
        <Card>
          <CardTitle
            help="Lo esencial e importante es tu piso de vida. Lo discrecional y de lujo es tu margen de maniobra."
            action={
              <Badge status={exp.expenseToIncomeRatio > 0.75 ? 'red'
                : exp.expenseToIncomeRatio > 0.5 ? 'yellow' : 'green'}>
                {fmtPct(exp.expenseToIncomeRatio)} de tu ingreso
              </Badge>
            }
          >
            Composición del gasto
          </CardTitle>

          <DonutChart
            data={priorityData}
            centerValue={fmtMXN(exp.totalMonthly)}
            centerLabel="al mes"
          />

          <div className="mt-4 grid grid-cols-2 gap-3 border-t border-zinc-700/50 pt-3 text-xs">
            <div>
              <p className="text-zinc-400">Margen comprimible</p>
              <p className="font-semibold tabular-nums text-zinc-100">{fmtMXN(exp.compressibleMonthly)}</p>
              <p className="text-[10px] text-zinc-500">Discrecional + lujo</p>
            </div>
            <div>
              <p className="text-zinc-400">Piso de vida</p>
              <p className="font-semibold tabular-nums text-zinc-100">{fmtMXN(exp.essentialMonthly)}</p>
              <p className="text-[10px] text-zinc-500">Base del fondo de emergencia</p>
            </div>
          </div>

          {exp.topCategories.length > 0 && (
            <div className="mt-4 border-t border-zinc-700/50 pt-3">
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
                Top 5 categorías
              </p>
              <ul className="space-y-1.5">
                {exp.topCategories.map((c) => (
                  <li key={c.value} className="flex items-center justify-between text-xs">
                    <span className="text-zinc-400">{c.label}</span>
                    <span className="tabular-nums text-zinc-100">
                      {fmtMXN(c.amount)}
                      <span className="ml-2 text-zinc-500">{Math.round(c.share * 100)}%</span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
