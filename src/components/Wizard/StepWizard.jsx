import { useState, useCallback, useEffect } from 'react';
import {
  ChevronLeft, ChevronRight, Check,
} from 'lucide-react';
import { Button } from '../ui';
import LiveTotals from './LiveTotals';
import { STEPS, LAST_INPUT_STEP, stepFromHash } from './steps';

/**
 * StepWizard puede usarse controlado (recibiendo `step`/`onStepChange` desde
 * un padre, como App.jsx, para compartir el estado con el conmutador del
 * header) o de forma autónoma, manteniendo su propio estado sincronizado
 * con el hash de la URL.
 */
export default function StepWizard({
  step: stepProp,
  onStepChange,
  steps = STEPS,
  onComplete,
  completeLabel = 'Finalizar diagnóstico',
  isSubmitting = false,
}) {
  const [internalStep, setInternalStep] = useState(() => (
    Math.min(stepFromHash(), steps.length - 1)
  ));
  const isControlled = stepProp !== undefined;
  const step = isControlled ? stepProp : internalStep;

  // Permite navegar con los botones de atrás/adelante del navegador
  // cuando el componente maneja su propio estado.
  useEffect(() => {
    if (isControlled) return undefined;
    const onHashChange = () => setInternalStep(
      Math.min(stepFromHash(), steps.length - 1),
    );
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, [isControlled, steps.length]);

  const go = useCallback((next) => {
    const target = Math.min(steps.length - 1, Math.max(0, next));
    if (isControlled) {
      onStepChange(target);
    } else {
      setInternalStep(target);
      window.history.replaceState(null, '', `#${steps[target].key}`);
    }
    // Al cambiar de paso el usuario espera empezar arriba.
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [isControlled, onStepChange, steps]);

  const current = steps[step];
  const Current = current.Component;
  const isFirst = step === 0;
  const isLast = step === steps.length - 1;
  // Diagnóstico y Optimización son lectura; cualquier catálogo recortado a
  // captura (como el público) mantiene LiveTotals en todos sus pasos.
  const isInputStep = !['diagnosis', 'optimization'].includes(current.key);
  const progressPct = steps.length > 1 ? (step / (steps.length - 1)) * 100 : 100;

  return (
    <div className="mx-auto w-full max-w-3xl">
      {/* Móvil: contador de paso + barra de progreso simple. */}
      <div className="mb-6 sm:hidden">
        <div className="mb-2.5 flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-xs font-semibold text-zinc-300">
            <span className="grid h-6 w-6 place-items-center rounded-full bg-indigo-600 text-white">
              <current.Icon size={12} />
            </span>
            {current.label}
          </span>
          <span className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">
            Paso {step + 1} de {steps.length}
          </span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-800">
          <div
            className="h-full rounded-full bg-gradient-to-r from-indigo-600 to-violet-500 transition-all duration-500"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      {/* Tablet/Desktop: barra horizontal con cápsulas e iconos. */}
      <nav aria-label="Pasos del diagnóstico" className="relative mb-6 hidden sm:block">
        {/* Riel de fondo */}
        <div
          className="absolute left-0 right-0 top-1/2 h-px -translate-y-1/2 bg-zinc-800"
          aria-hidden="true"
        />
        {/* Progreso recorrido, con degradado índigo -> violeta */}
        <div
          className="absolute left-0 top-1/2 h-px -translate-y-1/2 bg-gradient-to-r from-indigo-600 to-violet-500 transition-all duration-500"
          style={{ width: `${progressPct}%` }}
          aria-hidden="true"
        />

        <ol className="relative flex items-center justify-between gap-1 overflow-x-auto pb-0.5">
          {steps.map((s, i) => {
            const done = i < step;
            const active = i === step;
            const { Icon } = s;
            return (
              <li key={s.key} className="shrink-0">
                <button
                  type="button"
                  onClick={() => go(i)}
                  aria-current={active ? 'step' : undefined}
                  className={`group flex items-center gap-1.5 rounded-full border px-2.5 py-1.5 text-[11px] font-semibold transition-all duration-200 ${
                    active
                      ? 'border-indigo-500/60 bg-indigo-600 text-white shadow-lg shadow-indigo-600/40'
                      : done
                        ? 'border-indigo-500/40 bg-zinc-900 text-indigo-300 hover:border-indigo-400/70 hover:bg-zinc-800/60'
                        : 'border-zinc-800 bg-zinc-900 text-zinc-500 hover:border-zinc-700 hover:text-zinc-300'
                  }`}
                >
                  <span
                    className={`grid h-5 w-5 shrink-0 place-items-center rounded-full text-[9px] font-bold transition-colors ${
                      active
                        ? 'bg-white/25 text-white'
                        : done
                          ? 'bg-indigo-500/20 text-indigo-300'
                          : 'bg-zinc-800 text-zinc-500'
                    }`}
                  >
                    {done ? <Check size={11} strokeWidth={3} /> : <Icon size={11} />}
                  </span>
                  <span>{s.label}</span>
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

      {/* Navegación inferior: botones segmentados en una sola pista. */}
      <div className="mt-8 flex items-center gap-1 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-1.5 sm:justify-between sm:border-0 sm:bg-transparent sm:p-0 sm:border-t sm:border-zinc-800 sm:pt-5">
        <Button
          variant="secondary"
          icon={ChevronLeft}
          onClick={() => go(step - 1)}
          disabled={isFirst}
          className="flex-1 sm:flex-initial"
        >
          Anterior
        </Button>
        <span className="hidden shrink-0 text-[11px] font-medium uppercase tracking-wide text-zinc-500 sm:inline">
          Paso {step + 1} de {steps.length}
        </span>
        <Button
          iconRight={isLast && onComplete ? Check : ChevronRight}
          onClick={() => (isLast && onComplete ? onComplete() : go(step + 1))}
          disabled={isSubmitting || (isLast && !onComplete)}
          className="flex-1 sm:flex-initial"
        >
          {isSubmitting
            ? 'Guardando…'
            : isLast && onComplete
              ? completeLabel
              : step === LAST_INPUT_STEP ? 'Ver diagnóstico' : 'Siguiente'}
        </Button>
      </div>
    </div>
  );
}
