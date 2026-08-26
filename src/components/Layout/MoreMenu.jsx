import { useEffect, useState } from 'react';
import {
  Gauge, Settings, LogOut, ChevronRight, ChevronDown, X, MonitorSmartphone,
  StickyNote, Wand2, Eraser, BadgeCheck, Database, UserCheck, IdCard, ShieldCheck,
  Users, FlaskConical,
} from 'lucide-react';
import { useSession } from '../../context/SessionContext';
import { DASHBOARD_VERSIONS, useDashboardVersion } from '../../context/dashboardVersion';

/**
 * Título de un grupo de opciones ("HERRAMIENTAS", "CUENTA"...).
 *
 * Vive fuera de la tarjeta del grupo, no dentro: así el título pertenece
 * visualmente al espacio negro del panel y la tarjeta queda limpia, que es lo
 * que hace legible el patrón de lista agrupada.
 */
function SectionTitle({ children }) {
  return (
    <h3 className="mb-2 mt-6 px-1 text-xs font-semibold uppercase tracking-wider text-slate-500">
      {children}
    </h3>
  );
}

/**
 * Tarjeta contenedora de un grupo de filas.
 *
 * `divide-y` traza la línea finísima entre filas, y `overflow-hidden` es lo que
 * recorta la primera y la última contra las esquinas redondeadas — sin él, el
 * fondo de una fila al presionarla se saldría por las puntas.
 *
 * Las filas ya no llevan `rounded-*` propio: en una lista agrupada la esquina
 * la pone la tarjeta, no cada elemento.
 */
function SectionCard({ children }) {
  return (
    <div
      className="divide-y divide-slate-800/50 overflow-hidden rounded-2xl border
                 border-slate-800/60 bg-slate-900/50"
    >
      {children}
    </div>
  );
}

/**
 * Fila estándar del menú.
 * - `hint`: marca lo que aún no está disponible (deshabilita la fila).
 * - `badge`: cantidad que reclama atención. Se pinta en ámbar y no en gris
 *   porque su función es que se note sin tener que leer la fila.
 * - `nested`: fila dentro de un acordeón. Se hunde un poco y usa un ícono más
 *   chico, para leerse como hija de la fila que la despliega.
 *
 * Ya no hay variantes claras: la app es oscura de forma permanente, así que las
 * clases `dark:` duplicadas se retiraron. Mantenerlas obligaba a escribir cada
 * color dos veces y a que cualquier ajuste tuviera que hacerse en dos sitios,
 * con la mitad de las combinaciones sin que nadie las viera nunca.
 */
function MenuRow({
  icon: Icon, label, hint, badge, badgeHint = 'pendientes',
  tone = 'default', nested = false, onClick,
}) {
  const isDanger = tone === 'danger';
  const disabled = Boolean(hint);

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`flex w-full items-center justify-between gap-3 text-left transition-colors
        disabled:cursor-not-allowed disabled:opacity-50
        ${nested ? 'py-3 pl-3 pr-4' : 'px-4 py-3.5'}
        ${isDanger
          ? 'text-red-400 hover:bg-red-500/5 active:bg-red-500/10'
          : 'text-slate-200 hover:bg-slate-800/60 active:bg-slate-800'}`}
    >
      <span className="flex min-w-0 flex-1 items-center gap-3">
        {/*
          El ícono nunca va suelto: su caja lo alinea con el resto de la
          columna y le da un peso propio, de modo que la lista se recorre
          mirando los íconos y no leyendo cada rótulo.
        */}
        <span
          className={`flex shrink-0 items-center justify-center rounded-lg
            ${nested ? 'h-7 w-7' : 'h-8 w-8'}
            ${isDanger ? 'bg-red-500/10 text-red-400' : 'bg-slate-800 text-slate-300'}`}
          aria-hidden="true"
        >
          <Icon size={nested ? 14 : 16} />
        </span>

        <span className={`min-w-0 flex-1 font-medium ${nested ? 'text-[13px]' : 'text-sm'}`}>
          {label}
        </span>
      </span>

      <span className="flex shrink-0 items-center gap-2">
        {badge ? (
          <span
            className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[11px] font-bold
                       text-amber-400"
          >
            {badge}
            {/*
              El distintivo casi siempre es un número, y un "3" a secas no dice
              nada en voz alta. Por eso lleva su aclaración, y por eso se puede
              vaciar: cuando el distintivo ya es una palabra —"Activa"—,
              añadirle "pendientes" convertía la pista en una frase falsa.
            */}
            {badgeHint && <span className="sr-only"> {badgeHint}</span>}
          </span>
        ) : null}

        {hint ? (
          <span className="rounded-full border border-slate-700 px-2 py-0.5 text-[10px]
                           font-semibold uppercase tracking-wide text-slate-500"
          >
            {hint}
          </span>
        ) : (
          <ChevronRight size={16} className="text-slate-600" aria-hidden="true" />
        )}
      </span>
    </button>
  );
}

