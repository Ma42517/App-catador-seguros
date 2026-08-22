import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  PlayCircle, RotateCcw, Download, FileJson, X, Gauge,
  LayoutList, LineChart as LineChartIcon, FlaskConical, ArrowLeft, User, Building2,
} from 'lucide-react';
import { FinanceProvider, useFinance } from './context/FinanceContext';
import { ReferralProvider } from './context/ReferralContext';
import StepWizard from './components/Wizard/StepWizard';
import { STEPS, FIRST_INSIGHT_STEP } from './components/Wizard/steps';
import ExecutiveDashboard from './components/Dashboard/ExecutiveDashboard';
import SplashScreen from './components/SplashScreen';
import Login from './components/Auth/Login';
import PendingApproval from './components/Auth/PendingApproval';
import OnboardingFlow from './components/Auth/OnboardingFlow';
import AdminLayout from './components/Layout/AdminLayout';
import DevicePreview from './components/Layout/DevicePreview';
import TodayView from './components/Home/TodayView';
import CalendarView from './components/Calendar/CalendarView';
import ProductivityDashboard from './components/Productivity/ProductivityDashboard';
import PromotorDashboard from './components/Promotoria/PromotorDashboard';
import PromotorSetup from './components/Promotoria/PromotorSetup';
import { EventProvider } from './context/EventContext';
import { AccessProvider } from './context/AccessContext';
import { GoalsProvider } from './context/GoalsContext';
import {
  SessionProvider, InjectedSession, useSession, SESSION_STATUS,
} from './context/SessionContext';
import {
  canRunPromotoria, isApprovedRole, canManage as canManageRole, isAdminRole,
  isPromoterOwner, isAssistantRole, PROFILE_ROLES,
} from './data/profilesRepo';
import {
  DashboardVersionContext, DASHBOARD_VERSIONS, readVersion, writeVersion,
} from './context/dashboardVersion';
import { readPreference, writePreference } from './lib/uiPreference';
import { prospectNameFrom } from './lib/prospectText';
import { hasCapturedData } from './data/defaults';
import ConversationalWizard from './components/Wizard/ConversationalWizard';
import UnderwritingDrawer from './components/Prospecta/UnderwritingDrawer';

/** Dónde se recuerda qué versión de la captura se está usando. */
const CAPTURE_KEY = 'df360:captureMode:v1';

/** Las dos versiones de la captura, en el orden en que se ofrecen. */
const CAPTURE_MODES = [
  { value: 'v1', label: 'Captura Clásica (V1)' },
  { value: 'v2', label: 'Asistente Interactivo (V2)' },
];

/*
  El Asistente Interactivo (V2) se descarta por ahora, sin borrar su código:
  se apaga aquí, en un solo lugar, en vez de desmontar `ConversationalWizard`
  o desarmar el selector de prueba A/B pieza por pieza. Volver a mostrarlo el
  día que se retome es cambiar este valor a `true`, no reconstruir nada.
*/
const V2_ENABLED = false;
import PublicCardView from './pages/PublicCardView';
import { publicCardIdFromPath } from './lib/publicRoute';
import { Button, SegmentedControl } from './components/ui';
import { exportJSON } from './data/exporters';

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
 * `?onboardingPreview=1`: entorno para probar `OnboardingFlow` de punta a
 * punta —incluida la app que hay al otro lado, una vez "aprobado"— sin
 * crear ni abrir ninguna cuenta real.
 *
 * Se resuelve en `App()`, antes de montar `SessionProvider` — misma idea que
 * la tarjeta pública (`publicCardIdFromPath`) un poco más abajo—: así el
 * flujo no depende de que exista una sesión, ni de Supabase, ni de ningún
 * registro con estado `pending` de verdad. Es sólo para desarrollo; no se
 * enlaza desde ningún sitio de la app y desaparece si se quita el parámetro
 * de la URL. Ver `OnboardingPreview` para el detalle de la simulación de
 * aprobación.
 */
function isOnboardingPreview() {
  if (typeof window === 'undefined') return false;
  return new URLSearchParams(window.location.search).get('onboardingPreview') === '1';
}

/**
 * Clave fija para la vista previa: no es un UUID real de Supabase, así que
 * todo lo que se guarda por usuario (agenda, metas, bloques de tiempo)
 * queda bajo este identificador — entrar varias veces a la vista previa
 * encuentra los mismos datos de prueba, en vez de arrancar en blanco cada
 * vez.
 */
const PREVIEW_KEY = 'preview-sin-cuenta';

/*
  Mismas claves de localStorage que `data/advisorPoints.js` y
  `data/safeZone.js` (no se importan de ahí porque son constantes internas
  de esos módulos, no exportadas): el botón "Reiniciar puntos de prueba" de
  más abajo necesita borrar justo esas dos entradas, y sólo la parte de
  `PREVIEW_KEY` dentro de ellas —pero como ambos módulos guardan todo bajo
  una sola clave compartida por todos los usuarios (`{ [username]: valor
  }`), borrar la clave completa es seguro aquí: en este entorno de vista
  previa nunca hay otro usuario real compartiendo la misma clave de
  localStorage.
*/
const PREVIEW_POINTS_KEY = 'df360:advisorPoints:v1';
const PREVIEW_SAFE_ZONE_KEY = 'df360:safeZone:v1';

