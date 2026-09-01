import {
  useCallback, useEffect, useRef, useState,
} from 'react';
import {
  ArrowRight, CheckCircle2, KeyRound, Loader2, LockKeyhole, ShieldCheck, UserPlus,
} from 'lucide-react';
import { FinanceProvider, useFinance } from '../../context/FinanceContext';
import StepWizard from '../Wizard/StepWizard';
import { STEPS, FIRST_INSIGHT_STEP } from '../Wizard/steps';
import { ExecutiveDashboardV1 } from '../Dashboard/ExecutiveDashboard';
import PublicDiagnosticReferrals from './PublicDiagnosticReferrals';
import { publicDiagnosticRoute } from '../../lib/diagnosticPublicRoute';
import {
  readDeviceSecret, saveDeviceSecret, clearDeviceSecret,
} from '../../lib/diagnosticDevice';
import {
  capturePublicDiagnosticLead,
  claimPublicDiagnosticDevice,
  completePublicDiagnostic,
  openPublicDiagnostic,
  savePublicDiagnosticProgress,
} from '../../data/diagnosticsRepo';

const QUESTIONNAIRE_STEPS = STEPS.slice(0, FIRST_INSIGHT_STEP);
const INPUT = 'w-full rounded-xl border border-neutral-800 bg-neutral-900 px-4 py-3.5 '
  + 'text-sm font-light text-neutral-100 outline-none transition-colors '
  + 'placeholder:text-neutral-600 focus:border-neutral-500';

function digits(value) {
  return String(value ?? '').replace(/\D/g, '');
}

function FullScreenState({ icon: Icon, title, children }) {
  return (
    <main className="grid min-h-[100dvh] place-items-center bg-black px-6 text-neutral-100">
      <section className="w-full max-w-sm text-center">
        <span
          className="mx-auto mb-5 grid h-14 w-14 place-items-center rounded-2xl
                     border border-neutral-800 bg-neutral-950 text-neutral-400"
          aria-hidden="true"
        >
          <Icon size={24} strokeWidth={1.5} />
        </span>
        <h1 className="text-xl font-light tracking-tight text-white">{title}</h1>
        {children}
      </section>
    </main>
  );
}

/** Puente entre FinanceContext y el guard: entrega borrador y resultados frescos. */
function QuestionnaireBody({ onSnapshot, onComplete, isCompleting, saveStatus }) {
  const { data, scenario, activeMode, diagnosis } = useFinance();

  useEffect(() => {
    onSnapshot({ responses: data, scenario, activeMode, results: diagnosis });
  }, [data, scenario, activeMode, diagnosis, onSnapshot]);

  return (
    <>
      <div className="mb-7 flex items-center justify-between gap-4 border-b border-neutral-900 pb-4">
        <div>
          <p className="text-[10px] uppercase tracking-[0.24em] text-neutral-600">
            Radiografía Patrimonial
          </p>
          <p className="mt-1 text-sm font-light text-neutral-300">
            Tus avances se guardan automáticamente
          </p>
        </div>
        <span className="text-[11px] font-light text-neutral-600" role="status">
          {saveStatus === 'saving' ? 'Guardando…'
            : saveStatus === 'error' ? 'Sin conexión'
              : 'Guardado'}
        </span>
      </div>

      <StepWizard
        steps={QUESTIONNAIRE_STEPS}
        onComplete={onComplete}
        completeLabel="Enviar respuestas"
        isSubmitting={isCompleting}
      />
    </>
  );
}

/**
 * Registro de quien recibió un enlace que no es suyo.
 *
 * Ya no se le dice a quién pertenece el pase. Antes el mensaje nombraba al dueño
 * —"este pase pertenece a Marco"—, y eso le confirmaba a un tercero que Marco
 * tiene un análisis patrimonial en curso con un asesor: un dato de su vida
 * financiera que no le corresponde conocer.
 */
