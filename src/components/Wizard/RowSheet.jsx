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
      <div className="mb-5 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-lg font-bold text-zinc-100">{heading}</h2>
          {hint && <p className="mt-0.5 text-[11px] leading-snug text-zinc-500">{hint}</p>}
        </div>

        {/* Cifra derivada en vivo, cuando el módulo tiene una que valga la pena. */}
        {badge && (
          <span className="shrink-0 rounded-lg bg-indigo-500/10 px-2.5 py-1 text-[11px]
                           font-semibold tabular-nums text-indigo-300 ring-1
                           ring-indigo-500/25"
          >
            {badge}
          </span>
        )}
      </div>

      <div className="space-y-3.5">{children}</div>

      {/*
        Guardar primero y a lo ancho, cancelar debajo y discreto. En una hoja que ya se
        cierra tocando el fondo o con Escape, cancelar tiene dos caminos de sobra: no
        necesita competir en peso con la acción que se vino a hacer.
      */}
      <div className="mt-7 space-y-2">
        <Button size="lg" full disabled={!canSave} onClick={onSave}>
          {isEditing ? 'Guardar cambios' : saveLabel}
        </Button>
        <Button size="md" full variant="ghost" onClick={onClose}>
          Cancelar
        </Button>
      </div>
    </BottomSheet>
  );
}
