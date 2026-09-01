import { useEffect, useState } from 'react';
import {
  Check, Copy, ExternalLink, KeyRound, Link2, Loader2, RotateCcw, ShieldCheck, Ticket,
} from 'lucide-react';
import BottomSheet from '../Layout/BottomSheet';
import WhatsAppMark from '../Activities/WhatsAppMark';
import {
  getOrCreateDiagnosticForLead,
  issueDiagnosticAccessCode,
  revokeDiagnosticDevices,
} from '../../data/diagnosticsRepo';
import { publicDiagnosticUrl } from '../../lib/diagnosticPublicRoute';
import { whatsAppLink } from '../../lib/advisorPhone';
import { leadSourceLabel } from '../../data/leadsRepo';

function invitationMessage(lead, advisorName, url, code) {
  const firstName = String(lead?.name ?? '').trim().split(/\s+/)[0] || 'Hola';
  const signature = advisorName ? ` Soy ${advisorName}.` : '';
  return `Hola ${firstName}.${signature} Preparé para ti un pase personal de Radiografía `
    + `Patrimonial.\n\n${url}\n\nTu código de acceso es ${code}. Se pide una sola vez: `
    + 'después tu dispositivo queda autorizado y entras directo.';
}

/**
 * Preparar y entregar un pase, con su código de verificación.
 *
 * ## Por qué el código lo entrega el asesor
 * Automatizar el envío exige la plataforma oficial de Meta —número dedicado,
 * verificación del negocio, plantillas aprobadas y costo por mensaje—. Mientras
 * eso no exista, el asesor lo manda por WhatsApp junto con el enlace: cuesta
 * cero y el código llega al mismo chat que ya usa con su prospecto.
 *
 * ## Por qué el código se ve aquí y no en la pantalla del cliente
 * Porque es el secreto. Se genera dentro de Postgres, que guarda sólo su hash,
 * y este es el único lugar donde vuelve en claro: una sesión autenticada que ya
 * demostró ser dueña del pase. En el navegador del cliente no existe, así que
 * inspeccionar la web pública no lo revela.
 */
