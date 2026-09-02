import { useEffect, useState } from 'react';
import {
  Check, Copy, ExternalLink, IdCard, LifeBuoy, Link2, Loader2, ShieldCheck,
} from 'lucide-react';
import BottomSheet from '../Layout/BottomSheet';
import WhatsAppMark from '../Activities/WhatsAppMark';
import { createGiftCardForLead } from '../../data/giftCardsRepo';
import { giftCardUrl } from '../../lib/giftCardRoute';
import { whatsAppLink } from '../../lib/advisorPhone';
import { leadSourceLabel } from '../../data/leadsRepo';
import { fetchWalletSummary } from '../../data/walletRepo';

function giftMessage(lead, advisorName, url) {
  const firstName = String(lead?.name ?? '').trim().split(/\s+/)[0] || 'Hola';
  const from = advisorName ? ` Soy ${advisorName}.` : '';
  return `Hola ${firstName}.${from} Te regalo una tarjeta digital personal para que la hagas `
    + `tuya —tu nombre, tu foto, tus datos—.\n\n${url}\n\nÁbrela y entra con tu Google para `
    + 'activarla; sólo tú podrás editarla.';
}

/**
 * Regala una tarjeta digital a un prospecto.
 *
 * Consume 1 tarjeta del inventario (o del fondo de emergencia, con confirmación).
 * El enlace lleva a la ruta aislada `/mi-tarjeta/...`, donde el cliente entra con
 * SU Google. El envío es manual: el asesor abre WhatsApp cuando decide.
 */
