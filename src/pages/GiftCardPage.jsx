import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ArrowLeft, ArrowRight, Check, Copy, Eye, Gift, IdCard, KeyRound, Loader2, LogOut,
  Pencil, Share2, Sparkles, UserRound,
} from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';
import { giftCardRoute, giftCardUrl } from '../lib/giftCardRoute';
import {
  claimGiftCard, fetchMyGiftCard, fetchMyGiftCards, fetchPublicGiftCard,
  saveGiftCard, uploadGiftCardPhoto,
} from '../data/giftCardsRepo';
import { readImageFile, shrinkImageForUpload, dataUrlToFile } from '../data/cardPhoto';
import { whatsAppLink } from '../lib/advisorPhone';
import GiftCardVisual from '../components/GiftCard/GiftCardVisual';
import {
  claimGiftCardWithCode, openGiftCardWithDevice,
} from '../data/giftCardsRepo';
import { readCardSecret, saveCardSecret } from '../lib/giftCardDevice';

const INPUT = 'w-full rounded-xl border border-neutral-800 bg-neutral-900 px-4 py-3 text-sm '
  + 'font-light text-neutral-100 outline-none placeholder:text-neutral-600 focus:border-neutral-500';
const SPECIALTIES = ['Emprendedor', 'Profesional', 'Familia', 'Estudiante', 'Empresa'];
/** Marca de que ya se vio la bienvenida de una tarjeta, para no repetirla. */
const SEEN_KEY = 'df360:giftcard:welcome:';

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

const signInGoogle = async (setError) => {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: window.location.href },
  });
  if (error) setError?.('No pudimos abrir el acceso con Google. Inténtalo nuevamente.');
};

/**
 * Página de la tarjeta digital de regalo.
 *
 * Ruta aislada del mundo asesor: monta su propia sesión de Google con
 * `supabase.auth`, sin `SessionProvider`. Cubre `/mi-tarjeta/<uuid>` (una
 * tarjeta) y `/mi-tarjeta` (el panel con todas las del dueño).
 */
/**
 * Completa el regreso de Google si la dirección trae su respuesta.
 *
 * Hace falta porque el flujo por omisión es PKCE: el intercambio del `code`
 * necesita un `code_verifier` que quedó guardado en el navegador DONDE se inició
 * el acceso. Al abrir el enlace desde WhatsApp eso se rompe con facilidad —su
 * navegador interno arranca el acceso y Google lo termina en Chrome o Safari, que
 * es otro almacenamiento y no tiene el verificador—. Sin este manejo explícito el
 * fallo era mudo: la persona elegía su cuenta, volvía, y veía otra vez la misma
 * pantalla de "entrar", sin ninguna explicación.
 *
 * @returns {'none'|'ok'|'failed'} Qué se encontró y cómo terminó.
 */
async function completeOAuthReturn() {
  if (typeof window === 'undefined' || !supabase) return 'none';

  const query = new URLSearchParams(window.location.search);
  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''));
  const code = query.get('code');
  const failed = query.get('error') ?? hash.get('error');

  if (failed) return 'failed';
  if (!code) return 'none';

  const { error } = await supabase.auth.exchangeCodeForSession(code);

  // Se limpia la dirección en los dos casos: dejar el `code` usado en la barra
  // haría que un refresco intentara canjearlo otra vez y fallara siempre.
  window.history.replaceState(null, '', window.location.pathname);

  return error ? 'failed' : 'ok';
}

