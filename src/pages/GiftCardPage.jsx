import { useEffect, useRef, useState } from 'react';
import {
  ArrowLeft, Check, Copy, Eye, Gift, IdCard, Image as ImageIcon, Loader2, LogOut,
  Pencil, Share2, Sparkles,
} from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';
import { giftCardRoute, giftCardUrl } from '../lib/giftCardRoute';
import {
  claimGiftCard, fetchMyGiftCard, fetchMyGiftCards, fetchPublicGiftCard,
  saveGiftCard, uploadGiftCardPhoto,
} from '../data/giftCardsRepo';
import { readImageFile, shrinkImageForUpload, dataUrlToFile } from '../data/cardPhoto';
import { whatsAppLink } from '../lib/advisorPhone';

const INPUT = 'w-full rounded-xl border border-neutral-800 bg-neutral-900 px-4 py-3 text-sm '
  + 'font-light text-neutral-100 outline-none placeholder:text-neutral-600 focus:border-neutral-500';
const SPECIALTIES = ['Emprendedor', 'Profesional', 'Familia', 'Estudiante', 'Empresa'];

function Screen({ icon: Icon, title, children }) {
  return (
    <main className="grid min-h-[100dvh] place-items-center bg-black px-6 text-neutral-100">
      <section className="w-full max-w-sm text-center">
        {Icon && (
          <span className="mx-auto mb-5 grid h-14 w-14 place-items-center rounded-2xl border
                           border-neutral-800 bg-neutral-950 text-neutral-400"
          >
            <Icon size={24} strokeWidth={1.5} />
          </span>
        )}
        <h1 className="text-xl font-light tracking-tight text-white">{title}</h1>
        {children}
      </section>
    </main>
  );
}

/**
 * Tarjeta de presentación, en solo lectura.
 *
 * Es lo que ve cualquiera con el enlace: el dueño en su vista previa, y un
 * tercero a quien el dueño le compartió su tarjeta. Presenta contacto y
 * WhatsApp; no ofrece "obtén la tuya" —referir es exclusivo del asesor—.
 */
