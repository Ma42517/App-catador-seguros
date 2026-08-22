import { Phone, CheckCircle2, Clock } from 'lucide-react';
import { useEvents } from '../../context/EventContext';
import { digits, prospectNameFrom } from '../../lib/prospectText';
import WhatsAppMark from './WhatsAppMark';

/**
 * src/components/Activities/FollowUpCard.jsx
 *
 * Tarjeta de "Seguimiento" (`tipo_actividad === 'seguimiento'`): la
 * resolución "Pide más tiempo" del router de ventas
 * (`StageResolutionModal.jsx`/`PresentationEndModal.jsx`) siempre aterriza
 * aquí, sin importar de qué etapa venía. A propósito compacta y sin Flip
 * —a diferencia de `PipelineCard.jsx`—: no hay 4 acciones que esconder,
 * sólo 3 acciones directas siempre visibles (llamar, WhatsApp, completar),
 * así que no hace falta ganar espacio girando la tarjeta ni envolverla en
 * el gesto de deslizar de `SwipeableCard.jsx` — cada acción ya está a la
 * vista con un solo toque.
 *
 * El subtítulo muestra el origen/motivo del seguimiento
 * (`event.followUpReason`, escrito por quien enruta la actividad — ver
 * `App.jsx`, `handleRouteToActivity`): sin ese dato ("Seguimiento
 * pendiente" por defecto), la persona vería un nombre y una hora sin
 * ninguna pista de por qué existe esta tarea.
 */
export default function FollowUpCard({ event }) {
  const { completeEvent } = useEvents();

  const prospectName = prospectNameFrom(event.title);
  const phone = digits(event.telefono);
  const hasPhone = phone.length > 0;
  const reason = event.followUpReason || 'Seguimiento pendiente';

  const telHref = hasPhone ? `tel:${phone}` : null;
  const whatsAppHref = hasPhone
    ? `https://wa.me/${phone.replace(/^\+/, '')}?text=${encodeURIComponent(
      `Hola ${prospectName}, te escribo para dar seguimiento a lo que platicamos.`,
    )}`
    : null;

  return (
    <div
      className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-900
                 p-3.5"
    >
      <div className="min-w-0 flex-1">
        {/*
          Etiqueta del tipo de actividad, arriba del nombre — mismo patrón
          que `CallActivityCard.jsx`/`InitialMeetingCard.jsx`: el
          subtítulo con el motivo ya avisaba "por qué", pero no decía
          "qué es esto" hasta leer el título completo del evento.
        */}
        <p className="text-[10px] font-bold uppercase tracking-wide text-indigo-400">
          Seguimiento
        </p>
        <p className="truncate text-sm font-semibold text-white">{prospectName}</p>
        <p className="mt-0.5 truncate text-xs text-slate-500">{reason}</p>
        <p className="mt-0.5 flex items-center gap-1.5 text-xs text-slate-500">
          <Clock size={11} aria-hidden="true" />
          {event.time || 'Sin hora'}
        </p>
      </div>

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

      <button
        type="button"
        onClick={() => completeEvent(event.id)}
        aria-label={`Completar seguimiento de ${prospectName}`}
        className="grid h-10 w-10 shrink-0 place-items-center rounded-full
                   bg-slate-500/10 text-slate-300 transition-colors
                   hover:bg-slate-500/20 active:scale-95"
      >
        <CheckCircle2 size={16} aria-hidden="true" />
      </button>
    </div>
  );
}