export default function GiftCardPage() {
  const [{ cardId }] = useState(() => giftCardRoute());
  const [session, setSession] = useState(undefined);
  const [authFailed, setAuthFailed] = useState(false);

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) { setSession(null); return undefined; }

    let active = true;
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      if (!active) return;
      if (s) setAuthFailed(false);
      setSession(s ?? null);
    });

    (async () => {
      // Primero se atiende el regreso de Google; si no, se lee la sesión guardada.
      const outcome = await completeOAuthReturn();
      if (!active) return;
      if (outcome === 'failed') setAuthFailed(true);

      const { data } = await supabase.auth.getSession();
      if (!active) return;
      setSession(data.session ?? null);
    })();

    return () => { active = false; sub.subscription.unsubscribe(); };
  }, []);

  if (session === undefined) {
    return (
      <main className="grid min-h-[100dvh] place-items-center bg-black">
        <Loader2 size={22} className="animate-spin text-neutral-700" aria-label="Abriendo" />
      </main>
    );
  }

  if (cardId) {
    return <SingleCard cardId={cardId} session={session} authFailed={authFailed} />;
  }
  return <OwnerPanel session={session} authFailed={authFailed} />;
}

/**
 * Aviso de acceso interrumpido, con la salida concreta.
 *
 * Reintentar desde aquí sí funciona: el segundo intento nace en ESTE navegador,
 * así que el verificador se guarda donde después va a leerse. Y si el enlace se
 * abrió dentro de WhatsApp, se dice cómo salir de ahí, porque es la causa más
 * frecuente y no se puede resolver desde el código.
 */
function AuthRetryNotice() {
  return (
    <div className="mt-5 rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 text-left">
      <p className="text-xs font-medium text-amber-300">No se completó el acceso</p>
      <p className="mt-1 text-[11px] font-light leading-relaxed text-amber-200/80">
        Vuelve a tocar el botón para intentarlo de nuevo. Si abriste este enlace dentro de
        WhatsApp, ábrelo en Chrome o Safari: toca el menú de tres puntos y elige
        «Abrir en el navegador».
      </p>
    </div>
  );
}

/**
 * Una tarjeta por su id.
 *
 * El registro con Google es el PASO CERO: sin sesión no se muestra nada de la
 * tarjeta. Después, si es el dueño, va primero la BIENVENIDA que explica cómo
 * usar la tarjeta, y sólo entonces el editor. Así lo primero que ve no es un
 * recortador de foto sin contexto.
 */
