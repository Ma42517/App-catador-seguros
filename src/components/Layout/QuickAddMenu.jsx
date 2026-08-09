import { useState, useEffect } from 'react';
import { UserPlus, CalendarPlus, Briefcase } from 'lucide-react';

/** Duración del slide-up/down; debe coincidir con la clase duration-300. */
const ANIM_MS = 300;

/**
 * Acciones rápidas del botón "+".
 * El acento sólo vive en el ícono: el lenguaje es de productividad general,
 * no específico de un giro.
 */
const ACTIONS = [
  {
    key: 'contact',
    title: 'Nuevo Contacto',
    subtitle: 'Guarda clientes o leads',
    Icon: UserPlus,
    accent: 'bg-indigo-500/10 text-indigo-500 dark:text-indigo-400',
  },
  {
    key: 'event',
    title: 'Nuevo Evento',
    subtitle: 'Agenda citas o recordatorios',
    Icon: CalendarPlus,
    accent: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  },
  {
    key: 'project',
    title: 'Nuevo Proyecto',
    subtitle: 'Registra negocios o ingresos',
    Icon: Briefcase,
    accent: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  },
];

/**
 * Bottom sheet de acciones rápidas, abierto desde el "+" central.
 *
 * Se monta y desmonta con retardo para que la hoja pueda animar tanto la
 * entrada como la salida (un `if (!isOpen) return null` directo mataría la
 * animación de cierre).
 */
export default function QuickAddMenu({ isOpen, onClose, onSelect }) {
  const [isMounted, setIsMounted] = useState(isOpen);
  const [isShown, setIsShown] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsMounted(true);
      // Un frame de margen para que la transición arranque desde el estado inicial.
      const raf = requestAnimationFrame(() => setIsShown(true));
      return () => cancelAnimationFrame(raf);
    }
    setIsShown(false);
    const timer = setTimeout(() => setIsMounted(false), ANIM_MS);
    return () => clearTimeout(timer);
  }, [isOpen]);

  // Cerrar con Escape y congelar el scroll del fondo mientras está abierto.
  useEffect(() => {
    if (!isOpen) return undefined;
    const onKeyDown = (e) => { if (e.key === 'Escape') onClose(); };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen, onClose]);

  if (!isMounted) return null;

  const handleSelect = (key) => {
    onSelect?.(key);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label="Acciones rápidas">
      {/* Overlay */}
      <button
        type="button"
        aria-label="Cerrar"
        onClick={onClose}
        className={`absolute inset-0 h-full w-full cursor-default bg-black/60 backdrop-blur-sm
                    transition-opacity duration-300 ${isShown ? 'opacity-100' : 'opacity-0'}`}
      />

      {/* Bottom sheet */}
      <div
        className={`absolute bottom-0 left-0 right-0 mx-auto w-full max-w-lg transform rounded-t-3xl
                    bg-zinc-50 px-6 pt-6 shadow-2xl transition-transform duration-300 ease-out
                    pb-[max(1.5rem,env(safe-area-inset-bottom))]
                    dark:bg-zinc-900 ${isShown ? 'translate-y-0' : 'translate-y-full'}`}
      >
        {/* Barrita de arrastre */}
        <div
          className="mx-auto mb-6 h-1.5 w-12 rounded-full bg-zinc-300 dark:bg-zinc-700"
          aria-hidden="true"
        />

        <div className="flex flex-col gap-4">
          {ACTIONS.map(({ key, title, subtitle, Icon, accent }) => (
            <button
              key={key}
              type="button"
              onClick={() => handleSelect(key)}
              className="flex items-center gap-4 rounded-2xl border border-zinc-100 bg-white p-4
                         text-left shadow-sm transition-transform active:scale-95
                         focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500
                         dark:border-zinc-700 dark:bg-zinc-800"
            >
              <span
                className={`grid h-12 w-12 shrink-0 place-items-center rounded-xl ${accent}`}
                aria-hidden="true"
              >
                <Icon size={22} />
              </span>
              <span className="min-w-0">
                <span className="block text-lg font-semibold text-zinc-900 dark:text-white">
                  {title}
                </span>
                <span className="block text-sm text-zinc-500">{subtitle}</span>
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