/**
 * Cabecera de un acordeón dentro de una tarjeta de grupo.
 *
 * Comparte la misma altura y el mismo tratamiento de ícono que `MenuRow` para
 * que no se lea como una pieza distinta; lo único que cambia es el
 * `ChevronDown` que gira, y que puede llevar un subtítulo.
 */
function AccordionHeader({
  icon: Icon, label, sublabel, isOpen, badge, badgeHint, tone = 'default', onClick,
}) {
  const isAccent = tone === 'accent';

  return (
    <button
      type="button"
      onClick={onClick}
      aria-expanded={isOpen}
      className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left
                 transition-colors hover:bg-slate-800/60 active:bg-slate-800"
    >
      <span className="flex min-w-0 flex-1 items-center gap-3">
        <span
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg
            ${isAccent
            ? 'bg-indigo-500/15 text-indigo-300'
            : 'bg-slate-800 text-slate-300'}`}
          aria-hidden="true"
        >
          <Icon size={16} />
        </span>

        <span className="min-w-0 flex-1">
          <span className="block text-sm font-medium text-slate-200">{label}</span>
          {sublabel && (
            <span className="mt-0.5 block text-[11px] text-slate-500">{sublabel}</span>
          )}
        </span>
      </span>

      <span className="flex shrink-0 items-center gap-2">
        {badge ? (
          <span
            className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[11px] font-bold
                       text-amber-400"
          >
            {badge}
            {badgeHint && <span className="sr-only"> {badgeHint}</span>}
          </span>
        ) : null}

        <ChevronDown
          size={16}
          className={`text-slate-600 transition-transform duration-200
                      ${isOpen ? 'rotate-180' : ''}`}
          aria-hidden="true"
        />
      </span>
    </button>
  );
}

/**
 * Miniatura de la foto de perfil, o el ícono genérico si no hay ninguna.
 *
 * La foto sale de la identidad de la sesión, que se relee al guardar la tarjeta:
 * por eso el cambio se ve al instante, sin recargar.
 *
 * Si la imagen no carga —una URL caducada, el bucket que dejó de ser público— se
 * vuelve al ícono. Sin ese respaldo quedaría un hueco roto en el lugar más
 * visible del panel.
 */
function CardAvatar({ url }) {
  const [failed, setFailed] = useState(false);

  // Una foto nueva merece otro intento: el fallo anterior era de la anterior.
  useEffect(() => { setFailed(false); }, [url]);

  if (url && !failed) {
    return (
      <img
        src={url}
        alt="Tu foto de perfil"
        onError={() => setFailed(true)}
        /*
          Sin esta política, las fotos alojadas por Google responden 403 cuando
          el navegador manda la cabecera de referencia.
        */
        referrerPolicy="no-referrer"
        className="h-11 w-11 shrink-0 rounded-full border border-indigo-500/30 object-cover"
      />
    );
  }

  return (
    <span
      className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-indigo-500/15
                 text-indigo-200 ring-1 ring-indigo-500/30"
      aria-hidden="true"
    >
      <IdCard size={22} />
    </span>
  );
}

/**
 * Panel secundario (bottom sheet) abierto desde "Ver más".
 *
 * ── Estructura: lista agrupada ────────────────────────────────────────────
 *
 * Antes era una lista plana de once filas seguidas sobre negro: para encontrar
 * "Vaciar agenda" había que leer todas las anteriores, porque nada indicaba de
 * qué trataba cada tramo. Ahora las opciones se reparten en tarjetas por tema
 * (`SectionTitle` + `SectionCard`), el patrón de los ajustes de iOS: el título
 * en gris sobre el fondo negro dice de qué va el bloque, y la tarjeta lo
 * encierra con una línea finísima entre filas.
 *
 * El orden de los grupos sigue la frecuencia de uso real, no la importancia
 * declarada: la tarjeta digital arriba (se abre delante de un prospecto), luego
 * las herramientas del día, después la cuenta, y al final lo que rara vez se
 * toca —los datos de la agenda y la administración—. "Cerrar sesión" va en su
 * propio bloque, separado del resto: es la única acción sin retorno, y no debe
 * compartir tarjeta con nada que se toque a diario.
 *
 * ── Permisos ──────────────────────────────────────────────────────────────
 *
 * `isAdminUser` es la única llave: con ella se dibuja el acordeón de
 * administración y sin ella no existe en el marcado. Hoy llega desde
 * `AdminLayout`, que la calcula como "es el administrador de la app **o**
 * desbloqueó el modo promotor con su código" —dos permisos distintos que llevan
 * al mismo lugar—, y su origen último es el rol del perfil en Supabase
 * (`profiles.role`, vía `SessionContext`).
 *
 * Para engancharlo a otra fuente basta con cambiar quién pasa esa prop: no hay
 * ninguna comprobación de rol repartida por dentro de este componente. Y se
 * omite el marcado en lugar de esconderlo con CSS a propósito: una fila oculta
 * con `hidden` sigue estando en el DOM y se puede alcanzar con el teclado o
 * quitándole la clase desde el inspector.
 */
export default function MoreMenu({
  open, onClose, onOpenDiagnostico, onOpenPreview, onOpenNotes, onOpenProfile,
  onOpenAdmin, onOpenApprovals, onOpenCard, onLogout, onLoadDemo, onClearAgenda,
  canUsePreview = false, isAdminUser = false, isPromoterUser = false,
  onOpenPromotoria, pendingCount = 0,
}) {
  const { identity } = useSession();
  const { version } = useDashboardVersion();
  const [isAdminOpen, setAdminOpen] = useState(false);
  const [isDiagOpen, setDiagOpen] = useState(false);

  // Cerrar con Escape y bloquear el scroll del fondo mientras está abierto.
  useEffect(() => {
    if (!open) return undefined;
    const onKeyDown = (e) => { if (e.key === 'Escape') onClose(); };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, onClose]);

  // El acordeón vuelve cerrado en cada apertura: dejarlo abierto haría que el
  // menú de un administrador arrancara con nueve filas y el propósito del
  // acordeón —que la lista quepa— se perdería.
  useEffect(() => {
    if (open) return;
    setAdminOpen(false);
    setDiagOpen(false);
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60]" role="dialog" aria-modal="true" aria-label="Ver más">
      {/* Fondo atenuado: cerrar al tocar fuera */}
      <button
        type="button"
        aria-label="Cerrar menú"
        onClick={onClose}
        className="absolute inset-0 h-full w-full cursor-default bg-black/60 backdrop-blur-sm"
      />

      {/*
        Hoja inferior.

        `flex` en columna con alto máximo es lo que arregla el desbordamiento: la
        cabecera es un hermano que no se encoge y la lista es la que se desplaza.
        Con la cabecera dentro del área desplazable —aunque fuera `sticky`— el
        contenido le pasa por debajo y en iOS parpadea al rebotar el scroll.

        El alto va en `dvh` y no en `vh`: en un móvil, `100vh` cuenta la altura de
        la ventana **sin** descontar la barra de direcciones del navegador, así que
        las últimas filas —"Vaciar agenda" y "Cerrar sesión"— quedaban debajo de
        ella, imposibles de alcanzar. `dvh` mide el espacio que de verdad se ve.
      */}
      <div
        className="animate-rise absolute inset-x-0 bottom-0 mx-auto flex max-h-[88dvh] w-full
                   max-w-lg flex-col rounded-t-3xl border-t border-slate-800 bg-slate-950"
      >
        {/*
          ── Cabecera fija ──

          Fondo sólido: es lo que garantiza que ninguna fila se transparente por
          detrás al desplazarse. Contiene sólo el cierre y la tarjeta, que son
          las dos cosas que deben estar siempre alcanzables.
        */}
        <header className="relative z-50 shrink-0 rounded-t-3xl bg-slate-950 px-4 pb-3 pt-3">
          {/*
            Asa y cierre en una fila real, no con `absolute`.

            Ahí estaba el error: la X iba posicionada en absoluto sobre una fila
            que sólo medía el grosor del asa —seis píxeles—, así que sus treinta y
            seis de alto invadían el espacio de la tarjeta. Y como la tarjeta
            aparece después en el marcado, se pintaba encima y se comía el botón.
            Subirle el `z-index` lo habría dejado visible pero flotando sobre la
            tarjeta, tapándole la foto.

            Como fila de verdad —con su alto de `h-9` y el asa centrada por un
            contrapeso del mismo ancho que el botón— nada puede solaparse: cada
            pieza ocupa su sitio y el navegador reserva el espacio.
          */}
          <div className="mb-2 flex h-9 items-center justify-between">
            {/* Contrapeso invisible: mantiene el asa en el centro exacto. */}
            <span className="w-9 shrink-0" aria-hidden="true" />

            <span className="h-1.5 w-10 rounded-full bg-slate-700" aria-hidden="true" />

            <button
              type="button"
              onClick={onClose}
              aria-label="Cerrar"
              className="grid h-9 w-9 shrink-0 place-items-center rounded-full
                         text-slate-400 transition-colors hover:bg-slate-800
                         hover:text-slate-100 active:scale-90 focus-visible:outline-none
                         focus-visible:ring-2 focus-visible:ring-indigo-400"
            >
              <X size={18} />
            </button>
          </div>

          {/*
            ── Tarjeta Hero ──

            Es lo que el asesor abre delante de un prospecto, así que ocupa el
            primer lugar y viaja en la cabecera: nunca se va de la vista por más
            que se baje la lista.

            El degradado hacia índigo y el borde `indigo-500/20` la separan de
            los grupos de abajo, que son grises: en una lista agrupada todo
            compite por parecer igual, y este bloque es el único que debe
            destacar. Sigue siendo oscuro —de `slate-800` a `indigo-950`—, no un
            bloque de color saturado que rompería el modo oscuro del panel.
          */}
          <button
            type="button"
            onClick={onOpenCard}
            className="flex w-full items-center gap-4 rounded-2xl border border-indigo-500/20
                       bg-gradient-to-r from-slate-800 to-indigo-950 p-3.5 text-left
                       text-white shadow-lg shadow-indigo-950/40 transition-transform
                       hover:scale-[1.01] active:scale-[0.99]"
          >
            <CardAvatar url={identity?.avatarUrl} />
            <span className="min-w-0 flex-1">
              <span className="block text-[15px] font-bold leading-tight">
                Mi Tarjeta Digital
              </span>
              <span className="mt-0.5 block text-[11px] text-slate-400">
                Tu presentación profesional, lista para mostrar
              </span>
            </span>
            <ChevronRight size={18} className="shrink-0 text-slate-400" aria-hidden="true" />
          </button>
        </header>

        {/*
          ── Lista desplazable ──

          `flex-1` le da todo el alto que sobra y `overflow-y-auto` hace el resto.
          Sin `overscroll-contain` aquí no haría falta pensar en el fondo, pero
          esta hoja **sí** lo lleva: cubre la pantalla completa por abajo y, al
          llegar al final de la lista, seguir arrastrando movería la página de
          detrás —que está congelada— y el gesto se sentiría roto.
        */}
        <div className="flex-1 overflow-y-auto overscroll-contain px-4 pb-4 pb-safe">
          {/* ── Herramientas del día ── */}
          <SectionTitle>Herramientas</SectionTitle>
          <SectionCard>
            {/*
              Con una sola versión disponible (el rediseño V2 está descartado,
              ver `DASHBOARD_V2_ENABLED` en dashboardVersion.js) no hay nada que
              elegir: la fila navega directo, en vez de desplegar un acordeón con
              una sola opción ya activa. Es la misma razón por la que el
              conmutador de captura desaparece con `V2_ENABLED` en falso — un
              control con una sola salida no es una elección, es ruido.
            */}
            {DASHBOARD_VERSIONS.length <= 1 ? (
              <MenuRow
                icon={Gauge}
                label="Diagnóstico 360"
                onClick={() => onOpenDiagnostico(DASHBOARD_VERSIONS[0].value)}
              />
            ) : (
              /*
                El diagnóstico se despliega en lugar de navegar directo, porque
                hay dos versiones y hay que elegir. Es un acordeón y no un modal:
                esto ya es una hoja inferior, y abrir una ventana encima de otra
                deja dos capas que capturan el foco y dos maneras de cerrar.

                Se pliega solo al salir del menú, como el de administración:
                reabrirlo desplegado dejaría la fila del diagnóstico ocupando el
                triple de alto sin que nadie lo haya pedido.
              */
              <div>
                <AccordionHeader
                  icon={Gauge}
                  label="Diagnóstico 360"
                  isOpen={isDiagOpen}
                  /*
                    Cuál está elegida, visible sin desplegar. Sin esta pista,
                    quien viera un tablero raro no tendría forma de saber que
                    está en la propuesta nueva ni por dónde volver.
                  */
                  badge={version}
                  badgeHint=""
                  onClick={() => setDiagOpen((v) => !v)}
                />

                {isDiagOpen && (
                  <div className="animate-rise divide-y divide-slate-800/50 border-t
                                  border-slate-800/50 bg-slate-950/40"
                  >
                    {DASHBOARD_VERSIONS.map((option) => (
                      <MenuRow
                        key={option.value}
                        nested
                        icon={option.value === 'v1' ? Gauge : FlaskConical}
                        label={option.label}
                        badge={version === option.value ? 'Activa' : undefined}
                        badgeHint=""
                        onClick={() => onOpenDiagnostico(option.value)}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}

            <MenuRow icon={StickyNote} label="Mis Notas" onClick={onOpenNotes} />

            {/*
              ── Sólo promotores ──

              Va aquí y no en la barra inferior porque esa barra ya tiene sus
              cinco sitios ocupados (Hoy, Productividad, Agregar, Agenda, Ver
              más) y en un teléfono de 360 píxeles un sexto destino deja las
              etiquetas partidas o ilegibles. Éste es el menú de destinos de la
              app, y es donde ya viven los accesos que dependen del rol.

              Se omite del marcado cuando el rol no corresponde, no se oculta con
              CSS: una fila con `hidden` sigue en el DOM, se alcanza con el
              teclado y reaparece quitándole la clase desde el inspector.
            */}
            {isPromoterUser && (
              <MenuRow icon={Users} label="Mi Promotoría" onClick={onOpenPromotoria} />
            )}
          </SectionCard>

          {/* ── Cuenta ── */}
          <SectionTitle>Cuenta</SectionTitle>
          <SectionCard>
            <MenuRow icon={BadgeCheck} label="Mi Perfil" onClick={onOpenProfile} />
            <MenuRow icon={Settings} label="Configuración" hint="Pronto" />
          </SectionCard>

          {/*
            ── Datos de la agenda ──

            Las dos acciones van juntas y a la vista de todos: cargar la semana
            de ejemplo no es una herramienta de administración, es como cualquier
            asesor prueba la app sin capturar veinte citas a mano. Y queda antes
            de "Vaciar agenda", que es su contraparte.
          */}
          <SectionTitle>Agenda</SectionTitle>
          <SectionCard>
            <MenuRow icon={Wand2} label="Cargar semana demo" onClick={onLoadDemo} />
            <MenuRow icon={Eraser} label="Vaciar agenda" onClick={onClearAgenda} />
          </SectionCard>

          {/*
            ── Sólo administradores ──

            Acordeón y no pantalla aparte: las tres opciones de dentro se usan de
            paso —aprobar a alguien, abrir la consola— y llevarlas a otra
            pantalla añadiría un viaje de ida y vuelta a cada una. Plegadas, el
            menú del administrador tiene el mismo largo que el de cualquiera.
          */}
          {isAdminUser && (
            <>
              <SectionTitle>Sistema</SectionTitle>
              <SectionCard>
                <div>
                  <AccordionHeader
                    icon={ShieldCheck}
                    tone="accent"
                    label="Panel de Administración"
                    sublabel="Sólo tú ves esta sección"
                    isOpen={isAdminOpen}
                    /*
                      El distintivo de pendientes viaja al encabezado cuando está
                      plegado: si sólo viviera dentro, un administrador no sabría
                      que tiene gente esperando sin abrir el acordeón, y la
                      aprobación es justo lo que no debe quedarse esperando.
                    */
                    badge={!isAdminOpen && pendingCount > 0 ? pendingCount : undefined}
                    badgeHint="usuarios por aprobar"
                    onClick={() => setAdminOpen((v) => !v)}
                  />

                  {isAdminOpen && (
                    <div className="animate-rise divide-y divide-slate-800/50 border-t
                                    border-slate-800/50 bg-slate-950/40"
                    >
                      <MenuRow
                        nested
                        icon={UserCheck}
                        label="Aprobar Usuarios"
                        badge={pendingCount > 0 ? pendingCount : undefined}
                        onClick={onOpenApprovals}
                      />
                      {/*
                        La consola técnica sigue aquí dentro. No estaba en tu
                        lista, pero era la única puerta al panel de
                        diagnósticos: quitarla del menú la habría dejado
                        inalcanzable sin que se notara.
                      */}
                      <MenuRow
                        nested
                        icon={Database}
                        label="Consola y diagnósticos"
                        onClick={onOpenAdmin}
                      />
                      {canUsePreview && (
                        <MenuRow
                          nested
                          icon={MonitorSmartphone}
                          label="Vista previa"
                          onClick={onOpenPreview}
                        />
                      )}
                    </div>
                  )}
                </div>
              </SectionCard>
            </>
          )}

          {/*
            Salir va al final y en su propia tarjeta, sin título de sección: es
            la única acción sin retorno del menú, y compartir bloque con algo que
            se toca a diario la pondría a un dedo de distancia de un accidente.
          */}
          <div className="mt-6">
            <SectionCard>
              <MenuRow icon={LogOut} label="Cerrar Sesión" tone="danger" onClick={onLogout} />
            </SectionCard>
          </div>
        </div>
      </div>
    </div>
  );
}
