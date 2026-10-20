import { useState } from 'react';
import { Palette, Check, Type } from 'lucide-react';
import FullScreenView from '../Layout/FullScreenView';
import TextScaleControl from '../ui/TextScaleControl';
import { APP_THEMES, readAppTheme, writeAppTheme, applyAppTheme } from '../../lib/appTheme';

/**
 * src/components/Profile/SettingsView.jsx
 *
 * Pantalla de Configuración, abierta desde "Ver más → Configuración". Reúne los
 * ajustes de apariencia de la app: el color del tema y el tamaño del texto. Este
 * último vivía antes en "Mi Perfil", pero no es un dato del asesor sino de cómo
 * se ve la app, así que es hermano del color y su sitio es aquí.
 *
 * El cambio de tema se aplica EN VIVO: `applyAppTheme` reescribe la clase del
 * `<html>` y toda la app repinta sin recargar, así que la propia pantalla de
 * Configuración —que vive dentro de un `FullScreenView` que respeta el tema— se
 * tiñe al instante del color recién elegido. La elección se guarda
 * (`writeAppTheme`) para que sobreviva al cierre de sesión.
 *
 * El estado arranca leyendo la preferencia real guardada (`readAppTheme`), así
 * que al entrar aparece marcado el tema que la persona ya tiene puesto.
 */
export default function SettingsView({ isOpen, onClose }) {
  const [theme, setTheme] = useState(() => readAppTheme());

  const choose = (value) => {
    writeAppTheme(value);
    applyAppTheme(value);
    setTheme(value);
  };

  return (
    <FullScreenView
      isOpen={isOpen}
      onClose={onClose}
      title="Configuración"
      label="Ajustes de la app"
      backLabel="Cerrar"
    >
      <div className="animate-rise mx-auto w-full max-w-md space-y-6">
        {/* ── Apariencia ── */}
        <section>
          <h2 className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest
                         text-zinc-500 dark:text-zinc-400"
          >
            <Palette size={13} aria-hidden="true" />
            Apariencia
          </h2>

          <div className="mt-3 rounded-2xl border border-zinc-200 bg-white p-5
                          dark:border-zinc-800 dark:bg-zinc-900/60"
          >
            <p className="text-center text-base font-bold text-zinc-900 dark:text-white">
              Cambia el color de tu app
            </p>
            <p className="mt-1 text-center text-sm text-zinc-500 dark:text-zinc-400">
              Toca un color. El cambio se ve al instante.
            </p>

            {/*
              Selector en circulitos (el estilo que pidió el usuario): una muestra
              por tema con su etiqueta debajo y un anillo en el activo. Son dos
              —negro y beige—, centrados.
            */}
            <div
              className="mt-5 flex items-center justify-center gap-6"
              role="radiogroup"
              aria-label="Color de la app"
            >
              {APP_THEMES.map((option) => {
                const active = theme === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    aria-label={option.label}
                    onClick={() => choose(option.value)}
                    className="flex flex-col items-center gap-2 active:scale-95 transition-transform"
                  >
                    <span
                      className={`h-14 w-14 rounded-full border transition-all
                                  ${active
                                    ? 'ring-2 ring-indigo-500 ring-offset-2 ring-offset-transparent scale-110'
                                    : 'opacity-80'}`}
                      style={{
                        backgroundColor: option.swatch,
                        borderColor: active ? 'transparent' : 'rgba(120,120,120,0.45)',
                      }}
                      aria-hidden="true"
                    />
                    <span className={`flex items-center gap-1 text-xs font-semibold
                                      ${active
                                        ? 'text-zinc-900 dark:text-white'
                                        : 'text-zinc-500 dark:text-zinc-400'}`}
                    >
                      {active && <Check size={12} strokeWidth={3} className="text-indigo-500" />}
                      {option.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        {/* ── Tamaño de texto ── */}
        <section>
          <h2 className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest
                         text-zinc-500 dark:text-zinc-400"
          >
            <Type size={13} aria-hidden="true" />
            Tamaño de texto
          </h2>

          <div className="mt-3 rounded-2xl border border-zinc-200 bg-white p-5
                          dark:border-zinc-800 dark:bg-zinc-900/60"
          >
            <p className="text-center text-base font-bold text-zinc-900 dark:text-white">
              Ajusta qué tan grande se ve la app
            </p>
            <p className="mt-1 text-center text-sm text-zinc-500 dark:text-zinc-400">
              Toca una letra. El cambio se ve al instante.
            </p>

            <div className="mt-5 flex justify-center">
              <TextScaleControl />
            </div>
          </div>
        </section>
      </div>
    </FullScreenView>
  );
}
