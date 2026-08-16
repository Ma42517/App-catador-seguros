import { UserRound, Percent, ShieldCheck } from 'lucide-react';
import { useState } from 'react';
import { useFinance } from '../../context/FinanceContext';
import {
  Card, CardTitle, SectionTitle, Field, TextInput, NumberInput,
  Select, SegmentedControl, PercentInput, Checkbox,
} from '../ui';
import { RowGrid } from './RowShell';
import SuggestedField from './SuggestedField';

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

/*
  Esperanza de vida sugerida, por sexo.

  Preguntarle a alguien a qué edad calcula morirse detiene la captura en seco. No es un
  dato que nadie tenga, y encima obliga a pensar en la propia muerte delante del asesor
  justo en el primer paso. Con una estimación puesta, la pregunta pasa a ser "¿te parece
  bien este número?", que sí se puede contestar.

  EL MARGEN NO ES UN ADORNO, ES LA PROTECCIÓN. Planear hasta la esperanza de vida promedio
  significa quedarse sin dinero exactamente en la mitad de los casos: el promedio es, por
  definición, el punto donde la mitad de las personas vive más. Los diez años de margen son
  lo que convierte el plan en algo que aguanta sobrevivirle al promedio, que es el riesgo
  que un seguro viene a cubrir.

  Se escriben como base + margen, y no como el resultado ya sumado, para que se vea de
  dónde sale cada número y se pueda actualizar la base cuando el INEGI publique otra.

  LAS CIFRAS SON LAS DEL INEGI, DESGLOSADAS POR SEXO. Esa precisión costó una corrección:
  el 75 que se usaba antes para los hombres es la esperanza de vida de la POBLACIÓN TOTAL
  —75.5 años—, no la de ellos. Es un error fácil porque varias notas de prensa lo repiten,
  y le regalaba casi tres años de vida a la mitad de los prospectos justo en el dato que
  decide cuánto tiene que durar su dinero.

    Nacional 75.5 · hombres 72.6 · mujeres 78.4
    https://cuentame.inegi.org.mx/poblacion/esperanza.aspx?tema=P
*/
const INEGI_LIFE_EXPECTANCY = { male: 72.6, female: 78.4 };
const LONGEVITY_MARGIN = 10;

const SEX_OPTIONS = [
  { value: 'male', label: 'Hombre' },
  { value: 'female', label: 'Mujer' },
];

/**
 * Años de vida sugeridos para un sexo. `null` si todavía no se eligió.
 *
 * Se redondea porque el campo captura años enteros: 72.6 + 10 son 83 años, no 82.6. Hacia
 * arriba por el redondeo normal, que en este caso además juega a favor del prospecto.
 */
