import { useState } from 'react';
import { Phone, Clock } from 'lucide-react';
import useCallReturnDetector from '../../lib/useCallReturnDetector';
import CallFeedbackModal from './CallFeedbackModal';
import WhatsAppMark from './WhatsAppMark';
import Toast from '../Layout/Toast';
import { playChime, primeAudio } from '../../data/chime';
import { tapFeedback, SUCCESS_PATTERN } from '../../lib/haptics';
import { digits, prospectNameFrom } from '../../lib/prospectText';

/** "+ 0.5 Puntos", "+ 3 Puntos": entero sin decimales, fracción con uno solo. */
function formatPoints(amount) {
  const value = Number.isInteger(amount) ? String(amount) : amount.toFixed(1);
  return `+ ${value} ${amount === 1 ? 'Punto' : 'Puntos'}`;
}

/**
 * src/components/Activities/CallActivityCard.jsx
 *
 * Tarjeta de una actividad de tipo "Llamada": nombre del prospecto, hora,
 * y exactamente dos acciones —Teléfono y WhatsApp—. Sin ningún botón de
 * check: la tarea nunca se marca a mano, se resuelve sola cuando la
 * persona vuelve a la app después de haber marcado
 * (`useCallReturnDetector`, ver ese módulo para el porqué de las dos
 * guardas contra falsos positivos).
 *
 * El ícono de teléfono llama a `arm()` justo antes de abrir el `tel:` —no
 * después, y no en un efecto separado—: es el gesto de la persona el que
 * activa la vigilancia, nunca un temporizador que corra por su cuenta.
 *
 * `onEarnPoints` es el único vínculo con el marcador real de puntos del
 * asesor (`useAdvisorPoints`, un hook con estado propio, montado más
 * arriba en `TodayView.jsx`): esta tarjeta no sabe sumar puntos por sí
 * misma, sólo avisa cuánto se ganó y deja que quien la montó decida cómo
 * persistirlo. El toast, el sonido (`playChime`) y la vibración
 * (`SUCCESS_PATTERN`) sí son responsabilidad de esta tarjeta: son la
 * recompensa sensorial del momento, no un dato que otro componente deba
 * conocer. Agendar la cita nueva (si el feedback termina en "Agendar
 * Cita") lo resuelve por completo `CallFeedbackModal` — pide fecha y
 * hora ahí mismo, sin abrir un segundo formulario aparte.
 */
export default function CallActivityCard({ event, onEarnPoints }) {
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [toast, setToast] = useState('');
  const arm = useCallReturnDetector(() => setFeedbackOpen(true));

  const prospectName = prospectNameFrom(event.title);
  const phone = digits(event.telefono);
  const hasPhone = phone.length > 0;

  const handleCall = () => {
    if (!hasPhone) return;
    // El audio se abre con el gesto de tocar el ícono: para cuando la
    // persona vuelva de la llamada ya no habrá ningún toque que iOS/Safari
    // puedan aprovechar para reanudar el contexto de audio.
    primeAudio();
    arm();
    window.location.href = `tel:${phone}`;
  };

  const handleWhatsApp = () => {
    if (!hasPhone) return;
    window.open(`https://wa.me/${phone.replace(/^\+/, '')}`, '_blank', 'noopener');
  };

  const awardPoints = (amount) => {
    onEarnPoints?.(amount);
    playChime();
    tapFeedback(SUCCESS_PATTERN);
    setToast(formatPoints(amount));
  };

  return (
    <>
      <div
        className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-900
                   p-3.5"
      >
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-white">{prospectName}</p>
          <p className="mt-0.5 flex items-center gap-1.5 text-xs text-slate-500">
            <Clock size={11} aria-hidden="true" />
            {event.time || 'Sin hora'}
          </p>
        </div>

        <button
          type="button"
          onClick={handleWhatsApp}
          disabled={!hasPhone}
          aria-label={`Enviar WhatsApp a ${prospectName}`}
          className="grid h-10 w-10 shrink-0 place-items-center rounded-full
                     bg-emerald-500/10 text-emerald-400 transition-colors
                     hover:bg-emerald-500/20 active:scale-95 disabled:cursor-not-allowed
                     disabled:opacity-30"
        >
          <WhatsAppMark size={16} />
        </button>

        <button
          type="button"
          onClick={handleCall}
          disabled={!hasPhone}
          aria-label={`Llamar a ${prospectName}`}
          className="grid h-10 w-10 shrink-0 place-items-center rounded-full
                     bg-indigo-500/10 text-indigo-400 transition-colors
                     hover:bg-indigo-500/20 active:scale-95 disabled:cursor-not-allowed
                     disabled:opacity-30"
        >
          <Phone size={16} aria-hidden="true" />
        </button>
      </div>

      <CallFeedbackModal
        event={event}
        prospectName={prospectName}
        isOpen={feedbackOpen}
        onClose={() => setFeedbackOpen(false)}
        onEarnPoints={awardPoints}
      />

      <Toast message={toast} onDone={() => setToast('')} />
    </>
  );
}
