import { User, Phone, Ticket, Check } from 'lucide-react';
import { isPassComplete } from '../../data/vipPasses';

/**
 * Campo de un pase. `bg-neutral-900` sin borde propio: el marco lo pone el
 * boleto que lo contiene, así que un borde aquí sumaría una segunda línea
 * dentro de otra.
 */
const INPUT = 'w-full min-w-0 border-none bg-neutral-900 py-2 pl-8 pr-3 text-sm '
  + 'text-neutral-200 placeholder:text-neutral-600 rounded-lg '
  + 'focus:outline-none focus:ring-2 focus:ring-indigo-500';

/**
 * src/components/Prospecta/VIPPassFields.jsx
 *
 * Los tres boletos de cortesía. Se comparte entre los dos flujos que los
 * piden —el generador del menú (`VIPPassGenerator.jsx`) y el cierre de una
 * Cita Inicial (`PresentationEndModal.jsx`)— para que un pase se capture
 * igual sin importar de dónde venga, y para que `arePassesComplete` sea la
 * única definición de "ya está lleno".
 *
 * ## El boleto por llenar
 * Un pase vacío lleva `border-dashed`: se lee como un boleto pendiente de
 * escribir, no como un campo roto. Al completarse pasa a línea continua e
 * índigo, con su marca de verificación — el propio formulario va contando sin
 * necesitar una barra de progreso aparte.
 *
 * Quién decide si un pase está completo vive en `data/vipPasses.js`
 * (`isPassComplete`/`arePassesComplete`), no aquí: es la misma regla que usa
 * el botón de desbloquear, y duplicarla dejaría un boleto marcado en verde
 * mientras el botón sigue apagado.
 */
export default function VIPPassFields({ passes, onChange, disabled = false }) {
  const patch = (index, field, value) => {
    onChange(passes.map((pass, i) => (i === index ? { ...pass, [field]: value } : pass)));
  };

  return (
    <div className="space-y-2.5">
      {passes.map((pass, index) => {
        const isComplete = isPassComplete(pass);

        return (
          <div
            // El índice como clave es correcto aquí: son tres posiciones fijas
            // de un formulario, no una lista que se reordene o filtre.
            // eslint-disable-next-line react/no-array-index-key
            key={index}
            className={`rounded-xl border p-3 transition-colors ${isComplete
              ? 'border-indigo-500/50 bg-indigo-500/[0.04]'
              : 'border-dashed border-neutral-700 bg-neutral-950/40'}`}
          >
            <div className="mb-2 flex items-center gap-2">
              <span
                className={`grid h-5 w-5 shrink-0 place-items-center rounded-md
                            ${isComplete
                  ? 'bg-indigo-500 text-white'
                  : 'bg-neutral-800 text-neutral-500'}`}
                aria-hidden="true"
              >
                {isComplete ? <Check size={11} strokeWidth={3} /> : <Ticket size={11} />}
              </span>
              <span
                className={`text-[10px] font-bold uppercase tracking-widest
                            ${isComplete ? 'text-indigo-300' : 'text-neutral-500'}`}
              >
                Pase {index + 1}
              </span>
            </div>

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <div className="relative">
                <User
                  size={14}
                  className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2
                             text-neutral-600"
                  aria-hidden="true"
                />
                <input
                  className={INPUT}
                  value={pass.name}
                  disabled={disabled}
                  onChange={(e) => patch(index, 'name', e.target.value)}
                  placeholder="Nombre"
                  aria-label={`Nombre del pase ${index + 1}`}
                  autoComplete="off"
                />
              </div>

              <div className="relative">
                <Phone
                  size={14}
                  className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2
                             text-neutral-600"
                  aria-hidden="true"
                />
                <input
                  className={INPUT}
                  value={pass.phone}
                  disabled={disabled}
                  onChange={(e) => patch(index, 'phone', e.target.value)}
                  placeholder="WhatsApp"
                  aria-label={`WhatsApp del pase ${index + 1}`}
                  type="tel"
                  inputMode="tel"
                  autoComplete="off"
                />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