function SingleCard({ cardId, session, authFailed = false }) {
  const [phase, setPhase] = useState('loading');
  const [card, setCard] = useState(null);
  const [error, setError] = useState('');
  // Secreto del dispositivo cuando se entró por número + clave. Vacío con Google.
  const [deviceSecret, setDeviceSecret] = useState('');

  /**
   * Abre la tarjeta ya siendo su dueño: bienvenida la primera vez, luego editor.
   *
   * Va en `useCallback` porque el efecto de abajo la usa: sin estabilizarla, cada
   * render crearía otra función y el efecto volvería a correr en bucle.
   */
  const openAsOwner = useCallback(async (secret = '') => {
    const { data: mine } = await fetchMyGiftCard(cardId, secret);
    if (mine?.outcome !== 'OK') { setPhase('offline'); return; }
    setCard(mine);
    let seen = false;
    try { seen = Boolean(window.localStorage.getItem(SEEN_KEY + cardId)); } catch { /* sin storage */ }
    setPhase(seen ? 'editor' : 'welcome');
  }, [cardId]);

  useEffect(() => {
    let active = true;

    /*
      Antes que nada, el dispositivo. Quien ya entró con su número y clave tiene
      un secreto guardado en este navegador: entra directo, sin Google y sin
      volver a pedir la clave. Es la vía de quien no usa cuenta de Google.
    */
    const stored = readCardSecret(cardId);
    if (stored) {
      (async () => {
        const { data } = await openGiftCardWithDevice(cardId, stored);
        if (!active) return;
        if (data?.outcome === 'AUTHORIZED') {
          setDeviceSecret(stored);
          await openAsOwner(stored);
          return;
        }
        if (data?.outcome === 'NOT_FOUND') { setPhase('invalid'); return; }
        // Secreto ya inválido (el asesor restableció): se pide acceso de nuevo.
        setPhase(session ? 'checking_google' : 'login');
      })();
      return () => { active = false; };
    }

    if (!session) { setPhase('login'); return undefined; }

    (async () => {
      /*
        Se consulta el estado ANTES de reclamar.

        `claim_gift_card` amarra la tarjeta a la cuenta que llama, así que
        llamarlo de entrada la asignaba en silencio: quien ya tenía sesión de
        Google abierta —de otra prueba, o de otra tarjeta— se encontraba dueño de
        una tarjeta sin haber decidido nada, y sin ver con qué cuenta quedó
        vinculada. Aquí sólo se mira si está libre; el vínculo lo confirma la
        persona en la pantalla siguiente.
      */
      const { data: pub, error: pe } = await fetchPublicGiftCard(cardId);
      if (!active) return;
      if (pe) { setPhase('offline'); return; }
      if (pub?.outcome === 'NOT_FOUND') { setPhase('invalid'); return; }
      if (pub?.outcome === 'REVOCADA') { setPhase('revoked'); return; }

      // Libre: se pide confirmación explícita de la cuenta antes de vincular.
      if (pub?.outcome === 'PENDIENTE') { setPhase('confirm'); return; }

      // Ya activada: el servidor dice si esta cuenta es su dueña.
      const { data, error: e } = await claimGiftCard(cardId);
      if (!active) return;
      if (e) { setPhase('offline'); return; }
      if (data?.outcome === 'OWNER') { await openAsOwner(); return; }
      if (data?.outcome === 'NOT_OWNER') {
        setCard(pub?.outcome === 'ACTIVA' ? pub : null);
        setPhase('not_owner');
        return;
      }
      setPhase('offline');
    })();
    return () => { active = false; };
  }, [cardId, session, openAsOwner]);

  /** Vincula la tarjeta a esta cuenta, ya con el consentimiento dado. */
  const activate = async () => {
    setPhase('activating');
    setError('');
    const { data, error: e } = await claimGiftCard(cardId);
    if (e || data?.outcome !== 'OWNER') {
      setPhase('confirm');
      setError('No pudimos activar la tarjeta. Inténtalo nuevamente.');
      return;
    }
    await openAsOwner();
  };

  const dismissWelcome = () => {
    try { window.localStorage.setItem(SEEN_KEY + cardId, '1'); } catch { /* sin storage */ }
    setPhase('editor');
  };

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
        <p className="mt-3 text-sm font-light text-neutral-500">Esta tarjeta ya no está activa.</p>
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

  // Paso cero: identificarse. Dos vías, y ninguna muestra la tarjeta antes.
  if (phase === 'login') {
    return (
      <Screen icon={Sparkles} title="Tu tarjeta digital de regalo">
        <p className="mt-4 text-sm font-light leading-relaxed text-neutral-400">
          Te regalaron una tarjeta digital para que la hagas tuya: tu nombre, tu foto y tus
          datos. Identifícate para activarla; así sólo tú podrás editarla.
        </p>
        {error && <p role="alert" className="mt-3 text-xs font-light text-rose-400">{error}</p>}
        {authFailed && <AuthRetryNotice />}

        <button
          type="button"
          onClick={() => signInGoogle(setError)}
          className="mx-auto mt-8 flex w-full items-center justify-center gap-2 rounded-xl
                     bg-neutral-100 px-4 py-3.5 text-sm font-medium text-black hover:bg-white"
        >
          {authFailed ? 'Intentar de nuevo con Google' : 'Entrar con Google'}
        </button>

        <div className="my-5 flex items-center gap-3">
          <span className="h-px flex-1 bg-neutral-900" />
          <span className="text-[10px] uppercase tracking-widest text-neutral-700">o</span>
          <span className="h-px flex-1 bg-neutral-900" />
        </div>

        <button
          type="button"
          onClick={() => { setError(''); setPhase('phone'); }}
          className="flex w-full items-center justify-center gap-2 rounded-xl border
                     border-neutral-700 px-4 py-3.5 text-sm font-light text-neutral-200
                     hover:border-neutral-500"
        >
          <KeyRound size={15} /> Entrar con mi número y clave
        </button>
      </Screen>
    );
  }

  if (phase === 'phone') {
    return (
      <PhoneAccess
        cardId={cardId}
        onBack={() => setPhase('login')}
        onAuthorized={async (secret) => {
          saveCardSecret(cardId, secret);
          setDeviceSecret(secret);
          await openAsOwner(secret);
        }}
      />
    );
  }

  /*
    Consentimiento explícito del vínculo.

    Se muestra la cuenta con la que va a quedar amarrada, porque es una decisión
    permanente: sólo esa cuenta podrá editarla después. Antes esto ocurría solo,
    sin preguntar, y quien ya tenía una sesión de Google abierta se volvía dueño
    sin enterarse ni saber con qué correo.
  */
  if (phase === 'confirm' || phase === 'activating') {
    const email = session?.user?.email ?? '';
    return (
      <Screen icon={UserRound} title="Activa tu tarjeta">
        <p className="mt-4 text-sm font-light leading-relaxed text-neutral-400">
          Tu tarjeta quedará vinculada a esta cuenta. Sólo desde ella podrás editarla
          más adelante.
        </p>

        <div className="mt-5 rounded-xl border border-neutral-800 bg-neutral-950 p-4 text-left">
          <p className="text-[10px] uppercase tracking-widest text-neutral-600">Cuenta</p>
          <p className="mt-1 truncate text-sm font-light text-neutral-100">
            {email || 'Tu cuenta de Google'}
          </p>
        </div>

        {error && <p role="alert" className="mt-3 text-xs font-light text-rose-400">{error}</p>}

        <button
          type="button"
          onClick={activate}
          disabled={phase === 'activating'}
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-neutral-100
                     px-4 py-3.5 text-sm font-medium text-black hover:bg-white
                     disabled:cursor-wait disabled:opacity-50"
        >
          {phase === 'activating'
            ? <><Loader2 size={16} className="animate-spin" /> Activando…</>
            : <>Sí, activar mi tarjeta <ArrowRight size={16} /></>}
        </button>

        <button
          type="button"
          onClick={() => supabase.auth.signOut()}
          className="mx-auto mt-5 flex items-center gap-2 text-xs font-light text-neutral-500
                     underline-offset-2 hover:text-neutral-300 hover:underline"
        >
          <LogOut size={13} /> Usar otra cuenta de Google
        </button>
      </Screen>
    );
  }

  if (phase === 'welcome') return <Welcome onStart={dismissWelcome} />;

  if (phase === 'not_owner') {
    return (
      <main className="min-h-[100dvh] bg-black px-5 py-10">
        <div className="mx-auto mb-6 max-w-sm text-center">
          <p className="text-xs font-light leading-relaxed text-neutral-500">
            Esta tarjeta ya pertenece a alguien. Si es tuya, entra con la misma cuenta de
            Google con la que la activaste.
          </p>
          <button
            type="button"
            onClick={() => supabase.auth.signOut()}
            className="mx-auto mt-3 flex items-center gap-2 text-xs font-light text-neutral-400
                       underline-offset-2 hover:text-neutral-200 hover:underline"
          >
            <LogOut size={13} /> Entrar con otra cuenta
          </button>
        </div>
        {card && <GiftCardVisual card={card} />}
      </main>
    );
  }

  return <CardEditor cardId={cardId} initial={card} deviceSecret={deviceSecret} />;
}