export default function GiftCardInviteSheet({ lead, advisorName, onClose }) {
  const [phase, setPhase] = useState('idle');
  const [cardId, setCardId] = useState('');
  const [message, setMessage] = useState('');
  const [source, setSource] = useState('');
  const [inventory, setInventory] = useState(null);
  const [askEmergency, setAskEmergency] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState('');

  const leadId = lead?.id;
  useEffect(() => {
    setPhase('idle'); setCardId(''); setMessage(''); setSource('');
    setAskEmergency(false); setError(''); setCopied('');
    if (!leadId) return;
    fetchWalletSummary().then(({ data }) => {
      if (data?.outcome === 'READY') {
        setInventory({ cards: data.invCards, hasEmergency: data.hasEmergencyCards });
      }
    });
  }, [leadId]);

  const prepare = async (useEmergency = false) => {
    if (!lead?.id || phase === 'preparing') return;
    setPhase('preparing'); setError(''); setAskEmergency(false);

    const { data, error: e } = await createGiftCardForLead(lead.id, useEmergency);
    if (e || data?.outcome !== 'READY') {
      setPhase('idle');
      if (data?.outcome === 'NEEDS_EMERGENCY') setAskEmergency(true);
      else if (data?.outcome === 'EMPTY') {
        setError('Ya no tienes tarjetas ni fondo de emergencia. Compra un paquete en la Tienda.');
      } else setError('No pudimos preparar la tarjeta. Revisa tu conexión e inténtalo nuevamente.');
      return;
    }

    setSource(data.source ?? '');
    setCardId(data.cardId);
    setMessage(giftMessage(lead, advisorName, giftCardUrl(data.cardId)));
    setPhase('ready');
  };

  const url = giftCardUrl(cardId);
  const copy = async (value, tag) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(tag);
      window.setTimeout(() => setCopied(''), 1600);
    } catch { setError('No pudimos copiar. Selecciona el texto manualmente.'); }
  };

  return (
    <BottomSheet
      isOpen={Boolean(lead)}
      onClose={onClose}
      label="Tarjeta digital de regalo"
      zIndexClass="z-[80]"
    >
      {lead && (
        <div>
          <span className="grid h-11 w-11 place-items-center rounded-xl bg-amber-500/15
                           text-amber-600 dark:text-amber-300"
          >
            <IdCard size={20} aria-hidden="true" />
          </span>
          <p className="mt-4 text-[10px] font-bold uppercase tracking-widest text-amber-600">
            Tarjeta de regalo
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
                    Se creará una tarjeta en blanco. La persona la activa entrando con su
                    Google y la personaliza con sus datos. Nada se envía hasta que abras WhatsApp.
                  </p>
                </div>
              </div>

              {inventory && (
                <div className="mt-3 flex items-center justify-between rounded-xl border
                                border-amber-500/25 bg-amber-500/5 px-4 py-3"
                >
                  <span className="flex items-center gap-1.5 text-xs font-semibold
                                   text-amber-700 dark:text-amber-300"
                  >
                    <IdCard size={14} /> Tus tarjetas
                  </span>
                  <span className="text-sm font-bold text-zinc-900 dark:text-white">
                    {inventory.cards} disponibles
                  </span>
                </div>
              )}

              {askEmergency ? (
                <div className="mt-4 rounded-xl border border-amber-500/40 bg-amber-500/10 p-4">
                  <p className="flex items-center gap-2 text-sm font-semibold text-amber-700
                                dark:text-amber-300"
                  >
                    <LifeBuoy size={16} /> Se te acabaron las tarjetas
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-amber-700/90 dark:text-amber-200/80">
                    Puedes usar tu fondo de emergencia. Se repone con el tiempo.
                  </p>
                  <div className="mt-4 flex gap-2">
                    <button type="button" onClick={() => setAskEmergency(false)}
                      className="flex-1 rounded-xl border border-zinc-300 py-2.5 text-xs
                                 font-semibold text-zinc-600 dark:border-zinc-700 dark:text-zinc-300"
                    >
                      Ahora no
                    </button>
                    <button type="button" onClick={() => prepare(true)}
                      className="flex-[2] rounded-xl bg-amber-500 py-2.5 text-xs font-bold
                                 text-white hover:bg-amber-400"
                    >
                      Usar mi fondo de emergencia
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  {error && <p className="mt-3 text-xs text-rose-500" role="alert">{error}</p>}
                  <button
                    type="button"
                    onClick={() => prepare(false)}
                    disabled={phase === 'preparing'}
                    className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl
                               bg-amber-500 px-4 py-3.5 text-sm font-semibold text-white
                               transition-colors hover:bg-amber-400 disabled:cursor-wait
                               disabled:opacity-60"
                  >
                    {phase === 'preparing'
                      ? <><Loader2 size={16} className="animate-spin" /> Preparando…</>
                      : <><Link2 size={16} /> Crear tarjeta de regalo</>}
                  </button>
                </>
              )}
            </>
          ) : (
            <>
              <div className="mt-5 rounded-xl border border-emerald-500/25 bg-emerald-500/10 p-3">
                <p className="flex items-center gap-2 text-xs font-semibold text-emerald-700
                              dark:text-emerald-300"
                >
                  <Check size={15} /> Tarjeta lista
                  {source === 'EMERGENCY' && (
                    <span className="ml-auto font-normal text-amber-600 dark:text-amber-400">
                      Fondo de emergencia
                    </span>
                  )}
                  {source === 'INVENTORY' && (
                    <span className="ml-auto font-normal text-emerald-600 dark:text-emerald-400">
                      −1 tarjeta
                    </span>
                  )}
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
                  onChange={(e) => setMessage(e.target.value)}
                  rows={6}
                  className="w-full resize-none rounded-xl border border-zinc-300 bg-white p-3
                             text-sm leading-relaxed text-zinc-900 outline-none
                             focus:border-amber-500 dark:border-zinc-700 dark:bg-zinc-950
                             dark:text-zinc-100"
                />
              </label>

              <div className="mt-3 flex items-center gap-2 rounded-xl border border-zinc-200
                              bg-zinc-100/70 p-2 dark:border-zinc-800 dark:bg-zinc-950/50"
              >
                <input readOnly value={url} aria-label="Enlace de la tarjeta"
                  className="min-w-0 flex-1 bg-transparent px-1 text-[11px] text-zinc-500 outline-none" />
                <button type="button" onClick={() => copy(url, 'url')}
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
                <WhatsAppMark size={16} /> Enviar por WhatsApp <ExternalLink size={14} />
              </a>
            </>
          )}
        </div>
      )}
    </BottomSheet>
  );
}
