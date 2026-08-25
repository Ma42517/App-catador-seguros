import { useState } from 'react';
import { Phone, Clock, CheckCircle2 } from 'lucide-react';
import { useEvents } from '../../context/EventContext';
import { digits, prospectNameFrom } from '../../lib/prospectText';
import WhatsAppMark from './WhatsAppMark';
import TaskOptionsSheet from './TaskOptionsSheet';
import SwipeableCard from '../Layout/SwipeableCard';
import PaymentCollectedModal from './PaymentCollectedModal';
import { paymentFrequencyLabel } from '../../lib/paymentSchedule';

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
 * "Cobrado" no cierra la tarea de una vez: abre
 * `PaymentCollectedModal.jsx`, que pregunta cuándo se cobró y cada cuánto
 * se cobra esta póliza. Antes sí la cerraba en seco, y con eso una póliza
 * de prima mensual desaparecía de la agenda tras el primer pago, sin nadie
 * recordando los once cobros restantes del año. Ahora cada cobro agenda al
 * siguiente, así que la cadena se sostiene sola indefinidamente sin
 * ninguna tarea programada ni servidor: el próximo recordatorio es un
 * evento normal de la agenda, como cualquier otro.
 */
export default function PaymentCollectionCard({ event }) {
  const { updateEvent, removeEvent, addEvent } = useEvents();
  const [rescheduleOpen, setRescheduleOpen] = useState(false);
  const [collectedOpen, setCollectedOpen] = useState(false);

  const prospectName = prospectNameFrom(event.title);
  const phone = digits(event.telefono);
  const hasPhone = phone.length > 0;
  const amount = formatMoney(event.primaAnual);
  const frequencyLabel = paymentFrequencyLabel(event.paymentFrequency);

  /*
    Cierra este cobro y, si la póliza es recurrente, agenda el siguiente en
    la fecha que se confirmó en el modal. La frecuencia viaja al evento
    nuevo (`paymentFrequency`) para que el próximo cobro ya no vuelva a
    preguntarla: a partir del segundo, confirmar es sólo revisar la fecha.

    Así la cadena se sostiene sola indefinidamente —cada cobro agenda al
    que sigue— sin ninguna tarea programada ni servidor de por medio: el
    recordatorio siguiente es un evento normal de la agenda, igual que
    cualquier otro.
  */
  const handleCollected = ({ collectedOn, frequency, nextDate }) => {
    if (nextDate) {
      addEvent({
        tipo_actividad: 'cobro',
        title: `Cobro: ${prospectName}`,
        telefono: event.telefono ?? '',
        date: nextDate,
        // Se conserva la hora del cobro actual: si el cargo corre a cierta
        // hora del día, la siguiente vez conviene recordarlo a la misma.
        time: event.time || '09:00',
        priority: 'maxima',
        paymentFrequency: frequency,
        ...(event.primaAnual && { primaAnual: event.primaAnual }),
      });
    }
    /*
      `updateEvent` y no `completeEvent`: además de marcar la tarea como
      hecha hay que guardar dos datos en el mismo evento —cuándo se cobró
      de verdad (no cuándo estaba agendado) y con qué frecuencia—, y
      `completeEvent` sólo recibe el id. Es justo el caso para el que
      existe este ayudante genérico (ver su nota en `EventContext.jsx`).
    */
    updateEvent(event.id, {
      completed: true,
      collectedOn,
      paymentFrequency: frequency,
    });
  };

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
              {/*
                La frecuencia sólo aparece a partir del segundo cobro, que
                es cuando ya se eligió: en el primero no hay nada que
                mostrar todavía y el modal es quien la pregunta.
              */}
              {frequencyLabel && <span>· {frequencyLabel}</span>}
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
            onClick={() => setCollectedOpen(true)}
            aria-label={`Registrar el cobro de la prima de ${prospectName}`}
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

      <PaymentCollectedModal
        isOpen={collectedOpen}
        clientName={prospectName}
        amount={amount}
        initialFrequency={event.paymentFrequency}
        onClose={() => setCollectedOpen(false)}
        onConfirm={handleCollected}
      />
    </>
  );
}
