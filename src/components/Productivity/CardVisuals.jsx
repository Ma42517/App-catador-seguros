import { Bell, Flame } from 'lucide-react';

/**
 * Visuales animados de las tarjetas del hub.
 *
 * Cada destino tiene su propia pieza en lugar de un ícono genérico: la campana
 * repica, el anillo de metas se dibuja hasta su porcentaje real y la llama de
 * las rachas late. La animación aquí no es adorno, informa —el anillo dice
 * cuánto llevas, el reloj dice que algo corre—, y por eso todas se detienen con
 * `prefers-reduced-motion` salvo el anillo, que salta a su valor final para no
 * mostrar un dato falso.
 */

/** Marco circular común, para que todas las piezas ocupen lo mismo. */
function Frame({ tint, children }) {
  return (
    <span
      className={`grid h-14 w-14 shrink-0 place-items-center rounded-2xl ${tint}`}
      aria-hidden="true"
    >
      {children}
    </span>
  );
}

/** Workplace: campana que repica cada pocos segundos. */
export function BellVisual() {
  return (
    <Frame tint="bg-cyan-50 text-cyan-600 ring-1 ring-cyan-100">
      {/* `origin-top` es lo que hace que gire desde el yugo y no desde el centro */}
      <Bell size={26} strokeWidth={1.9} className="origin-top animate-swing" />
    </Frame>
  );
}

/**
 * Mis Metas: anillo que se dibuja de 0 al porcentaje indicado.
 *
 * El largo del trazo y su destino viajan como variables CSS porque el keyframe
 * es uno solo y compartido: así el mismo `draw-ring` sirve para cualquier
 * porcentaje sin generar una clase por valor.
 */
export function ProgressRingVisual({ percent = 70 }) {
  const radius = 20;
  const length = 2 * Math.PI * radius;
  const target = length * (1 - Math.min(100, Math.max(0, percent)) / 100);

  return (
    <Frame tint="bg-amber-50 ring-1 ring-amber-100">
      <span className="relative grid place-items-center">
        <svg width="48" height="48" viewBox="0 0 48 48" className="-rotate-90">
          <circle
            cx="24"
            cy="24"
            r={radius}
            fill="none"
            strokeWidth="4"
            className="stroke-amber-200/70"
          />
          <circle
            cx="24"
            cy="24"
            r={radius}
            fill="none"
            strokeWidth="4"
            strokeLinecap="round"
            className="animate-draw-ring stroke-amber-500"
            style={{
              strokeDasharray: length,
              '--ring-length': length,
              '--ring-target': target,
            }}
          />
        </svg>

        <span className="absolute text-[11px] font-bold text-amber-700">
          {Math.round(percent)}%
        </span>
      </span>
    </Frame>
  );
}

/**
 * Bloques de Tiempo: reloj minimalista con la aguja girando despacio.
 *
 * Diez segundos por vuelta: lo bastante lento para que no distraiga, lo
 * bastante visible para que se note que el tiempo corre.
 */
export function ClockVisual() {
  return (
    <Frame tint="bg-indigo-50 ring-1 ring-indigo-100">
      <svg width="44" height="44" viewBox="0 0 44 44">
        <circle cx="22" cy="22" r="15" fill="none" strokeWidth="2.5" className="stroke-indigo-200" />

        {/* Marcas de las cuatro horas cardinales */}
        {[0, 90, 180, 270].map((angle) => (
          <line
            key={angle}
            x1="22"
            y1="9"
            x2="22"
            y2="11.5"
            strokeWidth="2"
            strokeLinecap="round"
            className="stroke-indigo-300"
            transform={`rotate(${angle} 22 22)`}
          />
        ))}

        {/* La aguja gira sobre el centro del reloj, no sobre el del lienzo */}
        <g className="animate-spin-slow" style={{ transformOrigin: '22px 22px' }}>
          <line
            x1="22"
            y1="22"
            x2="22"
            y2="13"
            strokeWidth="2.5"
            strokeLinecap="round"
            className="stroke-indigo-600"
          />
        </g>

        <circle cx="22" cy="22" r="2" className="fill-indigo-600" />
      </svg>
    </Frame>
  );
}

/** Rachas: llama que late de forma irregular, como algo que arde. */
export function FlameVisual() {
  return (
    <Frame tint="bg-orange-50 text-orange-500 ring-1 ring-orange-100">
      <Flame size={26} strokeWidth={2} className="animate-flicker" />
    </Frame>
  );
}

/**
 * Dinero en la Mesa: el monto es el protagonista, no un ícono.
 *
 * El degradado se recorta sobre el texto y el reflejo lo recorre por encima.
 * Hace falta `bg-clip-text` con el texto transparente: pintar el degradado de
 * fondo dejaría el número ilegible sobre él.
 */
export function MoneyVisual({ amount = '$45,000' }) {
  return (
    <span className="shrink-0" aria-hidden="true">
      <span className="block text-2xl font-extrabold leading-none tracking-tight">
        <span
          className="animate-shine bg-gradient-to-r from-emerald-500 via-sky-500 to-emerald-500
                     bg-[length:250%_100%] bg-clip-text text-transparent"
        >
          {amount}
        </span>
      </span>
      <span className="mt-1 block text-[10px] font-bold uppercase tracking-widest text-emerald-600">
        MXN
      </span>
    </span>
  );
}
