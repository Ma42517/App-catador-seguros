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
import LoginScreen from './components/Auth/LoginScreen';
import { isAdmin, isValidRole } from './components/Auth/users';
import AdminLayout from './components/Layout/AdminLayout';
import DevicePreview from './components/Layout/DevicePreview';
import TodayView from './components/Home/TodayView';
import CalendarView from './components/Calendar/CalendarView';
import ProductivityDashboard from './components/Productivity/ProductivityDashboard';
import { EventProvider } from './context/EventContext';
import { readTheme, applyTheme, THEMES } from './theme';
import AgentProfiler from './components/Onboarding/AgentProfiler';
import { readProfile, saveProfile } from './components/Onboarding/storage';
import { Button } from './components/ui';
import { exportJSON, exportCSV } from './data/exporters';

/** Clave de sessionStorage para saber si el intro ya se mostró en esta pestaña/sesión. */
const INTRO_KEY = 'hasSeenIntro';
/** Clave de sessionStorage que mantiene la sesión abierta entre recargas. */
const AUTH_KEY = 'isAuthenticated';
/** Clave de sessionStorage con el rol del usuario autenticado. */
const ROLE_KEY = 'userRole';
/** Clave de sessionStorage con el usuario autenticado (llave del onboarding). */
const USER_KEY = 'userName';
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
function Shell({ onLogout, isPreview, role, profileName }) {
  const [theme, setTheme] = useState(readTheme);
  const isDark = theme === THEMES.DARK;

  // Sincroniza la clase del <html> con el tema elegido.
  useEffect(() => { applyTheme(theme); }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme((t) => (t === THEMES.DARK ? THEMES.LIGHT : THEMES.DARK));
  }, []);

  // La app abre en "Hoy": el Diagnóstico 360 se alcanza desde "Ver más".
  const [section, setSection] = useState('home');
  const [step, setStep] = useState(stepFromHash);

  // La vista previa multi-dispositivo es una herramienta interna: sólo el
  // admin la ve, y nunca se anida dentro de su propio iframe.
  const canUsePreview = isAdmin(role) && !isPreview;
  // Si la sección guardada ya no está permitida, se degrada al inicio.
  const activeSection = section === 'preview' && !canUsePreview ? 'home' : section;

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
      isDark={isDark}
      onToggleTheme={toggleTheme}
      username={profileName}
    >
      {activeSection === 'preview' ? (
        <DevicePreview />
      ) : activeSection === 'home' ? (
        <TodayView name={profileName} />
      ) : activeSection === 'productivity' ? (
        <ProductivityDashboard />
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

export default function App() {
  const [isPreview] = useState(isPreviewFrame);
  // Dentro del iframe de vista previa no se repite el splash: molesta al
  // estar cambiando de dispositivo constantemente.
  const [isAppReady, setIsAppReady] = useState(isPreview);
  // La sesión se rehidrata desde sessionStorage para no pedir la clave
  // en cada recarga dentro de la misma pestaña. Se exige además un rol
  // válido: las sesiones creadas antes de que existieran los roles se
  // consideran caducas y piden login de nuevo, en lugar de quedarse sin
  // permisos de forma silenciosa.
  const [role, setRole] = useState(() => {
    const stored = sessionStorage.getItem(ROLE_KEY) ?? '';
    return isValidRole(stored) ? stored : '';
  });
  const [username, setUsername] = useState(() => sessionStorage.getItem(USER_KEY) ?? '');
  const [isAuthenticated, setIsAuthenticated] = useState(
    () =>
      sessionStorage.getItem(AUTH_KEY) === 'true' &&
      isValidRole(sessionStorage.getItem(ROLE_KEY) ?? ''),
  );
  // Perfil del onboarding; `null` significa que aún no lo completó.
  const [profile, setProfile] = useState(() =>
    readProfile(sessionStorage.getItem(USER_KEY) ?? ''),
  );

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

  const handleLoginSuccess = useCallback((user) => {
    sessionStorage.setItem(AUTH_KEY, 'true');
    sessionStorage.setItem(ROLE_KEY, user.role);
    sessionStorage.setItem(USER_KEY, user.username);
    setRole(user.role);
    setUsername(user.username);
    // Si ya hizo el onboarding antes, se salta; si no, quedará en null.
    setProfile(readProfile(user.username));
    setIsAuthenticated(true);
  }, []);

  const handleLogout = useCallback(() => {
    sessionStorage.removeItem(AUTH_KEY);
    sessionStorage.removeItem(ROLE_KEY);
    sessionStorage.removeItem(USER_KEY);
    setRole('');
    setUsername('');
    setProfile(null);
    setIsAuthenticated(false);
  }, []);

  // El onboarding se guarda por usuario, así que sobrevive al cierre de sesión.
  const handleProfileComplete = useCallback((answers) => {
    saveProfile(username, answers);
    setProfile(answers);
  }, [username]);

  if (!isAppReady) return <SplashScreen />;

  if (!isAuthenticated) return <LoginScreen onLoginSuccess={handleLoginSuccess} />;

  // Perfil incompleto: se levanta el onboarding antes de entrar a la app.
  if (!profile) return <AgentProfiler onComplete={handleProfileComplete} />;

  return (
    <FinanceProvider>
      <ReferralProvider>
        {/* La agenda es por usuario, así que el provider vive dentro del área
            autenticada, donde ya se conoce quién entró. */}
        <EventProvider username={username}>
          <Shell
            onLogout={handleLogout}
            isPreview={isPreview}
            role={role}
            profileName={username}
          />
        </EventProvider>
      </ReferralProvider>
    </FinanceProvider>
  );
}
