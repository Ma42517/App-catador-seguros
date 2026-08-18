import { useEffect, useState } from 'react';
import {
  Gauge, Settings, LogOut, ChevronRight, ChevronDown, X, MonitorSmartphone,
  StickyNote, Wand2, Eraser, BadgeCheck, Database, UserCheck, IdCard, ShieldCheck,
  Users, FlaskConical,
} from 'lucide-react';
import { useSession } from '../../context/SessionContext';
import { DASHBOARD_VERSIONS, useDashboardVersion } from '../../context/dashboardVersion';

/**
 * Fila estándar del menú.
 * - `hint`: marca lo que aún no está disponible (deshabilita la fila).
 * - `badge`: cantidad que reclama atención. Se pinta en ámbar y no en gris
 *   porque su función es que se note sin tener que leer la fila.
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
      className={`flex w-full items-center gap-3 rounded-xl py-3 text-left transition-colors
        disabled:cursor-not-allowed disabled:opacity-50
        ${nested ? 'px-2.5' : 'px-3'}
        ${isDanger
          ? 'text-rose-400 hover:bg-rose-500/10'
          : 'text-zinc-200 hover:bg-white/5'}`}
    >
      <span
        className={`grid shrink-0 place-items-center rounded-xl border
          ${nested ? 'h-8 w-8' : 'h-9 w-9'}
          ${isDanger
            ? 'border-rose-500/30 bg-rose-500/10 text-rose-400'
            : 'border-white/10 bg-white/5 text-zinc-400'}`}
        aria-hidden="true"
      >
        <Icon size={nested ? 15 : 17} />
      </span>

      <span className={`min-w-0 flex-1 font-semibold ${nested ? 'text-[13px]' : 'text-sm'}`}>
        {label}
      </span>

      {badge ? (
        <span
          className="shrink-0 rounded-full bg-amber-500/15 px-2 py-0.5 text-[11px] font-bold
                     text-amber-400"
        >
          {badge}
          {/*
            El distintivo casi siempre es un número, y un "3" a secas no dice nada
            en voz alta. Por eso lleva su aclaración, y por eso se puede vaciar:
            cuando el distintivo ya es una palabra —"Activa"—, añadirle
            "pendientes" convertía la pista en una frase falsa.
          */}
          {badgeHint && <span className="sr-only"> {badgeHint}</span>}
        </span>
      ) : null}

      {hint ? (
        <span className="shrink-0 rounded-full border border-white/10 px-2 py-0.5 text-[10px]
                         font-semibold uppercase tracking-wide text-zinc-500"
        >
          {hint}
        </span>
      ) : (
        <ChevronRight size={16} className="shrink-0 opacity-40" aria-hidden="true" />
      )}
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
        className="h-11 w-11 shrink-0 rounded-full border border-white/20 object-cover"
      />
    );
  }

  return (
    <span
      className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-white/10
                 ring-1 ring-white/15"
      aria-hidden="true"
    >
      <IdCard size={22} />
    </span>
  );
}

