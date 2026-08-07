import { useState, useCallback, useEffect } from 'react';
import {
  ChevronLeft, ChevronRight, Check, UserRound, Wallet, ShoppingCart,
  CreditCard, PiggyBank, Target, Gauge, SlidersHorizontal,
} from 'lucide-react';
import { Button } from '../ui';
import LiveTotals from './LiveTotals';
import ProfileStep from './ProfileStep';
import IncomeStep from './IncomeStep';
import ExpenseStep from './ExpenseStep';
import DebtStep from './DebtStep';
import AssetStep from './AssetStep';
import GoalStep from './GoalStep';
import ExecutiveDashboard from '../Dashboard/ExecutiveDashboard';
import OptimizationPanel from '../Dashboard/OptimizationPanel';

export const STEPS = [
  { key: 'profile', label: 'Perfil', short: 'Perfil', Icon: UserRound, Component: ProfileStep },
  { key: 'income', label: 'Ingresos', short: 'Ingr.', Icon: Wallet, Component: IncomeStep },
  { key: 'expenses', label: 'Gastos', short: 'Gastos', Icon: ShoppingCart, Component: ExpenseStep },
  { key: 'debt', label: 'Deudas', short: 'Deuda', Icon: CreditCard, Component: DebtStep },
  { key: 'assets', label: 'Activos', short: 'Activos', Icon: PiggyBank, Component: AssetStep },
  { key: 'goals', label: 'Metas', short: 'Metas', Icon: Target, Component: GoalStep },
  { key: 'diagnosis', label: 'Diagnóstico', short: 'Diag.', Icon: Gauge, Component: ExecutiveDashboard },
  { key: 'optimization', label: 'Optimización', short: 'Optim.', Icon: SlidersHorizontal, Component: OptimizationPanel },
];

/** Lee el paso inicial del hash de la URL, para que sea enlazable y sobreviva recargas. */
function stepFromHash() {
  if (typeof window === 'undefined') return 0;
  const key = window.location.hash.replace('#', '');
  const found = STEPS.findIndex((s) => s.key === key);
  return found >= 0 ? found : 0;
}

export default function StepWizard() {
  const [step, setStep] = useState(stepFromHash);

  // Permite navegar con los botones de atrás/adelante del navegador.
  useEffect(() => {
    const onHashChange = () => setStep(stepFromHash());
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  const go = useCallback((next) => {
    const target = Math.min(STEPS.length - 1, Math.max(0, next));
    setStep(target);
    window.history.replaceState(null, '', `#${STEPS[target].key}`);
    // Al cambiar de paso el usuario espera empezar arriba.
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const current = STEPS[step];
  const Current = current.Component;
  const isFirst = step === 0;
  const isLast = step === STEPS.length - 1;
  // Los dos últimos pasos son de lectura: no necesitan la cinta de captura.
  const isInputStep = step < 6;


  return (
    <div className="mx-auto w-full max-w-3xl">
      {/* Stepper: cápsulas con icono y línea de conexión en degradado */}
      <nav aria-label="Pasos del diagnóstico" className="relative mb-6 -mx-4 px-4 sm:mx-0 sm:px-0">
        {/* Riel de fondo */}
        <div
          className="absolute left-4 right-4 top-1/2 h-px -translate-y-1/2 bg-slate-700/50 sm:left-0 sm:right-0"
          aria-hidden="true"
        />
        {/* Progreso recorrido, con degradado índigo -> violeta */}
        <div
          className="absolute left-4 top-1/2 h-px -translate-y-1/2 bg-gradient-to-r from-indigo-500 to-violet-500 transition-all duration-500 sm:left-0"
          style={{ width: `calc((100% - 2rem) * ${step / (STEPS.length - 1)})` }}
          aria-hidden="true"
        />

        <ol className="relative flex items-center justify-between gap-1 overflow-x-auto pb-0.5">
          {STEPS.map((s, i) => {
            const done = i < step;
            const active = i === step;
            const { Icon } = s;
            return (
              <li key={s.key} className="shrink-0">
                <button
                  type="button"
                  onClick={() => go(i)}
                  aria-current={active ? 'step' : undefined}
                  className={`group flex items-center gap-1.5 rounded-full border px-2 py-1.5 text-[11px] font-semibold transition-all duration-200 sm:px-2.5 ${
                    active
                      ? 'border-indigo-400/60 bg-indigo-500 text-white shadow-lg shadow-indigo-500/40'
                      : done
                        ? 'border-indigo-500/40 bg-slate-800 text-indigo-300 hover:border-indigo-400/70 hover:bg-slate-700/60'
                        : 'border-slate-700/60 bg-slate-900 text-slate-500 hover:border-slate-600 hover:text-slate-300'
                  }`}
                >
                  <span
                    className={`grid h-5 w-5 shrink-0 place-items-center rounded-full text-[9px] font-bold transition-colors ${
                      active
                        ? 'bg-white/25 text-white'
                        : done
                          ? 'bg-indigo-500/20 text-indigo-300'
                          : 'bg-slate-800 text-slate-500'
                    }`}
                  >
                    {done ? <Check size={11} strokeWidth={3} /> : <Icon size={11} />}
                  </span>
                  <span className="hidden sm:inline">{s.label}</span>
                  <span className="sm:hidden">{s.short}</span>
                </button>
              </li>
            );
          })}
        </ol>
      </nav>

      {isInputStep && <LiveTotals />}

      <div key={current.key} className="animate-rise">
        <Current />
      </div>

      {/* Navegación inferior */}
      <div className="mt-8 flex items-center justify-between gap-3 border-t border-slate-700/50 pt-5">
        <Button variant="secondary" icon={ChevronLeft} onClick={() => go(step - 1)} disabled={isFirst}>
          Anterior
        </Button>
        <span className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
          Paso {step + 1} de {STEPS.length}
        </span>
        <Button iconRight={ChevronRight} onClick={() => go(step + 1)} disabled={isLast}>
          {step === 5 ? 'Ver diagnóstico' : 'Siguiente'}
        </Button>
      </div>
    </div>
  );
}
