import { useState, useCallback, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Check } from 'lucide-react';
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
  { key: 'profile', label: 'Perfil', short: 'Perfil', Component: ProfileStep },
  { key: 'income', label: 'Ingresos', short: 'Ingr.', Component: IncomeStep },
  { key: 'expenses', label: 'Gastos', short: 'Gastos', Component: ExpenseStep },
  { key: 'debt', label: 'Deudas', short: 'Deuda', Component: DebtStep },
  { key: 'assets', label: 'Activos', short: 'Activos', Component: AssetStep },
  { key: 'goals', label: 'Metas', short: 'Metas', Component: GoalStep },
  { key: 'diagnosis', label: 'Diagnóstico', short: 'Diag.', Component: ExecutiveDashboard },
  { key: 'optimization', label: 'Optimización', short: 'Optim.', Component: OptimizationPanel },
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
      {/* Navegación por pasos: scrolleable en móvil */}
      <nav aria-label="Pasos del diagnóstico" className="mb-4 -mx-4 px-4 sm:mx-0 sm:px-0">
        <ol className="flex items-center gap-1 overflow-x-auto pb-1">
          {STEPS.map((s, i) => {
            const done = i < step;
            const active = i === step;
            return (
              <li key={s.key} className="flex shrink-0 items-center">
                <button
                  type="button"
                  onClick={() => go(i)}
                  aria-current={active ? 'step' : undefined}
                  className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors ${
                    active ? 'bg-blue-600 text-white'
                      : done ? 'text-blue-600 hover:bg-blue-50'
                      : 'text-slate-400 hover:bg-slate-100 hover:text-slate-600'
                  }`}
                >
                  <span className={`grid h-4 w-4 shrink-0 place-items-center rounded-full text-[10px] ${
                    active ? 'bg-white/20' : done ? 'bg-blue-100' : 'bg-slate-200'
                  }`}>
                    {done ? <Check size={10} /> : i + 1}
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

      <Current />

      {/* Navegación inferior */}
      <div className="mt-6 flex items-center justify-between gap-3 border-t border-slate-200 pt-4">
        <Button variant="secondary" icon={ChevronLeft} onClick={() => go(step - 1)} disabled={isFirst}>
          Anterior
        </Button>
        <span className="text-[11px] text-slate-400">
          Paso {step + 1} de {STEPS.length}
        </span>
        <Button iconRight={ChevronRight} onClick={() => go(step + 1)} disabled={isLast}>
          {step === 5 ? 'Ver diagnóstico' : 'Siguiente'}
        </Button>
      </div>
    </div>
  );
}
