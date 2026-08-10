import { useEffect, useState } from 'react';
import {
  Gauge, Settings, LogOut, ChevronRight, X, MonitorSmartphone, Sun, Moon,
  StickyNote, Wand2, Eraser, BadgeCheck, Database, UserCheck, IdCard,
} from 'lucide-react';
import { useSession } from '../../context/SessionContext';

/**
 * Fila estándar del menú.
 * - `hint`: marca lo que aún no está disponible (deshabilita la fila).
 * - `action`: estado actual de un control, como el tema activo.
 * - `badge`: cantidad que reclama atención. Se pinta en ámbar y no en gris
 *   porque su función es que se note sin tener que leer la fila.
 */
function MenuRow({ icon: Icon, label, hint, action, badge, tone = 'default', onClick }) {
  const isDanger = tone === 'danger';
  const disabled = Boolean(hint);

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition-colors
        disabled:cursor-not-allowed disabled:opacity-50
        ${isDanger
          ? 'text-rose-600 hover:bg-rose-500/10 dark:text-rose-400'
          : 'text-zinc-700 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-white/5'}`}
    >
      <span
        className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl border
          ${isDanger
            ? 'border-rose-500/30 bg-rose-500/10 text-rose-500 dark:text-rose-400'
            : 'border-zinc-200 bg-zinc-100 text-zinc-500 dark:border-white/10 dark:bg-white/5 dark:text-zinc-400'}`}
        aria-hidden="true"
      >
        <Icon size={17} />
      </span>

      <span className="min-w-0 flex-1 text-sm font-semibold">{label}</span>

      {badge ? (
        <span
          className="shrink-0 rounded-full bg-amber-500/15 px-2 py-0.5 text-[11px] font-bold
                     text-amber-600 dark:text-amber-400"
        >
          {badge}
          <span className="sr-only"> pendientes</span>
        </span>
      ) : null}

      {hint || action ? (
        <span className="shrink-0 rounded-full border border-zinc-200 px-2 py-0.5 text-[10px]
                         font-semibold uppercase tracking-wide text-zinc-400
                         dark:border-white/10 dark:text-zinc-500">
          {hint || action}
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
        className="h-12 w-12 shrink-0 rounded-full border border-white/20 object-cover"
      />
    );
  }

  return (
    <span
      className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-white/10
                 ring-1 ring-white/15"
      aria-hidden="true"
    >
      <IdCard size={24} />
    </span>
  );
}

/**
 * Panel secundario (bottom sheet) abierto desde "Ver más".
 * Aloja el acceso destacado al Diagnóstico 360 y las opciones de cuenta.
 */
export default function MoreMenu({
  open, onClose, onOpenDiagnostico, onOpenPreview, onOpenNotes, onOpenProfile,
  onOpenAdmin, onOpenApprovals, onOpenCard, onLogout, onLoadDemo, onClearAgenda,
  canUsePreview = false, isAdminUser = false, pendingCount = 0,
  isDark = true, onToggleTheme,
}) {
  const { identity } = useSession();

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

      {/* Hoja inferior */}
      <div
        className="animate-rise absolute inset-x-0 bottom-0 mx-auto w-full max-w-lg rounded-t-3xl
                   border-t border-zinc-200/60 bg-white/90 px-4 pt-3 backdrop-blur-xl pb-safe
                   dark:border-white/10 dark:bg-zinc-950/90"
      >
        {/* Asa de arrastre + cerrar */}
        <div className="mb-3 flex items-center">
          <span
            className="mx-auto h-1.5 w-10 rounded-full bg-zinc-300 dark:bg-white/15"
            aria-hidden="true"
          />
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="absolute right-4 top-3 grid h-8 w-8 place-items-center rounded-full
                       text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-600
                       dark:hover:bg-white/5 dark:hover:text-zinc-200"
          >
            <X size={16} />
          </button>
        </div>

        {/*
          Pieza destacada: la tarjeta digital.
          Es lo que el asesor abre delante de un prospecto, así que ocupa el
          primer lugar del panel. El Diagnóstico 360 baja a la lista de opciones:
          sigue completo, pero es una herramienta de trabajo interno y no algo
          que se enseñe en una mesa.
        */}
        <button
          type="button"
          onClick={onOpenCard}
          className="mb-4 flex w-full items-center gap-4 rounded-2xl bg-gradient-to-br
                     from-zinc-800 via-zinc-900 to-black p-4 text-left text-white shadow-lg
                     shadow-zinc-950/40 ring-1 ring-white/10
                     transition-transform hover:scale-[1.01]"
        >
          <CardAvatar url={identity?.avatarUrl} />
          <span className="min-w-0 flex-1">
            <span className="block text-base font-bold leading-tight">Mi Tarjeta Digital</span>
            <span className="mt-0.5 block text-xs text-zinc-400">
              Tu presentación profesional, lista para mostrar
            </span>
          </span>
          <ChevronRight size={18} className="shrink-0 opacity-70" aria-hidden="true" />
        </button>

        <div className="space-y-1 pb-2">
          <MenuRow icon={Gauge} label="Diagnóstico 360" onClick={onOpenDiagnostico} />
          <MenuRow icon={BadgeCheck} label="Mi Perfil" onClick={onOpenProfile} />
          {/* Aprobar usuarios va antes del panel técnico: es la tarea que el
              administrador repite, y el distintivo avisa sin abrir nada. */}
          {isAdminUser && (
            <MenuRow
              icon={UserCheck}
              label="Aprobar Usuarios"
              badge={pendingCount > 0 ? pendingCount : undefined}
              onClick={onOpenApprovals}
            />
          )}
          {isAdminUser && (
            <MenuRow icon={Database} label="Panel de Administración" onClick={onOpenAdmin} />
          )}
          <MenuRow icon={StickyNote} label="Mis Notas" onClick={onOpenNotes} />
          <MenuRow icon={Settings} label="Configuración" hint="Pronto" />
          <MenuRow
            icon={isDark ? Sun : Moon}
            label={isDark ? 'Tema claro' : 'Tema oscuro'}
            action={isDark ? 'Oscuro' : 'Claro'}
            onClick={onToggleTheme}
          />
          {canUsePreview && (
            <MenuRow icon={MonitorSmartphone} label="Vista previa" onClick={onOpenPreview} />
          )}
          <MenuRow icon={Wand2} label="Cargar semana demo" onClick={onLoadDemo} />
          <MenuRow icon={Eraser} label="Vaciar agenda" onClick={onClearAgenda} />
          <MenuRow icon={LogOut} label="Cerrar Sesión" tone="danger" onClick={onLogout} />
        </div>
      </div>
    </div>
  );
}
