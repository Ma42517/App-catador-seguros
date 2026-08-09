/**
 * Anillo de progreso con el reloj en el centro.
 *
 * Se dibuja con un `circle` y `strokeDashoffset` en vez de con un degradado
 * cónico porque así el trazo tiene extremos redondeados y anima suave; un
 * `conic-gradient` salta de grado en grado.
 *
 * El anillo se vacía en sentido horario desde arriba: `rotate(-90)` mueve el
 * origen de las 3 a las 12, que es donde una persona espera que empiece.
 */
const SIZE = 208;
const STROKE = 12;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export default function TimerRing({ clock, fraction, label, isDone, isRunning }) {
  const remainingFraction = Math.min(1, Math.max(0, 1 - fraction));

  // Los últimos dos minutos se marcan en ámbar y el final en esmeralda: el
  // color adelanta el estado antes de que se lea el número.
  const stroke = isDone
    ? 'stroke-emerald-500'
    : remainingFraction <= 0.08
      ? 'stroke-amber-500'
      : 'stroke-indigo-500';

  return (
    <div className="relative mx-auto" style={{ width: SIZE, height: SIZE }}>
      <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} aria-hidden="true">
        <circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          fill="none"
          strokeWidth={STROKE}
          className="stroke-zinc-200 dark:stroke-zinc-800"
        />
        <circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          fill="none"
          strokeWidth={STROKE}
          strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={CIRCUMFERENCE * (1 - remainingFraction)}
          transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}
          className={`${stroke} transition-[stroke-dashoffset] duration-1000 ease-linear`}
        />
      </svg>

      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {/*
          `tabular-nums` evita el temblor: sin ella, cada dígito tiene su propio
          ancho y el reloj se mueve en cada segundo.
        */}
        <p
          role="timer"
          aria-live="off"
          className={`text-5xl font-bold tabular-nums leading-none ${isDone
            ? 'text-emerald-600 dark:text-emerald-400'
            : 'text-zinc-900 dark:text-white'}`}
        >
          {clock}
        </p>

        <p className="mt-2 max-w-[85%] text-center text-xs font-semibold leading-tight text-zinc-600 dark:text-zinc-300">
          {isDone ? '¡Bloque completado!' : label}
        </p>

        {isRunning && !isDone && (
          <span
            className="mt-1.5 h-1.5 w-1.5 animate-pulse rounded-full bg-indigo-500"
            aria-hidden="true"
          />
        )}
      </div>
    </div>
  );
}