function LeadCapture({ diagnosticId, onBack }) {
  const [name, setName] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState('');

  const submit = async (event) => {
    event.preventDefault();
    if (status === 'submitting') return;
    if (name.trim().length < 2 || digits(whatsapp).length < 10) {
      setError('Escribe tu nombre y un WhatsApp de 10 dígitos.');
      return;
    }

    setStatus('submitting');
    setError('');
    const { data, error: requestError } = await capturePublicDiagnosticLead({
      diagnosticId,
      name,
      whatsapp,
    });
    if (requestError || data?.outcome !== 'CREATED') {
      setStatus('idle');
      setError('No pudimos registrar tu solicitud. Revisa tu conexión e inténtalo nuevamente.');
      return;
    }
    setStatus('success');
  };

  if (status === 'success') {
    return (
      <FullScreenState icon={CheckCircle2} title="Solicitud recibida">
        <p className="mt-3 text-sm font-light leading-relaxed text-neutral-400">
          Gracias, {name.trim().split(' ')[0]}. Un asesor se pondrá en contacto contigo
          para preparar tu análisis patrimonial de cortesía.
        </p>
      </FullScreenState>
    );
  }

  return (
    <main className="grid min-h-[100dvh] place-items-center bg-black px-5 py-10 text-neutral-100">
      <section className="w-full max-w-md rounded-3xl border border-neutral-900 bg-black p-6 sm:p-8">
        <span
          className="mb-6 grid h-12 w-12 place-items-center rounded-2xl border
                     border-neutral-800 bg-neutral-950 text-neutral-400"
          aria-hidden="true"
        >
          <UserPlus size={21} strokeWidth={1.5} />
        </span>
        <p className="text-[10px] uppercase tracking-[0.24em] text-neutral-600">
          Análisis de cortesía
        </p>
        <h1 className="mt-2 text-2xl font-light leading-tight text-white">
          Solicita tu propio análisis
        </h1>
        <p className="mt-4 text-sm font-light leading-relaxed text-neutral-400">
          Este pase es personal y su contenido está protegido. Si deseas solicitar un
          análisis patrimonial propio de cortesía, regístrate aquí.
        </p>

        <form onSubmit={submit} className="mt-8 space-y-3">
          <label className="block">
            <span className="sr-only">Nombre completo</span>
            <input
              className={INPUT}
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Nombre completo"
              autoComplete="name"
            />
          </label>
          <label className="block">
            <span className="sr-only">WhatsApp</span>
            <input
              className={INPUT}
              value={whatsapp}
              onChange={(event) => setWhatsapp(event.target.value)}
              placeholder="WhatsApp a 10 dígitos"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
            />
          </label>
          {error && <p role="alert" className="text-xs font-light text-rose-400">{error}</p>}
          <button
            type="submit"
            disabled={status === 'submitting'}
            className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl
                       bg-neutral-100 px-4 py-3.5 text-sm font-medium text-black
                       transition-colors hover:bg-white disabled:cursor-wait disabled:opacity-50"
          >
            {status === 'submitting' ? 'Enviando…' : 'Solicitar análisis de cortesía'}
            {status !== 'submitting' && <ArrowRight size={16} aria-hidden="true" />}
          </button>
        </form>

        <button
          type="button"
          onClick={onBack}
          className="mx-auto mt-6 block text-[11px] font-light text-neutral-600
                     underline-offset-2 transition-colors hover:text-neutral-400 hover:underline"
        >
          Tengo un código de acceso
        </button>
      </section>
    </main>
  );
}

/**
 * Candado público de la Radiografía Patrimonial.
 *
 * ## Qué acredita el acceso
 * El dispositivo, no un número de teléfono. La primera entrada canjea un código
 * de seis dígitos que el asesor entrega por WhatsApp; a cambio, el servidor
 * emite una llave que queda en este navegador y con la que se entra directo de
 * ahí en adelante.
 *
 * Antes se comparaba el WhatsApp del dueño, y eso era un secreto adivinable:
 * quien conociera su número entraba, y reenviar el enlace propagaba el pase.
 * Ahora reenviarlo no alcanza —el código caduca, se agota y autorizar otro
 * dispositivo exige un código nuevo que sólo el asesor puede emitir—.
 *
 * ## Qué NO hace este componente
 * No decide nada sensible. El código se compara contra su hash dentro de
 * Postgres y la llave del dispositivo se genera allí: aquí no hay ningún valor
 * que sirva para entrar si se inspecciona el navegador.
 */
