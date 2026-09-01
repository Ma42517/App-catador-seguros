import { useState, useCallback, useEffect, useRef } from 'react';
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

  /*
    La tira de módulos y su cápsula activa.

    Se desplaza la tira con `scrollTo` en vez de usar `scrollIntoView` sobre la
    cápsula: eso último arrastra también el scroll vertical de la página y pelea
    con el `window.scrollTo` que hace `go`, así que al cambiar de paso la pantalla
    daba un salto. Aquí sólo se mueve el eje horizontal de la propia tira.
  */
  const stripRef = useRef(null);
  const activeChipRef = useRef(null);

  useEffect(() => {
    const chip = activeChipRef.current;
    const strip = stripRef.current;
    if (!chip || !strip) return;
    strip.scrollTo({
      left: chip.offsetLeft - (strip.clientWidth - chip.clientWidth) / 2,
      behavior: 'smooth',
    });
  }, [step]);

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
  /*
    Dos medidas distintas, y confundirlas era el error.

    `railPct` une los puntos del riel de escritorio: en el primer paso vale 0
    porque el riel arranca EN ese punto. `progressPct` es cuánto se ha avanzado
    del cuestionario, y ahí el paso actual sí cuenta: con la fórmula del riel, la
    barra del teléfono se veía completamente vacía en el paso 1 de 7 —parecía que
    no había barra, o que el indicador se saltaba el primer paso—.
  */
  const railPct = steps.length > 1 ? (step / (steps.length - 1)) * 100 : 100;
  const progressPct = ((step + 1) / steps.length) * 100;

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

      {/*
        Las cápsulas con el nombre de cada módulo, en todos los tamaños.

        Estaban en `hidden sm:block`, así que en un teléfono —donde se llena el
        cuestionario de verdad— no existían: sólo quedaba el contador "Paso 1 de
        7", sin forma de ver qué módulos hay ni de volver a uno anterior. La tira
        se desplaza en horizontal y el paso activo se centra solo, que es lo que
        permite tenerla en pantalla sin robarle ancho al formulario.

        Los rieles siguen siendo de escritorio: unen puntos repartidos a lo largo
        de todo el ancho, y sobre una tira que se desplaza dibujarían una línea
        que no corresponde con lo que se ve.
      */}
      <nav aria-label="Pasos del diagnóstico" className="relative mb-6">
        {/* Riel de fondo */}
        <div
          className="absolute left-0 right-0 top-1/2 hidden h-px -translate-y-1/2 bg-zinc-800 sm:block"
          aria-hidden="true"
        />
        {/* Progreso recorrido, con degradado índigo -> violeta */}
        <div
          className="absolute left-0 top-1/2 hidden h-px -translate-y-1/2 bg-gradient-to-r from-indigo-600 to-violet-500 transition-all duration-500 sm:block"
          style={{ width: `${railPct}%` }}
          aria-hidden="true"
        />

        <ol
          ref={stripRef}
          className="relative flex items-center gap-1.5 overflow-x-auto pb-0.5
                     [scrollbar-width:none] sm:justify-between sm:gap-1
                     [&::-webkit-scrollbar]:hidden"
        >
          {steps.map((s, i) => {
            const done = i < step;
            const active = i === step;
            const { Icon } = s;
            return (
              <li key={s.key} className="shrink-0">
                <button
                  type="button"
                  ref={active ? activeChipRef : undefined}
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
