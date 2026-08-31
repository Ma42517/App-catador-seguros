import { User, Phone, Check } from 'lucide-react';
import { isPassComplete } from '../../data/vipPasses';

/**
 * Troquelado del boleto: las dos muescas semicirculares de los costados.
 *
 * Son dos máscaras radiales que se intersecan —una por lado—, la misma técnica
 * con la que `BottomTabBar.jsx` recorta el hueco de su botón central. Se
 * intersecan y no se suman: cada máscara oculta su propio círculo y deja
 * visible el resto, así que sólo lo que ambas dejan pasar sobrevive.
 *
 * `maskComposite: 'intersect'` es el estándar; el `-webkit-` con `source-in`
 * es su equivalente en Safari, que todavía lo necesita con prefijo.
 */
const PUNCH = {
  WebkitMaskImage: 'radial-gradient(circle 7px at 0 50%, rgba(0,0,0,0) 6px, rgb(0,0,0) 7px),'
    + 'radial-gradient(circle 7px at 100% 50%, rgba(0,0,0,0) 6px, rgb(0,0,0) 7px)',
  maskImage: 'radial-gradient(circle 7px at 0 50%, rgba(0,0,0,0) 6px, rgb(0,0,0) 7px),'
    + 'radial-gradient(circle 7px at 100% 50%, rgba(0,0,0,0) 6px, rgb(0,0,0) 7px)',
  WebkitMaskComposite: 'source-in',
  maskComposite: 'intersect',
};

/** Campo del boleto. Sin borde propio: el marco lo pone el boleto. */
const INPUT = 'w-full min-w-0 border-none bg-white/[0.04] py-2 pl-8 pr-2.5 text-sm '
  + 'text-neutral-100 placeholder:text-neutral-600 rounded-lg '
  + 'focus:outline-none focus:ring-2 focus:ring-indigo-500';

/**
 * src/components/Prospecta/VIPPassFields.jsx
 *
 * Los pases de cortesía, dibujados como boletos de verdad.
 *
 * Se comparte entre los dos flujos que los piden —el generador del menú
 * (`VIPPassGenerator.jsx`) y el cierre de una Cita Inicial
 * (`PresentationEndModal.jsx`)— para que un pase se capture igual sin importar
 * de dónde venga.
 *
 * ## Por qué un boleto y no una tarjeta más
 * La versión anterior era un rectángulo redondeado con borde punteado, igual
 * que las otras veinte tarjetas de la app: el nombre decía "pase" pero la
 * forma no. Aquí el objeto se parece a lo que es —talón numerado en
 * monoespaciada, línea de rasgado vertical, muescas troqueladas en los
 * costados— porque el candado se sostiene en que esto se sienta un regalo con
 * valor, no un formulario de tres contactos.
 *
 * El talón es la parte que cambia de estado: apagado mientras el boleto está
 * en blanco, con degradado índigo y su marca de verificación al completarse.
 * Así el avance se lee en la forma del objeto y no hace falta una barra de
 * progreso aparte.
 */
export default function VIPPassFields({ passes, onChange }) {
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
            className="relative"
          >
            {/*
              Fondo troquelado. Va en su propia capa, como en la barra
              inferior: si la máscara se aplicara al contenedor de los campos,
              recortaría el aro de foco de los inputs al acercarse al borde.
            */}
            <div
              className={`absolute inset-0 rounded-xl transition-colors ${isComplete
                ? 'bg-indigo-500/[0.07] ring-1 ring-inset ring-indigo-500/40'
                : 'bg-white/[0.02] ring-1 ring-inset ring-neutral-800'}`}
              style={PUNCH}
              aria-hidden="true"
            />

            <div className="relative flex items-stretch">
              {/*
                ── Talón ──

                Ancho fijo y línea de rasgado punteada: es el gesto que
                convierte el rectángulo en boleto. El número va en
                monoespaciada y a dos dígitos, como una entrada numerada.
              */}
              <div
                className={`flex w-14 shrink-0 flex-col items-center justify-center gap-0.5
                            border-r border-dashed py-3 transition-colors ${isComplete
                  ? 'border-indigo-500/40 text-indigo-300'
                  : 'border-neutral-800 text-neutral-600'}`}
              >
                {isComplete ? (
                  <Check size={16} strokeWidth={3} aria-hidden="true" />
                ) : (
                  <span className="font-mono text-base font-bold leading-none tabular-nums">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                )}
                <span className="text-[7px] font-bold uppercase tracking-[0.12em]">
                  Cortesía
                </span>
              </div>

              <div className="grid min-w-0 flex-1 grid-cols-1 gap-2 p-2.5 sm:grid-cols-2">
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
          </div>
        );
      })}
    </div>
  );
}
