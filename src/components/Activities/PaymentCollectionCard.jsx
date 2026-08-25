import { useState } from 'react';
import { Phone, Clock, CheckCircle2 } from 'lucide-react';
import { useEvents } from '../../context/EventContext';
import { digits, prospectNameFrom } from '../../lib/prospectText';
import WhatsAppMark from './WhatsAppMark';
import TaskOptionsSheet from './TaskOptionsSheet';
import SwipeableCard from '../Layout/SwipeableCard';

/** Monto en pesos, redondeado — mismo formato que usa `Prospecta/citaInicial.js`. */
function formatMoney(amount) {
  const value = Number(amount);
  if (!Number.isFinite(value) || value <= 0) return '';
  return `$${Math.round(value).toLocaleString('es-MX')}`;
}

/**
 * src/components/Activities/PaymentCollectionCard.jsx
 *
 * Tarjeta de "Cobro" (`tipo_actividad === 'cobro'`): el último eslabón del
 * embudo. La crea `PolicyDeliveryCard.jsx` al tocar "Entregada" —la póliza
 * ya está en manos del cliente, falta que la primera prima se pague— y
 * también puede nacer a mano desde "Nueva Actividad", que es la razón por
 * la que esta tarjeta no asume que siempre viene del embudo.
 *
 * Misma "Pill" oscura de botones circulares que el resto de las etapas,
 * con WhatsApp y teléfono ya listos: el `telefono` se arrastra intacto
 * desde la Cita de Propuesta original, evento por evento, sin volver a
 * pedirlo en ningún punto de la cadena.
 *
 * `primaAnual` se muestra junto a la hora cuando existe. Es el dato que de
 * verdad importa aquí —cuánto hay que cobrar— y viaja por la misma cadena
 * que el teléfono desde que `StageResolutionModal.jsx` lo validó en
 * "Cierre Exitoso". Cuando no existe (un Cobro creado a mano, o una
 * Propuesta resuelta por `ProposalResolutionModal.jsx`, que no pregunta
 * montos), simplemente no se dibuja: mejor omitir la cifra que inventar un
 * cero que se leería como "no debe nada".
 *
 * "Cobrado" cierra la actividad y no crea ninguna otra: aquí termina el
 * "Efecto Dominó", no hay una etapa siguiente que forzar.
 */
export default function PaymentCollectionCard({ event }) {
  const { completeEvent, removeEvent } = useEvents();
  const [rescheduleOpen, setRescheduleOpen] = useState(false);

  const prospectName = prospectNameFrom(event.title);
  const phone = digits(event.telefono);
  const hasPhone = phone.length > 0;
  const amount = formatMoney(event.primaAnual);

  const telHref = hasPhone ? `tel:${phone}` : null;
  const whatsAppHref = hasPhone
    ? `https://wa.me/${phone.replace(/^\+/, '')}?text=${encodeURIComponent(
      `Hola ${prospectName}, te escribo para coordinar el pago de tu primera prima`
      + `${amount ? ` (${amount})` : ''} y que tu póliza quede activa. `
      + '¿Te ayudo con los datos para hacerlo?',
    )}`
    : null;

  return (
    <>
      <SwipeableCard
        onReschedule={() => setRescheduleOpen(true)}
        onDiscard={() => removeEvent(event.id)}
      >
        <div
          className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-900
                     p-3.5"
        >
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-bold uppercase tracking-wide text-indigo-400">
              Cobro
            </p>
            <p className="truncate text-sm font-semibold text-white">{prospectName}</p>
            <p className="mt-0.5 flex items-center gap-1.5 text-xs text-slate-500">
              <Clock size={11} aria-hidden="true" />
              {event.time || 'Sin hora'}
              {amount && (
                <span className="font-semibold text-emerald-400">· {amount}</span>
              )}
            </p>
          </div>

          <a
            href={whatsAppHref ?? undefined}
            target="_blank"
            rel="noopener noreferrer"
            aria-disabled={!hasPhone}
            onClick={(e) => { if (!hasPhone) e.preventDefault(); }}
            aria-label={`Enviar WhatsApp a ${prospectName}`}
            className={`grid h-10 w-10 shrink-0 place-items-center rounded-full transition-colors
                        active:scale-95 ${hasPhone
                ? 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20'
                : 'cursor-not-allowed bg-emerald-500/10 text-emerald-400 opacity-30'}`}
          >
            <WhatsAppMark size={16} />
          </a>

          <a
            href={telHref ?? undefined}
            aria-disabled={!hasPhone}
            onClick={(e) => { if (!hasPhone) e.preventDefault(); }}
            aria-label={`Llamar a ${prospectName}`}
            className={`grid h-10 w-10 shrink-0 place-items-center rounded-full transition-colors
                        active:scale-95 ${hasPhone
                ? 'bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20'
                : 'cursor-not-allowed bg-indigo-500/10 text-indigo-400 opacity-30'}`}
          >
            <Phone size={16} aria-hidden="true" />
          </a>

          <button
            type="button"
            onClick={() => completeEvent(event.id)}
            aria-label={`Marcar como cobrada la prima de ${prospectName}`}
            className="flex shrink-0 items-center gap-1.5 rounded-full bg-emerald-600 px-3.5
                       py-2 text-xs font-semibold text-white transition-colors
                       hover:bg-emerald-500 active:scale-95"
          >
            <CheckCircle2 size={15} aria-hidden="true" />
            Cobrado
          </button>
        </div>
      </SwipeableCard>

      <TaskOptionsSheet
        event={event}
        isOpen={rescheduleOpen}
        onClose={() => setRescheduleOpen(false)}
        initialReschedule
      />
    </>
  );
}
