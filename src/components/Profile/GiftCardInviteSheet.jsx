import { useEffect, useState } from 'react';
import {
  Check, Copy, ExternalLink, IdCard, LifeBuoy, Link2, Loader2, RotateCcw, ShieldCheck,
} from 'lucide-react';
import BottomSheet from '../Layout/BottomSheet';
import WhatsAppMark from '../Activities/WhatsAppMark';
import {
  createGiftCardForLead, resetGiftCard, releaseGiftCard, issueGiftCardAccessCode,
  fetchAdvisorGiftCardsForLead,
} from '../../data/giftCardsRepo';
import { giftCardUrl } from '../../lib/giftCardRoute';
import { whatsAppLink } from '../../lib/advisorPhone';
import { leadSourceLabel } from '../../data/leadsRepo';
import { fetchWalletSummary } from '../../data/walletRepo';

function giftMessage(lead, advisorName, url, code) {
  const firstName = String(lead?.name ?? '').trim().split(/\s+/)[0] || 'Hola';
  const from = advisorName ? ` Soy ${advisorName}.` : '';
  const access = code
    ? `\n\nÁbrela y crea tu cuenta con este código de activación: ${code}\n`
      + 'Es de un solo uso, sólo para ti.'
    : '\n\nÁbrela y crea tu cuenta para activarla; sólo tú podrás editarla.';
  return `Hola ${firstName}.${from} Te regalo una tarjeta digital personal para que la hagas `
    + `tuya —tu nombre, tu foto, tus datos—.\n\n${url}${access}`;
}

/**
 * Regala una tarjeta digital a un prospecto.
 *
 * Consume 1 tarjeta del inventario (o del fondo de emergencia, con confirmación).
 * El enlace lleva a la ruta aislada `/mi-tarjeta/...`, donde el cliente entra con
 * su cuenta. El envío es manual: el asesor abre WhatsApp cuando decide.
 */
