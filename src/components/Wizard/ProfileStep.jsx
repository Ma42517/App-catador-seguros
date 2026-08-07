import { UserRound, Percent, ShieldCheck } from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
import {
  Card, CardTitle, SectionTitle, Field, TextInput, NumberInput,
  Select, SegmentedControl, PercentInput, Checkbox,
} from '../ui';
import { RowGrid } from './RowShell';

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
              <NumberInput value={profile.age} onChange={(v) => set({ age: v })} min={16} max={100} />
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
              onChange={(v) => set({ retirementAge: v })}
              min={Math.max(profile.age + 1, 40)}
              max={95}
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
              max={110}
            />
          </Field>
        </RowGrid>
        <p className="mt-3 text-[11px] text-slate-500">
          Te quedan <span className="font-semibold text-slate-400">
            {Math.max(0, profile.retirementAge - profile.age)} años
          </span> de acumulación y necesitarás cubrir{' '}
          <span className="font-semibold text-slate-400">
            {Math.max(0, data.retirement.lifeExpectancy - profile.retirementAge)} años
          </span> de retiro.
        </p>
      </Card>
    </div>
  );
}
