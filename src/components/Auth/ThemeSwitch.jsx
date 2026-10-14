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
      className={`flex items-center gap-3 rounded-full border border-black/10 bg-black/5
                  px-3 py-2 backdrop-blur-sm dark:border-white/10 dark:bg-white/5 ${className}`}
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
            className={`h-8 w-8 rounded-full border transition-all active:scale-90
                        ${active
                          ? 'ring-2 ring-indigo-500 ring-offset-2 ring-offset-transparent scale-110 border-transparent'
                          : 'opacity-80 hover:opacity-100'}`}
            style={{
              backgroundColor: option.swatch,
              // Borde gris medio para que el blanco y el crema no se fundan con el
              // fondo claro: sin él, dos de los tres circulitos desaparecían.
              borderColor: active ? 'transparent' : 'rgba(120,120,120,0.5)',
            }}
          />
        );
      })}
    </div>
  );
}
