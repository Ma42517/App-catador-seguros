import { Plus, Target } from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
import { useState } from 'react';
import { createGoal } from '../../data/defaults';
import {
  inflationForGoalPreset, isSuggestedRate, rateOrBlank,
  returnForSavingsVehicle, SAVINGS_VEHICLES, DEFAULT_SAVINGS_VEHICLE,
} from '../../data/historicalRates';
import RateField from './RateField';
import GoalFeasibility from './GoalFeasibility';
import {
  Card, CardTitle, SectionTitle, Field, TextInput, MoneyInput,
  NumberInput, Select, Button, EmptyState, Badge,
} from '../ui';
import { ProgressBar } from '../charts';
import CompactRow from './CompactRow';
import RowSheet from './RowSheet';
import useRowSheet, { newestFirst } from './useRowSheet';
import { labelOf } from '../../lib/options';
import { GOAL_PRESETS, GOAL_PRIORITIES, fmtMXN } from '../../engine/finance';

export default function GoalStep() {
  const { goals, matrix, add, update, remove } = useFinance();
  const g = matrix.goals;
  const byId = Object.fromEntries(g.items.map((x) => [x.id, x]));

  const sheet = useRowSheet({ collection: 'goals', create: createGoal, add, update });
  const { draft } = sheet;

  // Análisis de la meta que se corrige, cuando el motor ya la conoce.
  const analyzed = byId[draft.id];

  /*
    Dos tasas y dos modos independientes.

    La inflación la manda el tipo de meta —la educación se encarece más rápido que un
    viaje— así que cambiar la categoría la arrastra. El rendimiento no depende de la
    meta sino de dónde se invierta el ahorro, así que su sugerencia es fija y sólo se
    ofrece como punto de partida.
  */
  const [manualInflation, setManualInflation] = useState(false);
  const [manualReturn, setManualReturn] = useState(false);

  const suggestedInflation = inflationForGoalPreset(draft.preset);
  const suggestedReturn = returnForSavingsVehicle(draft.savingsVehicle);

  const openNewGoal = () => {
    setManualInflation(false);
    setManualReturn(false);
    sheet.openNew();
  };

  const openEditGoal = (goal) => {
    setManualInflation(!isSuggestedRate(goal.inflation, inflationForGoalPreset(goal.preset)));
    /*
      Las metas capturadas antes de que existiera el vehículo de ahorro no traen el
      campo: `returnForSavingsVehicle(undefined)` da `null`, así que abren en manual con
      su tasa guardada intacta. Es lo correcto —ese rendimiento lo eligió alguien— y
      evita que al reabrirlas se les cambie el número por debajo.
    */
    setManualReturn(!isSuggestedRate(
      goal.expectedReturn, returnForSavingsVehicle(goal.savingsVehicle),
    ));
    sheet.openEdit(goal);
  };

  /** Cambiar la categoría arrastra la inflación del bien, salvo que sea manual. */
  const changePreset = (preset) => {
    sheet.patch(manualInflation
      ? { preset }
      : { preset, inflation: rateOrBlank(inflationForGoalPreset(preset)) });
  };

  /** Cambiar el instrumento arrastra el rendimiento, salvo que sea manual. */
  const changeVehicle = (savingsVehicle) => {
    sheet.patch(manualReturn
      ? { savingsVehicle }
      : {
        savingsVehicle,
        expectedReturn: rateOrBlank(returnForSavingsVehicle(savingsVehicle)),
      });
  };

  return (
    <div className="space-y-4">
      <SectionTitle
        eyebrow="Módulo 9"
        title="Metas"
        description="Cada meta se valúa a futuro con su propia inflación. El motor calcula la aportación mensual real que necesitas y reparte tu excedente por prioridad. Tu retiro se planea en el paso anterior."
      />

      <Card>
        <CardTitle
          icon={Target}
          action={
            <Button size="sm" variant="outline" icon={Plus} onClick={openNewGoal}>
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
              <Button size="sm" icon={Plus} onClick={openNewGoal}>
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
                  onEdit={() => openEditGoal(goal)}
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

        {/*
          Lo que la persona puede aportar, y el veredicto justo debajo.

          El plazo se queda como campo: es una decisión ("la quiero en 5 años"), no un resultado.
          Lo que faltaba era la otra mitad —cuánto puede poner al mes— para poder contestar si
          esas dos cosas caben juntas. El motor ya calculaba el requerido; ahora se compara con
          el disponible y el veredicto sale solo.
        */}
        <div className="space-y-3.5 rounded-xl border border-zinc-800 bg-zinc-950/40 p-3">
          <Field
            label="¿Cuánto puedes aportar al mes?"
            help="Se compara contra la aportación que la meta exige, para decirte si el plazo que elegiste es alcanzable."
          >
            <MoneyInput
              value={draft.plannedContribution}
              onChange={(v) => sheet.patch({ plannedContribution: v })}
              step="500"
            />
          </Field>

          <GoalFeasibility goal={draft} contribution={draft.plannedContribution} />
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

          <Field label="Prioridad" help="Las metas de mayor prioridad consumen tu excedente primero.">
            <Select
              value={draft.priority}
              onChange={(v) => sheet.patch({ priority: v })}
              options={GOAL_PRIORITIES}
            />
          </Field>
        </div>

        {/*
          Las dos tasas de una meta, cada una pegada a la pregunta que la decide.

          La mecánica ya funcionaba —elegir "Educación" ponía su 7 %— pero el selector que
          la gobernaba se llamaba "Categoría" y vivía cuatro campos más arriba, junto a los
          años. Desde ahí no se veía que una cosa moviera la otra: la inflación parecía un
          número que aparecía solo, y quien no lo relacionaba lo escribía a mano encima.

          Emparejadas en dos bloques, cada tasa se lee como la consecuencia de la respuesta
          que tiene encima. Y las dos preguntas quedan formuladas igual —qué es, y dónde se
          guarda— que es lo que deja claro que son dos cosas distintas: la meta manda la
          inflación, el instrumento manda el rendimiento.
        */}
        <div className="space-y-3.5 rounded-xl border border-zinc-800 bg-zinc-950/40 p-3">
          <Field
            label="¿Qué tipo de objetivo es?"
            help="Define la inflación con la que se valúa la meta a futuro."
          >
            <Select value={draft.preset} onChange={changePreset} options={GOAL_PRESETS} />
          </Field>

          <RateField
            label="Inflación del bien"
            help="La educación y la salud suelen inflarse más rápido que el índice general."
            value={draft.inflation}
            suggested={suggestedInflation}
            note={suggestedInflation === null
              ? 'Sin referencia: depende de qué sea la meta. Escríbela.'
              : `Promedio histórico para ${labelOf(GOAL_PRESETS, draft.preset)}.`}
            isManual={manualInflation}
            onUseManual={() => setManualInflation(true)}
            onUseSuggested={() => {
              setManualInflation(false);
              sheet.patch({ inflation: suggestedInflation });
            }}
            onChange={(v) => sheet.patch({ inflation: v })}
          />
        </div>

        <div className="space-y-3.5 rounded-xl border border-zinc-800 bg-zinc-950/40 p-3">
          <Field
            label="¿Dónde vas a guardar este ahorro?"
            help="Define el rendimiento con el que se proyecta la meta. Cámbialo para comparar instrumentos."
          >
            <Select
              value={draft.savingsVehicle ?? DEFAULT_SAVINGS_VEHICLE}
              onChange={changeVehicle}
              options={SAVINGS_VEHICLES}
            />
          </Field>

          <RateField
            label="Rendimiento del ahorro"
            help="Sale del instrumento que elegiste arriba, no de la meta."
            value={draft.expectedReturn}
            suggested={suggestedReturn}
            note={suggestedReturn === null
              ? 'Depende del instrumento que uses: escríbelo.'
              : `Promedio para ${labelOf(SAVINGS_VEHICLES, draft.savingsVehicle ?? DEFAULT_SAVINGS_VEHICLE)}.`}
            isManual={manualReturn}
            onUseManual={() => setManualReturn(true)}
            onUseSuggested={() => {
              setManualReturn(false);
              sheet.patch({ expectedReturn: suggestedReturn });
            }}
            onChange={(v) => sheet.patch({ expectedReturn: v })}
            min={-100}
          />
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
