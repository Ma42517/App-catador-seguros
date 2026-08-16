import { X } from 'lucide-react';
import BottomSheet from '../Layout/BottomSheet';
import { Button } from '../ui';

/**
 * El marco de la hoja de captura: título, campos y los dos botones del final.
 *
 * Los cinco módulos comparten este contorno y sólo cambian los campos de dentro.
 * Tenerlo en un sitio es lo que evita que la hoja de deudas acabe con el botón a otra
 * altura, o con "Guardar" donde otra tiene "Cancelar".
 */
export default function RowSheet({
  isOpen, onClose, onSave, isEditing, title, hint, badge, canSave,
  saveLabel = 'Agregar', children,
}) {
  const heading = isEditing ? `Editar ${title}` : `Nuevo ${title}`;

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} label={heading}>
      {/*
        La cabecera se queda pegada arriba al desplazar.

        En una pantalla de portátil la hoja se llena y hay que hacer scroll; con la
        cabecera quieta, la X se iba fuera de vista justo cuando más lejos queda el
        final. `bg-inherit` toma el fondo de la hoja, así que sirve igual en tema claro
        y oscuro sin repetir el color. El `-mx-6 px-6` la extiende hasta los bordes para
        que el contenido no se vea pasar por debajo de las esquinas.
      */}
      <div className="sticky top-0 z-10 -mx-6 -mt-2 mb-4 flex items-start gap-3
                      bg-inherit px-6 pb-3 pt-2"
      >
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-bold text-zinc-100">{heading}</h2>
          {hint && <p className="mt-0.5 text-[11px] leading-snug text-zinc-500">{hint}</p>}
        </div>

        {/* Cifra derivada en vivo, cuando el módulo tiene una que valga la pena. */}
        {badge && (
          <span className="mt-0.5 shrink-0 rounded-lg bg-indigo-500/10 px-2.5 py-1
                           text-[11px] font-semibold tabular-nums text-indigo-300
                           ring-1 ring-indigo-500/25"
          >
            {badge}
          </span>
        )}

        {/*
          Cerrar sube aquí y desaparece el botón "Cancelar" del final. Son la misma
          acción, y abajo obligaba a recorrer el formulario entero para dar marcha
          atrás: la salida tiene que estar donde se mira primero, no al final de lo
          que se quiere abandonar.
        */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar"
          className="-mr-2 grid h-8 w-8 shrink-0 place-items-center rounded-lg
                     text-zinc-500 transition-colors hover:bg-zinc-200
                     hover:text-zinc-900 focus-visible:outline-none focus-visible:ring-2
                     focus-visible:ring-indigo-500 dark:hover:bg-zinc-800
                     dark:hover:text-zinc-100"
        >
          <X size={18} />
        </button>
      </div>

      <div className="space-y-3.5">{children}</div>

      <div className="mt-7">
        <Button size="lg" full disabled={!canSave} onClick={onSave}>
          {isEditing ? 'Guardar cambios' : saveLabel}
        </Button>
      </div>
    </BottomSheet>
  );
}
