import {
  Calculator, PieChart, Stethoscope, FileText, RotateCcw, ExternalLink,
} from 'lucide-react';
import { tapFeedback } from '../../lib/haptics';

/**
 * Herramientas del reverso, agrupadas por el momento en que sirven.
 *
 * Los dos grupos no son una decoración: quien todavía no compró y quien ya es
 * cliente buscan cosas distintas, y sin el corte los cuatro accesos se leen
 * como una lista donde hay que ir descartando. Con el rótulo, cada persona
 * salta directo a su mitad.
 *
 * Los cuatro abren WhatsApp con el texto ya redactado en lugar de llevar a una
 * pantalla propia. Es una decisión de alcance, no un atajo: una cotización, un
 * diagnóstico o un directorio médico de verdad necesitan datos y permisos que
 * esta app no tiene, y un botón que abre una pantalla vacía o un "próximamente"
 * se siente peor que no estar. Así la persona resuelve hoy, por la vía donde el
 * asesor ya atiende, y el mensaje prellenado le ahorra explicar qué necesita.
 *
 * El diagnóstico tampoco enlaza al módulo interno de la app: la tarjeta se le
 * pone en la mano a un desconocido, y ese módulo vive detrás de la sesión del
 * asesor. Abrirlo ahí sería entregarle su cuenta a quien tiene el teléfono.
 */
const SECTIONS = [
  {
    key: 'prospeccion',
    label: 'Prospección y nuevos negocios',
    items: [
      {
        key: 'cotizacion',
        label: 'Solicitar Cotización',
        hint: 'Auto, Vida, GMM y más.',
        Icon: Calculator,
        message: 'Hola, me interesa solicitar una cotización de un seguro.',
      },
      {
        key: 'diagnostico',
        label: 'Diagnóstico Financiero',
        hint: 'Descubre tu nivel de protección en 1 min.',
        Icon: PieChart,
        message: 'Hola, quiero hacer el diagnóstico financiero para conocer mi nivel de protección.',
      },
    ],
  },
  {
    key: 'clientes',
    label: 'Clientes activos',
    items: [
      {
        key: 'medico',
        label: 'Directorio Médico',
        hint: 'Encuentra hospitales y especialistas.',
        Icon: Stethoscope,
        message: 'Hola, necesito el directorio médico de mi seguro de gastos médicos.',
      },
      {
        key: 'polizas',
        label: 'Mis Pólizas y Facturas',
        hint: 'Consulta tus coberturas y recibos.',
        Icon: FileText,
        message: 'Hola, soy tu cliente y quiero consultar mis pólizas y facturas.',
      },
    ],
  },
];

/** Acceso individual: icono a la izquierda, título y subtítulo. */
function ToolButton({ label, hint, Icon, href }) {
  const enabled = Boolean(href);

  return (
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
        className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-white/10
                   bg-white/10 text-sky-300"
        aria-hidden="true"
      >
        <Icon size={18} strokeWidth={1.9} />
      </span>

      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold leading-tight text-white">{label}</span>
        <span className="mt-0.5 block text-[11px] leading-snug text-zinc-400">{hint}</span>
      </span>

      {enabled && (
        <ExternalLink size={14} className="shrink-0 text-zinc-500" aria-hidden="true" />
      )}
    </a>
  );
}

/**
 * Reverso de la tarjeta: el hub de servicios y prospección.
 *
 * La cara frontal está pensada para presentar al asesor; ésta para que quien
 * tiene el teléfono en la mano actúe, sea un desconocido pidiendo una
 * cotización o un cliente buscando su directorio médico.
 *
 * El fondo es gris oscuro sobrio, sin la foto ni el color ambiental del frente:
 * aquí nadie tiene que ser persuadido, sólo encontrar el botón que busca.
 */
