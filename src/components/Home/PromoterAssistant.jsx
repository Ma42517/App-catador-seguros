import { Sparkles, ChevronDown } from 'lucide-react';

/**
 * Asistente de la promotoría: ocupa el centro de la pantalla de inicio y
 * conduce la mirada hacia el botón "+" de la barra inferior.
 *
 * La guía visual (línea + flecha) queda centrada a propósito: el "+" también
 * está centrado en la barra, así que la línea apunta directo a él.
 */
export default function PromoterAssistant({ name }) {
  const saludo = name ? name.charAt(0).toUpperCase() + name.slice(1) : '';

  return (
    <div className="mt-10 flex flex-col items-center">
      {/* Avatar: círculo de cristal con halo índigo */}
      <div
        className="grid h-20 w-20 place-items-center rounded-full border border-indigo-500/30
                   bg-white/60 backdrop-blur-md shadow-[0_0_30px_rgba(79,70,229,0.2)]
                   dark:bg-zinc-800/50"
        aria-hidden="true"
      >
        <Sparkles
          size={30}
          strokeWidth={1.6}
          className="animate-pulse text-indigo-500 dark:text-white"
        />
      </div>

      {/* Burbuja de diálogo */}
      <div
        className="mt-4 max-w-sm rounded-2xl border border-zinc-200 bg-white/70 p-5 text-center
                   backdrop-blur-md dark:border-zinc-700/50 dark:bg-zinc-900/60"
      >
        <p className="text-lg font-light tracking-wide text-zinc-700 dark:text-zinc-200">
          Gran semana{saludo ? `, ${saludo}` : ''}. ¿Cerramos algún negocio pendiente hoy, o
          agendamos citas para arrancar el lunes con todo?
        </p>
      </div>

      {/* Guía visual hacia el botón "+" */}
      <div className="mt-6 flex flex-col items-center">
        <span
          className="h-16 w-px bg-gradient-to-b from-indigo-500/80 to-transparent"
          aria-hidden="true"
        />
        {/*
          La flecha debe quedar exactamente sobre el eje central, porque el "+"
          también está centrado en la barra. Por eso el rótulo se posiciona en
          absoluto a su derecha: si fuera un flex normal, el conjunto
          flecha+texto se centraría y la flecha terminaría desplazada a la
          izquierda la mitad del ancho del texto.
        */}
        <div className="relative -mt-1 flex items-center justify-center">
          <ChevronDown
            size={18}
            className="animate-bounce text-indigo-400"
            aria-hidden="true"
          />
          <span
            className="absolute left-1/2 ml-3 whitespace-nowrap text-[10px] uppercase
                       tracking-widest text-indigo-400"
          >
            Toca aquí para empezar
          </span>
        </div>
      </div>
    </div>
  );
}
