import {
  useCallback, useEffect, useRef, useState,
} from 'react';
import {
  ArrowRight, CheckCircle2, Loader2, LockKeyhole, ShieldCheck, UserPlus,
} from 'lucide-react';
import { FinanceProvider, useFinance } from '../../context/FinanceContext';
import StepWizard from '../Wizard/StepWizard';
import { STEPS, FIRST_INSIGHT_STEP } from '../Wizard/steps';
import { ExecutiveDashboardV1 } from '../Dashboard/ExecutiveDashboard';
import { publicDiagnosticRoute } from '../../lib/diagnosticPublicRoute';
import {
  capturePublicDiagnosticLead,
  completePublicDiagnostic,
  savePublicDiagnosticProgress,
  unlockPublicDiagnostic,
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

function LeadCapture({ diagnosticId, recipientName }) {
  const [name, setName] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState('');

  const submit = async (event) => {
    event.preventDefault();
    if (status === 'submitting') return;
    if (!name.trim() || digits(whatsapp).length < 10) {
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
          Pase protegido
        </p>
        <h1 className="mt-2 text-2xl font-light leading-tight text-white">
          Solicita tu propio análisis
        </h1>
        <p className="mt-4 text-sm font-light leading-relaxed text-neutral-400">
          Este pase pertenece a {recipientName || 'otra persona'}. Por seguridad de sus
          datos, el acceso está restringido. Si deseas solicitar un análisis patrimonial
          propio de cortesía, regístrate aquí.
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
      </section>
    </main>
  );
}

/**
 * Candado público de la Radiografía Patrimonial.
 *
 * La comparación sensible ocurre en `unlock_public_diagnostic`; este componente
 * nunca recibe el WhatsApp original. React sólo conduce los estados de UX.
 */
export default function DiagnosticSecurityGuard() {
  const [{ diagnosticId }] = useState(() => publicDiagnosticRoute());
  const [phase, setPhase] = useState(diagnosticId ? 'identity' : 'invalid');
  const [whatsapp, setWhatsapp] = useState('');
  const [record, setRecord] = useState(null);
  const [error, setError] = useState('');
  const [saveStatus, setSaveStatus] = useState('saved');
  const [isCompleting, setIsCompleting] = useState(false);

  const revisionRef = useRef(0);
  const latestSnapshotRef = useRef(null);
  const lastSavedRef = useRef('');
  const saveTimerRef = useRef(null);
  const saveChainRef = useRef(Promise.resolve());

  useEffect(() => () => clearTimeout(saveTimerRef.current), []);

  const persistSnapshot = useCallback((snapshot) => {
    if (!snapshot || !diagnosticId) return saveChainRef.current;
    const serialized = JSON.stringify(snapshot.responses);
    if (serialized === lastSavedRef.current) return saveChainRef.current;

    saveChainRef.current = saveChainRef.current.then(async () => {
      setSaveStatus('saving');
      const { data, error: requestError } = await savePublicDiagnosticProgress({
        diagnosticId,
        whatsapp,
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
  }, [diagnosticId, whatsapp]);

  const handleSnapshot = useCallback((snapshot) => {
    latestSnapshotRef.current = snapshot;
    clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => persistSnapshot(snapshot), 900);
  }, [persistSnapshot]);

  const unlock = async (event) => {
    event.preventDefault();
    if (phase === 'unlocking') return;
    if (digits(whatsapp).length < 10) {
      setError('Escribe el número de WhatsApp con 10 dígitos.');
      return;
    }

    setPhase('unlocking');
    setError('');
    const { data, error: requestError } = await unlockPublicDiagnostic(diagnosticId, whatsapp);
    if (requestError) {
      setPhase('identity');
      setError('No pudimos validar el pase. Revisa tu conexión e inténtalo nuevamente.');
      return;
    }
    if (data?.outcome === 'NOT_FOUND') {
      setPhase('invalid');
      return;
    }
    if (data?.outcome === 'MISMATCH') {
      setRecord(data);
      setPhase('mismatch');
      return;
    }
    if (data?.outcome !== 'MATCH') {
      setPhase('identity');
      setError('No pudimos validar el pase. Inténtalo nuevamente.');
      return;
    }

    setRecord(data);
    revisionRef.current = Number(data.revision) || 0;
    lastSavedRef.current = JSON.stringify(data.responses ?? {});
    setPhase(data.status === 'COMPLETADO' ? 'readonly' : 'questionnaire');
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
      whatsapp,
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

  if (phase === 'invalid') {
    return (
      <FullScreenState icon={LockKeyhole} title="Este pase no está disponible">
        <p className="mt-3 text-sm font-light leading-relaxed text-neutral-500">
          El enlace puede estar incompleto o haber dejado de estar disponible.
        </p>
      </FullScreenState>
    );
  }

  if (phase === 'mismatch') {
    return <LeadCapture diagnosticId={diagnosticId} recipientName={record?.recipientName} />;
  }

  if (phase === 'identity' || phase === 'unlocking') {
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
            Desbloquea tu pase
          </h1>
          <p className="mt-4 text-sm font-light leading-relaxed text-neutral-400">
            Confirma el número de WhatsApp con el que recibiste esta Radiografía
            Patrimonial. No enviaremos ningún mensaje.
          </p>

          <form onSubmit={unlock} className="mt-9">
            <label className="block">
              <span className="mb-2 block text-[11px] font-light uppercase tracking-widest
                               text-neutral-600"
              >
                WhatsApp
              </span>
              <input
                autoFocus
                className={INPUT}
                value={whatsapp}
                onChange={(event) => setWhatsapp(event.target.value)}
                placeholder="55 1234 5678"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
              />
            </label>
            {error && <p role="alert" className="mt-3 text-xs font-light text-rose-400">{error}</p>}
            <button
              type="submit"
              disabled={phase === 'unlocking'}
              className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl
                         bg-neutral-100 px-4 py-3.5 text-sm font-medium text-black
                         transition-colors hover:bg-white disabled:cursor-wait disabled:opacity-50"
            >
              {phase === 'unlocking' ? (
                <><Loader2 size={16} className="animate-spin" /> Validando…</>
              ) : (
                <>Desbloquear el pase <ArrowRight size={16} /></>
              )}
            </button>
          </form>
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
