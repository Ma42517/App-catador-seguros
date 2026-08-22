import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, CalendarClock, Archive } from 'lucide-react';
import Switch from '../ui/Switch';
import { PRESENTATION_END_GAMIFICATION } from '../../lib/presentationGamification';

/**
 * src/components/Prospecta/PresentationEndModal.jsx
 *
 * Formulario de resolución obligatorio al terminar una Cita Inicial
 * (`CitaInicialWizard.jsx`, botón "Terminar cita"). No es un simple
 * check de "completado": es el router de ventas que decide a dónde va el
 * prospecto después de esta cita — a "Nueva Actividad" pre-llenada con el
 * siguiente paso, o al archivo permanente si no califica.
 *
 * Bloquea la pantalla (overlay fijo, sin botón de cerrar aparte): la única
 * salida es elegir una de las 3 resoluciones, porque cada una decide qué
 * pasa con el prospecto y dejar la pantalla sin elegir dejaría el
 * expediente en un estado a medias.
 *
 * Las 3 resoluciones no le hablan directamente a `EventContext` ni a
 * Supabase: cada una llama a la prop correspondiente (`onRouteToActivity`,
 * `onDiscardClient`) y es quien monta este modal el que decide cómo
 * ejecutarlo — mismo desacople que ya usa `CallFeedbackModal.jsx` con
 * `onEarnPoints`.
 *
 * @param {boolean} isOpen
 * @param {{id?: string, name?: string, phone?: string}} client
 * @param {() => void} onClose
 * @param {(activityType: 'cita_propuesta'|'seguimiento', client: object) => void} onRouteToActivity
 * @param {(client: object) => void} onDiscardClient
 * @param {(amount: number) => void} onEarnPoints
 */
export default function PresentationEndModal({
  isOpen, client, onClose, onRouteToActivity, onDiscardClient, onEarnPoints,
}) {
  const [askedReferrals, setAskedReferrals] = useState(false);

  const clientName = client?.name || 'este prospecto';

  /*
    Los +2 de referidos aplican sin importar cuál de las 3 resoluciones se
    elija: pedir referidos es una acción de la cita en sí, no un premio
    exclusivo de "avanzar a propuesta".
  */
  const awardPoints = () => {
    const total = PRESENTATION_END_GAMIFICATION.RESOLUTION_BASE
      + (askedReferrals ? PRESENTATION_END_GAMIFICATION.REFERRAL_BONUS : 0);
    onEarnPoints?.(total);
  };

  const resolve = (action) => {
    awardPoints();
    action();
    setAskedReferrals(false);
    onClose?.();
  };

  const handleAdvanceToProposal = () => resolve(() => onRouteToActivity?.('cita_propuesta', client));
  const handleNeedsFollowUp = () => resolve(() => onRouteToActivity?.('seguimiento', client));
  const handleNotQualified = () => resolve(() => onDiscardClient?.(client));

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-label="Cierre de la Cita Inicial"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[90] flex items-center justify-center bg-black/70
                     p-4 backdrop-blur-sm"
        >
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.97 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="w-full max-w-sm rounded-3xl border border-slate-800 bg-slate-900 p-6
                       shadow-2xl shadow-black/50"
          >
            <p className="text-[11px] font-bold uppercase tracking-widest text-indigo-400">
              Cierre de Presentación
            </p>
            <h2 className="mt-1.5 text-lg font-bold leading-snug text-white">
              ¿Qué sigue con {clientName}?
            </h2>
            <p className="mt-1 text-xs leading-relaxed text-slate-400">
              Elige una resolución para continuar. La cita no se cierra sin decidir esto.
            </p>

            <div className="mt-5 flex flex-col gap-2.5">
              <button
                type="button"
                onClick={handleAdvanceToProposal}
                className="flex w-full items-center justify-between gap-3 rounded-xl
                           bg-indigo-600 px-4 py-3.5 text-left text-sm font-semibold text-white
                           transition-colors hover:bg-indigo-500 active:scale-[0.98]"
              >
                Avanzamos a Propuesta
                <ArrowRight size={18} className="shrink-0" aria-hidden="true" />
              </button>

              <button
                type="button"
                onClick={handleNeedsFollowUp}
                className="flex w-full items-center justify-between gap-3 rounded-xl
                           border border-slate-700 bg-slate-800 px-4 py-3.5 text-left text-sm
                           font-semibold text-slate-200 transition-colors hover:bg-slate-700
                           active:scale-[0.98]"
              >
                Requiere Seguimiento
                <CalendarClock size={18} className="shrink-0 text-slate-400" aria-hidden="true" />
              </button>

              <button
                type="button"
                onClick={handleNotQualified}
                className="flex w-full items-center justify-between gap-3 rounded-xl
                           border border-slate-700 bg-slate-800 px-4 py-3.5 text-left text-sm
                           font-semibold text-slate-400 transition-colors hover:bg-rose-500/10
                           hover:text-rose-300 active:scale-[0.98]"
              >
                No califica
                <Archive size={18} className="shrink-0" aria-hidden="true" />
              </button>
            </div>

            <div className="mt-5 border-t border-slate-800 pt-4">
              <Switch
                checked={askedReferrals}
                onChange={setAskedReferrals}
                label="¿Solicitaste referidos en esta cita?"
                hint={`Suma ${PRESENTATION_END_GAMIFICATION.REFERRAL_BONUS} puntos extra, sin importar la resolución que elijas.`}
              />
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
