import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ArrowLeft, ArrowRight, Check, Copy, Eye, Gift, IdCard, KeyRound, Loader2, LogOut,
  Pencil, Share2, Sparkles, UserRound,
} from 'lucide-react';
import { giftCardSupabase, isSupabaseConfigured } from '../lib/supabaseClient';
import { giftCardRoute, giftCardUrl } from '../lib/giftCardRoute';
import {
  claimGiftCard, claimGiftCardWithSignup,
  fetchMyGiftCard, fetchMyGiftCards, fetchPublicGiftCard,
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
/** Código escrito al registrarse, para retomarlo tras confirmar el correo. */
const PENDING_CODE_KEY = 'df360:giftcard:pendingcode';

/**
 * ¿La sesión es de un cliente que se registró en esta página?
 *
 * Las cuentas creadas aquí quedan marcadas con `df360_role: 'client'`. Cualquier
 * otra sesión del mismo navegador (la del asesor, por ejemplo) es ajena a la
 * tarjeta y no debe heredarla ni asomar su correo.
 */
function isClientSession(session) {
  return session?.user?.user_metadata?.df360_role === 'client';
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
 * Página de la tarjeta digital de regalo.
 *
 * Ruta aislada del mundo asesor: usa `giftCardSupabase`, un cliente con su
 * propia llave de sesión en el navegador, y no monta `SessionProvider`. Por eso
 * abrir el enlace desde el teléfono del asesor ya no hereda su sesión: en este
 * mundo esa sesión no existe. Cubre `/mi-tarjeta/<uuid>` (una tarjeta) y
 * `/mi-tarjeta` (el panel con todas las del dueño).
 */
export default function GiftCardPage() {
  const [{ cardId }] = useState(() => giftCardRoute());
  const [session, setSession] = useState(undefined);

  useEffect(() => {
    if (!isSupabaseConfigured || !giftCardSupabase) { setSession(null); return undefined; }
    let active = true;
    const { data: sub } = giftCardSupabase.auth.onAuthStateChange((_e, s) => {
      if (active) setSession(s ?? null);
    });
    giftCardSupabase.auth.getSession().then(({ data }) => {
      if (active) setSession(data.session ?? null);
    });
    return () => { active = false; sub.subscription.unsubscribe(); };
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

/**
 * Registro e inicio de sesión del cliente con correo y contraseña.
 *
 * Usa Supabase Auth, que guarda la contraseña hasheada (bcrypt): nunca se guarda
 * en ninguna tabla nuestra ni en texto. Se marca la cuenta con `df360_role:
 * 'client'` para que, si esa persona abriera la app principal, el Gate la deje
 * fuera del mundo del asesor.
 *
 * No usa Google: la sesión de asesor con Google se colaba aquí y mostraba su
 * correo. Ahora, además de tener cuentas de correo propias, la sesión vive en
 * `giftCardSupabase`, separada de la de la app.
 */
function EmailAuth({
  title, intro, requireCode = false, onReady,
}) {
  const [tab, setTab] = useState('signup'); // 'signup' | 'login'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [status, setStatus] = useState('idle');
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  const submit = async (event) => {
    event.preventDefault();
    if (status === 'sending') return;
    const mail = email.trim().toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(mail)) {
      setError('Escribe un correo válido.');
      return;
    }
    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.');
      return;
    }
    // Al crear cuenta en una tarjeta concreta hace falta el código del asesor.
    if (tab === 'signup' && requireCode && code.replace(/\D/g, '').length !== 6) {
      setError('Escribe el código de 6 dígitos que te compartió tu asesor.');
      return;
    }

    setStatus('sending');
    setError('');
    setNotice('');

    if (tab === 'signup') {
      const { data, error: e } = await giftCardSupabase.auth.signUp({
        email: mail,
        password,
        options: {
          // Marca de cliente: el Gate de la app deja fuera este rol.
          data: { df360_role: 'client' },
          emailRedirectTo: window.location.href,
        },
      });
      if (e) {
        setStatus('idle');
        setError(/registered|already/i.test(e.message)
          ? 'Ese correo ya tiene cuenta. Inicia sesión.'
          : 'No pudimos crear la cuenta. Inténtalo de nuevo.');
        return;
      }
      // Confirmación de correo activada en el proyecto: no hay sesión todavía.
      // Se recuerda el código para retomarlo cuando la persona vuelva ya
      // confirmada, y así no queda atrapada pidiendo un correo que no llega.
      if (data.user && !data.session) {
        try {
          window.localStorage.setItem(PENDING_CODE_KEY, code.replace(/\D/g, ''));
        } catch { /* sin storage: tendrá que escribir el código al volver */ }
        setStatus('idle');
        setNotice('Te enviamos un correo para confirmar tu cuenta. Ábrelo desde este mismo '
          + 'teléfono y tu tarjeta se activará sola.');
        return;
      }
      // Con sesión inmediata (confirmación desactivada): vincula y entra directo.
      onReady?.({ code: code.replace(/\D/g, '') });
      return;
    }

    const { error: e } = await giftCardSupabase.auth.signInWithPassword({ email: mail, password });
    if (e) {
      setStatus('idle');
      setError('Correo o contraseña incorrectos.');
    }
    // Login normal: `onAuthStateChange` en el padre resuelve el resto.
  };

  return (
    <Screen icon={UserRound} title={title}>
      <p className="mt-4 text-sm font-light leading-relaxed text-neutral-400">{intro}</p>

      <div className="mt-6 flex rounded-full border border-neutral-800 p-1">
        {[['signup', 'Crear cuenta'], ['login', 'Ya tengo cuenta']].map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => { setTab(key); setError(''); setNotice(''); }}
            className={`flex-1 rounded-full px-3 py-2 text-xs font-semibold transition-colors ${
              tab === key ? 'bg-neutral-100 text-black' : 'text-neutral-400'}`}
          >
            {label}
          </button>
        ))}
      </div>

      <form onSubmit={submit} className="mt-5 space-y-3 text-left">
        <input
          className={INPUT}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Tu correo"
          type="email"
          inputMode="email"
          autoComplete="email"
        />
        <input
          className={INPUT}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Tu contraseña"
          type="password"
          autoComplete={tab === 'signup' ? 'new-password' : 'current-password'}
        />
        {tab === 'signup' && requireCode && (
          <div>
            <input
              className={`${INPUT} text-center text-xl tracking-[0.4em]`}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="Código de tu asesor"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
            />
            <p className="mt-1.5 text-[11px] font-light text-neutral-600">
              Es el código de 6 dígitos que te compartió tu asesor. Se usa una sola vez.
            </p>
          </div>
        )}
        {error && <p role="alert" className="text-xs font-light text-rose-400">{error}</p>}
        {notice && <p className="text-xs font-light text-emerald-400">{notice}</p>}
        <button
          type="submit"
          disabled={status === 'sending'}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-neutral-100
                     px-4 py-3.5 text-sm font-medium text-black hover:bg-white
                     disabled:cursor-wait disabled:opacity-50"
        >
          {status === 'sending'
            ? <><Loader2 size={16} className="animate-spin" /> Un momento…</>
            : tab === 'signup'
              ? <>Crear mi cuenta <ArrowRight size={16} /></>
              : <>Entrar <ArrowRight size={16} /></>}
        </button>
      </form>
    </Screen>
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
function SingleCard({ cardId, session }) {
  const [phase, setPhase] = useState('loading');
  const [card, setCard] = useState(null);
  const [linkError, setLinkError] = useState('');
  // Secreto del dispositivo cuando se entró por número + clave. Vacío con correo.
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

  /**
   * Vincula la tarjeta a la cuenta con el código de invitación.
   *
   * Es el único camino que amarra una tarjeta libre: el código, de un solo uso,
   * es lo que impide que quien sólo reenvió el enlace se quede con ella.
   */
  const vincularConCodigo = useCallback(async (code) => {
    setLinkError('');
    setPhase('linking');
    const { data, error: e } = await claimGiftCardWithSignup(cardId, code);
    if (e || !data) {
      setLinkError('No pudimos validar el código. Revisa tu conexión e inténtalo de nuevo.');
      setPhase('need_code');
      return;
    }
    if (data.outcome === 'OWNER') { await openAsOwner(); return; }

    const messages = {
      CODE_INVALID: data.attemptsLeft > 0
        ? `Código incorrecto. Te quedan ${data.attemptsLeft} intentos.`
        : 'Código incorrecto. Pide uno nuevo a tu asesor.',
      CODE_EXPIRED: 'Ese código ya se usó o no es válido. Pide uno nuevo a tu asesor.',
      TOO_MANY_ATTEMPTS: 'Demasiados intentos. Pide un código nuevo a tu asesor.',
      NOT_OWNER: 'Esta tarjeta ya pertenece a otra cuenta.',
      // El servidor sólo acepta cuentas creadas en esta página; nunca la de un asesor.
      WRONG_ACCOUNT: 'Esa cuenta no sirve para activar la tarjeta. Sal y crea tu cuenta '
        + 'con tu correo aquí mismo.',
      REVOKED: 'Esta tarjeta ya no está activa.',
      NOT_FOUND: 'Esta tarjeta no está disponible.',
    };
    setLinkError(messages[data.outcome] ?? 'No pudimos validar el código.');
    setPhase('need_code');
  }, [cardId, openAsOwner]);

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
        setPhase('login');
      })();
      return () => { active = false; };
    }

    // Sin cuenta de correo iniciada: se pide identificarse (correo o número+clave).
    if (!session) { setPhase('login'); return undefined; }

    (async () => {
      /*
        Con sesión de correo se resuelve el rol. `claim_gift_card` ya NO vincula
        en silencio: si la tarjeta está libre devuelve NEEDS_CODE, porque el
        vínculo exige el código de invitación del asesor. Así, tener el enlace y
        una cuenta no basta para quedarse con la tarjeta.
      */
      const { data, error: e } = await claimGiftCard(cardId);
      if (!active) return;
      if (e) { setPhase('offline'); return; }
      if (data?.outcome === 'NOT_FOUND') { setPhase('invalid'); return; }
      if (data?.outcome === 'REVOKED') { setPhase('revoked'); return; }
      if (data?.outcome === 'OWNER') { await openAsOwner(); return; }
      // Cuenta iniciada pero tarjeta aún sin vincular: falta el código.
      if (data?.outcome === 'NEEDS_CODE') {
        /*
          Si la persona acaba de confirmar su correo y vuelve, el código que
          escribió al registrarse quedó guardado: se retoma solo, sin pedírselo de
          nuevo. Si no hay ninguno guardado, se le pide en pantalla.
        */
        let pending = '';
        try { pending = window.localStorage.getItem(PENDING_CODE_KEY) ?? ''; } catch { /* sin storage */ }
        if (pending && pending.length === 6) {
          try { window.localStorage.removeItem(PENDING_CODE_KEY); } catch { /* nada */ }
          await vincularConCodigo(pending);
          return;
        }
        /*
          Tarjeta libre y una sesión que no es de cliente: es la sesión del asesor
          (o de quien reenvió el enlace) heredada de este mismo navegador. Se
          cierra para no mostrar su correo ni dejar que herede la tarjeta, y la
          persona ve el registro limpio. Un cliente con cuenta propia sí llega a
          la pantalla del código, sin quedar en bucle de inicio de sesión.
        */
        if (!isClientSession(session)) {
          await giftCardSupabase.auth.signOut();
          if (!active) return;
          setPhase('login');
          return;
        }
        setPhase('need_code');
        return;
      }
      if (data?.outcome === 'NOT_OWNER') {
        const { data: pub } = await fetchPublicGiftCard(cardId);
        if (!active) return;
        setCard(pub?.outcome === 'ACTIVA' ? pub : null);
        setPhase('not_owner');
        return;
      }
      setPhase('offline');
    })();
    return () => { active = false; };
  }, [cardId, session, openAsOwner, vincularConCodigo]);

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

  // Paso cero: identificarse. El registro pide correo, contraseña y código de
  // invitación. Nada de la tarjeta se muestra antes de vincularla.
  if (phase === 'login') {
    return (
      <div>
        <EmailAuth
          title="Tu tarjeta digital de regalo"
          intro="Te regalaron una tarjeta digital para que la hagas tuya. Crea tu cuenta con el
                 código de invitación que te compartió tu asesor; así sólo tú podrás editarla."
          requireCode
          onReady={({ code }) => vincularConCodigo(code)}
        />
        <div className="mx-auto -mt-4 max-w-sm px-6 pb-10 text-center">
          <button
            type="button"
            onClick={() => setPhase('phone')}
            className="text-[11px] font-light text-neutral-500 underline-offset-2
                       hover:text-neutral-300 hover:underline"
          >
            ¿Prefieres entrar con tu número y una clave? Toca aquí
          </button>
        </div>
      </div>
    );
  }

  // Cuenta ya iniciada, pero la tarjeta aún no está vinculada a ella: se pide el
  // código de invitación (caso de quien creó la cuenta y confirmó correo aparte).
  if (phase === 'need_code' || phase === 'linking') {
    return (
      <InvitationCode
        busy={phase === 'linking'}
        error={linkError}
        onSubmit={vincularConCodigo}
      />
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

  if (phase === 'welcome') return <Welcome onStart={dismissWelcome} />;

  if (phase === 'not_owner') {
    return (
      <main className="min-h-[100dvh] bg-black px-5 py-10">
        <div className="mx-auto mb-6 max-w-sm text-center">
          <p className="text-xs font-light leading-relaxed text-neutral-500">
            Esta tarjeta ya está activada en otra cuenta. Si es tuya, entra con la misma
            cuenta con la que la activaste.
          </p>
          {/*
            Salida para el caso real: la tarjeta la llenó esta persona, pero quedó
            activada en una cuenta que no es la suya. Sólo el asesor puede
            devolvérsela, y al hacerlo conserva su nombre y su foto.
          */}
          <p className="mt-2 text-xs font-light leading-relaxed text-neutral-600">
            ¿La llenaste tú y nunca creaste esa cuenta? Pídele a tu asesor que te la
            devuelva: tus datos y tu foto se conservan, y te dará un código nuevo.
          </p>
          <button
            type="button"
            onClick={() => giftCardSupabase.auth.signOut()}
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
 * Pide el código de invitación cuando la cuenta ya está iniciada pero la tarjeta
 * aún no se ha vinculado (p. ej. tras confirmar el correo en otro momento).
 */
function InvitationCode({ busy, error, onSubmit }) {
  const [code, setCode] = useState('');
  const submit = (event) => {
    event.preventDefault();
    if (code.replace(/\D/g, '').length === 6) onSubmit(code.replace(/\D/g, ''));
  };
  return (
    <Screen icon={KeyRound} title="Escribe tu código de invitación">
      <p className="mt-4 text-sm font-light leading-relaxed text-neutral-400">
        Tu cuenta está lista. Escribe el código de 6 dígitos que te compartió tu asesor para
        activar tu tarjeta.
      </p>
      <form onSubmit={submit} className="mt-7 space-y-3">
        <input
          className={`${INPUT} text-center text-2xl tracking-[0.4em]`}
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
          placeholder="––––––"
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          autoFocus
        />
        {error && <p role="alert" className="text-xs font-light text-rose-400">{error}</p>}
        <button
          type="submit"
          disabled={busy}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-neutral-100
                     px-4 py-3.5 text-sm font-medium text-black hover:bg-white
                     disabled:cursor-wait disabled:opacity-50"
        >
          {busy
            ? <><Loader2 size={16} className="animate-spin" /> Activando…</>
            : <>Activar mi tarjeta <ArrowRight size={16} /></>}
        </button>
      </form>
    </Screen>
  );
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
function OwnerPanel({ session }) {
  const [cards, setCards] = useState(null);

  useEffect(() => {
    if (!session) return;
    fetchMyGiftCards().then(({ data }) => {
      setCards(data?.outcome === 'OK' ? (data.cards ?? []) : []);
    });
  }, [session]);

  if (!session) {
    return (
      <EmailAuth
        title="Tus tarjetas digitales"
        intro="Entra con tu cuenta para ver y editar las tarjetas que te han regalado."
      />
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
          onClick={() => giftCardSupabase.auth.signOut()}
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
            onClick={() => giftCardSupabase.auth.signOut()}
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
            onClick={() => giftCardSupabase.auth.signOut()}
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
