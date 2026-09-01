import { useEffect, useState } from 'react';
import {
  Check, Copy, ExternalLink, Link2, Loader2, ShieldCheck, Ticket,
} from 'lucide-react';
import BottomSheet from '../Layout/BottomSheet';
import WhatsAppMark from '../Activities/WhatsAppMark';
import { getOrCreateDiagnosticForLead } from '../../data/diagnosticsRepo';
import { publicDiagnosticUrl } from '../../lib/diagnosticPublicRoute';
import { whatsAppLink } from '../../lib/advisorPhone';
import { leadSourceLabel } from '../../data/leadsRepo';

function invitationMessage(lead, advisorName, url) {
  const firstName = String(lead?.name ?? '').trim().split(/\s+/)[0] || 'Hola';
  const signature = advisorName ? ` Soy ${advisorName}.` : '';
  return `Hola ${firstName}.${signature} Preparé para ti un pase personal de Radiografía Patrimonial.\n\n`
    + `${url}\n\nEste enlace es exclusivo para ti. Confirma tu WhatsApp para proteger tu información.`;
}

/**
 * El pase se crea sólo después de que el asesor toca "Preparar pase".
 * Abrir la hoja no crea registros y preparar el enlace tampoco abre WhatsApp.
 */
export default function DiagnosticInviteSheet({ lead, advisorName, onClose }) {
  const [phase, setPhase] = useState('idle');
  const [diagnosticId, setDiagnosticId] = useState('');
  const [diagnosticStatus, setDiagnosticStatus] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setPhase('idle');
    setDiagnosticId('');
    setDiagnosticStatus('');
    setMessage('');
    setError('');
    setCopied(false);
  }, [lead?.id]);

  const prepare = async () => {
    if (!lead?.id || phase === 'preparing') return;
    setPhase('preparing');
    setError('');

    const { data, error: requestError } = await getOrCreateDiagnosticForLead(lead.id);
    if (requestError || data?.outcome !== 'READY') {
      setPhase('idle');
      setError(data?.outcome === 'INVALID_CONTACT'
        ? 'Este prospecto necesita un WhatsApp válido de 10 dígitos.'
        : 'No pudimos preparar el pase. Revisa tu conexión e inténtalo nuevamente.');
      return;
    }

    const url = publicDiagnosticUrl(data.diagnosticId);
    setDiagnosticId(data.diagnosticId);
    setDiagnosticStatus(data.status ?? 'PENDIENTE');
    setMessage(invitationMessage(lead, advisorName, url));
    setPhase('ready');
  };

  const url = publicDiagnosticUrl(diagnosticId);
  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setError('No pudimos copiar el enlace. Puedes seleccionarlo manualmente.');
    }
  };

  return (
    <BottomSheet isOpen={Boolean(lead)} onClose={onClose} label="Pase de Radiografía Patrimonial">
      {lead && (
        <div>
          <span className="grid h-11 w-11 place-items-center rounded-xl bg-indigo-500/15
                           text-indigo-500 dark:text-indigo-300"
          >
            <Ticket size={20} aria-hidden="true" />
          </span>
          <p className="mt-4 text-[10px] font-bold uppercase tracking-widest text-indigo-500">
            Pase personal
          </p>
          <h2 className="mt-1 text-xl font-bold text-zinc-900 dark:text-white">{lead.name}</h2>
          <p className="mt-1 text-xs text-zinc-500">
            {lead.whatsapp} · {leadSourceLabel(lead)}
          </p>

          {phase !== 'ready' ? (
            <>
              <div className="mt-6 rounded-xl border border-zinc-200 bg-zinc-100/70 p-4
                              dark:border-zinc-800 dark:bg-zinc-950/50"
              >
                <div className="flex items-start gap-2">
                  <ShieldCheck size={16} className="mt-0.5 shrink-0 text-emerald-500" />
                  <p className="text-xs leading-relaxed text-zinc-600 dark:text-zinc-400">
                    El proceso tiene tres pasos: crear el enlace exclusivo, personalizar el
                    mensaje y abrir WhatsApp. Nada se envía antes del último paso.
                  </p>
                </div>
              </div>

              {error && <p className="mt-3 text-xs text-rose-500" role="alert">{error}</p>}

              <button
                type="button"
                onClick={prepare}
                disabled={phase === 'preparing'}
                className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl
                           bg-indigo-600 px-4 py-3.5 text-sm font-semibold text-white
                           transition-colors hover:bg-indigo-500 disabled:cursor-wait
                           disabled:opacity-60"
              >
                {phase === 'preparing'
                  ? <><Loader2 size={16} className="animate-spin" /> Preparando…</>
                  : <><Link2 size={16} /> Crear enlace del diagnóstico</>}
              </button>
            </>
          ) : (
            <>
              <div className="mt-5 rounded-xl border border-emerald-500/25 bg-emerald-500/10 p-3">
                <p className="flex items-center gap-2 text-xs font-semibold text-emerald-700
                              dark:text-emerald-300"
                >
                  <Check size={15} />
                  {diagnosticStatus === 'COMPLETADO' ? 'Diagnóstico completado' : 'Pase listo'}
                </p>
              </div>

              <label className="mt-5 block">
                <span className="mb-2 block text-[11px] font-semibold uppercase tracking-wider
                                 text-zinc-500"
                >
                  Mensaje editable
                </span>
                <textarea
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                  rows={7}
                  className="w-full resize-none rounded-xl border border-zinc-300 bg-white p-3
                             text-sm leading-relaxed text-zinc-900 outline-none
                             focus:border-indigo-500 dark:border-zinc-700 dark:bg-zinc-950
                             dark:text-zinc-100"
                />
              </label>

              <div className="mt-3 flex items-center gap-2 rounded-xl border border-zinc-200
                              bg-zinc-100/70 p-2 dark:border-zinc-800 dark:bg-zinc-950/50"
              >
                <input
                  readOnly
                  value={url}
                  aria-label="Enlace personal del diagnóstico"
                  className="min-w-0 flex-1 bg-transparent px-1 text-[11px] text-zinc-500
                             outline-none"
                />
                <button
                  type="button"
                  onClick={copyLink}
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border
                             border-zinc-300 text-zinc-500 dark:border-zinc-700"
                  aria-label="Copiar enlace"
                >
                  {copied ? <Check size={15} /> : <Copy size={15} />}
                </button>
              </div>

              {error && <p className="mt-3 text-xs text-rose-500" role="alert">{error}</p>}

              <a
                href={whatsAppLink(lead.whatsapp, message)}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl
                           bg-emerald-600 px-4 py-3.5 text-sm font-semibold text-white
                           transition-colors hover:bg-emerald-500"
              >
                <WhatsAppMark size={16} />
                Enviar por WhatsApp
                <ExternalLink size={14} />
              </a>
              <p className="mt-2 text-center text-[10px] leading-relaxed text-zinc-500">
                Puedes cambiar el texto antes de abrir WhatsApp. La app no marca el pase
                como enviado porque no puede confirmar la entrega.
              </p>
            </>
          )}
        </div>
      )}
    </BottomSheet>
  );
}