function lifeExpectancyFor(sex) {
  const base = INEGI_LIFE_EXPECTANCY[sex];
  return base === undefined ? null : Math.round(base + LONGEVITY_MARGIN);
}

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

  /**
   * Años sugeridos, ya respetando la regla de las tres edades.
   *
   * La sugerencia que se muestra es la misma que se guardaría, tope incluido. Si se
   * enseñara el 83 crudo y se guardara un 96 —porque alguien planea retirarse a los 95—,
   * el chip verde estaría afirmando un número distinto del que usa el motor.
   */
  const suggestedLife = (() => {
    const base = lifeExpectancyFor(profile.sex);
    if (base === null) return null;
    return Math.min(
      LIFE_EXPECTANCY_MAX,
      Math.max(base, profile.retirementAge + 1),
    );
  })();

  /*
    El modo se deduce del valor guardado, con un interruptor sólo para forzar el manual.

    Igual que en los rendimientos del retiro, y por lo mismo: este paso no se desmonta al
    volver a él, y "Cargar Demo" o "Limpiar" le reescriben el valor por debajo. Con el modo
    en estado, después de un "Limpiar" el campo seguiría diciendo "lo ajustaste a mano"
    sobre una cifra que acababa de volver a la de por omisión.
  */
  const [lifeOverride, setLifeOverride] = useState(false);
  const manualLife = lifeOverride
    || (suggestedLife !== null && data.retirement.lifeExpectancy !== suggestedLife);

  /**
   * Elegir el sexo rellena los años de vida.
   *
   * Se hace al elegir y no con un efecto que vigile el valor: es una acción explícita, y
   * así el número cambia mientras la persona mira el selector, no por su cuenta después.
   *
   * El `Math.max` con la edad de retiro respeta la regla de las tres edades que ya vive en
   * este archivo: se nace, se retira, se vive. Sin él, alguien que planea retirarse a los
   * 95 y elige "Hombre" acabaría con 85 años de vida y un retiro que empieza diez años
   * después de morirse, y el módulo de retiro dividiría entre un plazo negativo.
   */
  const setSex = (sex) => {
    set({ sex });

    const base = lifeExpectancyFor(sex);
    if (base === null) return;

    // Elegir el sexo vuelve al dato del INEGI, aunque antes se hubiera escrito otro.
    setLifeOverride(false);
    patchSection('retirement', {
      lifeExpectancy: Math.min(
        LIFE_EXPECTANCY_MAX,
        Math.max(base, profile.retirementAge + 1),
      ),
    });
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

        {/*
          El sexo vive aquí y no en "Datos personales", que es donde a primera vista
          parecería que va.

          En esta app su única función es estimar los años de vida, y ponerlo tres tarjetas
          más arriba dejaba el número apareciendo solo, sin que se viera qué lo produjo.
          Pegado al campo que rellena, la relación se lee sin explicarla. Si algún día se
          usa para tarifas —las tablas de mortalidad sí distinguen por sexo— tendrá sentido
          moverlo a los datos personales.
        */}
        <Field
          label="Sexo"
          help="Sólo se usa para estimar tus años de vida. Las mujeres viven más en promedio, así que su plan tiene que durar más."
        >
          <SegmentedControl
            value={profile.sex}
            onChange={setSex}
            options={SEX_OPTIONS}
          />
        </Field>

        <div className="mt-4">
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
          {/*
            En verde y con el mismo molde que las tasas de metas, activos y retiro: el dato
            del INEGI afirmado, y "ponerlo manualmente" debajo para quien quiera otro.

            El pie dice la verdad en cada estado. Afirmar "dato del INEGI" cuando el asesor
            acaba de teclear 100 a mano, o cuando todavía no se ha elegido el sexo, sería
            atribuirle a una fuente oficial un número que no salió de ella. En un
            diagnóstico que el prospecto se lleva impreso, ese detalle es lo que sostiene la
            credibilidad de todo lo demás.
          */}
          <SuggestedField
            label="Años estimados de vida"
            help="Determina cuántos años debe durar tu capital de retiro."
            suggested={suggestedLife}
            format={(v) => `${v} años`}
            note={profile.sex
              ? 'Esperanza de vida del INEGI + un margen de seguridad de 10 años para protegerte del riesgo de sobrevivir a tu dinero.'
              : 'Elige tu sexo arriba y tomamos el dato del INEGI. Seguirá siendo editable.'}
            isManual={manualLife}
            onUseManual={() => setLifeOverride(true)}
            onUseSuggested={() => {
              setLifeOverride(false);
              patchSection('retirement', { lifeExpectancy: suggestedLife });
            }}
            manualLabel="Ponerlo manualmente"
            manualNote="Lo ajustaste a mano. "
          >
            {(id) => (
              <NumberInput
                id={id}
                value={data.retirement.lifeExpectancy}
                onChange={(v) => patchSection('retirement', { lifeExpectancy: v })}
                min={profile.retirementAge + 1}
                max={LIFE_EXPECTANCY_MAX}
              />
            )}
          </SuggestedField>
        </RowGrid>
        </div>
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
