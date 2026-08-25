import { Clock } from 'lucide-react';
import SwipeableCard from '../Layout/SwipeableCard';

/**
 * src/components/Activities/ActionCardBase.jsx
 *
 * Carcasa compartida de las tarjetas del embudo: la "Pill" oscura
 * (`bg-slate-900`, borde `slate-800`, `rounded-xl`) con la etiqueta del
 * tipo de actividad arriba, el nombre del prospecto, la hora, y las
 * acciones circulares a la derecha.
 *
 * Existe porque seis tarjetas repetían exactamente el mismo bloque de
 * markup y las mismas clases —etiqueta índigo en mayúsculas, nombre
 * truncado, fila de hora con el ícono `Clock`, envoltura en
 * `SwipeableCard`—, así que cualquier ajuste visual había que aplicarlo
 * seis veces y bastaba olvidar una para que esa tarjeta se viera distinta
 * (fue justo lo que pasó con la etiqueta de tipo, que en su momento faltó
 * en tres de ellas).
 *
 * Lo que NO abstrae, a propósito: qué hace cada botón, qué modales abre y
 * cómo resuelve su etapa. Eso es lo único que de verdad distingue a una
 * tarjeta de otra, y meterlo aquí convertiría este archivo en un `switch`
 * gigante por `tipo_actividad` — exactamente lo que `ActionableCard.jsx` ya
 * resuelve delegando a un componente por etapa.
 *
 * `swipe` puede apagarse para una tarjeta que administre su propio gesto
 * (hoy ninguna lo hace, pero `PipelineCard.jsx` lo necesitó mientras usaba
 * el toque para voltearse).
 *
 * @param {string} label Etiqueta del tipo, en mayúsculas ("COBRO", "SEGUIMIENTO").
 * @param {string} title Nombre del prospecto.
 * @param {React.ReactNode} [subtitle] Línea extra bajo el nombre (el origen de un Seguimiento).
 * @param {string} [time] Hora del evento; cae a "Sin hora".
 * @param {React.ReactNode} [meta] Se añade a la línea de la hora (monto, frecuencia, avisos).
 * @param {boolean} [isWarning] Estado de urgencia: borde ámbar con latido.
 * @param {React.ReactNode} children Los botones de acción de la tarjeta.
 */
export default function ActionCardBase({
  label, title, subtitle, time, meta, isWarning = false, swipe = true,
  onReschedule, onDiscard, children,
}) {
  const card = (
    <div
      className={`flex items-center gap-3 rounded-xl border p-3.5 transition-colors ${
        isWarning
          ? 'animate-pulse border-amber-500/60 bg-slate-900'
          : 'border-slate-800 bg-slate-900'
      }`}
    >
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-bold uppercase tracking-wide text-indigo-400">
          {label}
        </p>
        {/*
          Sin `truncate`: el texto se acomoda en varias líneas en vez de
          cortarse con puntos suspensivos. Un nombre largo o el motivo de un
          Seguimiento ("Pidió más tiempo en su Cita de Cierre") no caben en
          una línea de teléfono, y recortarlos escondía justo el dato que
          explica por qué existe la tarjeta.

          La tarjeta crece de alto lo que haga falta, pero el diseño no se
          rompe: los botones de la derecha llevan `shrink-0`, así que esta
          columna se estrecha sin desplazarlos nunca. `break-words` cubre el
          caso de una palabra sin espacios más ancha que la columna (un
          correo, un teléfono pegado), que sí se saldría del borde.
        */}
        <p className="break-words text-sm font-semibold text-white">{title}</p>
        {subtitle && <p className="mt-0.5 break-words text-xs text-slate-500">{subtitle}</p>}
        <p className="mt-0.5 flex items-center gap-1.5 text-xs text-slate-500">
          <Clock size={11} aria-hidden="true" />
          {time || 'Sin hora'}
          {meta}
        </p>
      </div>

      {children}
    </div>
  );

  if (!swipe) return card;

  return (
    <SwipeableCard onReschedule={onReschedule} onDiscard={onDiscard}>
      {card}
    </SwipeableCard>
  );
}
