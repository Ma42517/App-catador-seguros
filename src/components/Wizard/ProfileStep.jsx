import { UserRound, Percent, ShieldCheck } from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
import {
  Card, CardTitle, SectionTitle, Field, TextInput, NumberInput,
  Select, SegmentedControl, PercentInput, Checkbox,
} from '../ui';
import { RowGrid } from './RowShell';

/**
 * Rangos de las tres edades, en un solo lugar.
 *
 * Los usan tanto los campos como la regla que mantiene su orden. Escritos por
 * separado, un cambio en el tope de un campo dejaría a la regla empujando valores
 * que ese mismo campo rechaza.
 */
const AGE_RANGE = { min: 16, max: 100 };
const RETIREMENT_AGE_MAX = 95;
const LIFE_EXPECTANCY_MAX = 110;

const MARITAL = [
  { value: 'single', label: 'Soltero(a)' },
  { value: 'married', label: 'Casado(a)' },
  { value: 'free_union', label: 'Unión libre' },
  { value: 'divorced', label: 'Divorciado(a)' },
  { value: 'widowed', label: 'Viudo(a)' },
];

export default function ProfileStep() {
  const { profile, data, patchSection, setField } = useFinance();
  const set = (patch) => patchSection('profile', patch);

  /*
    Las tres edades tienen que respetar su orden: se nace, se retira, se vive.

    Cada campo recorta su propio rango al salir, pero el mínimo de uno depende del
    valor de otro, y ahí quedaba un hueco: subir la edad actual a 70 dejaba la edad
    de retiro en 65 —por debajo de su propio mínimo— sin que nada la corrigiera,
    porque el recorte sólo ocurre en el campo que se está editando. El resultado era
    un perfil imposible: retirarse cinco años antes de la edad que se acaba de
    declarar, con "0 años de acumulación" y un módulo de retiro sin sentido.

    Así que quien mueve una edad empuja a las siguientes lo mínimo necesario. Nunca
    las baja: si alguien de 40 planea retirarse a los 70, cambiar su edad a 41 no
    tiene por qué tocarle el plan.
  */
  const pushLifeExpectancy = (retirementAge) => {
    const lifeExpectancy = Math.min(
      LIFE_EXPECTANCY_MAX,
      Math.max(data.retirement.lifeExpectancy, retirementAge + 1),
    );
    if (lifeExpectancy !== data.retirement.lifeExpectancy) {
      patchSection('retirement', { lifeExpectancy });
    }
  };

  const setAge = (age) => {
    const retirementAge = Math.min(
      RETIREMENT_AGE_MAX,
      Math.max(profile.retirementAge, age + 1),
    );
    set({ age, retirementAge });
    pushLifeExpectancy(retirementAge);
  };

  const setRetirementAge = (retirementAge) => {
    set({ retirementAge });
    pushLifeExpectancy(retirementAge);
  };

  return (
    <div className="space-y-4">
      <SectionTitle
        eyebrow="Módulo 1"
        title="Perfil financiero"
        description="Define quién eres y cómo capturas tu información. Todo se normaliza automáticamente a valores mensuales y anuales."
      />

      <Card>
        <CardTitle icon={UserRound}>Datos personales</CardTitle>
        <RowGrid cols={3}>
          <Field label="Nombre o alias">
            <TextInput
              value={profile.name}
              onChange={(v) => set({ name: v })}
              placeholder="Familia Pérez"
            />
          </Field>
          <Field label="Ciudad">
            <TextInput
              value={profile.city}
              onChange={(v) => set({ city: v })}
              placeholder="Ciudad de México"
            />
          </Field>
          <Field label="Estado civil">
            <Select value={profile.maritalStatus} onChange={(v) => set({ maritalStatus: v })} options={MARITAL} />
          </Field>
        </RowGrid>


        <div className="mt-3">
          <RowGrid cols={4}>
            <Field label="Edad actual">
              <NumberInput
                value={profile.age}
                onChange={setAge}
                min={AGE_RANGE.min}
                max={AGE_RANGE.max}
              />
            </Field>
            <Field label="Perceptores de ingreso" help="Cuántas personas del hogar aportan ingreso.">
              <NumberInput value={profile.earners} onChange={(v) => set({ earners: v })} min={1} max={10} />
            </Field>
            <Field label="Dependientes">
              <NumberInput value={profile.dependents} onChange={(v) => set({ dependents: v })} min={0} max={20} />
            </Field>
            <Field label="Hijos">
              <NumberInput value={profile.children} onChange={(v) => set({ children: v })} min={0} max={20} />
            </Field>
          </RowGrid>
        </div>
      </Card>

      <Card>
        <CardTitle
          icon={Percent}
          help="Estas dos decisiones determinan cómo el motor interpreta todo lo que captures después. Cambiarlas altera el diagnóstico completo."
        >
          Reglas de captura
        </CardTitle>

        <div className="space-y-4">
          <Field
            label="¿Tu ingreso es neto o bruto?"
            hint={profile.incomeType === 'net'
              ? 'Neto: ya tiene impuestos descontados. El motor NO volverá a restarlos.'
              : 'Bruto: el motor descontará los impuestos que registres una sola vez.'}
          >
            <SegmentedControl
              value={profile.incomeType}
              onChange={(v) => set({ incomeType: v })}
              options={[
                { value: 'net', label: 'Neto (lo que recibo)' },
                { value: 'gross', label: 'Bruto (antes de impuestos)' },
              ]}
            />
          </Field>

          <Field
            label="Frecuencia habitual de captura"
            hint="Sólo afecta el valor por omisión de los formularios; puedes cambiar la frecuencia fila por fila."
          >
            <SegmentedControl
              value={profile.inputFrequency}
              onChange={(v) => set({ inputFrequency: v })}
              options={[
                { value: 'monthly', label: 'Mensual' },
                { value: 'annual', label: 'Anual' },
              ]}
            />
          </Field>


          <Field
            label="Factor de uso del ingreso variable"
            help="Qué porcentaje de tus comisiones o bonos consideras seguro para comprometer gasto fijo. Un valor conservador protege tu plan."
            hint={`El motor usará ${Math.round(data.variabilityFactor * 100)}% de tu ingreso variable como sostenible.`}
          >
            <PercentInput
              value={data.variabilityFactor}
              onChange={(v) => setField('variabilityFactor', Math.min(1, Math.max(0, v)))}
              max={100}
            />
          </Field>
        </div>
      </Card>

      <Card>
        <CardTitle
          icon={ShieldCheck}
          help="El gasto en seguros no permite distinguir un gasto médico mayor de un seguro de auto, por eso se pregunta de forma explícita."
        >
          Coberturas actuales
        </CardTitle>
        <div className="space-y-3">
          <Checkbox
            checked={profile.hasMedicalInsurance}
            onChange={(v) => set({ hasMedicalInsurance: v })}
            label="Cuento con Gastos Médicos Mayores (GMM)"
            help="Sin GMM, una hospitalización se paga con patrimonio o con deuda."
          />
          <Checkbox
            checked={profile.hasLifeInsurance}
            onChange={(v) => set({ hasLifeInsurance: v })}
            label="Cuento con seguro de vida"
            help="Protege el ingreso de tus dependientes si tú faltas."
          />
        </div>
      </Card>

      <Card>
        <CardTitle icon={UserRound}>Horizonte de retiro</CardTitle>
        <RowGrid cols={2}>
          <Field label="Edad deseada de retiro">
            <NumberInput
              value={profile.retirementAge}
              onChange={setRetirementAge}
              /*
                El mínimo es la edad actual más uno, sin piso de 40. Ese piso
                impedía capturar un retiro anticipado —alguien de 30 que se plantea
                dejar de trabajar a los 38— y no protegía de nada: retirarse pronto
                es una decisión, no un error de captura. El diagnóstico ya se
                encarga de decir si alcanza.
              */
              min={profile.age + 1}
              max={RETIREMENT_AGE_MAX}
            />
          </Field>
          <Field
            label="Años estimados de vida"
            help="Determina cuántos años debe durar tu capital de retiro."
          >
            <NumberInput
              value={data.retirement.lifeExpectancy}
              onChange={(v) => patchSection('retirement', { lifeExpectancy: v })}
              min={profile.retirementAge + 1}
              max={LIFE_EXPECTANCY_MAX}
            />
          </Field>
        </RowGrid>
        <p className="mt-3 text-[11px] text-zinc-500">
          Te quedan <span className="font-semibold text-zinc-400">
            {Math.max(0, profile.retirementAge - profile.age)} años
          </span> de acumulación y necesitarás cubrir{' '}
          <span className="font-semibold text-zinc-400">
            {Math.max(0, data.retirement.lifeExpectancy - profile.retirementAge)} años
          </span> de retiro.
        </p>
      </Card>
    </div>
  );
}
