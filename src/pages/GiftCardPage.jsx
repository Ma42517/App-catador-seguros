import { useEffect, useRef, useState } from 'react';
import {
  Check, Gift, Image as ImageIcon, Loader2, LogOut, Send, Sparkles, UserPlus,
} from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';
import { giftCardRoute } from '../lib/giftCardRoute';
import {
  claimGiftCard, fetchMyGiftCard, saveGiftCard, uploadGiftCardPhoto, propagateGiftCard,
} from '../data/giftCardsRepo';
import {
  readImageFile, shrinkImageForUpload, dataUrlToFile,
} from '../data/cardPhoto';

const SPECIALTIES = ['Emprendedor', 'Profesional', 'Familia', 'Estudiante', 'Empresa'];
const INPUT = 'w-full rounded-xl border border-neutral-800 bg-neutral-900 px-4 py-3 text-sm '
  + 'font-light text-neutral-100 outline-none placeholder:text-neutral-600 focus:border-neutral-500';

function digits(value) {
  return String(value ?? '').replace(/\D/g, '');
}

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
 * Página pública de la tarjeta digital de regalo.
 *
 * Aislada del mundo del asesor: monta su propia sesión de Google con
 * `supabase.auth` directamente, SIN `SessionProvider`. Por eso entrar aquí con
 * Google no crea ninguna ficha de asesor ni pasa por el Gate — el `sub` del
 * token sólo sirve para que los RPC identifiquen al dueño de la tarjeta.
 */
export default function GiftCardPage() {
  const [{ cardId }] = useState(() => giftCardRoute());
  const [session, setSession] = useState(undefined); // undefined = cargando
  const [phase, setPhase] = useState('loading');
  const [card, setCard] = useState(null);
  const [error, setError] = useState('');

  // Sesión de Google, propia de esta página.
  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) { setSession(null); return undefined; }
    supabase.auth.getSession().then(({ data }) => setSession(data.session ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s ?? null));
    return () => sub.subscription.unsubscribe();
  }, []);

  // Con sesión, se intenta reclamar/entrar a la tarjeta.
  useEffect(() => {
    if (session === undefined) return;
    if (!cardId) { setPhase('invalid'); return; }
    if (!session) { setPhase('login'); return; }

    let active = true;
    (async () => {
      const { data, error: e } = await claimGiftCard(cardId);
      if (!active) return;
      if (e) { setPhase('offline'); return; }
      const outcome = data?.outcome;
      if (outcome === 'NOT_FOUND') { setPhase('invalid'); return; }
      if (outcome === 'REVOKED') { setPhase('revoked'); return; }
      if (outcome === 'NOT_OWNER') { setPhase('not_owner'); return; }
      if (outcome === 'OWNER') {
        const { data: mine } = await fetchMyGiftCard(cardId);
        if (!active) return;
        if (mine?.outcome === 'OK') { setCard(mine); setPhase('editor'); return; }
      }
      setPhase('offline');
    })();
    return () => { active = false; };
  }, [session, cardId]);

  const signIn = async () => {
    setError('');
    const { error: e } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.href },
    });
    if (e) setError('No pudimos abrir el acceso con Google. Inténtalo nuevamente.');
  };

  const signOut = async () => { await supabase.auth.signOut(); };

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
          Esta tarjeta ya no está activa. Contacta a quien te la compartió.
        </p>
      </Screen>
    );
  }

  if (phase === 'offline') {
    return (
      <Screen icon={Gift} title="Sin conexión">
        <p className="mt-3 text-sm font-light text-neutral-500">
          No pudimos abrir tu tarjeta. Revisa tu conexión y vuelve a cargar la página.
        </p>
      </Screen>
    );
  }

  if (phase === 'not_owner') {
    return (
      <Screen icon={Gift} title="Esta tarjeta es de otra persona">
        <p className="mt-3 text-sm font-light leading-relaxed text-neutral-500">
          Iniciaste sesión con una cuenta distinta a la que activó esta tarjeta. Si es tuya,
          entra con la misma cuenta de Google que usaste la primera vez.
        </p>
        <button
          type="button"
          onClick={signOut}
          className="mx-auto mt-6 flex items-center gap-2 text-xs font-light text-neutral-400
                     underline-offset-2 hover:text-neutral-200 hover:underline"
        >
          <LogOut size={13} /> Cambiar de cuenta
        </button>
      </Screen>
    );
  }

  if (phase === 'login') {
    return (
      <Screen icon={Sparkles} title="Tu tarjeta digital de regalo">
        <p className="mt-4 text-sm font-light leading-relaxed text-neutral-400">
          Te regalaron una tarjeta digital para que la hagas tuya: tu nombre, tu foto y tus
          datos. Entra con Google para activarla; así sólo tú podrás editarla.
        </p>
        {error && <p role="alert" className="mt-3 text-xs font-light text-rose-400">{error}</p>}
        <button
          type="button"
          onClick={signIn}
          className="mx-auto mt-8 flex w-full items-center justify-center gap-2 rounded-xl
                     bg-neutral-100 px-4 py-3.5 text-sm font-medium text-black
                     transition-colors hover:bg-white"
        >
          Entrar con Google
        </button>
      </Screen>
    );
  }

  return <GiftCardEditor cardId={cardId} initial={card} onSignOut={signOut} />;
}