export default function DiagnosticSecurityGuard() {
  const [{ diagnosticId }] = useState(() => publicDiagnosticRoute());
  const [phase, setPhase] = useState(diagnosticId ? 'checking' : 'invalid');
  const [record, setRecord] = useState(null);
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [saveStatus, setSaveStatus] = useState('saved');
  const [isCompleting, setIsCompleting] = useState(false);

  const secretRef = useRef('');
  const revisionRef = useRef(0);
  const latestSnapshotRef = useRef(null);
  const lastSavedRef = useRef('');
  const saveTimerRef = useRef(null);
  const saveChainRef = useRef(Promise.resolve());

  useEffect(() => () => clearTimeout(saveTimerRef.current), []);

  /** Deja el pase listo tras una apertura o un canje autorizado. */
  const adopt = useCallback((data) => {
    setRecord(data);
    revisionRef.current = Number(data.revision) || 0;
    lastSavedRef.current = JSON.stringify(data.responses ?? {});
    setPhase(data.status === 'COMPLETADO' ? 'readonly' : 'questionnaire');
  }, []);

  /*
    Apertura silenciosa al montar: si este dispositivo ya tiene llave, entra sin
    preguntar nada. Es justo lo que se pidió —que en su propio teléfono el dueño
    no vuelva a teclear nada— y también lo que evita que el código tenga que
    viajar más de una vez.
  */
  useEffect(() => {
    if (!diagnosticId) return;

    let active = true;
    const stored = readDeviceSecret(diagnosticId);
    secretRef.current = stored;

    openPublicDiagnostic(diagnosticId, stored).then(({ data, error: requestError }) => {
      if (!active) return;
      if (requestError) {
        setPhase('offline');
        return;
      }
      if (data?.outcome === 'NOT_FOUND') {
        setPhase('invalid');
        return;
      }
      if (data?.outcome === 'AUTHORIZED') {
        adopt(data);
        return;
      }
      // La llave guardada ya no vale —el asesor revocó los dispositivos—, así que
      // se olvida: conservarla haría que cada apertura intentara con una llave
      // muerta y el estado de la pantalla dejaría de corresponder con la realidad.
      if (stored) clearDeviceSecret(diagnosticId);
      secretRef.current = '';
      setPhase('code');
    });

    return () => { active = false; };
  }, [diagnosticId, adopt]);

  const persistSnapshot = useCallback((snapshot) => {
    if (!snapshot || !diagnosticId || !secretRef.current) return saveChainRef.current;
    const serialized = JSON.stringify(snapshot.responses);
    if (serialized === lastSavedRef.current) return saveChainRef.current;

    saveChainRef.current = saveChainRef.current.then(async () => {
      setSaveStatus('saving');
      const { data, error: requestError } = await savePublicDiagnosticProgress({
        diagnosticId,
        deviceSecret: secretRef.current,
        responses: snapshot.responses,
        revision: revisionRef.current,
      });
      if (requestError || data?.outcome !== 'SAVED') {
        setSaveStatus('error');
        return false;
      }
      revisionRef.current = data.revision;
      lastSavedRef.current = serialized;
      setSaveStatus('saved');
      return true;
    });

    return saveChainRef.current;
  }, [diagnosticId]);

  const handleSnapshot = useCallback((snapshot) => {
    latestSnapshotRef.current = snapshot;
    clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => persistSnapshot(snapshot), 900);
  }, [persistSnapshot]);

  const claim = async (event) => {
    event.preventDefault();
    if (phase === 'claiming') return;
    if (digits(code).length !== 6) {
      setError('El código tiene 6 dígitos.');
      return;
    }

    setPhase('claiming');
    setError('');
    const { data, error: requestError } = await claimPublicDiagnosticDevice(diagnosticId, code);

    if (requestError) {
      setPhase('code');
      setError('No pudimos validar el código. Revisa tu conexión e inténtalo nuevamente.');
      return;
    }
    if (data?.outcome === 'CODE_INVALID') {
      setPhase('code');
      setError(data.attemptsLeft > 0
        ? `Código incorrecto. Te quedan ${data.attemptsLeft} intentos.`
        : 'Código incorrecto. Pide uno nuevo a tu asesor.');
      return;
    }
    if (data?.outcome === 'CODE_EXPIRED' || data?.outcome === 'TOO_MANY_ATTEMPTS') {
      setPhase('code');
      setError('Este código ya no es válido. Pide uno nuevo a tu asesor.');
      return;
    }
    if (data?.outcome !== 'AUTHORIZED' || !data?.deviceSecret) {
      setPhase('code');
      setError('No pudimos validar el código. Inténtalo nuevamente.');
      return;
    }

    secretRef.current = data.deviceSecret;
    saveDeviceSecret(diagnosticId, data.deviceSecret);
    setCode('');
    adopt(data);
  };

  const complete = async () => {
    if (isCompleting || !latestSnapshotRef.current) return;
    setIsCompleting(true);
    setError('');
    clearTimeout(saveTimerRef.current);
    await saveChainRef.current;

    const snapshot = latestSnapshotRef.current;
    const { data, error: requestError } = await completePublicDiagnostic({
      diagnosticId,
      deviceSecret: secretRef.current,
      responses: snapshot.responses,
      results: snapshot.results,
      revision: revisionRef.current,
    });
    if (requestError || data?.outcome !== 'COMPLETED') {
      setIsCompleting(false);
      setError('No pudimos finalizar el análisis. Tus respuestas siguen en pantalla.');
      return;
    }

    setRecord((current) => ({ ...current, ...data }));
    setIsCompleting(false);
    setPhase('readonly');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (phase === 'checking') {
    return (
      <main className="grid min-h-[100dvh] place-items-center bg-black">
        <Loader2 size={22} className="animate-spin text-neutral-700" aria-label="Abriendo" />
      </main>
    );
  }

  if (phase === 'invalid') {
    return (
      <FullScreenState icon={LockKeyhole} title="Este pase no está disponible">
        <p className="mt-3 text-sm font-light leading-relaxed text-neutral-500">
          El enlace puede estar incompleto o haber dejado de estar disponible.
        </p>
      </FullScreenState>
    );
  }

  if (phase === 'offline') {
    return (
      <FullScreenState icon={LockKeyhole} title="Sin conexión">
        <p className="mt-3 text-sm font-light leading-relaxed text-neutral-500">
          No pudimos abrir tu pase. Revisa tu conexión y vuelve a cargar la página.
        </p>
      </FullScreenState>
    );
  }

  if (phase === 'lead') {
    return <LeadCapture diagnosticId={diagnosticId} onBack={() => setPhase('code')} />;
  }

  if (phase === 'code' || phase === 'claiming') {
    return (
      <main className="grid min-h-[100dvh] place-items-center bg-black px-5 text-neutral-100">
        <section className="w-full max-w-sm">
          <span
            className="mb-7 grid h-12 w-12 place-items-center rounded-2xl border
                       border-neutral-800 bg-neutral-950 text-neutral-400"
            aria-hidden="true"
          >
            <ShieldCheck size={22} strokeWidth={1.5} />
          </span>
          <p className="text-[10px] uppercase tracking-[0.25em] text-neutral-600">
            Acceso privado
          </p>
          <h1 className="mt-3 text-3xl font-light tracking-tight text-white">
            Ingresa tu código
          </h1>
          <p className="mt-4 text-sm font-light leading-relaxed text-neutral-400">
            Tu asesor te compartió un código de 6 dígitos. Se pide una sola vez: este
            dispositivo quedará autorizado y después entrarás directo.
          </p>

          <form onSubmit={claim} className="mt-9">
            <label className="block">
              <span className="mb-2 block text-[11px] font-light uppercase tracking-widest
                               text-neutral-600"
              >
                Código de acceso
              </span>
              <input
                autoFocus
                className={`${INPUT} text-center text-2xl tracking-[0.5em]`}
                value={code}
                onChange={(event) => setCode(digits(event.target.value).slice(0, 6))}
                placeholder="––––––"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
              />
            </label>
            {error && <p role="alert" className="mt-3 text-xs font-light text-rose-400">{error}</p>}
            <button
              type="submit"
              disabled={phase === 'claiming'}
              className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl
                         bg-neutral-100 px-4 py-3.5 text-sm font-medium text-black
                         transition-colors hover:bg-white disabled:cursor-wait disabled:opacity-50"
            >
              {phase === 'claiming' ? (
                <><Loader2 size={16} className="animate-spin" /> Validando…</>
              ) : (
                <>Autorizar este dispositivo <KeyRound size={16} /></>
              )}
            </button>
          </form>

          <p className="mt-7 border-t border-neutral-900 pt-5 text-[11px] font-light
                        leading-relaxed text-neutral-600"
          >
            ¿Te reenviaron este enlace y no tienes código?{' '}
            <button
              type="button"
              onClick={() => { setError(''); setPhase('lead'); }}
              className="text-neutral-400 underline underline-offset-2
                         transition-colors hover:text-neutral-200"
            >
              Solicita tu propio análisis de cortesía
            </button>
          </p>
        </section>
      </main>
    );
  }

  const initialState = {
    data: record?.responses ?? {},
    scenario: record?.scenario ?? {},
    activeMode: 'current',
  };

  if (phase === 'readonly') {
    return (
      <main className="min-h-[100dvh] bg-black px-4 py-7 text-neutral-100 sm:px-6">
        <div className="mx-auto max-w-5xl">
          <section className="mb-7 rounded-2xl border border-neutral-800 bg-neutral-950 p-5">
            <div className="flex items-start gap-3">
              <LockKeyhole size={18} className="mt-0.5 shrink-0 text-neutral-500" />
              <div>
                <p className="text-sm font-light leading-relaxed text-neutral-200">
                  Tu análisis está en revisión con tu asesor. No se pueden modificar las respuestas.
                </p>
              </div>
            </div>
          </section>
          <PublicDiagnosticReferrals
            diagnosticId={diagnosticId}
            deviceSecret={secretRef.current}
          />
          <FinanceProvider initialState={initialState} persist={false}>
            <ExecutiveDashboardV1 />
          </FinanceProvider>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-[100dvh] bg-black px-4 py-7 text-neutral-100 sm:px-6">
      <div className="mx-auto max-w-5xl">
        {error && (
          <p role="alert" className="mb-4 rounded-xl border border-rose-500/20 bg-rose-500/5
                                     px-4 py-3 text-xs font-light text-rose-300"
          >
            {error}
          </p>
        )}
        <FinanceProvider initialState={initialState} persist={false}>
          <QuestionnaireBody
            onSnapshot={handleSnapshot}
            onComplete={complete}
            isCompleting={isCompleting}
            saveStatus={saveStatus}
          />
        </FinanceProvider>
      </div>
    </main>
  );
}