/**
 * Acceso con número y clave de 15 minutos.
 *
 * La clave se compara contra su hash dentro de Postgres, así que aquí no hay
 * ningún valor que sirva para entrar si se inspecciona el navegador. Al validarla
 * el servidor devuelve el secreto del dispositivo, y desde entonces esta persona
 * entra directo sin volver a teclear nada.
 */
function PhoneAccess({ cardId, onBack, onAuthorized }) {
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState('');

  const submit = async (event) => {
    event.preventDefault();
    if (status === 'sending') return;
    if (String(phone).replace(/\D/g, '').length < 10) {
      setError('Escribe tu número a 10 dígitos.');
      return;
    }
    if (String(code).replace(/\D/g, '').length !== 6) {
      setError('La clave tiene 6 dígitos.');
      return;
    }

    setStatus('sending');
    setError('');
    const { data, error: e } = await claimGiftCardWithCode(cardId, phone, code);
    if (e || !data) {
      setStatus('idle');
      setError('No pudimos validar la clave. Revisa tu conexión e inténtalo nuevamente.');
      return;
    }

    const messages = {
      CODE_INVALID: data.attemptsLeft > 0
        ? `Clave incorrecta. Te quedan ${data.attemptsLeft} intentos.`
        : 'Clave incorrecta. Pide una nueva a quien te compartió la tarjeta.',
      CODE_EXPIRED: 'La clave venció. Pide una nueva: duran 15 minutos.',
      TOO_MANY_ATTEMPTS: 'Demasiados intentos. Pide una clave nueva.',
      INVALID_PHONE: 'Revisa tu número: deben ser 10 dígitos.',
      NOT_FOUND: 'Esta tarjeta no está disponible.',
      REVOKED: 'Esta tarjeta ya no está activa.',
    };

    if (data.outcome === 'AUTHORIZED' && data.deviceSecret) {
      await onAuthorized(data.deviceSecret);
      return;
    }

    setStatus('idle');
    setError(messages[data.outcome] ?? 'No pudimos validar la clave.');
  };

  return (
    <Screen icon={KeyRound} title="Entra con tu número">
      <p className="mt-4 text-sm font-light leading-relaxed text-neutral-400">
        Escribe tu número y la clave de 6 dígitos que te compartieron por WhatsApp.
        La clave dura 15 minutos.
      </p>

      <form onSubmit={submit} className="mt-7 space-y-3 text-left">
        <input
          className={INPUT}
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="Tu número a 10 dígitos"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
        />
        <input
          className={`${INPUT} text-center text-2xl tracking-[0.4em]`}
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
          placeholder="––––––"
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
        />
        {error && <p role="alert" className="text-xs font-light text-rose-400">{error}</p>}
        <button
          type="submit"
          disabled={status === 'sending'}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-neutral-100
                     px-4 py-3.5 text-sm font-medium text-black hover:bg-white
                     disabled:cursor-wait disabled:opacity-50"
        >
          {status === 'sending'
            ? <><Loader2 size={16} className="animate-spin" /> Validando…</>
            : <>Activar mi tarjeta <ArrowRight size={16} /></>}
        </button>
      </form>

      <button
        type="button"
        onClick={onBack}
        className="mx-auto mt-6 block text-[11px] font-light text-neutral-500
                   underline-offset-2 hover:text-neutral-300 hover:underline"
      >
        Volver a las opciones de acceso
      </button>
    </Screen>
  );
}