function CardPresentation({ card }) {
  const whatsapp = String(card.whatsapp ?? '').replace(/\D/g, '');
  const phone = String(card.phone ?? '').replace(/\D/g, '');
  const specialties = Array.isArray(card.specialties) ? card.specialties : [];

  return (
    <div className="mx-auto w-full max-w-sm overflow-hidden rounded-3xl border border-neutral-800
                    bg-gradient-to-b from-neutral-900 to-black"
    >
      <div className="relative h-72 w-full bg-neutral-950">
        {card.avatarUrl
          ? <img src={card.avatarUrl} alt={card.fullName} className="h-full w-full object-cover" />
          : (
            <div className="grid h-full w-full place-items-center text-neutral-700">
              <ImageIcon size={40} />
            </div>
          )}
        <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black to-transparent" />
      </div>

      <div className="p-6">
        <h1 className="text-2xl font-light tracking-tight text-white">
          {card.fullName || 'Sin nombre'}
        </h1>
        {card.title && <p className="mt-1 text-sm font-light text-neutral-400">{card.title}</p>}
        {card.company && <p className="text-xs font-light text-neutral-600">{card.company}</p>}
        {card.bio && (
          <p className="mt-4 text-sm font-light leading-relaxed text-neutral-400">{card.bio}</p>
        )}

        {specialties.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {specialties.map((s) => (
              <span key={s} className="rounded-full border border-neutral-800 px-3 py-1
                                       text-[11px] font-light text-neutral-400"
              >
                {s}
              </span>
            ))}
          </div>
        )}

        {(whatsapp || phone) && (
          <div className="mt-6 flex gap-2">
            {whatsapp && (
              <a
                href={`https://wa.me/${whatsapp}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-600
                           px-4 py-3 text-sm font-medium text-white hover:bg-emerald-500"
              >
                WhatsApp
              </a>
            )}
            {phone && (
              <a
                href={`tel:${phone}`}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl border
                           border-neutral-700 px-4 py-3 text-sm font-light text-neutral-200
                           hover:border-neutral-500"
              >
                Llamar
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Página de la tarjeta digital de regalo.
 *
 * Ruta aislada del mundo asesor: monta su propia sesión de Google con
 * `supabase.auth`, sin `SessionProvider`. Cubre dos direcciones:
 *   - `/mi-tarjeta/<uuid>`: una tarjeta concreta.
 *   - `/mi-tarjeta`: el panel del dueño con todas sus tarjetas.
 */
export default function GiftCardPage() {
  const [{ cardId }] = useState(() => giftCardRoute());
  const [session, setSession] = useState(undefined);

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) { setSession(null); return undefined; }
    supabase.auth.getSession().then(({ data }) => setSession(data.session ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s ?? null));
    return () => sub.subscription.unsubscribe();
  }, []);

  if (session === undefined) {
    return (
      <main className="grid min-h-[100dvh] place-items-center bg-black">
        <Loader2 size={22} className="animate-spin text-neutral-700" aria-label="Abriendo" />
      </main>
    );
  }

  if (cardId) return <SingleCard cardId={cardId} session={session} />;
  return <OwnerPanel session={session} />;
}

const signInGoogle = async (setError) => {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: window.location.href },
  });
  if (error) setError?.('No pudimos abrir el acceso con Google. Inténtalo nuevamente.');
};

/** Una tarjeta por su id: dueño → editor; tercero → presentación; sin sesión → según estado. */
function SingleCard({ cardId, session }) {
  const [phase, setPhase] = useState('loading');
  const [card, setCard] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    (async () => {
      // Si hay sesión, se intenta reclamar/entrar como dueño.
      if (session) {
        const { data, error: e } = await claimGiftCard(cardId);
        if (!active) return;
        if (e) { setPhase('offline'); return; }
        const outcome = data?.outcome;
        if (outcome === 'NOT_FOUND') { setPhase('invalid'); return; }
        if (outcome === 'REVOKED') { setPhase('revoked'); return; }
        if (outcome === 'OWNER') {
          const { data: mine } = await fetchMyGiftCard(cardId);
          if (!active) return;
          if (mine?.outcome === 'OK') { setCard(mine); setPhase('editor'); return; }
          setPhase('offline');
          return;
        }
        // NOT_OWNER: no es su tarjeta → se le muestra como presentación pública.
      }

      // Sin sesión, o sesión que no es dueña: vista pública de solo lectura.
      const { data: pub, error: pe } = await fetchPublicGiftCard(cardId);
      if (!active) return;
      if (pe) { setPhase('offline'); return; }
      if (pub?.outcome === 'ACTIVA') { setCard(pub); setPhase('public'); return; }
      if (pub?.outcome === 'PENDIENTE') { setPhase('pending'); return; }
      if (pub?.outcome === 'REVOCADA') { setPhase('revoked'); return; }
      setPhase('invalid');
    })();
    return () => { active = false; };
  }, [cardId, session]);

  if (phase === 'loading') {
    return (
      <main className="grid min-h-[100dvh] place-items-center bg-black">
        <Loader2 size={22} className="animate-spin text-neutral-700" aria-label="Abriendo" />
      </main>
    );
  }
  if (phase === 'invalid') {
    return (
      <Screen icon={Gift} title="Esta tarjeta no está disponible">
        <p className="mt-3 text-sm font-light text-neutral-500">
          El enlace puede estar incompleto o haber dejado de estar disponible.
        </p>
      </Screen>
    );
  }
  if (phase === 'revoked') {
    return (
      <Screen icon={Gift} title="Tarjeta desactivada">
        <p className="mt-3 text-sm font-light text-neutral-500">
          Esta tarjeta ya no está activa.
        </p>
      </Screen>
    );
  }
  if (phase === 'offline') {
    return (
      <Screen icon={Gift} title="Sin conexión">
        <p className="mt-3 text-sm font-light text-neutral-500">
          No pudimos abrir la tarjeta. Revisa tu conexión y vuelve a cargar.
        </p>
      </Screen>
    );
  }

  // Tarjeta aún sin reclamar: sólo el destinatario original la activa entrando.
  if (phase === 'pending') {
    return (
      <Screen icon={Sparkles} title="Tu tarjeta digital de regalo">
        <p className="mt-4 text-sm font-light leading-relaxed text-neutral-400">
          Te regalaron una tarjeta digital para que la hagas tuya: tu nombre, tu foto y tus
          datos. Entra con Google para activarla; así sólo tú podrás editarla.
        </p>
        {error && <p role="alert" className="mt-3 text-xs font-light text-rose-400">{error}</p>}
        <button
          type="button"
          onClick={() => signInGoogle(setError)}
          className="mx-auto mt-8 flex w-full items-center justify-center gap-2 rounded-xl
                     bg-neutral-100 px-4 py-3.5 text-sm font-medium text-black hover:bg-white"
        >
          Entrar con Google
        </button>
      </Screen>
    );
  }

  // Presentación pública para quien no es el dueño.
  if (phase === 'public') {
    return (
      <main className="grid min-h-[100dvh] place-items-center bg-black px-5 py-10">
        <CardPresentation card={card} />
      </main>
    );
  }

  return <CardEditor cardId={cardId} initial={card} />;
}

/** Panel del dueño: todas sus tarjetas, sin necesidad de guardar enlaces. */
function OwnerPanel({ session }) {
  const [cards, setCards] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!session) return;
    fetchMyGiftCards().then(({ data }) => {
      setCards(data?.outcome === 'OK' ? (data.cards ?? []) : []);
    });
  }, [session]);

  if (!session) {
    return (
      <Screen icon={IdCard} title="Tus tarjetas digitales">
        <p className="mt-4 text-sm font-light leading-relaxed text-neutral-400">
          Entra con Google para ver y editar las tarjetas que te han regalado.
        </p>
        {error && <p role="alert" className="mt-3 text-xs font-light text-rose-400">{error}</p>}
        <button
          type="button"
          onClick={() => signInGoogle(setError)}
          className="mx-auto mt-8 flex w-full items-center justify-center gap-2 rounded-xl
                     bg-neutral-100 px-4 py-3.5 text-sm font-medium text-black hover:bg-white"
        >
          Entrar con Google
        </button>
      </Screen>
    );
  }

  if (cards === null) {
    return (
      <main className="grid min-h-[100dvh] place-items-center bg-black">
        <Loader2 size={22} className="animate-spin text-neutral-700" aria-label="Cargando" />
      </main>
    );
  }

  if (cards.length === 0) {
    return (
      <Screen icon={IdCard} title="Todavía no tienes tarjetas">
        <p className="mt-4 text-sm font-light leading-relaxed text-neutral-400">
          Cuando alguien te regale una tarjeta digital y la actives con esta cuenta,
          aparecerá aquí.
        </p>
        <button
          type="button"
          onClick={() => supabase.auth.signOut()}
          className="mx-auto mt-6 flex items-center gap-2 text-xs font-light text-neutral-500
                     hover:text-neutral-300"
        >
          <LogOut size={13} /> Salir
        </button>
      </Screen>
    );
  }

  return (
    <main className="min-h-[100dvh] bg-black px-5 py-8 text-neutral-100">
      <div className="mx-auto max-w-md">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-lg font-light text-white">Tus tarjetas</h1>
          <button
            type="button"
            onClick={() => supabase.auth.signOut()}
            className="flex items-center gap-1 text-[11px] font-light text-neutral-500
                       hover:text-neutral-300"
          >
            <LogOut size={12} /> Salir
          </button>
        </div>
        <ul className="space-y-3">
          {cards.map((c) => (
            <li key={c.id}>
              <a
                href={giftCardUrl(c.id)}
                className="flex items-center gap-3 rounded-2xl border border-neutral-800
                           bg-neutral-950 p-3 transition-colors hover:border-neutral-600"
              >
                <span className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden
                                 rounded-xl bg-neutral-900"
                >
                  {c.avatarUrl
                    ? <img src={c.avatarUrl} alt={c.fullName} className="h-full w-full object-cover" />
                    : <IdCard size={20} className="text-neutral-600" />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-light text-white">
                    {c.fullName || 'Sin nombre'}
                  </span>
                  <span className="block truncate text-[11px] text-neutral-500">
                    {c.title || 'Toca para editar'}
                  </span>
                </span>
                <Pencil size={15} className="shrink-0 text-neutral-500" />
              </a>
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}

/** Editor del dueño, con vista previa y compartir. */
function CardEditor({ cardId, initial }) {
  const [mode, setMode] = useState('edit'); // 'edit' | 'preview'
  const [form, setForm] = useState({
    fullName: initial.fullName ?? '',
    title: initial.title ?? '',
    company: initial.company ?? '',
    specialties: Array.isArray(initial.specialties) ? initial.specialties : [],
    bio: initial.bio ?? '',
    phone: initial.phone ?? '',
    whatsapp: initial.whatsapp ?? '',
  });
  const [avatarUrl, setAvatarUrl] = useState(initial.avatarUrl ?? '');
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const fileRef = useRef(null);

  const set = (key, value) => setForm((f) => ({ ...f, [key]: value }));
  const toggleSpecialty = (s) => setForm((f) => ({
    ...f,
    specialties: f.specialties.includes(s)
      ? f.specialties.filter((x) => x !== s)
      : [...f.specialties, s].slice(0, 3),
  }));

  const save = async () => {
    setSaving(true);
    setError('');
    const { data, error: e } = await saveGiftCard(cardId, form);
    setSaving(false);
    if (e || data?.outcome !== 'SAVED') {
      setError('No pudimos guardar. Revisa tu conexión e inténtalo nuevamente.');
      return;
    }
    setSavedAt(Date.now());
  };

  const pickPhoto = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setUploading(true);
    setError('');
    try {
      const dataUrl = await readImageFile(file);
      const shrunk = await shrinkImageForUpload(dataUrl);
      const finalFile = await dataUrlToFile(shrunk, 'tarjeta.jpg');
      const { data, error: e } = await uploadGiftCardPhoto(cardId, finalFile);
      if (e || !data?.avatarUrl) throw new Error('upload');
      setAvatarUrl(data.avatarUrl);
    } catch {
      setError('No pudimos subir la foto. Prueba con otra imagen.');
    } finally {
      setUploading(false);
    }
  };

  const shareUrl = giftCardUrl(cardId);
  const shareMessage = `Hola, te comparto mi tarjeta digital:\n${shareUrl}`;
  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setError('No pudimos copiar. Selecciona el enlace manualmente.');
    }
  };

  const previewCard = { ...form, avatarUrl };

  if (mode === 'preview') {
    return (
      <main className="min-h-[100dvh] bg-black px-5 py-8">
        <div className="mx-auto max-w-md">
          <button
            type="button"
            onClick={() => setMode('edit')}
            className="mb-6 flex items-center gap-1 text-xs font-light text-neutral-400
                       hover:text-neutral-200"
          >
            <ArrowLeft size={14} /> Volver a editar
          </button>
          <CardPresentation card={previewCard} />

          <div className="mx-auto mt-6 max-w-sm space-y-2">
            <a
              href={whatsAppLink(form.whatsapp || form.phone, shareMessage)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600
                         px-4 py-3.5 text-sm font-medium text-white hover:bg-emerald-500"
            >
              <Share2 size={16} /> Compartir por WhatsApp
            </a>
            <button
              type="button"
              onClick={copyLink}
              className="flex w-full items-center justify-center gap-2 rounded-xl border
                         border-neutral-700 px-4 py-3 text-sm font-light text-neutral-200
                         hover:border-neutral-500"
            >
              {copied ? <><Check size={15} /> Enlace copiado</> : <><Copy size={15} /> Copiar enlace</>}
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-[100dvh] bg-black px-5 py-8 text-neutral-100">
      <div className="mx-auto max-w-md">
        <div className="mb-6 flex items-center justify-between">
          <p className="text-[10px] uppercase tracking-[0.25em] text-neutral-600">
            Tu tarjeta digital
          </p>
          <button
            type="button"
            onClick={() => supabase.auth.signOut()}
            className="flex items-center gap-1 text-[11px] font-light text-neutral-500
                       hover:text-neutral-300"
          >
            <LogOut size={12} /> Salir
          </button>
        </div>

        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="relative mx-auto mb-6 grid h-40 w-40 place-items-center overflow-hidden
                     rounded-3xl border border-neutral-800 bg-neutral-950"
        >
          {avatarUrl
            ? <img src={avatarUrl} alt="Tu foto" className="h-full w-full object-cover" />
            : <ImageIcon size={30} className="text-neutral-600" />}
          {uploading && (
            <span className="absolute inset-0 grid place-items-center bg-black/60">
              <Loader2 size={22} className="animate-spin text-white" />
            </span>
          )}
        </button>
        <input ref={fileRef} type="file" accept="image/*" onChange={pickPhoto} className="hidden" />
        <p className="mb-6 text-center text-[11px] font-light text-neutral-600">
          Toca la foto para cambiarla
        </p>

        <div className="space-y-3">
          <input className={INPUT} value={form.fullName}
            onChange={(e) => set('fullName', e.target.value)} placeholder="Tu nombre completo" />
          <input className={INPUT} value={form.title}
            onChange={(e) => set('title', e.target.value)} placeholder="Tu título o profesión" />
          <input className={INPUT} value={form.company}
            onChange={(e) => set('company', e.target.value)} placeholder="Empresa (opcional)" />
          <textarea className={`${INPUT} resize-none`} rows={3} value={form.bio}
            onChange={(e) => set('bio', e.target.value)} placeholder="Una línea sobre ti" />
          <input className={INPUT} value={form.whatsapp} type="tel" inputMode="tel"
            onChange={(e) => set('whatsapp', e.target.value)} placeholder="Tu WhatsApp" />
          <input className={INPUT} value={form.phone} type="tel" inputMode="tel"
            onChange={(e) => set('phone', e.target.value)} placeholder="Teléfono (opcional)" />

          <div className="flex flex-wrap gap-2 pt-1">
            {SPECIALTIES.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => toggleSpecialty(s)}
                className={`rounded-full border px-3 py-1.5 text-xs transition-colors ${
                  form.specialties.includes(s)
                    ? 'border-neutral-100 bg-neutral-100 text-black'
                    : 'border-neutral-800 text-neutral-400 hover:border-neutral-600'}`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {error && <p role="alert" className="mt-4 text-xs font-light text-rose-400">{error}</p>}

        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-neutral-100
                     px-4 py-3.5 text-sm font-medium text-black hover:bg-white
                     disabled:cursor-wait disabled:opacity-50"
        >
          {saving
            ? <><Loader2 size={16} className="animate-spin" /> Guardando…</>
            : savedAt ? <><Check size={16} /> Guardado</> : 'Guardar mi tarjeta'}
        </button>

        <button
          type="button"
          onClick={() => setMode('preview')}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border
                     border-neutral-700 px-4 py-3 text-sm font-light text-neutral-200
                     hover:border-neutral-500"
        >
          <Eye size={15} /> Ver y compartir mi tarjeta
        </button>
      </div>
    </main>
  );
}
