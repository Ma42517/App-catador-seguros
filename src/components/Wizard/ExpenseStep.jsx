import { useState } from 'react';
import { Plus, ShoppingCart, AlertTriangle } from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
import { createExpense } from '../../data/defaults';
import {
  Card, CardTitle, SectionTitle, Field, TextInput, MoneyInput, Select,
  Button, EmptyState, Badge,
} from '../ui';
import { DonutChart } from '../charts';
import BottomSheet from '../Layout/BottomSheet';
import CompactRow from './CompactRow';
import { labelOf } from '../../lib/options';
import {
  EXPENSE_CATEGORIES, EXPENSE_PRIORITIES, FREQUENCY_OPTIONS,
  fmtMXN, fmtPct, toMonthly,
} from '../../engine/finance';

/**
 * Formulario de un gasto, en hoja modal. Sirve para crear y para corregir.
 *
 * Trabaja sobre un borrador local y sólo escribe en el diagnóstico al guardar. Es el
 * cambio de fondo respecto al formulario en línea que había antes, que mandaba cada
 * tecla al estado global: aquello recalculaba el diagnóstico completo letra por letra
 * y no tenía forma de cancelar, porque lo escrito ya estaba dentro. Aquí "Cancelar"
 * de verdad descarta.
 */
function ExpenseSheet({ isOpen, onClose, draft, onDraftChange, onSave, isEditing }) {
  const set = (patch) => onDraftChange({ ...draft, ...patch });

  const monthly = toMonthly(draft.amount, draft.frequency);
  const name = (draft.name || '').trim();

  /*
    Se exige concepto y monto. Un gasto sin monto no mueve el diagnóstico, y uno sin
    nombre deja una tarjeta que nadie puede identificar tres módulos más adelante.

    Va como botón apagado y no como mensaje de error: el aviso rojo sobre un campo
    que apenas se empieza a llenar regaña antes de tiempo.
  */
  const canSave = name !== '' && draft.amount > 0;

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={onClose}
      label={isEditing ? 'Editar gasto' : 'Nuevo gasto'}
    >
      <div className="mb-5 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-lg font-bold text-zinc-100">
            {isEditing ? 'Editar gasto' : 'Nuevo gasto'}
          </h2>
          <p className="mt-0.5 text-[11px] text-zinc-500">
            {isEditing
              ? 'Corrige lo que necesites y guarda.'
              : 'Sólo el concepto y el monto son obligatorios.'}
          </p>
        </div>

        {/* El equivalente mensual, en vivo: es la cifra con la que trabaja el motor. */}
        {draft.amount > 0 && draft.frequency !== 'one-time' && (
          <span className="shrink-0 rounded-lg bg-indigo-500/10 px-2.5 py-1 text-[11px]
                           font-semibold tabular-nums text-indigo-300 ring-1
                           ring-indigo-500/25"
          >
            {fmtMXN(monthly)}/mes
          </span>
        )}
      </div>

      <div className="space-y-3.5">
        <Field label="Concepto">
          <TextInput
            value={draft.name}
            onChange={(v) => set({ name: v })}
            placeholder="Despensa"
          />
        </Field>

        <Field label="Monto">
          <MoneyInput value={draft.amount} onChange={(v) => set({ amount: v })} />
        </Field>

        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
          <Field label="Frecuencia">
            <Select
              value={draft.frequency}
              onChange={(v) => set({ frequency: v })}
              options={FREQUENCY_OPTIONS}
            />
          </Field>

          <Field label="Categoría">
            <Select
              value={draft.category}
              onChange={(v) => set({ category: v })}
              options={EXPENSE_CATEGORIES}
            />
          </Field>
        </div>

        <Field
          label="Prioridad"
          help="Determina qué tan comprimible es este gasto. Lo esencial nunca se recorta en los escenarios."
        >
          <Select
            value={draft.priority}
            onChange={(v) => set({ priority: v })}
            options={EXPENSE_PRIORITIES}
          />
        </Field>
      </div>

      {/*
        Guardar primero y a lo ancho, cancelar debajo y discreto. En una hoja que se
        cierra tocando el fondo o con Escape, cancelar ya tiene dos caminos: no
        necesita competir en peso con la acción que sí se vino a hacer.
      */}
      <div className="mt-7 space-y-2">
        <Button size="lg" full disabled={!canSave} onClick={onSave}>
          {isEditing ? 'Guardar cambios' : 'Agregar gasto'}
        </Button>
        <Button size="md" full variant="ghost" onClick={onClose}>
          Cancelar
        </Button>
      </div>
    </BottomSheet>
  );
}


export default function ExpenseStep() {
  const { expenses, data, matrix, add, update, remove } = useFinance();
  const exp = matrix.expenses;

  /*
    Un solo borrador para las dos operaciones, con `editingId` decidiendo cuál es.
    Dos hojas —una de crear y otra de editar— serían el mismo formulario duplicado,
    y en cuanto se añadiera un campo habría que acordarse de las dos.

    `editingId` a null significa "estoy creando". Y el borrador no se vacía al
    cerrar: la hoja tarda 300 ms en salir, y quitarle los datos antes la dejaría
    animando en blanco.
  */
  const [isSheetOpen, setSheetOpen] = useState(false);
  const [draft, setDraft] = useState(() => createExpense());
  const [editingId, setEditingId] = useState(null);

  const openNew = () => {
    setDraft(createExpense({ frequency: data.profile.inputFrequency }));
    setEditingId(null);
    setSheetOpen(true);
  };

  const openEdit = (expense) => {
    // Copia, no el objeto del estado: se edita el borrador, no el diagnóstico.
    setDraft({ ...expense });
    setEditingId(expense.id);
    setSheetOpen(true);
  };

  const save = () => {
    const clean = { ...draft, name: (draft.name || '').trim() };
    if (editingId) update('expenses', editingId, clean);
    else add('expenses', clean);
    setSheetOpen(false);
  };

  /*
    El último capturado, arriba.

    Se invierte al pintar en lugar de insertar al principio de la colección: quien
    inserta es el reducer de `FinanceContext`, que es zona intocable del proyecto, y
    el orden de lectura de una lista es asunto de la vista. El resultado es el que se
    buscaba —lo que acabas de agregar aparece sin bajar la pantalla— y de paso el
    orden en el archivo exportado se queda como estaba.
  */
  const visible = [...expenses].reverse();

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
            <Button size="sm" variant="outline" icon={Plus} onClick={openNew}>
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
              <Button size="sm" icon={Plus} onClick={openNew}>
                Agregar gasto
              </Button>
            }
          />
        ) : (
          <div className="space-y-2">
            {visible.map((expense) => {
              const monthly = toMonthly(expense.amount, expense.frequency);
              const isOneTime = expense.frequency === 'one-time';

              return (
                <CompactRow
                  key={expense.id}
                  title={expense.name || 'Gasto sin nombre'}
                  subtitle={[
                    labelOf(EXPENSE_CATEGORIES, expense.category),
                    labelOf(EXPENSE_PRIORITIES, expense.priority),
                  ].filter(Boolean).join(' · ')}
                  amount={isOneTime ? fmtMXN(expense.amount) : fmtMXN(monthly)}
                  note={isOneTime ? 'única vez' : 'al mes'}
                  onEdit={() => openEdit(expense)}
                  onRemove={() => remove('expenses', expense.id)}
                />
              );
            })}
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

      <ExpenseSheet
        isOpen={isSheetOpen}
        onClose={() => setSheetOpen(false)}
        draft={draft}
        onDraftChange={setDraft}
        onSave={save}
        isEditing={editingId !== null}
      />
    </div>
  );
}
