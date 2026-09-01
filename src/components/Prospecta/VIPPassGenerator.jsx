import { useState, useEffect, useRef } from 'react';
import { Ticket, Unlock, ArrowRight, Send, ShieldCheck } from 'lucide-react';
import FullScreenView from '../Layout/FullScreenView';
import { useSession } from '../../context/SessionContext';
import {
  MAX_PASSES, saveVipPasses, unlockVipWithoutPasses, isVipUnlocked,
  hasEnoughPasses, completePasses,
} from '../../data/vipPasses';
import VIPPassFields from './VIPPassFields';
import { createLead } from '../../data/leadsRepo';
import {
  GAMIFICATION_ACTIONS, awardGamification,
} from '../../store/gamificationStore';

/**
 * src/components/Prospecta/VIPPassGenerator.jsx
 *
 * Candado de Pases VIP del asesor: la puerta al Diagnóstico 360 desde el menú.
 *
 * La herramienta ya no se abre directo. Antes hay que generar tres pases de
 * cortesía —nombre y WhatsApp de tres personas a quienes se les regala el
 * diagnóstico—, y ese intercambio es lo que la desbloquea. La bandera de
 * desbloqueo (`isVipUnlocked`) se conserva para que, en aperturas posteriores,
 * exista una salida secundaria que permita entrar sin generar pases nuevos.
 * La pantalla de invitaciones sí aparece siempre primero: no se salta sólo
 * porque el asesor ya la haya completado alguna vez.
 *
 * ## Dos pasos, y por qué el envío es manual
 * Al confirmar, los pases se guardan y la herramienta queda abierta; el segundo
 * paso muestra un botón de WhatsApp por pase. No se abren los tres de golpe a
 * propósito: un navegador bloquea en silencio cualquier ventana que no venga de
 * un enlace real, así que dos de los tres mensajes nunca saldrían y el asesor
 * creería que ya los mandó. Con un enlace por pase, cada envío es una
 * navegación de verdad — misma lección ya documentada en
 * `CallActivityCard.jsx`.
 *
 * ## La salida
 * "Prefiero entrar sin invitados" desbloquea sin pases. Un candado sin salida
 * no es un intercambio, es un muro: quien hoy no tiene a quién invitar no
 * puede quedarse sin poder trabajar con su propia herramienta.
 */
