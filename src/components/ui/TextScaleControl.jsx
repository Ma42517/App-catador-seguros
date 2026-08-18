import { useState } from 'react';
import { TEXT_SCALES, readTextScale, writeTextScale, applyTextScale } from '../../lib/textScale';

/**
 * Selector de tamaño de texto: tres "A" crecientes, la forma más común y
 * reconocible de este control (la misma que usan la mayoría de apps y sitios
 * con ajuste de accesibilidad) — no hace falta explicar qué hace un ícono
 * nuevo si ya es un lenguaje visual conocido.
 *
 * El tamaño de cada "A" en pantalla escala con `text-sm`/`text-lg`/`text-2xl`
 * (todas en `rem`, ver `textScale.js`): sirve de vista previa en miniatura de
 * lo que la opción va a hacer, sin necesidad de una etiqueta aparte.
 */
export default function TextScaleControl({ className = '' }) {
  const [value, setValue] = useState(readTextScale);

  const choose = (next) => {
    setValue(next);
    writeTextScale(next);
    applyTextScale(next);
  };

  const sizeClass = { normal: 'text-sm', large: 'text-lg', xlarge: 'text-2xl' };

  return (
    <div
      role="radiogroup"
      aria-label="Tamaño de texto"
      className={`inline-flex items-center gap-1 rounded-xl border border-zinc-700/60
                  bg-zinc-900/70 p-1 ${className}`}
    >
      {TEXT_SCALES.map((scale) => {
        const active = value === scale.value;
        return (
          <button
            key={scale.value}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={`Tamaño de texto ${scale.percent === 100 ? 'normal' : scale.percent === 115 ? 'grande' : 'muy grande'}`}
            onClick={() => choose(scale.value)}
            className={`grid h-10 w-10 place-items-center rounded-lg font-bold transition-all
                        duration-150 ${sizeClass[scale.value]} ${
              active
                ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/25'
                : 'text-zinc-400 hover:bg-zinc-800/70 hover:text-zinc-200'
            }`}
          >
            {scale.label}
          </button>
        );
      })}
    </div>
  );
}
