import { isPassComplete } from '../../data/vipPasses';

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

/**
 * src/components/Prospecta/VIPPassFields.jsx
 *
 * Los tres pases de cortesía: nombre y WhatsApp de cada invitado.
 *
 * Se comparte entre el generador del menú (`VIPPassGenerator.jsx`) y el cierre
 * de una Cita Inicial (`PresentationEndModal.jsx`).
 *
 * ## Por qué es tan sobrio
 * Aquí hubo antes un boleto troquelado, con talón numerado en monoespaciada,
 * línea de rasgado y muescas en los costados. Se quitó por una razón que pesa
 * más que el ingenio del objeto: en el cierre de la Cita Inicial esta pantalla
 * **se le muestra al cliente**, y un "01 CORTESÍA" gigante junto a cada campo
 * convertía un obsequio en un talonario de rifa. El invitado no es el boleto
 * número uno de una serie.
 *
 * Lo que queda es sólo lo que la persona tiene que llenar. El avance se marca
 * con el filo del campo al completarse —sin marcas de verificación ni
 * contadores—, porque en una pantalla que un tercero está mirando, cada
 * elemento de más se lee como instrumentación del asesor.
 */
export default function VIPPassFields({ passes, onChange }) {
  const patch = (index, field, value) => {
    onChange(passes.map((pass, i) => (i === index ? { ...pass, [field]: value } : pass)));
  };

  return (
    <div className="space-y-3">
      {passes.map((pass, index) => {
        const isComplete = isPassComplete(pass);

        return (
          <div
            // El índice como clave es correcto aquí: son tres posiciones fijas
            // de un formulario, no una lista que se reordene o filtre.
            // eslint-disable-next-line react/no-array-index-key
            key={index}
            className="grid grid-cols-1 gap-2 sm:grid-cols-[1.2fr_1fr]"
          >
            <input
              className={`${INPUT} ${isComplete ? 'border-neutral-700' : ''}`}
              value={pass.name}
              onChange={(e) => patch(index, 'name', e.target.value)}
              placeholder="Nombre"
              /*
                El número sólo vive en el nombre accesible: sin él, un lector
                de pantalla anunciaría seis campos llamados "Nombre" y
                "WhatsApp" sin forma de saber a cuál de los tres invitados
                pertenece cada uno.
              */
              aria-label={`Nombre del invitado ${index + 1}`}
              autoComplete="off"
            />

            <input
              className={`${INPUT} ${isComplete ? 'border-neutral-700' : ''}`}
              value={pass.phone}
              onChange={(e) => patch(index, 'phone', e.target.value)}
              placeholder="WhatsApp"
              aria-label={`WhatsApp del invitado ${index + 1}`}
              type="tel"
              inputMode="tel"
              autoComplete="off"
            />
          </div>
        );
      })}
    </div>
  );
}