/** Bienvenida: qué es la tarjeta y cómo usarla, antes de tocar nada. */
function Welcome({ onStart }) {
  const steps = [
    { icon: UserRound, title: 'Completa tus datos', text: 'Tu nombre, a qué te dedicas y tu WhatsApp.' },
    { icon: IdCard, title: 'Sube tu foto', text: 'Será el fondo de tu tarjeta. Puedes cambiarla cuando quieras.' },
    { icon: Share2, title: 'Compártela', text: 'Manda tu tarjeta por WhatsApp a quien quieras.' },
  ];

  return (
    <main className="grid min-h-[100dvh] place-items-center bg-black px-6 py-10 text-neutral-100">
      <section className="w-full max-w-sm">
        <span className="grid h-14 w-14 place-items-center rounded-2xl border border-neutral-800
                         bg-neutral-950 text-neutral-300"
        >
          <Sparkles size={24} strokeWidth={1.5} />
        </span>
        <h1 className="mt-6 text-2xl font-light leading-tight tracking-tight text-white">
          Tu tarjeta digital ya es tuya
        </h1>
        <p className="mt-3 text-sm font-light leading-relaxed text-neutral-400">
          Es tu presentación personal: siempre a la mano, sin imprimir nada. Así se usa.
        </p>

        <ol className="mt-8 space-y-5">
          {steps.map((s, i) => (
            <li key={s.title} className="flex gap-4">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full border
                               border-neutral-800 bg-neutral-950 text-xs font-medium text-neutral-400"
              >
                {i + 1}
              </span>
              <span>
                <span className="flex items-center gap-2 text-sm font-medium text-neutral-100">
                  <s.icon size={14} className="text-neutral-500" aria-hidden="true" />
                  {s.title}
                </span>
                <span className="mt-0.5 block text-xs font-light leading-relaxed text-neutral-500">
                  {s.text}
                </span>
              </span>
            </li>
          ))}
        </ol>

        <button
          type="button"
          onClick={onStart}
          className="mt-10 flex w-full items-center justify-center gap-2 rounded-xl bg-neutral-100
                     px-4 py-3.5 text-sm font-medium text-black hover:bg-white"
        >
          Empezar a crear mi tarjeta <ArrowRight size={16} />
        </button>
      </section>
    </main>
  );
}

