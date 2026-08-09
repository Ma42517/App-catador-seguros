import { useEffect, useRef } from 'react';
import { Award, Flame, Clock, TrendingUp } from 'lucide-react';
import {
  referenceValue, formatMoney, formatDuration,
} from '../../data/timeBlocks';

/**
 * Cierre de un bloque de enfoque.
 *
 * Deliberadamente sobrio: fondo sólido, una sola entrada suave y tipografía
 * grande. Nada de confeti ni rebotes. Quien usa esto es un asesor en jornada de
 * trabajo, y con frecuencia alguien de más de cincuenta años: la recompensa
 * tiene que sentirse como un reconocimiento profesional, no como un premio de
 * videojuego.
 *
 * No se cierra solo. Un aviso que se desvanece a los tres segundos se pierde
 * justo cuando la persona levanta la vista de la llamada que acaba de colgar.
 */
export default function SessionCompleteModal({
  isOpen, label, minutes, todayBlocks, todayMinutes, onClose,
}) {
  const closeRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return undefined;

    const onKeyDown = (event) => { if (event.key === 'Escape') onClose(); };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKeyDown);

    // El foco va al botón: así se puede cerrar con Enter sin buscar el ratón.
    closeRef.current?.focus();

    return () => {
      window.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const value = referenceValue(minutes);

  return (
    <div
      className="fixed inset-0 z-[85] flex items-center justify-center p-5"
      role="dialog"
      aria-modal="true"
      aria-labelledby="session-complete-title"
    >
      <button
        type="button"
        aria-label="Cerrar"
        onClick={onClose}
        className="absolute inset-0 h-full w-full cursor-default bg-zinc-950/80 backdrop-blur-sm"
      />

      <div
        className="animate-rise relative w-full max-w-sm overflow-hidden rounded-3xl
                   border border-emerald-500/25 bg-zinc-900 shadow-2xl"
      >
        {/* Franja superior: el verde esmeralda es el color del cierre logrado */}
        <div className="border-b border-emerald-500/20 bg-emerald-500/10 px-6 py-5 text-center">
          <span
            className="mx-auto mb-3 grid h-14 w-14 place-items-center rounded-2xl
                       bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-400/30"
            aria-hidden="true"
          >
            <Award size={28} />
          </span>

          <h2 id="session-complete-title" className="text-xl font-bold text-white">
            Sesión completada
          </h2>
          <p className="mt-1 text-sm font-semibold text-emerald-300">{label}</p>
        </div>

        <div className="px-6 py-5">
          {/* Valor de referencia. El texto lo enmarca como estimación a
              propósito: no es un dato del sector y no debe repetirse como tal. */}
          <div className="rounded-2xl border border-amber-500/25 bg-amber-500/5 p-4">
            <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase
                          tracking-wider text-amber-400"
            >
              <TrendingUp size={12} />
              Valor generado
            </p>

            <p className="mt-1.5 text-3xl font-bold leading-none text-amber-300">
              {formatMoney(value)}
            </p>

            <p className="mt-2.5 text-sm leading-relaxed text-zinc-300">
              Estos <span className="font-bold text-white">{minutes} minutos</span> de enfoque
              puro acercan {formatMoney(value)} en valor de cierre a tu negocio.
              La constancia paga.
            </p>

            <p className="mt-2 text-[10px] leading-relaxed text-zinc-500">
              Estimación de referencia para medir tu esfuerzo, no una proyección de ingresos.
            </p>
          </div>

          {/* Acumulado del día */}
          <div className="mt-4 grid grid-cols-2 gap-2">
            <div className="rounded-2xl border border-zinc-800 bg-zinc-950/50 p-3 text-center">
              <Flame size={16} className="mx-auto text-orange-400" aria-hidden="true" />
              <p className="mt-1.5 text-2xl font-bold leading-none text-white">{todayBlocks}</p>
              <p className="mt-1 text-[11px] text-zinc-400">
                {todayBlocks === 1 ? 'bloque hoy' : 'bloques hoy'}
              </p>
            </div>

            <div className="rounded-2xl border border-zinc-800 bg-zinc-950/50 p-3 text-center">
              <Clock size={16} className="mx-auto text-indigo-400" aria-hidden="true" />
              <p className="mt-1.5 text-2xl font-bold leading-none text-white">
                {formatDuration(todayMinutes)}
              </p>
              <p className="mt-1 text-[11px] text-zinc-400">enfocado hoy</p>
            </div>
          </div>

          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            className="mt-5 w-full rounded-xl bg-emerald-600 px-4 py-3.5 text-base font-bold
                       text-white shadow-lg shadow-emerald-600/25 transition-colors
                       hover:bg-emerald-500 focus-visible:outline-none focus-visible:ring-2
                       focus-visible:ring-emerald-400 focus-visible:ring-offset-2
                       focus-visible:ring-offset-zinc-900"
          >
            Continuar
          </button>
        </div>
      </div>
    </div>
  );
}
