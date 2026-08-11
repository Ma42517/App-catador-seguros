import { useState, useEffect, useCallback } from 'react';
import {
  PlayCircle, RotateCcw, Download, FileJson, FileSpreadsheet, X, Gauge,
  LayoutList, LineChart as LineChartIcon,
} from 'lucide-react';
import { FinanceProvider, useFinance } from './context/FinanceContext';
import { ReferralProvider } from './context/ReferralContext';
import StepWizard, { STEPS } from './components/Wizard/StepWizard';
import ExecutiveDashboard from './components/Dashboard/ExecutiveDashboard';
import SplashScreen from './components/SplashScreen';
import Login from './components/Auth/Login';
import PendingApproval from './components/Auth/PendingApproval';
import AdminLayout from './components/Layout/AdminLayout';
import DevicePreview from './components/Layout/DevicePreview';
import TodayView from './components/Home/TodayView';
import CalendarView from './components/Calendar/CalendarView';
import ProductivityDashboard from './components/Productivity/ProductivityDashboard';
import PromotorDashboard from './components/Promotoria/PromotorDashboard';
import { EventProvider } from './context/EventContext';
import { AccessProvider } from './context/AccessContext';
import { GoalsProvider } from './context/GoalsContext';
import { SessionProvider, useSession, SESSION_STATUS } from './context/SessionContext';
import { PROFILE_ROLES } from './data/profilesRepo';
import PublicCardView from './pages/PublicCardView';
import { publicCardIdFromPath } from './lib/publicRoute';
import { Button } from './components/ui';
import { exportJSON, exportCSV } from './data/exporters';

/** Clave de sessionStorage para saber si el intro ya se mostró en esta pestaña/sesión. */
const INTRO_KEY = 'hasSeenIntro';
/** Duración mínima garantizada del splash en la primera visita de la sesión. */
const FIRST_VISIT_SPLASH_MS = 3200;

/**
 * `?preview=1` indica que la app corre dentro del iframe del previsualizador:
 * se omite el splash y se oculta la sección de vista previa para no anidarla.
 */
function isPreviewFrame() {
  if (typeof window === 'undefined') return false;
  return new URLSearchParams(window.location.search).get('preview') === '1';
}

/**
 * Conmutador tipo pill entre las dos grandes fases de la app: captura
 * (pasos 0-5) y lectura (diagnóstico + optimización). Sólo cambia de
 * paso dentro del mismo StepWizard; no introduce una ruta nueva.
 */
