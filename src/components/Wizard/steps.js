/**
 * src/components/Wizard/steps.js
 * El orden de los pasos del diagnóstico, y los cortes que se derivan de él.
 *
 * Vive aparte de `StepWizard.jsx` porque este archivo no exporta componentes: mezclar la
 * lista con el componente que la pinta rompe el refresco en caliente de Vite, y el linter
 * lo señalaba ya antes de esta reordenación.
 */
import {
  UserRound, Wallet, ShoppingCart, CreditCard, PiggyBank, Home, Target,
  Gauge, SlidersHorizontal,
} from 'lucide-react';
import ProfileStep from './ProfileStep';
import IncomeStep from './IncomeStep';
import ExpenseStep from './ExpenseStep';
import DebtStep from './DebtStep';
import SavingsStep from './SavingsStep';
import PatrimonioStep from './PatrimonioStep';
import GoalStep from './GoalStep';
import ExecutiveDashboard from '../Dashboard/ExecutiveDashboard';
import OptimizationPanel from '../Dashboard/OptimizationPanel';

export const STEPS = [
  { key: 'profile', label: 'Perfil', short: 'Perfil', Icon: UserRound, Component: ProfileStep },
  { key: 'income', label: 'Ingresos', short: 'Ingr.', Icon: Wallet, Component: IncomeStep },
  { key: 'expenses', label: 'Gastos', short: 'Gastos', Icon: ShoppingCart, Component: ExpenseStep },
  { key: 'debt', label: 'Deudas', short: 'Deuda', Icon: CreditCard, Component: DebtStep },

  /*
    La antigua pestaña "Activos", partida en dos.

    Metía en el mismo cajón una cuenta de nómina, un Afore y una casa, con un nombre
    —"Activos"— que hay que explicar antes de poder usarlo. Y lo que más pesa en el
    diagnóstico, cuánto se aparta cada mes y dónde, quedaba enterrado entre bienes que no
    se pueden gastar.

    `patrimonio` se queda en el sitio que ocupaba "Activos", y `savings` entra pegado a
    `goals`. Ese orden es el que importa: se pregunta cuánto se ahorra y con qué
    rendimiento, y con eso fresco se pasa a poner metas, que es justo la conversación que
    sigue. Al revés quedaba una casa en medio de esas dos preguntas.

    Las dos pestañas escriben en la MISMA colección `data.assets` y sólo filtran tipos
    distintos, así que ningún cálculo del motor cambia por esto.
  */
  { key: 'patrimonio', label: 'Patrimonio', short: 'Patrim.', Icon: Home, Component: PatrimonioStep },
  { key: 'savings', label: 'Ahorro y Afore', short: 'Ahorro', Icon: PiggyBank, Component: SavingsStep },

  { key: 'goals', label: 'Metas', short: 'Metas', Icon: Target, Component: GoalStep },
  { key: 'diagnosis', label: 'Diagnóstico', short: 'Diag.', Icon: Gauge, Component: ExecutiveDashboard },
  { key: 'optimization', label: 'Optimización', short: 'Optim.', Icon: SlidersHorizontal, Component: OptimizationPanel },
];

/**
 * Dónde termina la captura y empieza la lectura.
 *
 * Se calcula del arreglo, no se escribe a mano. Este número estaba copiado como un `6`
 * literal en tres sitios —el conmutador de fases de la cabecera, la cinta de totales en
 * vivo y la etiqueta del botón "Ver diagnóstico"—, y al partir "Activos" en dos pestañas
 * los tres apuntaban ya a un paso equivocado: el conmutador habría llevado a Metas
 * creyendo que era el diagnóstico. Derivado, sobrevive a la siguiente reordenación.
 */
export const FIRST_INSIGHT_STEP = STEPS.findIndex((s) => s.key === 'diagnosis');

/** Último paso de captura: el que remata con "Ver diagnóstico". */
export const LAST_INPUT_STEP = FIRST_INSIGHT_STEP - 1;

/** Lee el paso inicial del hash de la URL, para que sea enlazable y sobreviva recargas. */
export function stepFromHash() {
  if (typeof window === 'undefined') return 0;
  const key = window.location.hash.replace('#', '');
  const found = STEPS.findIndex((s) => s.key === key);
  return found >= 0 ? found : 0;
}