/**
 * Panel secundario (bottom sheet) abierto desde "Ver más".
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
        className="absolute inset-0 h-full w-full cursor-default bg-zinc-950/50 backdrop-blur-sm"
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
                   max-w-lg flex-col rounded-t-3xl border-t border-white/10 bg-zinc-950/95
                   backdrop-blur-xl"
      >
        {/*
          ── Cabecera fija ──

          Fondo sólido y `z-50`: es lo que garantiza que ninguna fila se
          transparente por detrás al desplazarse. Contiene sólo el cierre y la
          tarjeta, que son las dos cosas que deben estar siempre alcanzables.
        */}
        <header className="relative z-50 shrink-0 rounded-t-3xl bg-zinc-950 px-4 pb-3 pt-3">
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

            <span
              className="h-1.5 w-10 rounded-full bg-white/15"
              aria-hidden="true"
            />

            <button
              type="button"
              onClick={onClose}
              aria-label="Cerrar"
              className="grid h-9 w-9 shrink-0 place-items-center rounded-full
                         text-zinc-400 transition-colors hover:bg-white/10 hover:text-zinc-100
                         active:scale-90 focus-visible:outline-none focus-visible:ring-2
                         focus-visible:ring-white/40"
            >
              <X size={18} />
            </button>
          </div>

          {/*
            Pieza destacada: la tarjeta digital.
            Es lo que el asesor abre delante de un prospecto, así que ocupa el
            primer lugar y viaja en la cabecera: nunca se va de la vista por más
            que se baje la lista.
          */}
          <button
            type="button"
            onClick={onOpenCard}
            className="flex w-full items-center gap-4 rounded-2xl bg-gradient-to-br
                       from-zinc-800 via-zinc-900 to-black p-3.5 text-left text-white
                       shadow-lg shadow-zinc-950/40 ring-1 ring-white/10
                       transition-transform hover:scale-[1.01]"
          >
            <CardAvatar url={identity?.avatarUrl} />
            <span className="min-w-0 flex-1">
              <span className="block text-[15px] font-bold leading-tight">
                Mi Tarjeta Digital
              </span>
              <span className="mt-0.5 block text-[11px] text-zinc-400">
                Tu presentación profesional, lista para mostrar
              </span>
            </span>
            <ChevronRight size={18} className="shrink-0 opacity-70" aria-hidden="true" />
          </button>

          {/* Corte visual entre lo fijo y lo que se desplaza. */}
          <div className="mt-3 h-px bg-white/10" aria-hidden="true" />
        </header>

        {/*
          ── Lista desplazable ──

          `flex-1` le da todo el alto que sobra y `overflow-y-auto` hace el resto.
          Sin `overscroll-contain` aquí no haría falta pensar en el fondo, pero
          esta hoja **sí** lo lleva: cubre la pantalla completa por abajo y, al
          llegar al final de la lista, seguir arrastrando movería la página de
          detrás —que está congelada— y el gesto se sentiría roto.
        */}
        <div className="flex-1 space-y-1 overflow-y-auto overscroll-contain px-4 pb-4 pt-2 pb-safe">
          {/* ── Para todos ── */}

          {/*
            El diagnóstico se despliega en lugar de navegar directo, porque hay dos
            versiones y hay que elegir. Es un acordeón y no un modal: esto ya es una
            hoja inferior, y abrir una ventana encima de otra deja dos capas que
            capturan el foco y dos maneras de cerrar. El acordeón es además el mismo
            patrón que usa el panel de administración de más abajo.

            Se pliega solo al salir del menú, como el de administración: reabrirlo
            desplegado dejaría la fila del diagnóstico ocupando el triple de alto sin
            que nadie lo haya pedido.
          */}
          {/*
            Con una sola versión disponible (el rediseño V2 está descartado, ver
            `DASHBOARD_V2_ENABLED` en dashboardVersion.js) no hay nada que elegir:
            la fila navega directo, en vez de desplegar un acordeón con una sola
            opción ya activa. Es la misma razón por la que el conmutador de
            captura desaparece con `V2_ENABLED` en falso — un control con una
            sola salida no es una elección, es ruido.
          */}
          {DASHBOARD_VERSIONS.length <= 1 ? (
            <MenuRow
              icon={Gauge}
              label="Diagnóstico 360"
              onClick={() => onOpenDiagnostico(DASHBOARD_VERSIONS[0].value)}
            />
          ) : (
            <div className="overflow-hidden rounded-xl">
              <button
                type="button"
                onClick={() => setDiagOpen((v) => !v)}
                aria-expanded={isDiagOpen}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left
                           text-zinc-200 transition-colors hover:bg-white/5"
              >
                <span
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border
                             border-white/10 bg-white/5 text-zinc-400"
                  aria-hidden="true"
                >
                  <Gauge size={17} />
                </span>

                <span className="min-w-0 flex-1 text-sm font-semibold">Diagnóstico 360</span>

                {/*
                  Cuál está elegida, visible sin desplegar. Sin esta pista, quien viera
                  un tablero raro no tendría forma de saber que está en la propuesta
                  nueva ni por dónde volver.
                */}
                <span className="shrink-0 rounded-full border border-white/10 px-2 py-0.5
                                 text-[10px] font-bold uppercase tracking-wide text-zinc-500"
                >
                  {version}
                </span>

                <ChevronDown
                  size={16}
                  className={`shrink-0 opacity-40 transition-transform duration-200
                              ${isDiagOpen ? 'rotate-180' : ''}`}
                  aria-hidden="true"
                />
              </button>

              {isDiagOpen && (
                <div className="animate-rise space-y-0.5 px-1.5 pb-1.5">
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
          <MenuRow icon={BadgeCheck} label="Mi Perfil" onClick={onOpenProfile} />
          {/*
            ── Sólo promotores ──

            Va aquí y no en la barra inferior porque esa barra ya tiene sus cinco
            sitios ocupados (Hoy, Productividad, Agregar, Agenda, Ver más) y en un
            teléfono de 360 píxeles un sexto destino deja las etiquetas partidas o
            ilegibles. Éste es el menú de destinos de la app, y es donde ya viven
            los accesos que dependen del rol.

            Se omite del marcado cuando el rol no corresponde, no se oculta con
            CSS: una fila con `hidden` sigue en el DOM, se alcanza con el teclado y
            reaparece quitándole la clase desde el inspector.
          */}
          {isPromoterUser && (
            <MenuRow
              icon={Users}
              label="Mi Promotoría"
              onClick={onOpenPromotoria}
            />
          )}
          <MenuRow icon={StickyNote} label="Mis Notas" onClick={onOpenNotes} />
          <MenuRow icon={Settings} label="Configuración" hint="Pronto" />
          {/*
            Las dos acciones de agenda van juntas y a la vista de todos: cargar la
            semana de ejemplo no es una herramienta de administración, es como
            cualquier asesor prueba la app sin capturar veinte citas a mano. Y
            queda antes de "Vaciar agenda", que es su contraparte.
          */}
          <MenuRow icon={Wand2} label="Cargar semana demo" onClick={onLoadDemo} />
          <MenuRow icon={Eraser} label="Vaciar agenda" onClick={onClearAgenda} />

          {/*
            ── Sólo administradores ──

            Acordeón y no pantalla aparte: las tres opciones de dentro se usan de
            paso —aprobar a alguien, cargar la semana de ejemplo— y llevarlas a
            otra pantalla añadiría un viaje de ida y vuelta a cada una. Plegadas,
            el menú del administrador tiene el mismo largo que el de cualquiera.
          */}
          {isAdminUser && (
            <div className="!mt-3 overflow-hidden rounded-xl border border-white/10 bg-white/[0.03]">
              <button
                type="button"
                onClick={() => setAdminOpen((v) => !v)}
                aria-expanded={isAdminOpen}
                className="flex w-full items-center gap-3 px-3 py-3 text-left
                           transition-colors hover:bg-white/5"
              >
                <span
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border
                             border-indigo-500/30 bg-indigo-500/10 text-indigo-300"
                  aria-hidden="true"
                >
                  <ShieldCheck size={17} />
                </span>

                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold text-zinc-100">
                    Panel de Administración
                  </span>
                  <span className="mt-0.5 block text-[11px] text-zinc-500">
                    Sólo tú ves esta sección
                  </span>
                </span>

                {/*
                  El distintivo de pendientes viaja al encabezado cuando está
                  plegado: si sólo viviera dentro, un administrador no sabría que
                  tiene gente esperando sin abrir el acordeón, y la aprobación es
                  justo lo que no debe quedarse esperando.
                */}
                {!isAdminOpen && pendingCount > 0 && (
                  <span className="shrink-0 rounded-full bg-amber-500/15 px-2 py-0.5
                                   text-[11px] font-bold text-amber-400"
                  >
                    {pendingCount}
                    <span className="sr-only"> usuarios por aprobar</span>
                  </span>
                )}

                <ChevronDown
                  size={16}
                  className={`shrink-0 text-zinc-500 transition-transform duration-200
                              ${isAdminOpen ? 'rotate-180' : ''}`}
                  aria-hidden="true"
                />
              </button>

              {isAdminOpen && (
                <div className="animate-rise space-y-0.5 border-t border-white/10 px-1.5 py-1.5">
                  <MenuRow
                    nested
                    icon={UserCheck}
                    label="Aprobar Usuarios"
                    badge={pendingCount > 0 ? pendingCount : undefined}
                    onClick={onOpenApprovals}
                  />
                  {/*
                    La consola técnica sigue aquí dentro. No estaba en tu lista,
                    pero era la única puerta al panel de diagnósticos: quitarla
                    del menú la habría dejado inalcanzable sin que se notara.
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
          )}

          {/* Salir va al final y separado: es la única acción sin retorno. */}
          <div className="!mt-3 border-t border-white/5 pt-2">
            <MenuRow icon={LogOut} label="Cerrar Sesión" tone="danger" onClick={onLogout} />
          </div>
        </div>
      </div>
    </div>
  );
}
