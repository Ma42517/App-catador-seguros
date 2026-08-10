import {
  CalendarClock, Calculator, PieChart, Stethoscope, FileText, RotateCcw, ExternalLink,
} from 'lucide-react';
import { tapFeedback } from '../../lib/haptics';
import PitchVideo from './PitchVideo';
import RotatingQuestions from './RotatingQuestions';

/**
 * Mensajes de las dos acciones principales.
 *
 * Van redactados en primera persona del prospecto porque el que los envía es
 * él: llegan al WhatsApp del asesor como si los hubiera escrito, y con la
 * intención ya declarada. El asesor abre la conversación sabiendo si le piden
 * una cita o un precio, sin gastar el primer mensaje en preguntarlo.
 *
 * Los quince minutos van dentro del texto y no sólo en el botón: es el
 * compromiso que hace que un desconocido acepte: una cita sin duración
 * anunciada se lee como una tarde de venta.
 */
const AGENDA_MESSAGE = 'Hola, vi tu tarjeta y quiero agendar una asesoría de 15 minutos.';
const QUOTE_MESSAGE = 'Hola, vi tu tarjeta y quiero una cotización rápida.';

/**
 * Herramientas del reverso, agrupadas por el momento en que sirven.
 *
 * Los dos grupos no son una decoración: quien todavía no compró y quien ya es
 * cliente buscan cosas distintas, y sin el corte los accesos se leen como una
 * lista donde hay que ir descartando. Con el rótulo, cada persona salta directo
 * a su mitad.
 *
 * Todos abren WhatsApp con el texto ya redactado en lugar de llevar a una
 * pantalla propia. Es una decisión de alcance, no un atajo: un diagnóstico o un
 * directorio médico de verdad necesitan datos y permisos que esta app no tiene,
 * y un botón que abre una pantalla vacía o un "próximamente" se siente peor que
 * no estar.
 *
 * "Solicitar cotización" ya no está aquí: subió a la acción secundaria bajo el
 * botón de agendar. Repetida en los dos sitios obligaba a preguntarse si eran
 * cosas distintas.
 */
const SECTIONS = [
  {
    key: 'prospeccion',
    label: 'Antes de decidir',
    items: [
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
 * Reverso de la tarjeta: prospección y agenda.
 *
 * La cara frontal presenta al asesor; ésta pide una cita. Está ordenada como una
 * conversación de venta y no como un menú de opciones: primero el video pone
 * cara y voz, después las preguntas hacen que el prospecto se reconozca en una
 * situación, y sólo entonces aparece el botón. Al revés —el botón primero— se le
 * pide la cita a alguien que todavía no sabe por qué la necesita.
 *
 * El fondo es gris oscuro sobrio, sin la foto ni el color ambiental del frente:
 * aquí nadie tiene que ser persuadido por la estética, sólo encontrar el botón.
 */
export default function ServicesHubBack({ card, onBack }) {
  const {
    fullName, company, whatsapp, phone, videoUrl,
  } = card;

  // Se acepta el teléfono como respaldo: quien no llenó el campo de WhatsApp
  // casi siempre tiene el mismo número en ambos, y dejar los accesos muertos
  // por un campo vacío desperdicia la cara entera.
  const contactNumber = String(whatsapp || phone || '').replace(/[^\d+]/g, '').replace(/^\+/, '');

  const linkFor = (message) => (contactNumber
    ? `https://wa.me/${contactNumber}?text=${encodeURIComponent(message)}`
    : '');

  const agendaHref = linkFor(AGENDA_MESSAGE);
  const quoteHref = linkFor(QUOTE_MESSAGE);

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
        El contenido se desplaza en lugar de comprimirse. Con el video, las
        preguntas, las dos acciones y los accesos ya no cabe centrado en la
        pantalla de un teléfono pequeño, y sin esto lo último quedaría cortado sin
        forma de alcanzarlo.

        No lleva `overscroll-contain`: esa propiedad prohíbe que el gesto se
        propague, así que al llegar al final el movimiento moriría aquí en lugar
        de seguir desplazando lo que haya detrás.

        El `pt-14` reserva la banda del botón de cerrar. Sin esa reserva, el video
        arrancaría a la misma altura que el botón y quedaría por debajo.
      */}
      <div className="relative flex-1 overflow-y-auto px-5 pb-8 pt-14">
        {/* 1 — Quién es. Pone cara y voz antes de pedir nada. */}
        <PitchVideo url={videoUrl} fullName={fullName} />

        {/* 2 — Por qué le importa. Las preguntas se relevan solas. */}
        <RotatingQuestions />

        {/*
          3 — La acción.

          Un solo botón ancho y con peso visual, porque toda esta cara existe
          para que se pulse. La cotización queda debajo como enlace discreto: le
          sirve a quien ya sabe lo que quiere y sólo busca un precio, y compitiendo
          en tamaño con la cita le robaría al asesor la conversación de quince
          minutos donde de verdad puede ayudar.
        */}
        <a
          href={agendaHref || undefined}
          aria-disabled={!agendaHref}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(event) => {
            if (!agendaHref) {
              event.preventDefault();
              return;
            }
            tapFeedback();
          }}
          className={`flex w-full items-center justify-center gap-2.5 rounded-2xl px-4 py-4
            text-base font-bold text-white transition-all
            ${agendaHref
              ? `bg-gradient-to-r from-sky-500 to-indigo-600 shadow-lg shadow-indigo-600/30
                 hover:from-sky-400 hover:to-indigo-500 active:scale-[0.98]
                 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300`
              : 'cursor-default bg-white/10 text-white/50'}`}
        >
          <CalendarClock size={19} strokeWidth={2.2} aria-hidden="true" />
          Agendar Asesoría (15 min)
        </a>

        <a
          href={quoteHref || undefined}
          aria-disabled={!quoteHref}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(event) => {
            if (!quoteHref) {
              event.preventDefault();
              return;
            }
            tapFeedback();
          }}
          className={`mx-auto mt-3 flex w-max items-center gap-1.5 rounded-lg px-3 py-2
            text-xs font-semibold underline decoration-zinc-600 decoration-1 underline-offset-4
            transition-colors
            ${quoteHref
              ? `text-zinc-400 hover:text-sky-300 hover:decoration-sky-400
                 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/60`
              : 'cursor-default text-zinc-600'}`}
        >
          <Calculator size={13} aria-hidden="true" />
          Solicitar cotización rápida
        </a>

        {/*
          A quién le llega. Va después de las acciones y no antes: puesto arriba
          se leía como el título de la cara, y el título de esta cara es el video.
        */}
        <p className="mt-3 text-center text-[11px] leading-relaxed text-zinc-500">
          {fullName
            ? `Le escribes directo a ${fullName.split(' ')[0]}`
            : 'Le escribes directo a tu asesor'}
          {company ? ` · ${company}` : ''}
        </p>

        {/*
          Sin número no se ocultan los accesos: se explica qué falta. Un reverso
          apagado parecería roto, y el asesor no sabría que el arreglo está en su
          propio formulario.
        */}
        {!contactNumber && (
          <p className="mt-4 text-center text-[11px] leading-relaxed text-amber-400/90">
            Agrega tu WhatsApp en la tarjeta para activar estos botones.
          </p>
        )}

        {/*
          4 — Lo demás, separado por una línea.

          El corte es lo que evita que estos accesos compitan con el botón de
          arriba: sin él, la vista lee seis destinos del mismo rango y la cita
          deja de ser la acción principal.
        */}
        <div className="my-6 h-px bg-white/10" aria-hidden="true" />

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
      </div>
    </div>
  );
}
