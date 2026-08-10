import { FileText, Stethoscope, ShieldCheck, ChevronLeft, ExternalLink } from 'lucide-react';
import { tapFeedback } from '../../lib/haptics';

/**
 * Accesos del portal, con el mensaje que cada uno deja escrito.
 *
 * Los tres abren WhatsApp con el texto ya redactado en lugar de llevar a una
 * pantalla propia. Es una decisión de alcance, no un atajo: un portal de
 * facturación o un directorio médico de verdad necesitan datos que esta app no
 * tiene, y un botón que abre una pantalla vacía o un "próximamente" se siente
 * peor que no estar. Así el cliente resuelve hoy, con la vía por la que el
 * asesor ya atiende, y el mensaje prellenado le ahorra explicar qué necesita.
 */
const ACTIONS = [
  {
    key: 'factura',
    label: 'Solicitar Factura',
    hint: 'Datos fiscales y comprobantes',
    Icon: FileText,
    message: 'Hola, soy tu cliente y necesito solicitar una factura de mi póliza.',
  },
  {
    key: 'medico',
    label: 'Directorio Médico',
    hint: 'Hospitales y médicos de tu red',
    Icon: Stethoscope,
    message: 'Hola, necesito el directorio médico de mi seguro de gastos médicos.',
  },
  {
    key: 'polizas',
    label: 'Mis Pólizas',
    hint: 'Coberturas, recibos y vigencias',
    Icon: ShieldCheck,
    message: 'Hola, quiero consultar la información de mis pólizas vigentes.',
  },
];

/**
 * Reverso de la tarjeta: el portal para quien ya es cliente.
 *
 * La cara frontal está pensada para convencer a un desconocido; ésta para
 * resolverle un trámite a alguien que ya firmó. Son dos públicos con
 * necesidades opuestas, y mezclarlos obligaba a que el prospecto viera botones
 * de facturación que no le sirven de nada. De ahí que sean dos caras y no una
 * lista más larga.
 *
 * El fondo es gris oscuro sobrio, sin la foto ni el color ambiental del frente:
 * aquí nadie tiene que ser persuadido, sólo encontrar el botón que busca.
 */
export default function ClientPortalBack({ card, onBack }) {
  const { fullName, company, whatsapp, phone } = card;

  // Se acepta el teléfono como respaldo: quien no llenó el campo de WhatsApp
  // casi siempre tiene el mismo número en ambos, y dejar los tres accesos
  // muertos por un campo vacío desperdicia la cara entera.
  const contactNumber = String(whatsapp || phone || '').replace(/[^\d+]/g, '').replace(/^\+/, '');

  const linkFor = (message) => (contactNumber
    ? `https://wa.me/${contactNumber}?text=${encodeURIComponent(message)}`
    : '');

  return (
    <div className="flex h-full w-full flex-col bg-zinc-900">
      {/* Textura de fondo: dos resplandores muy tenues, para que el gris no
          se lea como un bloque plano. */}
      <span
        className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full
                   bg-sky-500/10 blur-3xl"
        aria-hidden="true"
      />
      <span
        className="pointer-events-none absolute -bottom-24 -left-16 h-56 w-56 rounded-full
                   bg-indigo-600/10 blur-3xl"
        aria-hidden="true"
      />

      {/* Regreso a la cara frontal */}
      <div className="relative flex items-center justify-between p-5 pb-0">
        <button
          type="button"
          onClick={() => { tapFeedback(); onBack(); }}
          className="flex items-center gap-1 rounded-full border border-white/10 bg-white/5
                     py-1.5 pl-2 pr-3 text-xs font-semibold text-zinc-300 backdrop-blur-md
                     transition-colors hover:bg-white/10 hover:text-white active:scale-95
                     focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
        >
          <ChevronLeft size={15} />
          Volver
        </button>
      </div>

      <div className="relative flex flex-1 flex-col justify-center px-5 pb-8">
        <div className="mb-6">
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-sky-400">
            Portal de Clientes
          </p>
          <h2 className="mt-1 text-2xl font-bold leading-tight text-white">
            ¿En qué te ayudo hoy?
          </h2>
          <p className="mt-1.5 text-xs leading-relaxed text-zinc-400">
            {fullName
              ? `Escribe directo a ${fullName.split(' ')[0]}`
              : 'Escribe directo a tu asesor'}
            {company ? ` · ${company}` : ''}
          </p>
        </div>

        <ul className="flex flex-col gap-2.5">
          {ACTIONS.map(({ key, label, hint, Icon, message }) => {
            const href = linkFor(message);
            const enabled = Boolean(href);

            return (
              <li key={key}>
                <a
                  href={enabled ? href : undefined}
                  aria-disabled={!enabled}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(event) => {
                    if (!enabled) {
                      event.preventDefault();
                      return;
                    }
                    tapFeedback();
                  }}
                  className={`flex items-center gap-3 rounded-2xl border p-3.5 transition-all
                    ${enabled
                      ? `border-white/10 bg-white/[0.07] backdrop-blur-md hover:bg-white/[0.12]
                         active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2
                         focus-visible:ring-sky-400/60`
                      : 'cursor-default border-white/5 bg-white/[0.03] opacity-50'}`}
                >
                  <span
                    className="grid h-10 w-10 shrink-0 place-items-center rounded-xl
                               border border-white/10 bg-white/10 text-sky-300"
                    aria-hidden="true"
                  >
                    <Icon size={18} strokeWidth={1.9} />
                  </span>

                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold leading-tight text-white">
                      {label}
                    </span>
                    <span className="mt-0.5 block truncate text-[11px] text-zinc-400">
                      {hint}
                    </span>
                  </span>

                  {enabled && (
                    <ExternalLink size={14} className="shrink-0 text-zinc-500" aria-hidden="true" />
                  )}
                </a>
              </li>
            );
          })}
        </ul>

        {/*
          Sin número no se ocultan los accesos: se explica qué falta. Un reverso
          vacío parecería roto, y el asesor no sabría que el arreglo está en su
          propio formulario.
        */}
        {!contactNumber && (
          <p className="mt-4 text-center text-[11px] leading-relaxed text-amber-400/90">
            Agrega tu WhatsApp en la tarjeta para activar estos accesos.
          </p>
        )}
      </div>
    </div>
  );
}
