import { useEffect } from 'react';
import {
  Gauge, Settings, LogOut, ChevronRight, X, MonitorSmartphone, Sun, Moon,
  StickyNote, Wand2, Eraser, BadgeCheck, Database,
} from 'lucide-react';

/**
 * Fila estándar del menú.
 * - `hint`: marca lo que aún no está disponible (deshabilita la fila).
 * - `action`: estado actual de un control, como el tema activo.
 */
function MenuRow({ icon: Icon, label, hint, action, tone = 'default', onClick }) {
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
 * Panel secundario (bottom sheet) abierto desde "Ver más".
 * Aloja el acceso destacado al Diagnóstico 360 y las opciones de cuenta.
 */
export default function MoreMenu({
  open, onClose, onOpenDiagnostico, onOpenPreview, onOpenNotes, onOpenProfile,
  onOpenAdmin, onLogout, onLoadDemo, onClearAgenda,
  canUsePreview = false, isAdminUser = false, isDark = true, onToggleTheme,
}) {
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

        {/* Tarjeta destacada: Diagnóstico 360 */}
        <button
          type="button"
          onClick={onOpenDiagnostico}
          className="mb-4 flex w-full items-center gap-4 rounded-2xl bg-gradient-to-br
                     from-indigo-600 to-violet-600 p-4 text-left text-white shadow-lg
                     shadow-indigo-600/30 transition-transform hover:scale-[1.01]"
        >
          <span
            className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-white/20"
            aria-hidden="true"
          >
            <Gauge size={24} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-base font-bold leading-tight">Diagnóstico 360</span>
            <span className="mt-0.5 block text-xs text-indigo-100">
              Captura tus finanzas y obtén tu diagnóstico completo
            </span>
          </span>
          <ChevronRight size={18} className="shrink-0 opacity-80" aria-hidden="true" />
        </button>

        <div className="space-y-1 pb-2">
          <MenuRow icon={BadgeCheck} label="Mi Perfil" onClick={onOpenProfile} />
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
