import { Pencil, Loader2, AlertTriangle } from 'lucide-react';
import DigitalCardPreview from './DigitalCardPreview';

/**
 * Modo presentación de la tarjeta.
 *
 * Es la pantalla que el asesor gira hacia el prospecto, así que no hay nada
 * alrededor: sólo la tarjeta centrada. El botón de editar va debajo y en tono
 * discreto —no compite con la tarjeta— y desaparecería del encuadre si el
 * teléfono se acerca a la otra persona.
 *
 * Editar vive en otra pantalla y no aquí al lado a propósito: un formulario
 * junto a la tarjeta convierte la presentación en una pantalla de trabajo, y
 * delante de un cliente eso resta.
 */
export default function DigitalCardStage({ card, isLoading, error, onEdit }) {
  if (isLoading) {
    return (
      <p className="flex items-center justify-center gap-2 py-20 text-sm text-zinc-500">
        <Loader2 size={16} className="animate-spin" />
        Cargando tu tarjeta...
      </p>
    );
  }

  const isEmpty = !card.fullName && !card.title && !card.avatarUrl;

  return (
    <div className="flex flex-col items-center">
      {error && (
        <p
          role="alert"
          className="mb-5 flex w-full items-start gap-2 rounded-xl border border-rose-500/30
                     bg-rose-500/10 p-3 text-xs leading-relaxed text-rose-600 dark:text-rose-300"
        >
          <AlertTriangle size={14} className="mt-0.5 shrink-0" aria-hidden="true" />
          {error}
        </p>
      )}

      <DigitalCardPreview card={card} />

      {/*
        Sin datos todavía, la invitación a completarla sustituye al texto de
        ayuda: enseñar una tarjeta vacía no le sirve a nadie.
      */}
      {isEmpty ? (
        <p className="mt-5 max-w-xs text-center text-xs leading-relaxed text-zinc-500">
          Tu tarjeta está vacía. Completa tu nombre, tu título y una foto para
          poder mostrarla.
        </p>
      ) : (
        <p className="mt-5 max-w-xs text-center text-xs leading-relaxed text-zinc-500">
          Gira el teléfono hacia tu prospecto. Los botones de contacto funcionan
          desde aquí.
        </p>
      )}

      <button
        type="button"
        onClick={onEdit}
        className="mt-4 flex items-center justify-center gap-2 rounded-xl border
                   border-zinc-300 px-5 py-3 text-sm font-semibold text-zinc-700
                   transition-colors hover:bg-zinc-100 active:scale-[0.98]
                   dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-900"
      >
        <Pencil size={15} />
        {isEmpty ? 'Completar mi tarjeta' : 'Editar mi tarjeta'}
      </button>
    </div>
  );
}