/**
 * Valor simulado de `useSession()` para la vista previa.
 *
 * Sin esto, `SessionContext.Provider` recibiría sólo `identity` y
 * `Shell` funcionaría a medias: en cuanto la persona abriera el menú "Ver
 * más", la tarjeta digital o cualquier otra pantalla que también llama a
 * `useSession()` (`PriorityAlerts`, `AdminLayout`, `AccessBar`...), esa
 * llamada encontraría un contexto con la forma equivocada —`identity`
 * suelto, sin `role`, sin `refreshIdentity`— y fallaría en cuanto leyera
 * una propiedad que no está, tirando la pantalla a negro igual que sin
 * proveedor. Se construye con la misma forma exacta que arma
 * `SessionProvider`, con funciones no-op donde tocaría escribir en
 * Supabase: aquí no hay sesión real que cerrar ni ficha real que releer.
 *
 * `role: PROFILE_ROLES.ADVISOR` porque el resto de la app (menú, permisos)
 * espera un rol aprobado para dibujar sus pantallas normales; con
 * `advisorProfileData` ya resuelto no hace falta simular ningún otro rol
 * para este propósito.
 */
function buildPreviewSessionValue(advisorProfileData, role = PROFILE_ROLES.ADVISOR) {
  const identity = {
    key: PREVIEW_KEY,
    name: advisorProfileData.nombre || 'Asesor',
    email: '',
    avatarUrl: '',
    role,
    promotorId: null,
    promotoriaStatus: null,
    promotoriaCode: '',
    company: '',
    phone: '',
    whatsapp: '',
    experienceLevel: advisorProfileData.perfil || '',
    advisorProfileData,
  };

  return {
    status: SESSION_STATUS.READY,
    identity,
    error: '',
    isApproved: isApprovedRole(role),
    isPending: false,
    canManage: canManageRole(role),
    canRunPromotoria: canRunPromotoria(role),
    isPromoterOwner: isPromoterOwner(role),
    isAssistant: isAssistantRole(role),
    isAdmin: isAdminRole(role),
    role,
    promotoriaStatus: null,
    isAwaitingPromotoria: false,
    promotorId: null,
    needsPromotoria: false,
    googleEnabled: false,
    signInWithGoogle: async () => ({ error: null }),
    signInWithPassword: async () => ({ error: null }),
    signUpWithPassword: async () => ({ error: null }),
    signOut: async () => { window.location.reload(); },
    refreshRole: async () => ({ changed: false }),
    refreshIdentity: async () => {},
  };
}

/**
 * Conmutador tipo pill entre las dos grandes fases de la app: captura
 * (pasos 0-5) y lectura (diagnóstico + optimización). Sólo cambia de
 * paso dentro del mismo StepWizard; no introduce una ruta nueva.
 */
