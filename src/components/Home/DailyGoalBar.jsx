import { DAILY_POINTS_GOAL } from '../../store/gamificationStore';

/**
 * src/components/Home/DailyGoalBar.jsx
 *
 * Barra de "Objetivo Diario": refleja el Sistema de 20 Puntos.
 *
 * Vive en el cuerpo del tablero, no en la cabecera: etiqueta ("Objetivo
 * Diario") y contador a los lados de una fila, con una barra de progreso
 * debajo. Sigue siendo de sólo lectura, igual que el resto del Tracker —sin
 * botones ni acciones—, y refleja `puntosActuales` que calculará en algún
 * otro lugar la lógica de producto todavía por construir.
 */

export default function DailyGoalBar({ puntosActuales = 0 }) {
  const displayPoints = Math.max(0, Number(puntosActuales) || 0);
  const progressPoints = Math.min(displayPoints, DAILY_POINTS_GOAL);
  const percent = (progressPoints / DAILY_POINTS_GOAL) * 100;

  return (
    <div
      role="status"
      aria-label={`Objetivo diario: ${displayPoints} de ${DAILY_POINTS_GOAL} puntos`}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
          Objetivo Diario
        </span>
        <span className="text-xs font-bold tabular-nums text-amber-500">
          {displayPoints} / {DAILY_POINTS_GOAL} Puntos
        </span>
      </div>

      <div className="mt-2 h-1.5 w-full rounded-full bg-slate-800">
        {/*
          El brillo se deja puesto siempre, no sólo cuando `percent > 0`: en
          0% el relleno mide 0 de ancho y el `shadow` no tiene silueta que
          iluminar, así que no hay nada que mostrar de más — pero
          condicionarlo de todos modos introduciría un salto de clases justo
          al ganar el primer punto, que es el momento menos indicado para
          que algo cambie de golpe.
        */}
        <div
          className="h-full rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]
                     transition-all duration-500"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