export default function DiagnosticInviteSheet({ lead, advisorName, onClose }) {
  const [phase, setPhase] = useState('idle');
  const [diagnosticId, setDiagnosticId] = useState('');
  const [diagnosticStatus, setDiagnosticStatus] = useState('');
  const [code, setCode] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [copied, setCopied] = useState('');

  useEffect(() => {
    setPhase('idle');
    setDiagnosticId('');
    setDiagnosticStatus('');
    setCode('');
    setMessage('');
    setError('');
    setCopied('');
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

    const { data: codeData, error: codeError } = await issueDiagnosticAccessCode(
      data.diagnosticId,
    );
    if (codeError || codeData?.outcome !== 'ISSUED') {
      setPhase('idle');
      setError('Creamos el pase pero no pudimos emitir el código. Inténtalo nuevamente.');
      return;
    }

    const url = publicDiagnosticUrl(data.diagnosticId);
    setDiagnosticId(data.diagnosticId);
    setDiagnosticStatus(data.status ?? 'PENDIENTE');
    setCode(codeData.code);
    setMessage(invitationMessage(lead, advisorName, url, codeData.code));
    setPhase('ready');
  };

  /*
    Un código nuevo para autorizar otro dispositivo: el cliente cambió de
    teléfono, borró los datos del navegador, o abrió el enlace en el navegador
    interno de WhatsApp y ahora quiere seguir en Chrome. Emitirlo invalida el
    anterior, así que un código viejo que ande circulando deja de servir.
  */
  const reissue = async () => {
    if (!diagnosticId || phase === 'reissuing') return;
    setPhase('reissuing');
    setError('');

    const { data, error: requestError } = await issueDiagnosticAccessCode(diagnosticId);
    if (requestError || data?.outcome !== 'ISSUED') {
      setPhase('ready');
      setError('No pudimos emitir un código nuevo. Inténtalo nuevamente.');
      return;
    }

    setCode(data.code);
    setMessage(invitationMessage(lead, advisorName, publicDiagnosticUrl(diagnosticId), data.code));
    setPhase('ready');
  };

  const revoke = async () => {
    if (!diagnosticId || phase === 'revoking') return;
    setPhase('revoking');
    setError('');

    const { data, error: requestError } = await revokeDiagnosticDevices(diagnosticId);
    if (requestError || data?.outcome !== 'REVOKED') {
      setPhase('ready');
      setError('No pudimos revocar los accesos. Inténtalo nuevamente.');
      return;
    }

    setCode('');
    setMessage('');
    setPhase('revoked');
  };

  const url = publicDiagnosticUrl(diagnosticId);
  const copy = async (value, tag) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(tag);
      window.setTimeout(() => setCopied(''), 1600);
    } catch {
      setError('No pudimos copiar. Puedes seleccionar el texto manualmente.');
    }
  };

  const busy = phase === 'preparing' || phase === 'reissuing' || phase === 'revoking';

  return (
    /*
      `z-[80]` y no el `z-[60]` por omisión: esta hoja se abre dentro de
      `LeadsList`, que es un `FullScreenView` en `z-[70]`. Con la capa normal
      quedaba dibujada DEBAJO de esa pantalla, así que "Enviar diagnóstico"
      parecía no hacer nada — el panel sí se montaba, pero detrás del fondo
      opaco. Mismo criterio que ya documentan `LeadCaptureModal.jsx` y la
      hoja de tareas de `FirstLoginIntro.jsx`.
    */
    <BottomSheet
      isOpen={Boolean(lead)}
      onClose={onClose}
      label="Pase de Radiografía Patrimonial"
      zIndexClass="z-[80]"
    >
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

          {phase === 'revoked' ? (
            <>
              <div className="mt-6 rounded-xl border border-amber-500/30 bg-amber-500/5 p-4">
                <p className="text-xs leading-relaxed text-amber-700 dark:text-amber-300">
                  Accesos revocados. Ningún dispositivo puede abrir este pase y el código
                  anterior quedó anulado. Sus respuestas siguen guardadas.
                </p>
              </div>
              <button
                type="button"
                onClick={reissue}
                className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl
                           bg-indigo-600 px-4 py-3.5 text-sm font-semibold text-white
                           transition-colors hover:bg-indigo-500"
              >
                <KeyRound size={16} /> Emitir un código nuevo
              </button>
            </>
          ) : phase !== 'ready' ? (
            <>
              <div className="mt-6 rounded-xl border border-zinc-200 bg-zinc-100/70 p-4
                              dark:border-zinc-800 dark:bg-zinc-950/50"
              >
                <div className="flex items-start gap-2">
                  <ShieldCheck size={16} className="mt-0.5 shrink-0 text-emerald-500" />
                  <p className="text-xs leading-relaxed text-zinc-600 dark:text-zinc-400">
                    Se creará su enlace personal y un código de 6 dígitos. El código sólo
                    aparece aquí: tú se lo compartes, y su dispositivo queda autorizado al
                    usarlo. Nada se envía hasta que abras WhatsApp.
                  </p>
                </div>
              </div>

              {error && <p className="mt-3 text-xs text-rose-500" role="alert">{error}</p>}

              <button
                type="button"
                onClick={prepare}
                disabled={busy}
                className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl
                           bg-indigo-600 px-4 py-3.5 text-sm font-semibold text-white
                           transition-colors hover:bg-indigo-500 disabled:cursor-wait
                           disabled:opacity-60"
              >
                {phase === 'preparing'
                  ? <><Loader2 size={16} className="animate-spin" /> Preparando…</>
                  : <><Link2 size={16} /> Crear enlace y código</>}
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

              {/* El código, grande y copiable: es lo que hay que dictar o pegar. */}
              <div className="mt-4 rounded-2xl border border-indigo-500/30 bg-indigo-500/5 p-4">
                <p className="text-[10px] font-bold uppercase tracking-widest text-indigo-500">
                  Código de acceso · válido 24 h
                </p>
                <div className="mt-2 flex items-center justify-between gap-3">
                  <span className="font-mono text-3xl font-bold tracking-[0.25em]
                                   text-zinc-900 dark:text-white"
                  >
                    {code}
                  </span>
                  <button
                    type="button"
                    onClick={() => copy(code, 'code')}
                    className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border
                               border-indigo-500/30 text-indigo-500 dark:text-indigo-300"
                    aria-label="Copiar código"
                  >
                    {copied === 'code' ? <Check size={16} /> : <Copy size={16} />}
                  </button>
                </div>
                <p className="mt-2 text-[10px] leading-relaxed text-zinc-500">
                  Sirve para autorizar hasta 2 dispositivos. No aparece en la página del
                  cliente ni se puede recuperar después de cerrar esta hoja.
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
                  onClick={() => copy(url, 'url')}
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border
                             border-zinc-300 text-zinc-500 dark:border-zinc-700"
                  aria-label="Copiar enlace"
                >
                  {copied === 'url' ? <Check size={15} /> : <Copy size={15} />}
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

              <div className="mt-5 flex gap-2 border-t border-zinc-200 pt-4 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={reissue}
                  disabled={busy}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border
                             border-zinc-300 px-3 py-2.5 text-[11px] font-semibold text-zinc-600
                             transition-colors hover:bg-zinc-100 disabled:opacity-60
                             dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                >
                  <KeyRound size={14} /> Código nuevo
                </button>
                <button
                  type="button"
                  onClick={revoke}
                  disabled={busy}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border
                             border-rose-500/30 px-3 py-2.5 text-[11px] font-semibold
                             text-rose-500 transition-colors hover:bg-rose-500/10
                             disabled:opacity-60"
                >
                  <RotateCcw size={14} /> Revocar accesos
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </BottomSheet>
  );
}
