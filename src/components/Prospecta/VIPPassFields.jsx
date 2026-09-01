import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, X, Ticket } from 'lucide-react';
import { REQUIRED_PASSES } from '../../data/vipPasses';
import AddInvitationSheet from './AddInvitationSheet';

/** Entrada y salida de una invitación ya agregada. Corta, sin rebote: es una fila, no un aviso. */
const REVEAL = {
  initial: { opacity: 0, y: -6, height: 0 },
  animate: { opacity: 1, y: 0, height: 'auto' },
  exit: { opacity: 0, y: -6, height: 0 },
  transition: { duration: 0.22, ease: 'easeOut' },
};

/**
 * src/components/Prospecta/VIPPassFields.jsx
 *
 * Las invitaciones de cortesía, con divulgación progresiva.
 *
 * ## Por qué no arranca con tres formularios
 * Antes se dibujaban los tres pares de campos vacíos desde el principio, y eso
 * comunicaba lo contrario de lo que se busca: tres casillas dobles en blanco se
 * leen como un requisito que hay que rellenar para poder seguir. Ahora la
 * pantalla empieza con una sola invitación a agregar, y cada nombre se suma
 * porque alguien decidió sumarlo. El límite (`REQUIRED_PASSES`) sigue ahí: el
 * botón desaparece al llegar al tercero.
 *
 * ## Por qué la captura vive en una hoja y no en línea
 * Antes cada "+ Agregar invitación" desplegaba un par de campos dentro de la
 * misma vista, y al crecer deformaban el layout —una lista de cajas a medio
 * llenar en medio de la pantalla del cliente—. Ahora el botón abre una hoja
 * inferior (`AddInvitationSheet`) que captura un contacto de una vez; al
 * confirmar, el contacto baja a esta lista como una fila limpia de sólo
 * lectura. La captura y la lista quedan separadas: aquí sólo se ve lo ya
 * agregado.
 *
 * ## Por qué se puede quitar una invitación
 * La `X` de cada fila no es un adorno: en una lista que crece, agregar de más
 * es tan fácil como agregar de menos, y sin forma de deshacerlo la única
 * salida sería dejar un contacto que no se quería.
 *
 * ## Historia del diseño
 * Aquí hubo un boleto troquelado con talón numerado en monoespaciada. Se quitó
 * porque en el cierre de la Cita Inicial esta pantalla **se le muestra al
 * cliente**, y un "01 CORTESÍA" junto a cada campo convertía un obsequio en un
 * talonario de rifa. Lo que queda es sólo lo que hay que llenar.
 */
export default function VIPPassFields({ passes, onChange }) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const canAddMore = passes.length < REQUIRED_PASSES;

  const add = (contact) => onChange([...passes, contact]);
  const remove = (index) => onChange(passes.filter((_, i) => i !== index));

  return (
    <div>
      <AnimatePresence initial={false}>
        {passes.map((pass, index) => (
          <motion.div
            // El índice como clave es aceptable aquí: las filas sólo se agregan
            // al final y se quitan por posición; nunca se reordenan ni se
            // filtran por contenido.
            // eslint-disable-next-line react/no-array-index-key
            key={index}
            {...REVEAL}
            className="overflow-hidden"
          >
            {/*
              Fila de sólo lectura de una invitación ya agregada. La captura se
              hizo en la hoja; aquí sólo se muestra a quién se invitó, con la
              `X` para quitarlo.
            */}
            <div className="mb-2 flex items-center gap-3 rounded-xl border border-neutral-800
                            bg-neutral-900/60 px-4 py-3"
            >
              <span
                className="grid h-9 w-9 shrink-0 place-items-center rounded-lg
                           bg-neutral-800 text-neutral-400"
                aria-hidden="true"
              >
                <Ticket size={16} />
              </span>

              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-neutral-100">
                  {pass.name}
                </span>
                <span className="block truncate text-xs text-neutral-500">
                  {pass.phone}
                </span>
              </span>

              <button
                type="button"
                onClick={() => remove(index)}
                aria-label={`Quitar la invitación ${index + 1}`}
                className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-neutral-600
                           transition-colors hover:text-neutral-300 focus-visible:outline-none
                           focus-visible:ring-1 focus-visible:ring-neutral-600"
              >
                <X size={16} aria-hidden="true" />
              </button>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>

      {/*
        El botón queda debajo de las invitaciones ya agregadas. Ya no despliega
        campos en línea: abre la hoja de captura. Desaparece al llegar al
        tercero en vez de quedarse deshabilitado: un botón apagado invita a
        preguntarse qué falta, y aquí no falta nada.
      */}
      {canAddMore && (
        <button
          type="button"
          onClick={() => setSheetOpen(true)}
          className="flex w-full items-center justify-center gap-2 rounded-lg border
                     border-neutral-800 bg-neutral-900 px-4 py-3.5 text-sm font-medium
                     text-neutral-200 transition-colors hover:border-neutral-700
                     hover:bg-neutral-800 active:scale-[0.99] focus-visible:outline-none
                     focus-visible:ring-1 focus-visible:ring-neutral-600"
        >
          <Plus size={16} strokeWidth={2} aria-hidden="true" />
          Agregar invitación
        </button>
      )}

      <AddInvitationSheet
        isOpen={sheetOpen}
        onClose={() => setSheetOpen(false)}
        onAdd={add}
      />
    </div>
  );
}