export default function VIPPassGenerator({ isOpen, onClose, onUnlocked }) {
  const { identity } = useSession();
  const username = identity?.key;

  // Arranca vacío: las invitaciones se agregan de una en una.
  const [passes, setPasses] = useState([]);
  const [saved, setSaved] = useState(null);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const sessionIdRef = useRef('');

  // Cada apertura arranca en limpio: son tres pases nuevos, no la continuación
  // de los de la vez pasada.
  useEffect(() => {
    if (!isOpen) return;
    setPasses([]);
    setSaved(null);
    setError('');
    setIsSubmitting(false);
    sessionIdRef.current = `pases-menu:${globalThis.crypto?.randomUUID?.() ?? Date.now()}`;
  }, [isOpen]);

  // Con una invitación válida basta. Las incompletas no bloquean ni se guardan.
  const ready = completePasses(passes);
  const canContinue = hasEnoughPasses(passes);
  const alreadyUnlocked = isVipUnlocked(username);

  const handleGenerate = async (e) => {
    e.preventDefault();
    if (!canContinue || isSubmitting) return;
    setIsSubmitting(true);
    setError('');
    try {
      const results = await Promise.all(ready.map((pass) => createLead(
        username,
        { name: pass.name, whatsapp: pass.phone },
        'vip_menu',
      )));
      if (results.some((result) => result.error)) {
        throw new Error('No fue posible guardar los prospectos');
      }

      const created = saveVipPasses(username, ready, { origin: 'menu' });
      created.forEach((pass) => {
        awardGamification(GAMIFICATION_ACTIONS.NUEVO_REFERIDO_AGREGADO, {
          userKey: username,
          sessionId: sessionIdRef.current,
          referralId: pass.id,
        });
      });
      setSaved(created);
      setIsSubmitting(false);
    } catch {
      setError('No pudimos guardar los pases. Revisa tu conexión e inténtalo nuevamente.');
      setIsSubmitting(false);
    }
  };

  const handleSkip = () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    unlockVipWithoutPasses(username);
    onUnlocked?.();
  };

  return (
    <FullScreenView
      isOpen={isOpen}
      onClose={onClose}
      title="Pases VIP 360"
      label="Generar pases de cortesía"
      backLabel="Cerrar"
    >
      {saved ? (
        /* ── Paso 2: pases listos para enviar ── */
        <div className="animate-rise">
          <div className="mb-6 text-center">
            <span
              className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl
                         bg-indigo-500/15 text-indigo-300 ring-1 ring-indigo-500/30"
              aria-hidden="true"
            >
              <Unlock size={24} />
            </span>
            <h2 className="text-lg font-bold text-white">Herramienta desbloqueada</h2>
            <p className="mx-auto mt-1.5 max-w-xs text-xs leading-relaxed text-neutral-400">
              Los contactos quedaron en Mi Perfil → Prospectos capturados. Desde ahí
              preparas su enlace personal, editas el mensaje y decides cuándo abrir WhatsApp.
            </p>
          </div>

          <ul className="space-y-2">
            {saved.map((pass) => (
              <li
                key={pass.id}
                className="flex items-center gap-3 rounded-xl border border-neutral-800
                           bg-neutral-900/60 p-3"
              >
                <span
                  className="grid h-8 w-8 shrink-0 place-items-center rounded-lg
                             bg-neutral-800 text-neutral-400"
                  aria-hidden="true"
                >
                  <Ticket size={15} />
                </span>

                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-neutral-100">
                    {pass.name}
                  </span>
                  <span className="block truncate text-[11px] text-neutral-500">
                    {pass.phone} · Guardado en Prospectos capturados
                  </span>
                </span>
              </li>
            ))}
          </ul>

          <button
            type="button"
            onClick={() => onUnlocked?.()}
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl
                       bg-indigo-600 px-4 py-3.5 text-sm font-semibold text-white
                       shadow-lg shadow-indigo-600/30 transition-colors hover:bg-indigo-500
                       active:scale-[0.98]"
          >
            Entrar al Diagnóstico 360
            <ArrowRight size={16} aria-hidden="true" />
          </button>
        </div>
      ) : (
        /* ── Paso 1: llenar los tres boletos ── */
        <form onSubmit={handleGenerate} className="animate-rise">
          <div className="mb-6 text-center">
            <span
              className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl
                         bg-indigo-500/15 text-indigo-300 ring-1 ring-indigo-500/30"
              aria-hidden="true"
            >
              <Ticket size={24} />
            </span>
            <h2 className="text-lg font-bold leading-snug text-white">
              Regala un Pase VIP a alguien que valoras
            </h2>
            <p className="mx-auto mt-1.5 max-w-sm text-xs leading-relaxed text-neutral-400">
              Con una sola persona basta para entrar al Diagnóstico 360. Si quieres,
              puedes invitar hasta {MAX_PASSES}. Tú les abres la puerta; ellos obtienen
              claridad para tomar mejores decisiones financieras.
            </p>
          </div>

          <VIPPassFields passes={passes} onChange={setPasses} />

          {error && (
            <p role="alert" className="mt-3 rounded-lg bg-rose-500/10 px-3 py-2 text-xs
                                       text-rose-300 ring-1 ring-rose-500/25"
            >
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={!canContinue || isSubmitting}
            className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl
                       bg-indigo-600 px-4 py-3.5 text-sm font-semibold text-white
                       shadow-lg shadow-indigo-600/30 transition-colors hover:bg-indigo-500
                       active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40
                       disabled:shadow-none"
          >
            <Send size={16} aria-hidden="true" />
            {ready.length > 1
              ? `Crear ${ready.length} pases y desbloquear`
              : 'Crear pase y desbloquear'}
          </button>

          <div className="mt-4 flex items-start gap-2 rounded-xl border border-neutral-800
                          bg-neutral-950/40 p-3"
          >
            <ShieldCheck size={14} className="mt-0.5 shrink-0 text-emerald-400" aria-hidden="true" />
            <p className="text-[10px] leading-relaxed text-neutral-500">
              Los contactos se guardan en Prospectos capturados. No se crea ningún enlace
              ni se abre WhatsApp hasta que tú lo decidas desde Mi Perfil.
            </p>
          </div>

          {/*
            La salida. Se enuncia con el mismo lenguaje de invitación que todo
            el candado —no como un "omitir" administrativo— para que se lea
            como una elección legítima y no como hacer trampa.
          */}
          <button
            type="button"
            onClick={handleSkip}
            disabled={isSubmitting}
            className="mx-auto mt-5 block text-[11px] text-neutral-500 underline-offset-2
                       transition-colors hover:text-neutral-300 hover:underline
                       disabled:cursor-wait disabled:opacity-50"
          >
            {alreadyUnlocked
              ? 'Entrar sin generar pases nuevos'
              : 'Prefiero entrar sin invitados'}
          </button>
        </form>
      )}
    </FullScreenView>
  );
}
