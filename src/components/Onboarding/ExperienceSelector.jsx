import { useState } from 'react';
import { Sparkles, Briefcase, Award, ArrowRight, Check } from 'lucide-react';

/** Niveles de experiencia del asesor. El `value` es lo que se persistirá luego. */
export const EXPERIENCE_LEVELS = [
  { value: 'nuevo', title: 'Nuevo', subtitle: 'De 0 a 1 años', Icon: Sparkles },
  { value: 'profesional', title: 'Profesional', subtitle: 'Más de 1 año', Icon: Briefcase },
  { value: 'consolidado', title: 'Consolidado', subtitle: 'Más de 3 años', Icon: Award },
];

/**
 * Primer paso del onboarding: nivel de experiencia del asesor.
 *
 * Por ahora sólo mantiene la selección en estado local y reporta el valor al
 * continuar. No toca los contexts ni el motor financiero.
 */
export default function ExperienceSelector({ onContinue }) {
  const [selected, setSelected] = useState('');

  const handleContinue = () => {
    console.log('Nivel de experiencia seleccionado:', selected);
    if (onContinue) onContinue(selected);
  };

  return (
    <div className="flex min-h-screen w-full max-w-full flex-col items-center justify-center overflow-hidden bg-slate-950 px-4 py-12">
      <div className="w-full max-w-md">
        <h1 className="mb-8 text-center text-2xl font-bold text-white md:text-3xl">
          ¿Cuál es tu nivel de experiencia actual?
        </h1>

        <div role="radiogroup" aria-label="Nivel de experiencia">
          {EXPERIENCE_LEVELS.map(({ value, title, subtitle, Icon }) => {
            const active = selected === value;
            return (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => setSelected(value)}
                className={`mb-4 w-full max-w-md cursor-pointer rounded-2xl border bg-slate-900/80 p-6 text-left backdrop-blur-md transition-all hover:border-indigo-500 ${
                  active
                    ? 'border-indigo-500 ring-2 ring-indigo-500/40'
                    : 'border-slate-800'
                }`}
              >
                <div className="flex items-center gap-4">
                  <span
                    className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl border transition-colors ${
                      active
                        ? 'border-indigo-500/40 bg-indigo-500/15 text-indigo-300'
                        : 'border-slate-800 bg-slate-950/60 text-slate-500'
                    }`}
                    aria-hidden="true"
                  >
                    <Icon size={20} />
                  </span>

                  <div className="min-w-0 flex-1">
                    <p className="text-base font-bold text-white">{title}</p>
                    <p className="text-sm text-slate-400">{subtitle}</p>
                  </div>

                  {active && (
                    <span
                      className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-indigo-600 text-white"
                      aria-hidden="true"
                    >
                      <Check size={14} strokeWidth={3} />
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {selected && (
          <button
            type="button"
            onClick={handleContinue}
            className="animate-rise mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-600/30 transition-all hover:bg-indigo-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
          >
            Continuar
            <ArrowRight size={16} />
          </button>
        )}
      </div>
    </div>
  );
}
