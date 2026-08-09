import { useEffect, useRef } from 'react';
import { Trash2 } from 'lucide-react';

/**
 * Consola de diagnóstico: registro cronológico de lo que la app le pidió a la
 * base y qué contestó.
 *
 * Existe porque los errores de Supabase son específicos y accionables (traen
 * código y sugerencia de arreglo). Resumirlos a "algo falló" obliga a abrir las
 * herramientas de desarrollo, que es justo lo que este panel evita.
 *
 * Es presentacional a propósito: recibe las líneas ya formadas para que el
 * panel decida qué se registra y esta pieza sólo se ocupe de mostrarlo.
 */

/**
 * Cada nivel se distingue por su marca y por color, no sólo por color.
 *
 * Las marcas son ASCII a propósito: los símbolos tipo ✓ o ✕ no existen en
 * muchas fuentes monoespaciadas y se degradan al cuadrito de glifo faltante,
 * que es justo lo que no puede pasarle al indicador de un log.
 */
const LEVELS = {
  cmd: { mark: '$', className: 'text-zinc-300' },
  ok: { mark: 'OK', className: 'text-emerald-400' },
  error: { mark: 'ERR', className: 'text-rose-400' },
  warn: { mark: 'WRN', className: 'text-amber-400' },
  info: { mark: '-', className: 'text-zinc-400' },
};

export default function DiagnosticsConsole({ lines, onClear }) {
  const endRef = useRef(null);

  // La línea nueva es la que importa, así que la vista sigue al final.
  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'nearest' });
  }, [lines]);

  return (
    <div className="overflow-hidden rounded-xl border border-zinc-800 bg-black">
      <div className="flex items-center justify-between border-b border-zinc-800 px-3 py-2">
        <div className="flex items-center gap-1.5" aria-hidden="true">
          <span className="h-2.5 w-2.5 rounded-full bg-rose-500/70" />
          <span className="h-2.5 w-2.5 rounded-full bg-amber-500/70" />
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-500/70" />
          <span className="ml-2 font-mono text-[10px] uppercase tracking-wider text-zinc-500">
            consola
          </span>
        </div>

        <button
          type="button"
          onClick={onClear}
          disabled={lines.length === 0}
          className="flex items-center gap-1 rounded-md px-2 py-1 font-mono text-[10px]
                     uppercase tracking-wider text-zinc-500 transition-colors
                     hover:bg-white/5 hover:text-zinc-300 disabled:opacity-40
                     disabled:hover:bg-transparent disabled:hover:text-zinc-500"
        >
          <Trash2 size={11} />
          Limpiar
        </button>
      </div>

      <div
        role="log"
        aria-live="polite"
        aria-label="Consola de diagnóstico"
        className="max-h-56 overflow-y-auto px-3 py-2.5 font-mono text-[11px] leading-relaxed"
      >
        {lines.length === 0 ? (
          <p className="text-zinc-600">Sin actividad. Usa &quot;Verificar conexión&quot;.</p>
        ) : (
          lines.map((line) => {
            const level = LEVELS[line.level] ?? LEVELS.info;
            return (
              <p key={line.id} className="flex gap-2 break-words">
                <span className="shrink-0 text-zinc-600">{line.time}</span>
                {/* Ancho fijo: las marcas miden distinto y sin esto el texto
                    de cada línea arrancaría en una columna diferente. */}
                <span className={`w-7 shrink-0 text-right ${level.className}`}>
                  {level.mark}
                </span>
                <span className={`min-w-0 flex-1 ${level.className}`}>{line.text}</span>
              </p>
            );
          })
        )}
        <span ref={endRef} />
      </div>
    </div>
  );
}