/** Editor de la tarjeta, sólo visible para su dueño. */
function GiftCardEditor({ cardId, initial, onSignOut }) {
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
  const [canPropagate, setCanPropagate] = useState(Boolean(initial.canPropagate));
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
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

  return (
    <main className="min-h-[100dvh] bg-black px-5 py-8 text-neutral-100">
      <div className="mx-auto max-w-md">
        <div className="mb-6 flex items-center justify-between">
          <p className="text-[10px] uppercase tracking-[0.25em] text-neutral-600">
            Tu tarjeta digital
          </p>
          <button
            type="button"
            onClick={onSignOut}
            className="flex items-center gap-1 text-[11px] font-light text-neutral-500
                       hover:text-neutral-300"
          >
            <LogOut size={12} /> Salir
          </button>
        </div>

        {/* Foto */}
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
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          onChange={pickPhoto}
          className="hidden"
        />
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
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl
                     bg-neutral-100 px-4 py-3.5 text-sm font-medium text-black
                     transition-colors hover:bg-white disabled:cursor-wait disabled:opacity-50"
        >
          {saving
            ? <><Loader2 size={16} className="animate-spin" /> Guardando…</>
            : savedAt
              ? <><Check size={16} /> Guardado</>
              : 'Guardar mi tarjeta'}
        </button>

        {canPropagate && (
          <PropagateBlock
            cardId={cardId}
            onDone={() => setCanPropagate(false)}
          />
        )}
      </div>
    </main>
  );
}

/** Bloque para regalar una tarjeta más (propagación de un nivel). */
function PropagateBlock({ cardId, onDone }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState('');

  const submit = async (event) => {
    event.preventDefault();
    if (status === 'sending') return;
    if (name.trim().length < 2 || digits(whatsapp).length < 10) {
      setError('Escribe el nombre y un WhatsApp de 10 dígitos.');
      return;
    }
    setStatus('sending');
    setError('');
    const { data, error: e } = await propagateGiftCard(cardId, name, whatsapp);
    if (e || data?.outcome !== 'PROPAGATED') {
      setStatus('idle');
      setError('No pudimos registrar el regalo. Inténtalo nuevamente.');
      return;
    }
    setStatus('done');
    onDone?.();
  };

  if (status === 'done') {
    return (
      <div className="mt-8 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-5 text-center">
        <Check size={22} className="mx-auto text-emerald-400" />
        <p className="mt-2 text-sm font-light text-neutral-300">
          ¡Listo! Preparamos una tarjeta para esa persona. Un asesor la contactará.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-8 rounded-2xl border border-neutral-800 bg-neutral-950 p-5">
      <p className="flex items-center gap-2 text-sm font-light text-neutral-200">
        <UserPlus size={16} className="text-neutral-400" /> Regala una tarjeta a alguien
      </p>
      <p className="mt-1 text-xs font-light leading-relaxed text-neutral-500">
        Puedes obsequiar una tarjeta digital como la tuya a una persona que elijas.
      </p>

      {open ? (
        <form onSubmit={submit} className="mt-4 space-y-2">
          <input className={INPUT} value={name} onChange={(e) => setName(e.target.value)}
            placeholder="Nombre de la persona" />
          <input className={INPUT} value={whatsapp} type="tel" inputMode="tel"
            onChange={(e) => setWhatsapp(e.target.value)} placeholder="Su WhatsApp a 10 dígitos" />
          {error && <p role="alert" className="text-xs font-light text-rose-400">{error}</p>}
          <button
            type="submit"
            disabled={status === 'sending'}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-neutral-100
                       px-4 py-3 text-sm font-medium text-black hover:bg-white
                       disabled:cursor-wait disabled:opacity-50"
          >
            {status === 'sending'
              ? <><Loader2 size={16} className="animate-spin" /> Enviando…</>
              : <><Send size={15} /> Regalar tarjeta</>}
          </button>
        </form>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="mt-4 w-full rounded-xl border border-neutral-700 px-4 py-3 text-sm
                     font-light text-neutral-200 hover:border-neutral-500"
        >
          Regalar una tarjeta
        </button>
      )}
    </div>
  );
}