export default function GiftCardInviteSheet({ lead, advisorName, onClose }) {
  const [phase, setPhase] = useState('idle');
  const [cardId, setCardId] = useState('');
  const [message, setMessage] = useState('');
  const [source, setSource] = useState('');
  const [inventory, setInventory] = useState(null);
  // Clave de acceso por número, visible sólo aquí para que el asesor la comparta.
  const [code, setCode] = useState('');
  const [askEmergency, setAskEmergency] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState('');
  // Tarjeta de este prospecto que ya quedó activada por alguna cuenta.
  const [claimedCard, setClaimedCard] = useState(null);

  const leadId = lead?.id;
  useEffect(() => {
    setPhase('idle'); setCardId(''); setMessage(''); setSource('');
    setAskEmergency(false); setError(''); setCopied(''); setClaimedCard(null);
    if (!leadId) return;
    fetchWalletSummary().then(({ data }) => {
      if (data?.outcome === 'READY') {
        setInventory({ cards: data.invCards, hasEmergency: data.hasEmergencyCards });
      }
    });
    /*
      Se busca una tarjeta ya activada de este prospecto. Importa porque crear
      otra gastaría inventario y dejaría la buena —con el nombre y la foto que la
      persona ya subió— atrapada en la cuenta equivocada.
    */
    fetchAdvisorGiftCardsForLead(leadId).then(({ data }) => {
      if (data?.outcome !== 'READY') return;
      setClaimedCard((data.cards ?? []).find((c) => c.claimed) ?? null);
    });
  }, [leadId]);

  /**
   * Devuelve la tarjeta activada a su dueño real, sin borrar lo que llenó.
   *
   * Queda libre y con un código nuevo: la persona se registra con su correo y la
   * encuentra tal cual. No consume inventario, es la misma tarjeta.
   */
  const devolverTarjeta = async () => {
    if (!claimedCard?.cardId || phase === 'preparing') return;
    setPhase('preparing'); setError('');

    const { data } = await releaseGiftCard(claimedCard.cardId);
    if (data?.outcome !== 'RELEASED') {
      setPhase('idle');
      setError('No pudimos liberar la tarjeta. Revisa tu conexión e inténtalo de nuevo.');
      return;
    }

    const id = claimedCard.cardId;
    const { data: codeData } = await issueGiftCardAccessCode(id);
    const issued = codeData?.outcome === 'ISSUED' ? codeData.code : '';
    setClaimedCard(null);
    setCardId(id);
    setCode(issued);
    setSource('existing');
    setMessage(giftMessage(lead, advisorName, giftCardUrl(id), issued));
    setPhase('ready');
  };

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

    // Código de activación de un solo uso: la persona lo necesita para crear su
    // cuenta y quedarse con la tarjeta. Si algo falla al emitirlo, la tarjeta ya
    // existe y se puede emitir el código aparte; no se bloquea la entrega.
    const { data: codeData } = await issueGiftCardAccessCode(data.cardId);
    const issued = codeData?.outcome === 'ISSUED' ? codeData.code : '';
    setCode(issued);
    setMessage(giftMessage(lead, advisorName, giftCardUrl(data.cardId), issued));
    setPhase('ready');
  };

  /** Código nuevo: el anterior queda inservible en el momento. */
  const reissueCode = async () => {
    if (!cardId) return;
    const { data } = await issueGiftCardAccessCode(cardId);
    if (data?.outcome !== 'ISSUED') {
      setError('No pudimos emitir una clave nueva. Inténtalo otra vez.');
      return;
    }
    setCode(data.code);
    setMessage(giftMessage(lead, advisorName, giftCardUrl(cardId), data.code));
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
              {/*
                Tarjeta ya activada de este prospecto. Se muestra primero porque
                casi siempre es lo que el asesor necesita: si la activó una cuenta
                equivocada, devolverla es mejor que gastar otra tarjeta y perder
                el nombre y la foto que la persona ya subió.
              */}
              {claimedCard && (
                <div className="mt-6 rounded-2xl border border-indigo-500/30 bg-indigo-500/5 p-4">
                  <p className="flex items-center gap-2 text-xs font-semibold text-indigo-600
                                dark:text-indigo-300"
                  >
                    <RotateCcw size={15} /> Ya hay una tarjeta activada
                  </p>
                  <p className="mt-2 text-xs leading-relaxed text-zinc-600 dark:text-zinc-400">
                    {claimedCard.fullName
                      ? <>Está a nombre de <strong>{claimedCard.fullName}</strong></>
                      : 'Está activada y aún sin llenar'}
                    {claimedCard.ownerHint && <> · cuenta {claimedCard.ownerHint}</>}.
                    Si la persona te dice que es suya pero no puede entrar, devuélvesela:
                    queda libre para que se registre con su correo y conserva su nombre
                    y su foto.
                  </p>
                  <button
                    type="button"
                    onClick={devolverTarjeta}
                    disabled={phase === 'preparing'}
                    className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl
                               bg-indigo-600 px-4 py-3 text-xs font-bold text-white
                               transition-colors hover:bg-indigo-500 disabled:cursor-wait
                               disabled:opacity-60"
                  >
                    {phase === 'preparing'
                      ? <><Loader2 size={15} className="animate-spin" /> Liberando…</>
                      : <><RotateCcw size={15} /> Devolvérsela con un código nuevo</>}
                  </button>
                  <p className="mt-2 text-[10px] text-zinc-500">
                    No gasta tarjetas de tu inventario: es la misma.
                  </p>
                </div>
              )}

              <div className="mt-6 rounded-xl border border-zinc-200 bg-zinc-100/70 p-4
                              dark:border-zinc-800 dark:bg-zinc-950/50"
              >
                <div className="flex items-start gap-2">
                  <ShieldCheck size={16} className="mt-0.5 shrink-0 text-emerald-500" />
                  <p className="text-xs leading-relaxed text-zinc-600 dark:text-zinc-400">
                    Se creará una tarjeta en blanco. La persona la activa creando su cuenta
                    con el código y la personaliza con sus datos. Nada se envía hasta que
                    abras WhatsApp.
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
                      : (
                        <>
                          <Link2 size={16} />
                          {claimedCard ? 'Crear otra tarjeta nueva' : 'Crear tarjeta de regalo'}
                        </>
                      )}
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

              {/*
                Código de activación de la tarjeta. Es de un solo uso y sólo
                aparece aquí: en la página del cliente no existe, así que
                inspeccionar la web pública no lo revela.
              */}
              {code && (
                <div className="mt-4 rounded-2xl border border-indigo-500/30 bg-indigo-500/5 p-4">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-indigo-500">
                      Código de activación · un solo uso
                    </p>
                    <button
                      type="button"
                      onClick={reissueCode}
                      className="text-[10px] font-semibold text-indigo-500 underline-offset-2
                                 hover:underline dark:text-indigo-300"
                    >
                      Código nuevo
                    </button>
                  </div>
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
                    La persona lo necesita para crear su cuenta y activar la tarjeta. Se usa
                    una sola vez; puedes emitir uno nuevo cuando quieras.
                  </p>
                </div>
              )}

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

              {/*
                Soltar al dueño. Si la tarjeta la activó por error una cuenta
                equivocada, ésta es la forma de devolverla a la persona correcta:
                se libera y se puede emitir un código nuevo. No consume inventario:
                es la misma tarjeta.
              */}
              <button
                type="button"
                onClick={async () => {
                  if (!window.confirm('Esto libera la tarjeta: quien la activó dejará de '
                    + 'poder editarla y podrá reclamarla de nuevo la persona correcta. '
                    + '¿Continuar?')) return;
                  const { data } = await resetGiftCard(cardId);
                  if (data?.outcome === 'RESET') onClose?.();
                }}
                className="mt-2 w-full text-center text-[11px] font-light text-neutral-500
                           underline-offset-2 hover:text-neutral-300 hover:underline"
              >
                Restablecer tarjeta (soltar al dueño)
              </button>
            </>
          )}
        </div>
      )}
    </BottomSheet>
  );
}
