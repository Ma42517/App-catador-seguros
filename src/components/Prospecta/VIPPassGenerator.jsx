import { useState, useEffect } from 'react';
import { Ticket, Unlock, ArrowRight, Send, Check, ShieldCheck } from 'lucide-react';
import FullScreenView from '../Layout/FullScreenView';
import { useSession } from '../../context/SessionContext';
import {
  REQUIRED_PASSES, saveVipPasses, unlockVipWithoutPasses, isVipUnlocked, vipPassLink,
  arePassesComplete,
} from '../../data/vipPasses';
import VIPPassFields from './VIPPassFields';
import WhatsAppMark from '../Activities/WhatsAppMark';

/**
 * src/components/Prospecta/VIPPassGenerator.jsx
 *
 * Candado de Pases VIP del asesor: la puerta al Diagnóstico 360 desde el menú.
 *
 * La herramienta ya no se abre directo. Antes hay que generar tres pases de
 * cortesía —nombre y WhatsApp de tres personas a quienes se les regala el
 * diagnóstico—, y ese intercambio es lo que la desbloquea. El desbloqueo es
 * permanente (`isVipUnlocked`): a partir de ahí la fila del menú entra directo,
 * porque un peaje que se cobra en cada visita deja de ser un intercambio y se
 * vuelve un impuesto.
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
  const [sentIds, setSentIds] = useState([]);

  // Cada apertura arranca en limpio: son tres pases nuevos, no la continuación
  // de los de la vez pasada.
  useEffect(() => {
    if (!isOpen) return;
    setPasses([]);
    setSaved(null);
    setSentIds([]);
  }, [isOpen]);

  const isComplete = arePassesComplete(passes);
  const alreadyUnlocked = isVipUnlocked(username);

  const handleGenerate = (e) => {
    e.preventDefault();
    if (!isComplete) return;
    setSaved(saveVipPasses(username, passes, { origin: 'menu' }));
  };

  const handleSkip = () => {
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
              Envía sus pases cuando quieras. Ya puedes entrar al Diagnóstico.
            </p>
          </div>

          <ul className="space-y-2">
            {saved.map((pass) => {
              const href = vipPassLink(pass, identity?.name);
              const wasSent = sentIds.includes(pass.id);

              return (
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
                      {pass.phone}
                    </span>
                  </span>

                  {/*
                    Enlace real y no `window.open`: es lo que garantiza que
                    el mensaje salga también en computadora.
                  */}
                  <a
                    href={href ?? undefined}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => setSentIds((prev) => [...prev, pass.id])}
                    className={`flex shrink-0 items-center gap-1.5 rounded-full px-3 py-2
                                text-[11px] font-semibold transition-colors ${wasSent
                      ? 'bg-neutral-800 text-neutral-400'
                      : 'bg-emerald-600 text-white hover:bg-emerald-500'}`}
                  >
                    {wasSent
                      ? <Check size={13} aria-hidden="true" />
                      : <WhatsAppMark size={13} />}
                    {wasSent ? 'Enviado' : 'Enviar'}
                  </a>
                </li>
              );
            })}
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
              Regala {REQUIRED_PASSES} Pases VIP a tus amigos
            </h2>
            <p className="mx-auto mt-1.5 max-w-sm text-xs leading-relaxed text-neutral-400">
              Antes de entrar al Diagnóstico 360, invita a tres personas que valores
              a recibir un análisis patrimonial sin costo. Tú les abres la puerta;
              ellos obtienen claridad para tomar mejores decisiones financieras.
            </p>
          </div>

          <VIPPassFields passes={passes} onChange={setPasses} />

          <button
            type="submit"
            disabled={!isComplete}
            className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl
                       bg-indigo-600 px-4 py-3.5 text-sm font-semibold text-white
                       shadow-lg shadow-indigo-600/30 transition-colors hover:bg-indigo-500
                       active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40
                       disabled:shadow-none"
          >
            <Send size={16} aria-hidden="true" />
            Crear Pases VIP y desbloquear
          </button>

          <div className="mt-4 flex items-start gap-2 rounded-xl border border-neutral-800
                          bg-neutral-950/40 p-3"
          >
            <ShieldCheck size={14} className="mt-0.5 shrink-0 text-emerald-400" aria-hidden="true" />
            <p className="text-[10px] leading-relaxed text-neutral-500">
              Los pases se guardan sólo en este dispositivo. Nada se envía hasta que tú
              toques el botón de WhatsApp de cada uno.
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
            className="mx-auto mt-5 block text-[11px] text-neutral-500 underline-offset-2
                       transition-colors hover:text-neutral-300 hover:underline"
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
