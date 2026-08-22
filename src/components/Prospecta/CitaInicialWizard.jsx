import { useState } from 'react';
import {
  ArrowLeft, ChevronLeft, ChevronRight, ShieldCheck, Check, ArrowUp, ArrowDown,
  Sparkles,
} from 'lucide-react';
import {
  Field, NumberInput, MoneyInput, SegmentedControl, Checkbox, Button,
} from '../ui';
import { BigResult, MiniStat, YesNoRow, StepHeading } from './ProspectaParts';
import PresentationEndModal from './PresentationEndModal';
import { useSession } from '../../context/SessionContext';
import useAdvisorPoints from '../../lib/useAdvisorPoints';
import { markProspectDiscarded } from '../../data/prospectStatus';
import {
  COMPANY_FACTS, PYRAMID_LEVELS, THERMOMETER_AMOUNTS, PAYMENT_METHODS,
  SAVING_HABITS, CURRENCY_OPTIONS,
  formatMoney, formatShortMoney, firstAffordable, annualIncome, recommendedCoverage,
  lifetimeEarnings, retirementPlan, savingCapacity,
} from './citaInicial';

/**
 * Estado inicial de toda la cita.
 *
 * Un solo objeto para los siete pasos, y no un estado por paso: las
 * conclusiones necesitan el ingreso que se capturó en el paso 4, y el paso 6
 * reutiliza la edad del paso 5. Con estados separados habría que ir pasándolos
 * hacia arriba, y el asesor perdería lo escrito al volver atrás a corregir algo
 * —que es lo que más ocurre en una conversación real—.
 */
const EMPTY = {
  // Paso 3
  imss: null,
  gmm: null,
  thermometer: {},
  payWith: {},
  // Paso 4
  monthlyIncome: 0,
  cushionYears: 15,
  // Paso 5
  savingHabit: '',
  startWorkAge: 0,
  currentAge: 0,
  // Paso 6
  retireAge: 65,
  lifeExpectancy: 85,
  desiredMonthly: 0,
  // Paso 7
  priorities: PYRAMID_LEVELS.map((level) => level.key),
  currency: 'udis',
};

const STEP_LABELS = [
  'Rompehielo', 'Pirámide', 'Salud', 'Protección', 'Ahorro', 'Retiro', 'Conclusiones',
];

/* ── Paso 1 ─────────────────────────────────────────────────────────────── */

