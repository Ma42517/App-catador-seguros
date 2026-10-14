import { APP_THEMES, writeAppTheme } from '../../lib/appTheme';

/**
 * src/components/Auth/ThemeSwitch.jsx
 *
 * Conmutador de tema flotante: tres circulitos (negro / blanco / crema) para
 * cambiar el color de la app en el acto. Nació para poder recorrer el onboarding
 * en los tres temas sin tener que reiniciarlo, pero le sirve igual a la persona que
 * en la bienvenida eligió un color y, ya dentro, prefiere otro.
 *
 * Guarda la preferencia (`writeAppTheme`) y avisa al padre (`onChange`) para que
 * repinte sin recargar. Es discreto a propósito —circulitos pequeños en una
 * esquina—: es un ajuste, no un paso del recorrido.
 */
export default function ThemeSwitch({ value, onChange, className = '' }) {
  const choose = (next) => {
    writeAppTheme(next);
    onChange(next);
  };

  return (
    <div
      role="radiogroup"
      aria-label="Color de la app"
      className={`flex items-center gap-2 rounded-full border border-black/10 bg-black/5
                  px-2 py-1.5 backdrop-blur-sm dark:border-white/10 dark:bg-white/5 ${className}`}
    >
      {APP_THEMES.map((option) => {
        const active = value === option.value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={option.label}
            title={option.label}
            onClick={() => choose(option.value)}
            className={`h-5 w-5 rounded-full ring-2 transition-all active:scale-90
                        ${active ? 'ring-indigo-500 ring-offset-1 ring-offset-transparent scale-110'
                          : 'ring-transparent opacity-60 hover:opacity-100'}`}
            style={{ backgroundColor: option.swatch }}
          />
        );
      })}
    </div>
  );
}