/** Panel del dueño: todas sus tarjetas, sin necesidad de guardar enlaces. */
function OwnerPanel({ session, authFailed = false }) {
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
        {authFailed && <AuthRetryNotice />}
        <button
          type="button"
          onClick={() => signInGoogle(setError)}
          className="mx-auto mt-8 flex w-full items-center justify-center gap-2 rounded-xl
                     bg-neutral-100 px-4 py-3.5 text-sm font-medium text-black hover:bg-white"
        >
          {authFailed ? 'Intentar de nuevo con Google' : 'Entrar con Google'}
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

/** Editor del dueño: datos primero, y la tarjeta real como vista previa. */
function CardEditor({ cardId, initial, deviceSecret = '' }) {
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
    const { data, error: e } = await saveGiftCard(cardId, form, deviceSecret);
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
      const { data, error: e } = await uploadGiftCardPhoto(cardId, finalFile, deviceSecret);
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

  const preview = { ...form, avatarUrl };
  const hidden = (
    <input ref={fileRef} type="file" accept="image/*" onChange={pickPhoto} className="hidden" />
  );

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

          <GiftCardVisual card={preview} />

          <div className="mx-auto mt-6 max-w-[340px] space-y-2">
            <a
              href={whatsAppLink('', shareMessage)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600
                         px-4 py-3.5 text-sm font-medium text-white hover:bg-emerald-500"
            >
              <Share2 size={16} /> Compartir mi tarjeta
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
        {hidden}
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

        {/* Los datos van primero; la foto se cambia desde la propia tarjeta. */}
        <div className="space-y-3">
          <input className={INPUT} value={form.fullName}
            onChange={(e) => set('fullName', e.target.value)} placeholder="Tu nombre completo" />
          <input className={INPUT} value={form.title}
            onChange={(e) => set('title', e.target.value)} placeholder="A qué te dedicas" />
          <input className={INPUT} value={form.company}
            onChange={(e) => set('company', e.target.value)} placeholder="Empresa (opcional)" />
          <input className={INPUT} value={form.whatsapp} type="tel" inputMode="tel"
            onChange={(e) => set('whatsapp', e.target.value)} placeholder="Tu WhatsApp" />
          <input className={INPUT} value={form.phone} type="tel" inputMode="tel"
            onChange={(e) => set('phone', e.target.value)} placeholder="Teléfono (opcional)" />
          <textarea className={`${INPUT} resize-none`} rows={3} value={form.bio}
            onChange={(e) => set('bio', e.target.value)} placeholder="Una línea sobre ti" />

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

        {/* Así va quedando: la tarjeta de verdad, con el botón de cámara. */}
        <p className="mt-8 mb-3 text-[10px] uppercase tracking-[0.22em] text-neutral-600">
          Así se ve tu tarjeta
        </p>
        <GiftCardVisual
          card={preview}
          onPickPhoto={() => fileRef.current?.click()}
          uploading={uploading}
        />
        {hidden}

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
