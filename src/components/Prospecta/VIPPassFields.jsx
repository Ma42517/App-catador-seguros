import { motion, AnimatePresence } from 'framer-motion';
import { Plus, X } from 'lucide-react';
import { REQUIRED_PASSES, isPassComplete } from '../../data/vipPasses';

/*
  Campo del formulario. Fondo casi negro con un filo apenas visible que se
  aclara al enfocar: no hay caja gris, sólo la línea que delimita dónde se
  escribe.

  Es el detalle que decide si el formulario se ve caro. Un `bg-neutral-800`
  —el gris de relleno habitual— convierte cada campo en un bloque que compite
  con el texto; a `neutral-950` sobre negro el campo casi desaparece y lo único
  que se lee es lo que la persona escribe.
*/
const INPUT = 'w-full min-w-0 rounded-lg border border-neutral-800 bg-neutral-950 px-3.5 py-3 '
  + 'text-sm text-neutral-200 placeholder-neutral-600 transition-colors '
  + 'focus:border-neutral-500 focus:outline-none';

/** Entrada y salida de una invitación. Corta, sin rebote: es un campo, no un aviso. */
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
 * ## Por qué se puede quitar una invitación
 * La `X` de cada fila no es un adorno: en un formulario que crece, agregar de
 * más es tan fácil como agregar de menos, y sin forma de deshacerlo la única
 * salida sería dejar una fila vacía —que además bloquearía el conteo de
 * completos—.
 *
 * ## Historia del diseño
 * Aquí hubo un boleto troquelado con talón numerado en monoespaciada. Se quitó
 * porque en el cierre de la Cita Inicial esta pantalla **se le muestra al
 * cliente**, y un "01 CORTESÍA" junto a cada campo convertía un obsequio en un
 * talonario de rifa. Lo que queda es sólo lo que hay que llenar.
 */
export default function VIPPassFields({ passes, onChange }) {
  const canAddMore = passes.length < REQUIRED_PASSES;

  const patch = (index, field, value) => {
    onChange(passes.map((pass, i) => (i === index ? { ...pass, [field]: value } : pass)));
  };

  const add = () => onChange([...passes, { name: '', phone: '' }]);
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
            <div className="flex items-center gap-2 pb-3">
              <div className="grid min-w-0 flex-1 grid-cols-1 gap-2 sm:grid-cols-[1.2fr_1fr]">
                <input
                  className={`${INPUT} ${isPassComplete(pass) ? 'border-neutral-700' : ''}`}
                  value={pass.name}
                  onChange={(e) => patch(index, 'name', e.target.value)}
                  placeholder="Nombre"
                  /*
                    El número sólo vive en el nombre accesible: sin él, un lector
                    de pantalla anunciaría campos llamados "Nombre" y "WhatsApp"
                    sin forma de saber a cuál invitado pertenece cada uno.
                  */
                  aria-label={`Nombre del invitado ${index + 1}`}
                  autoComplete="off"
                  autoFocus={!pass.name && !pass.phone}
                />

                <input
                  className={`${INPUT} ${isPassComplete(pass) ? 'border-neutral-700' : ''}`}
                  value={pass.phone}
                  onChange={(e) => patch(index, 'phone', e.target.value)}
                  placeholder="WhatsApp"
                  aria-label={`WhatsApp del invitado ${index + 1}`}
                  type="tel"
                  inputMode="tel"
                  autoComplete="off"
                />
              </div>

              <button
                type="button"
                onClick={() => remove(index)}
                aria-label={`Quitar la invitación ${index + 1}`}
                className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-neutral-700
                           transition-colors hover:text-neutral-400 focus-visible:outline-none
                           focus-visible:ring-1 focus-visible:ring-neutral-600"
              >
                <X size={15} aria-hidden="true" />
              </button>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>

      {/*
        El botón queda debajo de las invitaciones ya agregadas, así que la
        siguiente se escribe justo donde estaba el pulgar. Desaparece al llegar
        al tercero en vez de quedarse deshabilitado: un botón apagado invita a
        preguntarse qué falta, y aquí no falta nada.
      */}
      {canAddMore && (
        <button
          type="button"
          onClick={add}
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
    </div>
  );
}