export default function ServicesHubBack({ card, onBack }) {
  const { fullName, company, whatsapp, phone } = card;

  // Se acepta el teléfono como respaldo: quien no llenó el campo de WhatsApp
  // casi siempre tiene el mismo número en ambos, y dejar los accesos muertos
  // por un campo vacío desperdicia la cara entera.
  const contactNumber = String(whatsapp || phone || '').replace(/[^\d+]/g, '').replace(/^\+/, '');

  const linkFor = (message) => (contactNumber
    ? `https://wa.me/${contactNumber}?text=${encodeURIComponent(message)}`
    : '');

  return (
    <div className="relative flex h-full w-full flex-col bg-zinc-900">
      {/*
        Textura de fondo: dos resplandores muy tenues para que el gris no se lea
        como un bloque plano. Van fuera del área que se desplaza, si no se
        moverían con la lista y el fondo dejaría de parecer fondo.
      */}
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

      {/*
        Cierre del reverso, arriba a la derecha.

        Estaba a la izquierda y chocaba con la flecha de "Volver" de la pantalla
        de la tarjeta, que vive en `left-4 top-4`: dos botones de regreso
        superpuestos, y el de abajo inalcanzable. A la derecha no hay nada que
        disputar, y además queda donde está el botón "Servicios" de la cara
        frontal: se entra y se sale por el mismo sitio.

        Va fuera del área que se desplaza —no dentro— para que no se vaya de la
        vista al bajar la lista. El `z-50` lo mantiene por encima del contenido
        desplazable, que no crea contexto de apilamiento propio.

        El icono es una flecha circular y no una equis: una equis dice "esto se
        cierra", y aquí nada se cierra —la tarjeta vuelve a su cara frontal—. La
        vuelta que da cada pocos segundos anticipa el movimiento que va a hacer
        la tarjeta al pulsarlo.
      */}
      <button
        type="button"
        /*
          El golpe al tacto no se dispara aquí: lo hace `flipTo` en la tarjeta,
          que es quien gobierna el giro. Llamarlo en los dos sitios daba una
          vibración doble en un solo toque.
        */
        onClick={onBack}
        aria-label="Voltear la tarjeta y volver al frente"
        className="group absolute right-4 top-4 z-50 rounded-full bg-white/10 p-2
                   backdrop-blur-md transition-colors hover:bg-white/20 active:scale-95
                   focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
      >
        <RotateCcw size={20} className="animate-flip-hint text-white" />
      </button>

      {/*
        La lista se desplaza en lugar de comprimirse. Con cuatro accesos y dos
        rótulos ya no cabe centrada en la pantalla de un teléfono pequeño, y sin
        esto el último botón quedaría cortado sin forma de alcanzarlo.
        No lleva `overscroll-contain`: esa propiedad prohíbe que el gesto se
        propague, así que al llegar al final del listado el movimiento moriría aquí
        en lugar de seguir desplazando lo que haya detrás.

        El `pt-16` reserva la banda del botón de cerrar. Sin esa reserva, el
        título arrancaría a la misma altura que el botón y el texto le pasaría
        por debajo; al desplazar la lista sí lo hace, pero entonces es
        deliberado: el cristal del botón deja ver el contenido correr detrás.
      */}
      <div className="relative flex-1 overflow-y-auto px-5 pb-8 pt-16">
        <div className="mb-5">
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-sky-400">
            Servicios y Soluciones
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

        <div className="flex flex-col gap-5">
          {SECTIONS.map((section) => (
            <section key={section.key} aria-labelledby={`hub-${section.key}`}>
              <h3
                id={`hub-${section.key}`}
                className="mb-2 text-[10px] font-bold uppercase tracking-[0.14em] text-zinc-500"
              >
                {section.label}
              </h3>

              <ul className="flex flex-col gap-2.5">
                {section.items.map(({ key, label, hint, Icon, message }) => (
                  <li key={key}>
                    <ToolButton
                      label={label}
                      hint={hint}
                      Icon={Icon}
                      href={linkFor(message)}
                    />
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>

        {/*
          Sin número no se ocultan los accesos: se explica qué falta. Un reverso
          vacío parecería roto, y el asesor no sabría que el arreglo está en su
          propio formulario.
        */}
        {!contactNumber && (
          <p className="mt-5 text-center text-[11px] leading-relaxed text-amber-400/90">
            Agrega tu WhatsApp en la tarjeta para activar estos accesos.
          </p>
        )}
      </div>
    </div>
  );
}