function NavPill({ step, onNavigate }) {
  /*
    El corte entre captura y lectura se importa del wizard, no se escribe aquí.

    Estaba copiado como un `6` literal en las dos líneas de abajo. Al partir "Activos" en
    "Ahorro y Afore" y "Patrimonio", el diagnóstico se corrió al 7: este conmutador habría
    seguido mandando al 6, que ahora es Metas, y habría marcado como "Diagnóstico" un paso
    de captura. Un número derivado no se desincroniza.
  */
  const isCapture = step < FIRST_INSIGHT_STEP;
  const groups = [
    { key: 'capture', label: 'Captura', short: 'Captura', Icon: LayoutList, target: 0 },
    {
      key: 'insights', label: 'Diagnóstico', short: 'Diag.',
      Icon: LineChartIcon, target: FIRST_INSIGHT_STEP,
    },
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

function Header({ step, onNavigate, onExit }) {
  const { loadDemoData, resetAll, data, isDemo } = useFinance();
  const [menuOpen, setMenuOpen] = useState(false);

  /*
    El botón de limpiar sólo existe si hay algo que limpiar. Los datos de ejemplo
    cuentan: son lo que más veces hay que quitar de encima.
  */
  const canClear = isDemo || hasCapturedData(data);

  /**
   * Borra todo. Pregunta antes sólo si lo que se va a perder es del usuario.
   *
   * Confirmar para descartar los datos de ejemplo es fricción sin nada que
   * proteger: no son de nadie y se recuperan con un clic en "Cargar Demo". El
   * aviso se guarda para cuando de verdad hay trabajo capturado detrás.
   */
  const handleClear = () => {
    if (!isDemo
      && !window.confirm('Esto borrará toda tu información capturada. ¿Continuar?')) {
      return;
    }
    resetAll();
    setMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-30 border-b border-zinc-800 bg-zinc-950/85 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-5xl items-center gap-2 px-4">
        {/*
          La salida de la sección, en la esquina superior izquierda.

          Es la contrapartida de haber escondido la barra inferior: sin ella, esta
          era la única pantalla de la app sin vuelta atrás. Va primero en el orden de
          lectura y de tabulación, que es donde se busca.

          En el teléfono se queda sólo la flecha. La palabra "Regresar" ocupaba el
          sitio del título del módulo en una cabecera de dieciséis unidades de alto,
          y una flecha a la izquierda no necesita que le expliquen qué hace.
        */}
        <button
          type="button"
          onClick={onExit}
          className="-ml-1 flex shrink-0 items-center gap-1 rounded-lg px-2 py-1.5 text-xs
                     font-semibold text-zinc-400 transition-colors hover:bg-zinc-800/70
                     hover:text-zinc-100 focus-visible:outline-none focus-visible:ring-2
                     focus-visible:ring-indigo-500"
        >
          <ArrowLeft size={16} className="shrink-0" />
          <span className="hidden sm:inline">Regresar</span>
          <span className="sr-only sm:hidden">Regresar</span>
        </button>

        {/* Marca */}
        <span
          className="mr-1 hidden h-9 w-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 shadow-lg shadow-indigo-600/30 lg:grid"
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

        {/*
          Contorno ámbar y no el azul relleno que tenía antes.

          Siendo el único botón sólido de la cabecera, "Cargar Demo" era lo más
          llamativo de la pantalla: la acción de pruebas pesaba más que capturar o
          exportar, que es el trabajo real. El ámbar lo marca como lo que es —un
          atajo de demostración— y lo emparenta con el aviso de la V2.
        */}
        <Button
          size="sm"
          variant="outline"
          icon={PlayCircle}
          onClick={loadDemoData}
          className="shrink-0 border-amber-500/30 text-amber-200/90
                     hover:border-amber-400/60 hover:bg-amber-500/10 hover:text-amber-100"
        >
          <span className="hidden sm:inline">Cargar Demo</span>
          <span className="sm:hidden">Demo</span>
        </Button>

        {/*
          Limpiar sale de dentro del menú de exportar y se pone a la vista, pero
          sólo cuando hay algo que borrar: en una app en blanco no aparece.

          Estaba escondido como tercer elemento de un desplegable llamado
          "Exportar", donde nadie busca cómo empezar de nuevo. Quien acababa de
          cargar el ejemplo por curiosidad no encontraba la vuelta.
        */}
        {canClear && (
          <Button
            size="sm"
            variant="ghost"
            icon={RotateCcw}
            onClick={handleClear}
            className="shrink-0 text-zinc-500 hover:bg-rose-500/10 hover:text-rose-300"
          >
            <span className="hidden sm:inline">Limpiar</span>
          </Button>
        )}

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
              {/*
                Aquí estaba "Exportar diagnóstico (CSV)". El reporte para el cliente —PDF y
                Excel— se fue al último paso, donde el diagnóstico ya está completo: desde la
                cabecera se podía descargar el reporte de una captura a medias, que es un
                documento que desprestigia a quien lo entrega.

                Se conserva el respaldo en JSON porque no es un reporte: es la copia
                reimportable de los datos, una herramienta del asesor y no un entregable.
              */}
              <button
                type="button"
                onClick={() => { exportJSON(data); setMenuOpen(false); }}
                className="flex w-full items-center gap-2 border-t border-zinc-800 px-3 py-2.5 text-left text-xs text-zinc-300 hover:bg-zinc-900/50"
              >
                <FileJson size={14} className="text-zinc-500" />
                Respaldar mis datos (JSON)
              </button>
              {/*
                Aquí estaba "Empezar de cero". Se fue a la cabecera como "Limpiar":
                dejarlo en los dos sitios daría dos caminos a la misma acción
                destructiva, con dos confirmaciones que mantener en sintonía.
              */}
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
  onLogout, isPreview, isAdmin, isPromoterUser, storageKey, displayName, horario, inquietud,
  mercado, perfil,
  /*
    Con qué pestaña abre el Shell. Por omisión "Hoy" —lo de siempre para
    cualquier asesor real, aprobado o en vista previa—; sólo la vista previa
    del Promotor (`OnboardingPreview`, más abajo) la cambia a `'promotoria'`
    para aterrizar directo en su propio panel, en vez de en una pestaña
    "Hoy" que un promotor nunca usa de entrada.
  */
  initialSection = 'home',
}) {
  /*
    No hay estado de tema. La app es oscura de forma permanente y la clase `dark`
    vive en el <html> de index.html, así que no hay nada que sincronizar en
    tiempo de ejecución: un interruptor de tema obligaba a mantener cada color en
    dos versiones, y la clara casi nadie la veía.
  */

  // La app abre en "Hoy": el Diagnóstico 360 se alcanza desde "Ver más".
  const [section, setSection] = useState(initialSection);
  const [step, setStep] = useState(stepFromHash);

  /*
    Con qué etapa de Prospecta debe abrir "Productividad" la próxima vez que
    se monte. La pone `handleStartSession` (justo abajo) al presionar
    "Iniciar Sesión" en `InitialMeetingCard.jsx` —la "ruta del módulo de
    presentación" del pedido—, y `ProductivityDashboard` la consume una sola
    vez y avisa (`onAutoOpenConsumed`) para no reabrir Prospecta sola cada
    vez que la persona vuelva a esta pestaña sin haber vuelto a tocar
    "Iniciar Sesión".
  */
  const [prospectaAutoStage, setProspectaAutoStage] = useState(null);

  /*
    Nombre y teléfono del prospecto de la Cita Inicial que se está
    reportando en vivo — se leen del propio evento que ya tenía la
    tarjeta (`InitialMeetingCard.jsx`, "Iniciar Sesión" manda el evento
    completo). Viajan junto con `prospectaAutoStage` porque describen la
    misma cosa: la cita que llegó por notificación, no una que el asesor
    abrió por su cuenta desde el menú.

    Es justo lo que permite que "Avanzamos a Propuesta"
    (`PresentationEndModal.jsx`) llegue a `ActivityForm` con el nombre y el
    teléfono ya puestos —el asesor sólo elige lugar/modalidad y
    fecha/hora—, en vez de tener que volver a escribirlos: ese prospecto
    ya existe, viene de esta misma cita. Cuando la Cita Inicial se abre a
    mano (repasar el guion, presentación hecha fuera de la app), este valor
    se queda en `null` y `ActivityForm` arranca con esos dos campos en
    blanco, como cualquier "Nueva Actividad" — porque en ese caso el
    prospecto no está en ningún lado de la app todavía.
  */
  const [prospectaClient, setProspectaClient] = useState(null);

  const handleStartSession = useCallback((event) => {
    setProspectaAutoStage('cita');
    setProspectaClient({
      name: prospectNameFrom(event?.title),
      phone: event?.telefono ?? '',
    });
    setSection('productivity');
  }, []);

  /*
    Router de ventas del cierre de una Cita Inicial
    (`PresentationEndModal.jsx`): "Avanzamos a Propuesta" y "Requiere
    Seguimiento" no crean el evento ellos mismos, sólo dicen qué prellenar.
    Guardar el prellenado aquí, en el Shell, es lo que le llega a
    `AdminLayout` sin importar en qué sección se esté ("productivity", que
    es de donde viene siempre este llamado): es el mismo antepasado común
    que ya resuelve `prospectaAutoStage` arriba.
  */
  const [activityPrefill, setActivityPrefill] = useState(null);

  const handleRouteToActivity = useCallback((activityType, client) => {
    setActivityPrefill({
      tipoActividad: activityType,
      prospectName: client?.name ?? '',
      prospectPhone: client?.phone ?? '',
    });
  }, []);

  /*
    Botón ámbar (`Sparkles`) del reverso de `PipelineCard.jsx`, "Asistente de
    requisitos": abre `UnderwritingDrawer.jsx` —el expediente médico rápido
    de las 3 Súper Preguntas— como una pantalla completa por encima de todo,
    igual que Prospecta. Estaba conectado hasta aquí en la cadena de props
    (`ActionableCard.jsx` → `AISequence.jsx` → `TodayView.jsx`) pero nunca
    llegaba a un manejador real: el botón no tenía nada que abrir, por eso
    no hacía nada al tocarlo.
  */
  const [underwritingOpen, setUnderwritingOpen] = useState(false);
  const handleOpenRequirements = useCallback(() => setUnderwritingOpen(true), []);

  /*
    Qué versión del diagnóstico se ve. El estado vive aquí, en el Shell, porque es
    el antepasado común de los dos sitios que la deciden: el menú "Ver más", que la
    elige antes de navegar, y el interruptor de pruebas de dentro del tablero.

    Arranca en la versión actual. Mientras el rediseño sea un lienzo, quien abra su
    diagnóstico tiene que encontrar su diagnóstico; a la propuesta nueva se entra a
    propósito, eligiéndola.
  */
  const [dashboardVersion, setDashboardVersion] = useState(readVersion);

  // Se recuerda para que comparar no obligue a elegir en cada visita: esta
  // pantalla se desmonta al cambiar de sección, y comparar es entrar y salir.
  useEffect(() => { writeVersion(dashboardVersion); }, [dashboardVersion]);

  const versionContext = useMemo(
    () => ({ version: dashboardVersion, setVersion: setDashboardVersion }),
    [dashboardVersion],
  );

  /*
    Qué versión de la CAPTURA se usa: el asistente clásico de ocho pasos o la
    propuesta conversacional. Se recuerda por lo mismo que la del tablero: esta
    pantalla se desmonta al cambiar de sección, y comparar dos diseños es entrar y
    salir muchas veces.

    Arranca en la clásica y así debe quedarse mientras V2 esté a medio construir: la
    captura es donde el asesor invierte media hora de trabajo, y la propuesta nueva
    sólo pregunta dos de sus tres pasos. Lo que sí contesta ya va al mismo perfil que
    llena la clásica, así que alternar entre las dos no pierde nada.
  */
  const [captureModeChoice, setCaptureMode] = useState(
    () => readPreference(CAPTURE_KEY, ['v1', 'v2'], 'v1'),
  );

  useEffect(() => { writePreference(CAPTURE_KEY, captureModeChoice); }, [captureModeChoice]);

  /*
    Con el V2 apagado, la sección de captura es siempre la clásica sin
    importar qué haya quedado guardado en el navegador de una sesión
    anterior en la que sí estaba activo. `captureModeChoice` conserva la
    preferencia real para que, al reactivar `V2_ENABLED`, la elección de
    quien ya lo estaba probando vuelva tal como la dejó.
  */
  const captureMode = V2_ENABLED ? captureModeChoice : 'v1';

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

  /*
    El árbol se arma aparte y el proveedor lo envuelve al final. Es para no
    reindentar doscientas líneas de `AdminLayout` sólo por ganar un nivel: un
    cambio así ensucia el historial y esconde la modificación de verdad, que son
    tres líneas.
  */
  const content = (
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
      activityPrefill={activityPrefill}
      onActivityPrefillConsumed={() => setActivityPrefill(null)}
      /*
        El Diagnóstico se queda con la pantalla completa: sin barra inferior.

        Es donde el asesor captura de pie, con el prospecto enfrente y seis módulos
        de formularios por delante. Las dos versiones de la captura ponen su propio
        "Regresar", así que esconder la barra no encierra a nadie.
      */
      immersive={activeSection === 'wizard'}
    >
      {activeSection === 'preview' ? (
        <DevicePreview />
      ) : activeSection === 'home' ? (
        <TodayView
          name={displayName}
          horario={horario}
          inquietud={inquietud}
          mercado={mercado}
          perfil={perfil}
          username={storageKey}
          /*
            El botón "Usar Diagnóstico 360" del push (`DiagnosticPushNudge.jsx`,
            vía `AISequence.jsx`) abre exactamente lo mismo que "Ver más →
            Diagnóstico" (`onOpenDiagnostico` en `AdminLayout.jsx`): fija la
            versión del tablero y navega a la sección `wizard`. Mismo destino,
            dos puertas de entrada — la del push no debe llevar a una copia
            distinta del Diagnóstico.
          */
          onOpenDiagnostic={() => {
            setDashboardVersion(DASHBOARD_VERSIONS[0].value);
            setSection('wizard');
          }}
          onStartSession={handleStartSession}
          onOpenRequirements={handleOpenRequirements}
        />
      ) : activeSection === 'productivity' ? (
        <ProductivityDashboard
          username={storageKey}
          autoOpenProspectaStage={prospectaAutoStage}
          autoOpenProspectaClient={prospectaClient}
          onAutoOpenConsumed={() => { setProspectaAutoStage(null); setProspectaClient(null); }}
          onRouteToActivity={handleRouteToActivity}
        />
      ) : activeSection === 'promotoria' ? (
        <PromotorDashboard />
      ) : activeSection === 'agenda' ? (
        <CalendarView />
      ) : activeSection === 'wizard' && captureMode === 'v2' ? (
        /*
          La propuesta conversacional se queda con la pestaña entera.

          Se decide aquí, antes de montar nada de la versión clásica, y no dentro del
          `main`. Ahí abajo habría convivido con la cabecera, su conmutador de fases,
          el resplandor de cuadrícula y el pie con el aviso legal: la propuesta
          quedaría como un recuadro rodeado de la interfaz que viene a sustituir, que
          es exactamente lo que se pidió evitar.

          La barra de navegación inferior sigue en pie —vive por encima— y es la
          salida de la sección. La vuelta a la captura clásica va dentro, en su
          propia esquina.
        */
        <ConversationalWizard
          onUseClassic={() => setCaptureMode('v1')}
          onExit={() => setSection('home')}
        />
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
            <Header step={step} onNavigate={go} onExit={() => setSection('home')} />
            <main className="mx-auto max-w-5xl px-4 py-6">
              {activeSection === 'wizard' ? (
                <div className="mx-auto w-full max-w-3xl">
                  {/*
                    Selector de la prueba A/B, con borde punteado y su rótulo: es un
                    control de pruebas y no una función del producto. Mezclado con la
                    interfaz de captura parecería parte del diagnóstico, y esto se
                    quita en cuanto una de las dos versiones gane.

                    Vive sólo en la versión clásica. La conversacional toma la
                    pestaña completa y lleva su propia puerta de vuelta: dejarle
                    encima este recuadro con borde punteado sería devolverle justo el
                    marco de la versión que viene a sustituir.

                    Con `V2_ENABLED` en falso no hay nada que elegir: un
                    interruptor con una sola opción real no es un control, es una
                    promesa vacía. Se oculta en vez de dejarlo deshabilitado —la
                    interfaz no ofrece lo que no puede cumplir.
                  */}
                  {V2_ENABLED && (
                    <div className="mb-5 flex flex-wrap items-center justify-between gap-2
                                    rounded-xl border border-dashed border-zinc-700 p-2.5"
                    >
                      <span className="flex items-center gap-1.5 pl-1 text-[10px] font-bold
                                       uppercase tracking-widest text-zinc-500"
                      >
                        <FlaskConical size={12} aria-hidden="true" />
                        Prueba A/B · Captura
                      </span>

                      <SegmentedControl
                        value={captureMode}
                        onChange={setCaptureMode}
                        options={CAPTURE_MODES}
                      />
                    </div>
                  )}

                  <StepWizard step={step} onStepChange={go} />
                </div>
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

  return (
    <DashboardVersionContext.Provider value={versionContext}>
      {content}

      {/*
        Overlay independiente, fuera de `AdminLayout`: se abre por encima de
        cualquier sección (hoy sólo desde "Hoy", pero no depende de estar
        en ella) y "Cerrar" sólo apaga este estado, sin tocar `section`.
      */}
      {underwritingOpen && (
        <div className="fixed inset-0 z-[75] overflow-y-auto bg-black">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-grid-fade" aria-hidden="true" />
          <div className="relative mx-auto max-w-md px-4 pb-16 pt-6">
            <UnderwritingDrawer
              onBack={() => setUnderwritingOpen(false)}
              backLabel="Cerrar"
            />
          </div>
        </div>
      )}
    </DashboardVersionContext.Provider>
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
    status, identity, isApproved, canManage, isAdmin, role, signOut, refreshIdentity,
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

    Sin aprobar hay dos vistas posibles, y la que corresponde se decide con
    `identity.experienceLevel`: vacío significa que la persona nunca pasó por
    el Onboarding (registro nuevo, primera vez), así que le toca el
    recorrido completo de nueve pasos. Ya elegida una etapa —en esta
    sesión o en cualquiera anterior—, cualquier apertura posterior mientras
    el rol siga pendiente cae directo en la sala de espera de siempre: la
    bienvenida es un momento, no una pantalla de estado que se repite cada
    vez que se recarga la página.
  */
  if (!isApproved) {
    return identity.experienceLevel
      ? <PendingApproval />
      : <OnboardingFlow userId={identity.key} onProfileSaved={refreshIdentity} />;
  }

  /*
    Detección automática de qué Onboarding le toca a cada rol — sin ningún
    selector ni botón que preguntar: quien entra ya es promotor o ya es
    asesor en la base (`role`, escrito por un administrador o por el propio
    registro), y de eso —no de nada que la persona elija aquí— depende cuál
    de los dos recorridos ve.

    El asesor pasa por `OnboardingFlow` (arriba) mientras `experienceLevel`
    esté vacío. El promotor NUNCA pasa por ahí —su ficha nace ya aprobada,
    directo en `role = 'promoter'`, el día que un administrador lo asciende
    (`AccessRequests.jsx`, "Hacer Promotor")—, así que sin este bloque
    aterrizaría de una vez en `Shell` sin haber configurado su agencia ni su
    código de invitación. Se usa `isPromoterOwner(role)` y no
    `canRunPromotoria(role)`: el asistente de una promotoría ya existente se
    vincula con el código de su titular, no crea una agencia propia, así que
    nunca debe ver esta pantalla.

    "¿Ya configuró su agencia?" no tiene una columna dedicada — se infiere
    de dos datos que `PromotorSetup` es quien primero llena: el nombre de la
    agencia (`company`, en la tarjeta digital) y el código de invitación
    (`promotoriaCode`). Mientras los dos sigan vacíos, la configuración
    nunca ha corrido y le toca esta pantalla; basta que uno de los dos ya
    exista para no volver a mostrarla.
  */
  if (isPromoterOwner(role) && !identity.company && !identity.promotoriaCode) {
    return (
      <PromotorSetup
        promoterId={identity.key}
        initialName={identity.name}
        onComplete={refreshIdentity}
      />
    );
  }

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
                /*
                  El titular y su asistente. Antes se comparaba con el rol
                  `promoter` exacto, así que un asistente no habría visto la
                  sección que existe para que él la opere.
                */
                isPromoterUser={canRunPromotoria(role)}
                storageKey={identity.key}
                /*
                  El saludo de "Hoy" usa el nombre que la persona escribió en
                  el Paso 1 del Onboarding, no el de su cuenta de Google —
                  `identity.name` cae al correo cuando Google no trae un
                  nombre de perfil (`friendlyNameFrom`, en
                  `SessionContext.jsx`), y sin este respaldo el saludo diría
                  "Hola, smnyl.clientes.22" en vez de "Hola, Marco". El
                  Onboarding es la única vez que se le pregunta directamente
                  cómo quiere que le llamen, así que ese dato manda.
                */
                displayName={identity.advisorProfileData?.nombre || identity.name}
                horario={identity.advisorProfileData?.horario ?? []}
                inquietud={identity.advisorProfileData?.inquietud ?? ''}
                mercado={identity.advisorProfileData?.mercado ?? ''}
                perfil={identity.advisorProfileData?.perfil ?? ''}
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

  if (isOnboardingPreview()) {
    return <OnboardingPreview isPreview={isPreview} />;
  }

  return (
    <SessionProvider>
      <Gate isPreview={isPreview} />
    </SessionProvider>
  );
}

/**
 * `?onboardingPreview=1`: entorno de prueba, sin `SessionProvider` ni
 * ninguna cuenta real detrás, para el flujo completo de un registro nuevo:
 * el Onboarding tal como lo ve la persona, y —simulando la aprobación del
 * administrador con un botón que sólo existe aquí— el resto de la app tal
 * como la vería justo después de que la aceptan.
 *
 * `approvedData` es `null` mientras se recorre el cuestionario; se llena al
 * terminarlo con la radiografía real que la persona contestó
 * (`advisorProfileData`), y sólo entonces aparece el botón de "Simular
 * aprobación" sobre la Sala de Análisis. No hay ningún perfil inventado de
 * antemano: lo que se ve después de aprobar es la app calibrada con las
 * respuestas que de verdad se dieron en esta corrida —el mismo nombre, el
 * mismo horario—, tal como pasaría con una cuenta real.
 */
/**
 * Insignia fija de la esquina superior izquierda, compartida por las
 * cuatro pantallas de `OnboardingPreview` (selector, cuestionario del
 * asesor, configuración del promotor y app ya aprobada): mismo estilo,
 * mismo lugar, para que la vista previa siempre se identifique igual sin
 * importar en qué punto del recorrido está.
 */
function PreviewBadge({ onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="fixed left-3 top-3 z-50 flex items-center gap-1.5 rounded-full
                 border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-[10px]
                 font-bold uppercase tracking-widest text-amber-300/90
                 backdrop-blur-md transition-colors hover:bg-amber-500/20"
    >
      <FlaskConical size={11} aria-hidden="true" />
      {children}
    </button>
  );
}

/**
 * Selector de camino a probar, EXCLUSIVO de `?onboardingPreview=1`.
 *
 * En la app real nunca existe esta pregunta: el rol de cada cuenta ya está
 * decidido en la base (`role` de `profiles`, asignado por un administrador
 * o por el propio flujo de registro), y `Gate` decide en automático —sin
 * preguntarle nada a nadie— cuál Onboarding le toca a cada quien, comparando
 * ese rol (ver el bloque `isPromoterOwner(role)` dentro de `Gate`). Este
 * selector sólo sirve para que, en el entorno de prueba, se pueda recorrer
 * cualquiera de los dos caminos a voluntad sin tener que crear una cuenta
 * real de cada tipo en Supabase.
 */
function PreviewRoleChooser({ onChoose }) {
  return (
    <div className="flex min-h-screen w-full flex-col items-center justify-center gap-8
                    bg-slate-950 px-6 text-center"
    >
      <div>
        <p className="text-xs font-bold uppercase tracking-widest text-amber-400">
          Vista previa
        </p>
        <p className="mt-2 max-w-sm text-xl font-light leading-snug text-white">
          ¿Qué camino quieres probar?
        </p>
        <p className="mt-2 max-w-xs text-[11px] leading-relaxed text-slate-500">
          Este paso no existe en la app real: ahí el rol de la cuenta decide
          esto en automático.
        </p>
      </div>

      <div className="flex w-full max-w-sm flex-col gap-3">
        <button
          type="button"
          onClick={() => onChoose(PROFILE_ROLES.ADVISOR)}
          className="flex items-center gap-3 rounded-2xl border border-slate-700
                     bg-slate-900/60 p-4 text-left transition-colors hover:border-indigo-500/50
                     hover:bg-slate-900"
        >
          <span
            className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border
                       border-indigo-500/30 bg-indigo-500/10 text-indigo-300"
            aria-hidden="true"
          >
            <User size={20} strokeWidth={1.8} aria-hidden="true" />
          </span>
          <span>
            <span className="block text-sm font-semibold text-white">Asesor</span>
            <span className="block text-xs text-slate-500">
              Cuestionario de nueve pasos y su agenda del día
            </span>
          </span>
        </button>

        <button
          type="button"
          onClick={() => onChoose(PROFILE_ROLES.PROMOTER)}
          className="flex items-center gap-3 rounded-2xl border border-slate-700
                     bg-slate-900/60 p-4 text-left transition-colors hover:border-amber-500/50
                     hover:bg-slate-900"
        >
          <span
            className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border
                       border-amber-500/30 bg-amber-500/10 text-amber-300"
            aria-hidden="true"
          >
            <Building2 size={20} strokeWidth={1.8} aria-hidden="true" />
          </span>
          <span>
            <span className="block text-sm font-semibold text-white">Promotor</span>
            <span className="block text-xs text-slate-500">
              Configuración de agencia y panel de equipo
            </span>
          </span>
        </button>
      </div>
    </div>
  );
}

/**
 * `?onboardingPreview=1`: entorno de prueba, sin `SessionProvider` ni
 * ninguna cuenta real detrás.
 *
 * Dos caminos posibles, elegidos con `PreviewRoleChooser` (ver arriba, y su
 * nota sobre por qué este paso no existe fuera de la vista previa):
 *
 *  - **Asesor**: el cuestionario de nueve pasos (`OnboardingFlow`) tal como
 *    lo ve la persona, y —simulando la aprobación del administrador con un
 *    botón que sólo existe aquí— la app ya aprobada, calibrada con las
 *    respuestas reales de esa corrida.
 *  - **Promotor**: directo a `PromotorSetup` (la configuración de agencia
 *    que un promotor real ve la primera vez que entra, sin pasar por
 *    ningún cuestionario de asesor) y, al terminarla, el panel de
 *    Promotoría ya con esa agencia creada.
 */
function OnboardingPreview({ isPreview }) {
  const [role, setRole] = useState(null);
  const [approvedData, setApprovedData] = useState(null);
  const [promoterAgency, setPromoterAgency] = useState(null);

  const reset = () => window.location.reload();

  if (role === PROFILE_ROLES.PROMOTER) {
    if (!promoterAgency) {
      return (
        <div className="relative min-h-screen">
          <PromotorSetup
            promoterId={PREVIEW_KEY}
            onComplete={(agencyName) => setPromoterAgency(agencyName || 'Tu Promotoría')}
            /*
              `PREVIEW_KEY` no es un UUID real de Supabase: sin esta
              bandera, la Fase 3 intentaría escribir de verdad
              (`saveMyCard`/`saveMyCode`) contra una fila que no existe y
              se quedaría atorada mostrando el error de la base en vez de
              avanzar — mismo criterio que ya usa `OnboardingFlow` en este
              mismo entorno (`onProfileSaved={async () => {}}`).
            */
            skipPersistence
          />
          <PreviewBadge onClick={reset}>Vista previa · Promotor</PreviewBadge>
        </div>
      );
    }

    const sessionValue = buildPreviewSessionValue(
      { nombre: '', perfil: '' },
      PROFILE_ROLES.PROMOTER,
    );

    return (
      <div className="relative min-h-screen">
        <InjectedSession value={sessionValue}>
          <FinanceProvider>
            <ReferralProvider>
              <EventProvider username={PREVIEW_KEY}>
                <AccessProvider username={PREVIEW_KEY} forcedPromoter>
                  <GoalsProvider username={PREVIEW_KEY}>
                    <Shell
                      onLogout={reset}
                      isPreview={isPreview}
                      isAdmin={false}
                      isPromoterUser
                      storageKey={PREVIEW_KEY}
                      displayName="Promotor"
                      horario={[]}
                      inquietud=""
                      mercado=""
                      perfil=""
                      /*
                        Un promotor real nunca abre en "Hoy": no tiene
                        agenda propia que revisar ahí, su primera pantalla
                        es su equipo. La vista previa entra directo a lo
                        mismo que vería recién creada su agencia.
                      */
                      initialSection="promotoria"
                    />
                  </GoalsProvider>
                </AccessProvider>
              </EventProvider>
            </ReferralProvider>
          </FinanceProvider>
        </InjectedSession>

        <PreviewBadge onClick={reset}>
          Vista previa · Promotor · {promoterAgency}
        </PreviewBadge>
      </div>
    );
  }

  if (role === PROFILE_ROLES.ADVISOR) {
    if (approvedData) {
      /*
        El valor no se memoriza con `useMemo` porque `approvedData` sólo
        cambia una vez, al terminar el cuestionario: no hay ningún
        re-render frecuente aquí que memoizar evitaría.
      */
      const sessionValue = buildPreviewSessionValue(approvedData);

      return (
        <div className="relative min-h-screen">
          <InjectedSession value={sessionValue}>
            <FinanceProvider>
              <ReferralProvider>
                <EventProvider username={PREVIEW_KEY}>
                  <AccessProvider username={PREVIEW_KEY} forcedPromoter={false}>
                    <GoalsProvider username={PREVIEW_KEY}>
                      <Shell
                        onLogout={reset}
                        isPreview={isPreview}
                        isAdmin={false}
                        isPromoterUser={false}
                        storageKey={PREVIEW_KEY}
                        displayName={approvedData.nombre || 'Asesor'}
                        horario={approvedData.horario ?? []}
                        inquietud={approvedData.inquietud ?? ''}
                        mercado={approvedData.mercado ?? ''}
                        perfil={approvedData.perfil ?? ''}
                      />
                    </GoalsProvider>
                  </AccessProvider>
                </EventProvider>
              </ReferralProvider>
            </FinanceProvider>
          </InjectedSession>

          <PreviewBadge onClick={reset}>Vista previa · ya aprobado</PreviewBadge>

          {/*
            Botón aparte de la insignia de arriba, y no fundido con ella:
            éste hace algo (borra los puntos de prueba) mientras la otra
            sólo informa. Existe porque `useAdvisorPoints` persiste bajo la
            misma `PREVIEW_KEY` fija entre visitas —a propósito, para que la
            agenda de prueba no se resetee sola— y ese mismo acierto es lo
            que esconde `FirstLoginIntro` en la segunda vuelta: una vez
            ganado el punto la primera vez, "Simular aprobación" ya no
            vuelve a mostrarlo, porque la condición real (`puntos === 0`) ya
            no se cumple. Sin este botón, la única forma de volver a verlo
            era borrar la clave a mano desde la consola del navegador.
          */}
          <button
            type="button"
            onClick={() => {
              localStorage.removeItem(PREVIEW_POINTS_KEY);
              localStorage.removeItem(PREVIEW_SAFE_ZONE_KEY);
              reset();
            }}
            className="fixed left-3 top-9 z-50 flex items-center gap-1.5 rounded-full
                       border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-[10px]
                       font-bold uppercase tracking-widest text-amber-300/90
                       backdrop-blur-md transition-colors hover:bg-amber-500/20"
          >
            <FlaskConical size={11} aria-hidden="true" />
            Reiniciar puntos de prueba
          </button>
        </div>
      );
    }

    return (
      <div className="relative min-h-screen">
        <OnboardingFlow
          userId={PREVIEW_KEY}
          onProfileSaved={async () => {}}
          /*
            El resto de esta pantalla no cambia por este prop: sólo lo usa
            la Sala de Análisis, para ofrecer el botón que simula la
            aprobación con la radiografía que se acaba de contestar.
          */
          onSimulateApproval={setApprovedData}
        />
        <PreviewBadge onClick={reset}>Vista previa · Asesor</PreviewBadge>
      </div>
    );
  }

  return <PreviewRoleChooser onChoose={setRole} />;
}