function NavPill({ step, onNavigate }) {
  const isCapture = step < 6;
  const groups = [
    { key: 'capture', label: 'Captura', short: 'Captura', Icon: LayoutList, target: 0 },
    { key: 'insights', label: 'Diagnóstico', short: 'Diag.', Icon: LineChartIcon, target: 6 },
  ];

  return (
    <div
      role="tablist"
      aria-label="Fase del diagnóstico"
      className="hidden shrink-0 items-center gap-1 rounded-full border border-zinc-800 bg-zinc-900/70 p-1 sm:flex"
    >
      {groups.map((g) => {
        const active = g.key === 'capture' ? isCapture : !isCapture;
        return (
          <button
            key={g.key}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onNavigate(g.target)}
            className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-all duration-150 ${
              active
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : 'text-zinc-400 hover:bg-zinc-800/70 hover:text-zinc-200'
            }`}
          >
            <g.Icon size={13} />
            {g.label}
          </button>
        );
      })}
    </div>
  );
}

function Header({ step, onNavigate }) {
  const { loadDemoData, resetAll, data, diagnosis, isDemo } = useFinance();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-30 border-b border-zinc-800 bg-zinc-950/85 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-5xl items-center gap-2 px-4">
        {/* Marca */}
        <span
          className="mr-1 hidden h-9 w-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 shadow-lg shadow-indigo-600/30 sm:grid"
          aria-hidden="true"
        >
          <Gauge size={17} className="text-white" />
        </span>

        <div className="min-w-0 flex-1">
          <h1 className="truncate text-[13px] font-extrabold uppercase tracking-[0.14em] text-zinc-50 sm:text-sm">
            Diagnóstico Financiero <span className="text-indigo-400">360</span>
          </h1>
          {isDemo ? (
            <p className="flex items-center gap-1 text-[10px] font-semibold text-emerald-400">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_rgb(16_185_129/0.9)]" />
              Datos de ejemplo cargados
            </p>
          ) : (
            <p className="hidden text-[10px] text-zinc-500 sm:block">
              Sistema de inteligencia financiera personal
            </p>
          )}
        </div>

        <NavPill step={step} onNavigate={onNavigate} />

        <Button
          size="sm"
          variant="primary"
          icon={PlayCircle}
          onClick={loadDemoData}
          className="shrink-0"
        >
          <span className="hidden sm:inline">Cargar ejemplo</span>
          <span className="sm:hidden">Demo</span>
        </Button>

        <div className="relative shrink-0">
          <Button
            size="sm"
            variant="ghost"
            icon={menuOpen ? X : Download}
            onClick={() => setMenuOpen((v) => !v)}
          >
            <span className="hidden sm:inline">Exportar</span>
          </Button>


          {menuOpen && (
            <div className="animate-rise absolute right-0 top-full mt-2 w-60 overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900/95 shadow-2xl shadow-zinc-950/70 backdrop-blur-xl">
              <button
                type="button"
                onClick={() => { exportCSV(data, diagnosis); setMenuOpen(false); }}
                className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-xs text-zinc-300 hover:bg-zinc-900/50"
              >
                <FileSpreadsheet size={14} className="text-zinc-500" />
                Exportar diagnóstico (CSV)
              </button>
              <button
                type="button"
                onClick={() => { exportJSON(data); setMenuOpen(false); }}
                className="flex w-full items-center gap-2 border-t border-zinc-800 px-3 py-2.5 text-left text-xs text-zinc-300 hover:bg-zinc-900/50"
              >
                <FileJson size={14} className="text-zinc-500" />
                Respaldar mis datos (JSON)
              </button>
              <button
                type="button"
                onClick={() => {
                  if (window.confirm('Esto borrará toda tu información capturada. ¿Continuar?')) {
                    resetAll();
                    setMenuOpen(false);
                  }
                }}
                className="flex w-full items-center gap-2 border-t border-zinc-800 px-3 py-2.5 text-left text-xs text-rose-400 hover:bg-rose-500/10"
              >
                <RotateCcw size={14} />
                Empezar de cero
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

/** Lee el paso inicial del hash de la URL, para que sea enlazable y sobreviva recargas. */
function stepFromHash() {
  if (typeof window === 'undefined') return 0;
  const key = window.location.hash.replace('#', '');
  const found = STEPS.findIndex((s) => s.key === key);
  return found >= 0 ? found : 0;
}

/**
 * El estado del paso vive aquí, en el Shell, para que el conmutador tipo
 * pill del header y el stepper interno de StepWizard queden siempre en
 * sincronía: ambos leen y escriben el mismo `step`.
 */
/*
  `storageKey` identifica a la persona para todo lo que se guarda por usuario
  (agenda, metas, bloques de tiempo, marca de agua) y `displayName` es lo que se
  le muestra. Con Google son distintos: la clave es el UUID de la cuenta y el
  nombre es el de su perfil. Usar el nombre como clave ataría los datos a un
  texto que la persona puede cambiar.
*/
function Shell({
  onLogout, isPreview, isAdmin, isPromoterUser, storageKey, displayName,
}) {
  /*
    No hay estado de tema. La app es oscura de forma permanente y la clase `dark`
    vive en el <html> de index.html, así que no hay nada que sincronizar en
    tiempo de ejecución: un interruptor de tema obligaba a mantener cada color en
    dos versiones, y la clara casi nadie la veía.
  */

  // La app abre en "Hoy": el Diagnóstico 360 se alcanza desde "Ver más".
  const [section, setSection] = useState('home');
  const [step, setStep] = useState(stepFromHash);

  // La vista previa multi-dispositivo es una herramienta interna de desarrollo:
  // sólo el administrador la ve, y nunca se anida dentro de su propio iframe.
  const canUsePreview = isAdmin && !isPreview;

  /*
    ── El candado de Gestión de Promotoría ──

    Esta app no tiene enrutador: no hay `<Route path="/promotoria">` que proteger,
    la navegación es este estado `section`. Así que el guardián se pone donde de
    verdade se decide qué se monta, y aquí es más fuerte que una redirección:

     - Se evalúa en **cada render**, no una sola vez al entrar. Si a alguien le
       retiran el rol mientras tiene la vista abierta, la pierde en el momento; un
       `redirect` sólo actúa al llegar y lo dejaría dentro hasta que recargara.
     - No hay dirección que forzar. Poner `section` a mano desde las herramientas
       del navegador tampoco sirve: el valor se degrada a `home` antes de
       renderizar.

    Y aunque este candado se saltara, no habría nada que ver: la vista todavía no
    lee datos, y cuando los lea será RLS en Supabase quien decida qué devuelve. La
    comprobación de la interfaz existe para no ofrecer puertas que no abren, no
    para proteger.
  */
  const canUsePromotoria = isPromoterUser;

  // Si la sección guardada ya no está permitida, se degrada al inicio.
  const guardedSection = section === 'preview' && !canUsePreview ? 'home' : section;
  const activeSection = guardedSection === 'promotoria' && !canUsePromotoria
    ? 'home'
    : guardedSection;

  // Permite navegar con los botones de atrás/adelante del navegador.
  useEffect(() => {
    const onHashChange = () => setStep(stepFromHash());
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  const go = useCallback((next) => {
    const target = Math.min(STEPS.length - 1, Math.max(0, next));
    setStep(target);
    window.history.replaceState(null, '', `#${STEPS[target].key}`);
    // Al cambiar de paso el usuario espera empezar arriba.
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  return (
    <AdminLayout
      onNavigate={setSection}
      onLogout={onLogout}
      canUsePreview={canUsePreview}
      /*
        `isAdmin` y no `canManage`: el segundo incluye a los promotores, y el
        panel de administración —aprobar usuarios, mover roles, borrar fichas— es
        exclusivo del administrador.
      */
      isAdminUser={isAdmin}
      /*
        El menú necesita saberlo para dibujar —o no— el acceso. Es la misma
        llave que usa el guardián de arriba: una sola fuente para las dos
        decisiones, así no pueden discrepar.
      */
      isPromoterUser={isPromoterUser}
      onOpenPromotoria={() => setSection('promotoria')}
      username={storageKey}
    >
      {activeSection === 'preview' ? (
        <DevicePreview />
      ) : activeSection === 'home' ? (
        <TodayView name={displayName} />
      ) : activeSection === 'productivity' ? (
        <ProductivityDashboard username={storageKey} />
      ) : activeSection === 'promotoria' ? (
        <PromotorDashboard />
      ) : activeSection === 'agenda' ? (
        <CalendarView />
      ) : (
        /*
          El módulo de Diagnóstico 360 es un tablero de datos diseñado en
          oscuro (gráficas, semáforos y acentos calibrados sobre negro). Se
          fuerza la clase `dark` para que conserve su legibilidad incluso con
          el tema claro activo, en lugar de mostrarse ilegible.
        */
        <div className="dark relative min-h-screen bg-black">
          {/* Iluminación ambiental fija del fondo */}
          <div
            className="pointer-events-none absolute inset-x-0 top-0 h-[420px] bg-grid-fade"
            aria-hidden="true"
          />

          <div className="relative">
            <Header step={step} onNavigate={go} />
            <main className="mx-auto max-w-5xl px-4 py-6">
              {activeSection === 'wizard' ? (
                <StepWizard step={step} onStepChange={go} />
              ) : (
                <div className="animate-rise">
                  <ExecutiveDashboard />
                </div>
              )}
            </main>
            <footer className="mx-auto max-w-5xl px-4 pb-10 pt-4">
              <div className="border-t border-zinc-800 pt-5">
                <p className="text-center text-[10px] leading-relaxed text-zinc-600">
                  Herramienta de diagnóstico y simulación. Los resultados son estimaciones basadas en los
                  supuestos que capturas y no constituyen asesoría financiera, fiscal ni de inversión.
                  Tu información se guarda únicamente en este navegador.
                </p>
              </div>
            </footer>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}

/**
 * Decide qué se ve según el estado de la sesión.
 *
 * El orden importa: primero el splash, luego el login, luego la sala de espera
 * y sólo al final la app. Un rol sin aprobar no debe llegar a montar los
 * providers, porque montarlos ya empezaría a leer y escribir datos de una
 * persona que todavía no tiene permiso de entrar.
 */
function Gate({ isPreview }) {
  const {
    status, identity, isApproved, canManage, isAdmin, role, signOut,
  } = useSession();

  // Dentro del iframe de vista previa no se repite el splash: molesta al
  // estar cambiando de dispositivo constantemente.
  const [isAppReady, setIsAppReady] = useState(isPreview);

  // Primera vez en la sesión: splash con look de marca. Visitas
  // subsecuentes dentro de la misma pestaña: splash casi instantáneo,
  // tipo Facebook/Instagram, solo para evitar un "flash" de layout vacío.
  useEffect(() => {
    if (isPreview) return undefined;

    const isFirstVisit = !sessionStorage.getItem(INTRO_KEY);
    const delay = isFirstVisit ? FIRST_VISIT_SPLASH_MS : 300 + Math.random() * 200;

    const timer = setTimeout(() => {
      if (isFirstVisit) sessionStorage.setItem(INTRO_KEY, 'true');
      setIsAppReady(true);
    }, delay);

    return () => clearTimeout(timer);
  }, [isPreview]);

  if (!isAppReady) return <SplashScreen />;

  // Resolver la sesión implica una consulta a la base; mientras llega se
  // mantiene el splash en vez de asomar el login y quitarlo enseguida.
  if (status === SESSION_STATUS.LOADING) return <SplashScreen />;

  if (status === SESSION_STATUS.ANON || !identity) return <Login />;

  /*
    Sólo entran los roles aprobados. Se comprueba en positivo a propósito: antes
    se bloqueaba únicamente `pending`, así que un rol vacío, mal escrito o
    desconocido pasaba de largo hasta el contenido. Una puerta de acceso tiene
    que cerrarse ante lo que no reconoce.
  */
  if (!isApproved) return <PendingApproval />;

  return (
    <FinanceProvider>
      <ReferralProvider>
        {/* Todo lo que se guarda por persona usa la misma clave de identidad. */}
        <EventProvider username={identity.key}>
          {/*
            `forcedPromoter` conecta los dos sistemas de permisos: quien ya es
            promotor en la tabla `profiles` no tiene que escribir además el
            código de invitación para publicar en el muro.
          */}
          <AccessProvider username={identity.key} forcedPromoter={canManage}>
            <GoalsProvider username={identity.key}>
              <Shell
                onLogout={signOut}
                isPreview={isPreview}
                isAdmin={isAdmin}
                /*
                  El rol se compara con la constante del repositorio y no con el
                  texto 'promotor': la base guarda 'promoter', en inglés como el
                  resto de los roles, y escribirlo a mano en español dejaría el
                  candado siempre cerrado sin que salte ningún error.
                */
                isPromoterUser={role === PROFILE_ROLES.PROMOTER}
                storageKey={identity.key}
                displayName={identity.name}
              />
            </GoalsProvider>
          </AccessProvider>
        </EventProvider>
      </ReferralProvider>
    </FinanceProvider>
  );
}

export default function App() {
  const [isPreview] = useState(isPreviewFrame);

  /*
    Única dirección que se atiende sin sesión. Se resuelve antes de montar
    `SessionProvider` a propósito: así la tarjeta pública no espera a que se
    consulte la sesión, no enseña el splash y —sobre todo— no puede acabar
    detrás de la puerta de acceso por un cambio futuro en `Gate`. Lo que no pasa
    por ahí no se puede proteger por error, ni desproteger por descuido.

    Todo lo demás sigue entrando por `Gate`, que manda al inicio de sesión a
    quien no tenga cuenta. No hace falta declarar rutas protegidas una por una:
    lo protegido es el caso por omisión.
  */
  const [publicCardId] = useState(publicCardIdFromPath);
  if (publicCardId) return <PublicCardView advisorId={publicCardId} />;

  return (
    <SessionProvider>
      <Gate isPreview={isPreview} />
    </SessionProvider>
  );
}