function IntroStep() {
  return (
    <div>
      <StepHeading
        eyebrow="Paso 1"
        title="Antes de empezar"
        subtitle="Quién te acompaña en esto y cuánto va a durar."
      />

      {/*
        La marca va como texto y no como imagen: no tengo el archivo del logo
        oficial, y una imagen que no carga en la primera pantalla de una cita
        es peor que una tipografía bien puesta. Cuando tengas el PNG o el SVG,
        se sustituye este bloque y nada más.
      */}
      <div
        className="mb-5 rounded-2xl border border-zinc-800 bg-gradient-to-br from-zinc-900
                   to-zinc-950 p-6 text-center"
      >
        <span
          className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-xl
                     border border-indigo-500/30 bg-indigo-500/10 text-indigo-300"
          aria-hidden="true"
        >
          <ShieldCheck size={24} strokeWidth={1.8} />
        </span>
        <p className="text-sm font-black uppercase tracking-[0.2em] text-white">
          Seguros Monterrey
        </p>
        <p className="mt-0.5 text-[11px] font-semibold uppercase tracking-[0.3em] text-indigo-300">
          New York Life
        </p>
      </div>

      <div className="flex flex-col gap-2.5">
        {COMPANY_FACTS.map((fact) => (
          <div
            key={fact.key}
            className="flex items-center gap-4 rounded-xl border border-zinc-800
                       bg-zinc-900/60 p-4"
          >
            <p className="w-20 shrink-0 text-lg font-black leading-none tabular-nums
                          text-indigo-300"
            >
              {fact.value}
            </p>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-zinc-200">{fact.label}</p>
              <p className="mt-0.5 text-[11px] leading-snug text-zinc-500">{fact.detail}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Paso 2 ─────────────────────────────────────────────────────────────── */

function PyramidStep() {
  const [open, setOpen] = useState(null);

  return (
    <div>
      <StepHeading
        eyebrow="Paso 2"
        title="La pirámide de necesidades"
        subtitle="Toca cada nivel. Los de arriba sólo se sostienen si los de abajo están resueltos."
      />

      {/*
        Se dibuja de arriba hacia abajo invirtiendo el arreglo, que está en orden
        de urgencia. Así el ancho decrece con la altura y la figura se lee como
        una pirámide sin necesidad de explicarla.
      */}
      <div className="flex flex-col items-center gap-1.5">
        {[...PYRAMID_LEVELS].reverse().map((level) => {
          const isOpen = open === level.key;
          return (
            <button
              key={level.key}
              type="button"
              aria-expanded={isOpen}
              onClick={() => setOpen(isOpen ? null : level.key)}
              className={`${level.width} rounded-xl border border-white/10 bg-gradient-to-r
                          px-4 py-3 text-left transition-all duration-200 active:scale-[0.98]
                          focus-visible:outline-none focus-visible:ring-2
                          focus-visible:ring-white/50 ${level.tone}
                          ${isOpen ? 'ring-2 ring-white/60' : 'hover:brightness-110'}`}
            >
              <p className="text-sm font-bold leading-none text-white">{level.label}</p>
              <p className="mt-1 text-[11px] leading-snug text-white/75">{level.tagline}</p>
            </button>
          );
        })}
      </div>

      {/*
        La descripción vive fuera de la pirámide y no dentro del nivel. Dentro,
        al abrirse empujaría los demás niveles y la figura se deformaría justo
        cuando se está usando para explicar algo.
      */}
      {open && (
        <div className="animate-rise mt-4 rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4">
          <p className="text-xs font-bold uppercase tracking-wider text-indigo-300">
            {PYRAMID_LEVELS.find((l) => l.key === open).label}
          </p>
          <p className="mt-1.5 text-xs leading-relaxed text-zinc-300">
            {PYRAMID_LEVELS.find((l) => l.key === open).description}
          </p>
        </div>
      )}
    </div>
  );
}

/* ── Paso 3 ─────────────────────────────────────────────────────────────── */

function HealthStep({ data, update }) {
  const affordable = firstAffordable(data.thermometer);
  const answered = THERMOMETER_AMOUNTS.some((a) => data.thermometer[a] !== undefined);

  return (
    <div>
      <StepHeading
        eyebrow="Paso 3"
        title="¿Qué pasa si hoy te enfermas?"
        subtitle="Primero qué tienes, y después cuánto podrías pagar de tu bolsa."
      />

      <div className="mb-5 flex flex-col gap-2.5">
        <YesNoRow
          question="¿Tienes IMSS o ISSSTE?"
          value={data.imss}
          onChange={(v) => update({ imss: v })}
        />
        <YesNoRow
          question="¿Tienes gastos médicos mayores privado?"
          value={data.gmm}
          onChange={(v) => update({ gmm: v })}
        />
      </div>

      <p className="mb-2.5 text-[11px] font-bold uppercase tracking-widest text-indigo-400">
        Termómetro financiero
      </p>
      <p className="mb-3 text-xs leading-relaxed text-zinc-400">
        ¿Podrías pagar esta cantidad hoy, en caso de emergencia?
      </p>

      <div className="flex flex-col gap-2">
        {THERMOMETER_AMOUNTS.map((amount) => (
          <YesNoRow
            key={amount}
            question={formatShortMoney(amount)}
            value={data.thermometer[amount] ?? null}
            onChange={(v) => update({
              thermometer: { ...data.thermometer, [amount]: v },
            })}
          />
        ))}
      </div>

      {/*
        El resultado aparece sólo cuando hay al menos una respuesta. Mostrarlo
        vacío desde el principio le quita el efecto a la única frase que importa
        de este paso.
      */}
      {answered && (
        <div className="mt-4">
          <BigResult
            label={affordable ? 'Puedes cubrir hasta' : 'Hoy no podrías cubrir'}
            value={affordable ? formatShortMoney(affordable) : 'Ni $500'}
            tone={affordable ? 'indigo' : 'rose'}
            hint={affordable
              ? 'Todo lo que esté por encima de esta cifra es el hueco que hay que asegurar.'
              : 'Una emergencia de cualquier tamaño hoy se pagaría con deuda.'}
          />
        </div>
      )}

      <p className="mb-2.5 mt-5 text-[11px] font-bold uppercase tracking-widest text-indigo-400">
        ¿Cómo lo pagarías?
      </p>
      <div className="flex flex-col gap-2.5">
        {PAYMENT_METHODS.map((method) => (
          <div
            key={method.key}
            className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-3"
          >
            <Checkbox
              checked={!!data.payWith[method.key]}
              onChange={(v) => update({ payWith: { ...data.payWith, [method.key]: v } })}
              label={method.label}
            />
            {data.payWith[method.key] && (
              <p className="mt-1.5 pl-6 text-[11px] font-medium leading-snug text-amber-400/90">
                {method.cost}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Paso 4 ─────────────────────────────────────────────────────────────── */

function ProtectionStep({ data, update }) {
  const annual = annualIncome(data.monthlyIncome);
  const coverage = recommendedCoverage(data.monthlyIncome, data.cushionYears);

  return (
    <div>
      <StepHeading
        eyebrow="Paso 4"
        title="¿Cuánto vale tu ingreso?"
        subtitle="Un seguro de vida no reemplaza a una persona. Reemplaza su sueldo el tiempo que haga falta."
      />

      <div className="flex flex-col gap-4">
        <Field label="Ingreso mensual" hint="Lo que entra a tu casa cada mes.">
          <MoneyInput
            value={data.monthlyIncome}
            onChange={(v) => update({ monthlyIncome: v })}
          />
        </Field>

        <MiniStat label="Ingreso anual" value={formatMoney(annual)} />

        <Field
          label="Años de colchón financiero"
          hint="Cuántos años debería vivir tu familia igual que hoy sin ti."
        >
          <NumberInput
            value={data.cushionYears}
            onChange={(v) => update({ cushionYears: v })}
            suffix="años"
            min={1}
            max={40}
            step="1"
          />
        </Field>
      </div>

      <div className="mt-5">
        <BigResult
          label="Suma asegurada correcta recomendada"
          value={formatMoney(coverage)}
          hint={annual > 0 && data.cushionYears > 0
            ? `${formatMoney(annual)} al año × ${data.cushionYears} años`
            : 'Escribe tu ingreso mensual para ver la cifra.'}
        />
      </div>
    </div>
  );
}

/* ── Paso 5 ─────────────────────────────────────────────────────────────── */

function SavingStep({ data, update }) {
  const { yearsWorked, total } = lifetimeEarnings(data);

  return (
    <div>
      <StepHeading
        eyebrow="Paso 5"
        title="¿Cuánto dinero ha pasado por tus manos?"
        subtitle="No es cuánto ganas. Es cuánto has ganado en toda tu vida laboral."
      />

      <Field label="¿Tienes el hábito de ahorrar?" className="mb-4">
        <SegmentedControl
          value={data.savingHabit}
          onChange={(v) => update({ savingHabit: v })}
          options={SAVING_HABITS}
          className="w-full"
        />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Empecé a trabajar a los">
          <NumberInput
            value={data.startWorkAge}
            onChange={(v) => update({ startWorkAge: v })}
            suffix="años"
            min={10}
            max={80}
            step="1"
          />
        </Field>

        <Field label="Edad actual">
          <NumberInput
            value={data.currentAge}
            onChange={(v) => update({ currentAge: v })}
            suffix="años"
            min={16}
            max={90}
            step="1"
          />
        </Field>
      </div>

      <Field label="Ingreso mensual actual" className="mt-3">
        <MoneyInput
          value={data.monthlyIncome}
          onChange={(v) => update({ monthlyIncome: v })}
        />
      </Field>

      {/*
        El ingreso es el mismo campo del paso 4 a propósito: en la conversación
        real es el mismo dato, y pedirlo dos veces invita a que se escriban dos
        cifras distintas y a que las conclusiones no cuadren con la propuesta.
      */}
      <p className="mt-1.5 text-[11px] leading-relaxed text-zinc-500">
        Es el mismo ingreso del paso anterior. Si lo cambias aquí, allá también cambia.
      </p>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <MiniStat label="Años trabajados" value={`${yearsWorked}`} />
        <MiniStat label="Ingreso anual" value={formatMoney(annualIncome(data.monthlyIncome))} />
      </div>

      <div className="mt-4">
        <BigResult
          label="Dinero que has generado en tu vida"
          value={formatMoney(total)}
          hint={total > 0
            ? '¿Cuánto de esto se quedó contigo?'
            : 'Completa las dos edades y tu ingreso.'}
        />
      </div>
    </div>
  );
}

/* ── Paso 6 ─────────────────────────────────────────────────────────────── */

function RetirementStep({ data, update }) {
  const plan = retirementPlan(data);

  return (
    <div>
      <StepHeading
        eyebrow="Paso 6"
        title="¿Cuánto cuesta tu retiro?"
        subtitle="Dejar de trabajar no es dejar de gastar. Alguien tiene que pagar esos años."
      />

      <div className="grid grid-cols-2 gap-3">
        <Field label="Edad actual">
          <NumberInput
            value={data.currentAge}
            onChange={(v) => update({ currentAge: v })}
            suffix="años"
            min={16}
            max={90}
            step="1"
          />
        </Field>

        <Field label="Quiero retirarme a los">
          <NumberInput
            value={data.retireAge}
            onChange={(v) => update({ retireAge: v })}
            suffix="años"
            min={40}
            max={90}
            step="1"
          />
        </Field>

        <Field label="Expectativa de vida">
          <NumberInput
            value={data.lifeExpectancy}
            onChange={(v) => update({ lifeExpectancy: v })}
            suffix="años"
            min={50}
            max={110}
            step="1"
          />
        </Field>

        <Field label="Ingreso mensual deseado">
          <MoneyInput
            value={data.desiredMonthly}
            onChange={(v) => update({ desiredMonthly: v })}
          />
        </Field>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <MiniStat label="Años de retiro" value={`${plan.retirementYears}`} />
        <MiniStat label="Años para ahorrarlo" value={`${plan.yearsToSave}`} />
      </div>

      <div className="mt-4 flex flex-col gap-3">
        <BigResult
          label="Costo total de tu retiro"
          value={formatMoney(plan.totalCost)}
          hint={plan.retirementYears > 0
            ? `${formatMoney(annualIncome(data.desiredMonthly))} al año × ${plan.retirementYears} años`
            : 'La expectativa de vida debe ser mayor que la edad de retiro.'}
        />

        {/*
          El esfuerzo mensual es la cifra que cierra el ejercicio: el costo total
          asusta pero es abstracto, y esto es lo que se decide hoy. Cuando no
          quedan años para ahorrar se dice con palabras en lugar de mostrar una
          división imposible.
        */}
        <BigResult
          label="Ahorro mensual requerido hoy"
          value={plan.monthlySaving !== null ? formatMoney(plan.monthlySaving) : '—'}
          tone="emerald"
          hint={plan.monthlySaving !== null
            ? 'Sin contar rendimientos. Con un plan, la cifra baja.'
            : 'Ajusta la edad de retiro: debe ser mayor que tu edad actual.'}
        />
      </div>
    </div>
  );
}

/* ── Paso 7 ─────────────────────────────────────────────────────────────── */

function ConclusionStep({ data, update }) {
  const annual = annualIncome(data.monthlyIncome);
  const { low, high } = savingCapacity(annual);

  /*
    Reordenar con flechas y no arrastrando.

    El arrastre nativo del navegador no existe en pantallas táctiles —haría falta
    una librería— y esta pantalla se usa en un teléfono, sobre una mesa, delante
    de alguien. Dos flechas funcionan con el pulgar, con teclado y con lector de
    pantalla, y nunca dejan un elemento "pegado" a medio arrastre.
  */
  const move = (index, direction) => {
    const next = [...data.priorities];
    const target = index + direction;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    update({ priorities: next });
  };

  const currency = CURRENCY_OPTIONS.find((o) => o.value === data.currency);

  return (
    <div>
      <StepHeading
        eyebrow="Paso 7"
        title="¿Por dónde empezamos?"
        subtitle="Acomoda los cuatro niveles en el orden que tú decidas. El primero es el que atendemos hoy."
      />

      <div className="flex flex-col gap-2">
        {data.priorities.map((key, index) => {
          const level = PYRAMID_LEVELS.find((l) => l.key === key);
          return (
            <div
              key={key}
              className="flex items-center gap-3 rounded-xl border border-zinc-800
                         bg-zinc-900/60 p-3"
            >
              <span
                className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-indigo-500/15
                           text-xs font-black tabular-nums text-indigo-300"
                aria-hidden="true"
              >
                {index + 1}
              </span>

              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold leading-none text-zinc-100">
                  {level.label}
                </p>
                <p className="mt-1 text-[11px] leading-snug text-zinc-500">{level.tagline}</p>
              </div>

              <div className="flex shrink-0 flex-col gap-1">
                <button
                  type="button"
                  onClick={() => move(index, -1)}
                  disabled={index === 0}
                  aria-label={`Subir ${level.label}`}
                  className="grid h-6 w-6 place-items-center rounded-md border border-zinc-700
                             text-zinc-400 transition-colors hover:border-indigo-500/50
                             hover:text-indigo-300 disabled:opacity-25
                             focus-visible:outline-none focus-visible:ring-2
                             focus-visible:ring-indigo-500"
                >
                  <ArrowUp size={12} strokeWidth={2.5} aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={() => move(index, 1)}
                  disabled={index === data.priorities.length - 1}
                  aria-label={`Bajar ${level.label}`}
                  className="grid h-6 w-6 place-items-center rounded-md border border-zinc-700
                             text-zinc-400 transition-colors hover:border-indigo-500/50
                             hover:text-indigo-300 disabled:opacity-25
                             focus-visible:outline-none focus-visible:ring-2
                             focus-visible:ring-indigo-500"
                >
                  <ArrowDown size={12} strokeWidth={2.5} aria-hidden="true" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-5">
        <BigResult
          label="Tu capacidad de ahorro recomendada"
          value={annual > 0 ? `${formatMoney(low)} – ${formatMoney(high)}` : '—'}
          tone="emerald"
          hint={annual > 0
            ? `Entre el 10% y el 15% de tus ${formatMoney(annual)} anuales`
            : 'Falta el ingreso mensual del paso 4.'}
        />
      </div>

      <Field label="¿UDIs o dólares?" className="mt-5">
        <SegmentedControl
          value={data.currency}
          onChange={(v) => update({ currency: v })}
          options={CURRENCY_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
          className="w-full"
        />
      </Field>
      <p className="mt-2 rounded-xl border border-zinc-800 bg-zinc-900/60 p-3 text-[11px]
                    leading-relaxed text-zinc-400"
      >
        {currency.detail}
      </p>

      <div className="mt-5 flex items-start gap-2 rounded-xl border border-indigo-500/25
                      bg-indigo-500/5 p-3"
      >
        <Sparkles size={13} className="mt-0.5 shrink-0 text-indigo-400" aria-hidden="true" />
        <p className="text-[11px] leading-relaxed text-zinc-400">
          Nada de esto se guarda todavía: la cita vive en esta pantalla mientras la
          tengas abierta. Si quieres que el expediente quede grabado, dímelo y lo
          conecto a la base.
        </p>
      </div>
    </div>
  );
}

/* ── El asistente ───────────────────────────────────────────────────────── */

const STEPS = [
  IntroStep, PyramidStep, HealthStep, ProtectionStep,
  SavingStep, RetirementStep, ConclusionStep,
];

/**
 * Cita Inicial: el Análisis de Necesidades, paso a paso.
 *
 * Sustituye la presentación de PowerPoint que el asesor enseñaba en el
 * teléfono. La diferencia no es el formato: una diapositiva muestra cifras de
 * ejemplo y aquí las cifras son las del prospecto, calculadas mientras habla. El
 * argumento deja de ser "esto le pasa a la gente" y pasa a ser "esto es lo tuyo".
 *
 * Es autocontenido a propósito: no consume ningún contexto de la app, no toca el
 * hash de la URL —eso lo usa el Diagnóstico 360 y escribirlo desde aquí le
 * cambiaría el paso— y no guarda nada fuera de su propio estado. Se puede montar
 * en cualquier sitio con `<CitaInicialWizard onBack={...} />` y quitarlo sin
 * dejar rastro.
 *
 * "Terminar cita" ya no regresa directo a la lista de etapas: abre
 * `PresentationEndModal`, el router de ventas que decide a dónde va el
 * prospecto después (`onRouteToActivity`, hacia `ActivityForm` pre-llenado
 * en `AdminLayout.jsx`, vía `App.jsx`). El regreso a "Etapas" ocurre recién
 * al cerrar ese modal, sea cual sea la resolución elegida.
 */
export default function CitaInicialWizard({ onBack, onRouteToActivity }) {
  const [step, setStep] = useState(0);
  const [data, setData] = useState(EMPTY);
  const [showEndModal, setShowEndModal] = useState(false);

  const { identity } = useSession();
  const [, addPoints] = useAdvisorPoints(identity?.key);

  const update = (patch) => setData((prev) => ({ ...prev, ...patch }));

  const isFirst = step === 0;
  const isLast = step === STEPS.length - 1;
  const Current = STEPS[step];
  const progress = (step / (STEPS.length - 1)) * 100;

  /*
    Al cambiar de paso se sube al principio del diálogo, no de la ventana.
    `window.scrollTo` no serviría: el que se desplaza es el contenedor del modal
    de Prospecta, y la ventana detrás está bloqueada.
  */
  const go = (next) => {
    const target = Math.min(STEPS.length - 1, Math.max(0, next));
    setStep(target);
    document.querySelector('[data-cita-top]')?.scrollIntoView({
      behavior: 'smooth', block: 'start',
    });
  };

  return (
    <div className="animate-rise" data-cita-top>
      <button
        type="button"
        onClick={onBack}
        className="mb-5 flex items-center gap-2 text-sm font-semibold text-zinc-500
                   transition-colors hover:text-zinc-200"
      >
        <ArrowLeft size={16} />
        Etapas
      </button>

      {/*
        Panel oscuro propio. El hub de Productividad fuerza tema claro y los
        controles del proyecto están pintados para fondo oscuro: sin este panel,
        los campos saldrían con texto casi blanco sobre blanco.
      */}
      <div className="rounded-3xl border border-zinc-800 bg-zinc-950 p-5 shadow-2xl
                      shadow-black/50 sm:p-6"
      >
        <div className="mb-5">
          <div className="mb-2 flex items-baseline justify-between">
            <p className="text-[11px] font-bold uppercase tracking-widest text-zinc-500">
              Paso
              {' '}
              <span className="tabular-nums text-indigo-400">{step + 1}</span>
              {' '}
              de
              {' '}
              <span className="tabular-nums">{STEPS.length}</span>
            </p>
            <p className="text-[11px] font-semibold text-zinc-400">{STEP_LABELS[step]}</p>
          </div>

          <div className="h-1.5 overflow-hidden rounded-full bg-zinc-800">
            <div
              className="h-full rounded-full bg-gradient-to-r from-indigo-600 to-violet-500
                         transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* La `key` fuerza el remontaje: la animación de entrada se repite en cada paso. */}
        <div key={step} className="animate-rise">
          <Current data={data} update={update} />
        </div>

        <div className="mt-7 flex items-center justify-between gap-3 border-t border-zinc-800 pt-5">
          <Button
            variant="secondary"
            icon={ChevronLeft}
            onClick={() => go(step - 1)}
            disabled={isFirst}
          >
            Atrás
          </Button>

          {isLast ? (
            <Button variant="success" icon={Check} onClick={() => setShowEndModal(true)}>
              Terminar cita
            </Button>
          ) : (
            <Button iconRight={ChevronRight} onClick={() => go(step + 1)}>
              Siguiente
            </Button>
          )}
        </div>
      </div>

      {/*
        Sin un identificador real de prospecto capturado por este asistente
        todavía (ver la nota del Paso 7: "nada de esto se guarda todavía"),
        `client` viaja vacío — el modal cae a "este prospecto" en su título,
        y `ActivityForm` sigue abriendo con los campos de nombre/teléfono en
        blanco, listos para escribirse a mano, como cualquier "Nueva
        Actividad" hoy.
      */}
      <PresentationEndModal
        isOpen={showEndModal}
        client={{ name: '', phone: '' }}
        onClose={() => { setShowEndModal(false); onBack(); }}
        onRouteToActivity={onRouteToActivity}
        onDiscardClient={(client) => markProspectDiscarded(identity?.key, client)}
        onEarnPoints={addPoints}
      />
    </div>
  );
}
