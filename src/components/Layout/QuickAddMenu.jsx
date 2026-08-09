import { useState, useEffect } from 'react';
import { Calendar, PhoneForwarded, CheckSquare } from 'lucide-react';

/** Duración del slide-up/down; debe coincidir con la clase duration-300. */
const ANIM_MS = 300;

/** Borde por defecto de las tarjetas. */
const CARD_BORDER = 'border-zinc-100 dark:border-zinc-700';

/**
 * Acciones rápidas del botón "+": las tres formas en que el asesor ocupa su
 * tiempo. La agenda va primero porque es la que compromete una hora concreta.
 */
const ACTIONS = [
  {
    key: 'evento',
    title: 'Agregar Actividad / Evento',
    subtitle: 'Bloquea una cita o actividad en tu agenda.',
    Icon: Calendar,
    accent: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
    border: CARD_BORDER,
  },
  {
    key: 'seguimiento',
    title: 'Dar Seguimiento',
    subtitle: 'Registra una llamada, mensaje o envío del 360.',
    Icon: PhoneForwarded,
    accent: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
    border: CARD_BORDER,
  },
  {
    key: 'tarea',
    title: 'Agregar Tarea',
    subtitle: 'Un pendiente sin hora fija que no se te puede olvidar.',
    Icon: CheckSquare,
    accent: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
    border: CARD_BORDER,
  },
];

/** Niveles de prioridad que hereda lo que se cree desde este menú. */
const PRIORITIES = [
  {
    key: 'baja',
    label: 'Baja',
    idle: 'border-emerald-500/30 text-emerald-600 dark:text-emerald-400/80',
    active: 'border-emerald-500 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300',
  },
  {
    key: 'importante',
    label: 'Importante',
    idle: 'border-amber-500/30 text-amber-600 dark:text-amber-400/80',
    active: 'border-amber-500 bg-amber-500/10 text-amber-600 dark:text-amber-300',
  },
  {
    key: 'maxima',
    label: 'Máxima',
    // La urgencia máxima lleva fondo propio incluso sin estar seleccionada:
    // es la única que debe "quemar" a simple vista.
    idle: 'border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300',
    active: 'border-rose-500 bg-rose-500/25 text-rose-800 dark:text-rose-100',
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
  const [priority, setPriority] = useState('importante');

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

  // La prioridad viaja junto con la acción: lo que se cree nace con ella.
  const handleSelect = (key) => {
    onSelect?.(key, priority);
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
          {ACTIONS.map(({ key, title, subtitle, Icon, accent, border }) => (
            <button
              key={key}
              type="button"
              onClick={() => handleSelect(key)}
              className={`flex items-center gap-4 rounded-2xl border bg-white p-4
                         text-left shadow-sm transition-transform active:scale-95
                         focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500
                         dark:bg-zinc-800 ${border}`}
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

        {/* Prioridad que heredará lo que se cree desde aquí */}
        <div className="mt-2 border-t border-zinc-200 pt-4 dark:border-zinc-800">
          <p className="mb-3 text-[10px] uppercase tracking-wider text-zinc-500">
            Nivel de Prioridad por Defecto
          </p>
          <div role="radiogroup" aria-label="Nivel de prioridad por defecto" className="flex gap-2">
            {PRIORITIES.map(({ key, label, idle, active }) => {
              const isActive = priority === key;
              return (
                <button
                  key={key}
                  type="button"
                  role="radio"
                  aria-checked={isActive}
                  onClick={() => setPriority(key)}
                  className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-all
                              active:scale-95 focus-visible:outline-none focus-visible:ring-2
                              focus-visible:ring-indigo-500 ${isActive ? active : idle}`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
