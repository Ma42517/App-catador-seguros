import { Plus, Target, Sunset } from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
import { createGoal } from '../../data/defaults';
import {
  Card, CardTitle, SectionTitle, Field, TextInput, MoneyInput, PercentInput,
  NumberInput, Select, Button, EmptyState, Badge,
} from '../ui';
import { ProgressBar, LineChart } from '../charts';
import { RowGrid } from './RowShell';
import CompactRow from './CompactRow';
import RowSheet from './RowSheet';
import useRowSheet, { newestFirst } from './useRowSheet';
import { labelOf } from '../../lib/options';
import { GOAL_PRESETS, GOAL_PRIORITIES, fmtMXN, fmtPct } from '../../engine/finance';

export default function GoalStep() {
  const {
    goals, data, matrix, diagnosis, add, update, remove, patchSection,
  } = useFinance();
  const g = matrix.goals;
  const r = matrix.retirement;
  const byId = Object.fromEntries(g.items.map((x) => [x.id, x]));

  const sheet = useRowSheet({ collection: 'goals', create: createGoal, add, update });
  const { draft } = sheet;

  // Análisis de la meta que se corrige, cuando el motor ya la conoce.
  const analyzed = byId[draft.id];

  return (
    <div className="space-y-4">
      <SectionTitle
        eyebrow="Módulos 8 y 9"
        title="Metas y retiro"
        description="Cada meta se valúa a futuro con su propia inflación. El motor calcula la aportación mensual real que necesitas y reparte tu excedente por prioridad."
      />

      <Card>
        <CardTitle
          icon={Target}
          action={
            <Button size="sm" variant="outline" icon={Plus} onClick={() => sheet.openNew()}>
              Agregar
            </Button>
          }
        >
          Metas de vida
        </CardTitle>


        {goals.length === 0 ? (
          <EmptyState
            icon={Target}
            title="Sin metas registradas"
            description="Una casa, la universidad de tus hijos, un viaje, un negocio. Ponles número y fecha."
            action={
              <Button size="sm" icon={Plus} onClick={() => sheet.openNew()}>
                Agregar meta
              </Button>
            }
          />
        ) : (
          <div className="space-y-2">
            {newestFirst(goals).map((goal) => {
              const a = byId[goal.id];

              /*
                Una meta que no alcanza es el dato que hace falta ver de un tirón:
                es lo que abre la conversación sobre prioridades. Dentro de la hoja
                se vería una por una, y la comparación entre metas se perdería.
              */
              const flag = a && !a.isFeasible
                ? <Badge status={a.coverage > 0.5 ? 'yellow' : 'red'}>{a.feasibilityScore}%</Badge>
                : null;

              return (
                <CompactRow
                  key={goal.id}
                  title={goal.name || 'Meta sin nombre'}
                  badge={flag}
                  subtitle={[
                    labelOf(GOAL_PRESETS, goal.preset),
                    labelOf(GOAL_PRIORITIES, goal.priority),
                    goal.years > 0 ? `${goal.years} años` : '',
                  ].filter(Boolean).join(' · ')}
                  amount={a ? fmtMXN(a.monthlyRequired) : fmtMXN(goal.cost)}
                  note={a ? 'requerido/mes' : 'costo hoy'}
                  onEdit={() => sheet.openEdit(goal)}
                  onRemove={() => remove('goals', goal.id)}
                />
              );
            })}
          </div>
        )}

        {goals.length > 0 && (
          <div className="surface-sunken mt-4 space-y-2 p-3 text-xs">
            <div className="flex justify-between">
              <span className="text-zinc-400">Aportación total requerida</span>
              <span className="tabular-nums font-semibold text-zinc-100">{fmtMXN(g.totalMonthlyRequired)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-400">Excedente disponible</span>
              <span className="tabular-nums font-medium text-zinc-200">
                {fmtMXN(Math.max(0, matrix.NET_CASHFLOW - matrix.assets.monthlyContributions))}
              </span>
            </div>
            {g.unfundedMonthly > 0 && (
              <div className="flex justify-between border-t border-zinc-700/50 pt-2">
                <span className="text-zinc-400">Faltante mensual</span>
                <span className="tabular-nums font-semibold text-rose-400">{fmtMXN(g.unfundedMonthly)}</span>
              </div>
            )}
            <div className="flex items-center justify-between border-t border-zinc-700/50 pt-2">
              <span className="text-zinc-400">Viabilidad del conjunto</span>
              <Badge status={g.overallFeasibility >= 0.999 ? 'green' : g.overallFeasibility >= 0.6 ? 'yellow' : 'red'}>
                {g.feasibilityScore}/100
              </Badge>
            </div>
          </div>
        )}
      </Card>


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
          <Field label="Rendimiento antes del retiro">
            <PercentInput
              value={data.retirement.preRetirementReturn}
              onChange={(v) => patchSection('retirement', { preRetirementReturn: v })}
            />
          </Field>
          <Field label="Rendimiento durante el retiro" help="Suele ser menor: el portafolio se vuelve más conservador.">
            <PercentInput
              value={data.retirement.postRetirementReturn}
              onChange={(v) => patchSection('retirement', { postRetirementReturn: v })}
            />
          </Field>
        </RowGrid>

        <div className="mt-4 rounded-xl bg-indigo-500/10 p-3 text-[11px] leading-relaxed text-indigo-200 ring-1 ring-indigo-500/25">
          Tu capital de retiro y tu aportación mensual se toman automáticamente de los activos
          que marcaste como <span className="font-semibold">cuenta de retiro</span> en el paso anterior
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

      <RowSheet
        isOpen={sheet.isOpen}
        onClose={sheet.close}
        onSave={sheet.save}
        isEditing={sheet.isEditing}
        title="meta"
        hint="La meta y su costo de hoy son obligatorios."
        canSave={(draft.name || '').trim() !== '' && draft.cost > 0}
        saveLabel="Agregar meta"
      >
        <Field label="Meta">
          <TextInput
            value={draft.name}
            onChange={(v) => sheet.patch({ name: v })}
            placeholder="Universidad de los hijos"
          />
        </Field>

        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
          <Field label="Costo hoy">
            <MoneyInput
              value={draft.cost}
              onChange={(v) => sheet.patch({ cost: v })}
              step="1000"
            />
          </Field>

          <Field label="Ya ahorrado">
            <MoneyInput
              value={draft.currentSavings}
              onChange={(v) => sheet.patch({ currentSavings: v })}
              step="1000"
            />
          </Field>
        </div>

        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
          <Field label="Años para lograrla">
            <NumberInput
              value={draft.years}
              onChange={(v) => sheet.patch({ years: v })}
              min={0}
              max={50}
            />
          </Field>

          <Field label="Categoría">
            <Select
              value={draft.preset}
              onChange={(v) => sheet.patch({ preset: v })}
              options={GOAL_PRESETS}
            />
          </Field>
        </div>

        <Field label="Prioridad" help="Las metas de mayor prioridad consumen tu excedente primero.">
          <Select
            value={draft.priority}
            onChange={(v) => sheet.patch({ priority: v })}
            options={GOAL_PRIORITIES}
          />
        </Field>

        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
          <Field
            label="Inflación del bien"
            help="La educación y la salud suelen inflarse más rápido que el índice general."
          >
            <PercentInput
              value={draft.inflation}
              onChange={(v) => sheet.patch({ inflation: v })}
            />
          </Field>

          <Field label="Rendimiento esperado del ahorro">
            <PercentInput
              value={draft.expectedReturn}
              onChange={(v) => sheet.patch({ expectedReturn: v })}
              min={-100}
            />
          </Field>
        </div>

        {/* Viabilidad calculada por el motor. Sólo al corregir una meta existente. */}
        {sheet.isEditing && analyzed && (
          <div className="border-t border-zinc-700/50 pt-3">
            <p className="mb-1.5 flex items-center justify-between text-[11px] text-zinc-400">
              <span>Viabilidad</span>
              <span>Costo futuro: {fmtMXN(analyzed.futureCost)}</span>
            </p>
            <ProgressBar
              value={analyzed.coverage}
              tone={analyzed.isFeasible ? 'green' : analyzed.coverage > 0.5 ? 'yellow' : 'red'}
              right={`${analyzed.feasibilityScore}%`}
            />
          </div>
        )}
      </RowSheet>
    </div>
  );
}
