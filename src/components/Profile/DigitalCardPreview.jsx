import { useState } from 'react';
import {
  Phone, Mail, MessageSquare, QrCode, Share2, UserPlus,
} from 'lucide-react';
import { tapFeedback } from '../../lib/haptics';
import QrPassModal from './QrPassModal';

/**
 * Icono de WhatsApp: lucide no lo trae, así que va como trazo propio.
 *
 * Acepta `className` para poder animarlo desde fuera, igual que los iconos de
 * lucide: sin eso, el único de los cuatro que no se movería sería justo el que
 * más se usa.
 */
function WhatsAppMark({ size = 18, className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M17.47 14.38c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.35.22-.64.07-.3-.15-1.13-.42-2.15-1.33-.8-.71-1.34-1.6-1.5-1.9-.15-.3-.01-.46.13-.61.16-.16.3-.35.45-.53.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.07-.15-.65-1.57-.89-2.15-.23-.56-.47-.49-.65-.5h-.55c-.2 0-.5.07-.77.37-.27.3-1.02 1-1.02 2.42s1.04 2.8 1.19 3c.15.2 2.05 3.13 4.96 4.27 2.42.95 2.9.76 3.42.71.52-.05 1.68-.68 1.92-1.35.24-.66.24-1.23.17-1.35-.07-.12-.27-.2-.57-.35z" />
      <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.46 1.32 4.96L2 22l5.25-1.38c1.45.79 3.08 1.2 4.79 1.2 5.46 0 9.91-4.45 9.91-9.91S17.5 2 12.04 2zm0 18.02c-1.55 0-3.07-.42-4.4-1.2l-.32-.19-3.26.86.87-3.18-.2-.33a8.09 8.09 0 0 1-1.24-4.32c0-4.47 3.64-8.11 8.11-8.11s8.11 3.64 8.11 8.11-3.64 8.11-8.11 8.11z" />
    </svg>
  );
}

/**
 * Botón circular blanco de contacto.
 *
 * Se hunde al pulsarlo y responde con un golpe corto de vibración: son los
 * gestos que hacen que un botón se sienta físico. El golpe va en el `onClick`,
 * y no al cargar la tarjeta, porque es el único momento en que el navegador
 * permite vibrar —ya hubo un toque de la persona.
 *
 * Deshabilitado si no hay dato que usar, porque enlazar a un `tel:` vacío le
 * daría un error a quien lo toque. Deshabilitado tampoco se anima: un icono
 * moviéndose invita a tocarlo, y tocar aquí no haría nada.
 */
function SocialButton({ label, href, glow = false, children }) {
  const enabled = Boolean(href);

  return (
    <a
      href={enabled ? href : undefined}
      aria-label={label}
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
      /*
        El brillo del contorno vive en el círculo y no en el icono: es la
        silueta del botón la que tiene que destellar. Sólo se enciende si el
        botón sirve, porque un botón que llama la atención sin poder usarse
        promete algo que no cumple.
      */
      className={`grid h-11 w-11 place-items-center rounded-full transition-transform
        will-change-transform
        ${enabled
          ? `bg-white text-zinc-900 shadow-lg active:scale-90
             hover:shadow-[0_0_15px_rgba(255,255,255,0.4)]
             ${glow ? 'animate-glow-outline' : ''}`
          : 'cursor-default bg-white/30 text-zinc-600'}`}
    >
      {children}
    </a>
  );
}

/**
 * Vista previa de la tarjeta digital, con fondo "Ambient Blur".
 *
 * La mitad inferior ya no es negra: bajo el contenido vive la misma foto
 * repetida, desenfocada al extremo, de modo que la tarjeta se tiñe con los
 * colores de la ropa y del fondo del retrato. Es el recurso que usan las apps
 * de mensajería para que una imagen no termine en un corte seco.
 *
 * Las capas van en este orden y ninguna sobra:
 *
 *   0. Ambiental — la foto desenfocada, más un velo que baja su contraste.
 *   1. Retrato   — la foto nítida en el 60% superior, desvanecida hacia abajo.
 *   2. Legibilidad — velo vertical que asegura el contraste del texto.
 *   3. Contenido — nombre, datos y accesos de contacto.
 *
 * El retrato se desvanece con una máscara en lugar de taparse con un degradado
 * negro: pintar negro encima devolvería justo el bloque sólido que se quería
 * quitar, y la unión volvería a notarse. Con la máscara, la foto nítida se
 * disuelve y lo que aparece por debajo es el color ambiental.
 */
export default function DigitalCardPreview({ card, variant = 'frame', onAddContact }) {
  const {
    fullName, title, company, license, specialties = [], bio, phone, email, whatsapp, avatarUrl,
  } = card;

  const digits = (value) => String(value ?? '').replace(/[^\d+]/g, '');

  const [isQrOpen, setQrOpen] = useState(false);

  /*
    Dos presentaciones de la misma tarjeta:
      - `frame`: maqueta de celular, para verla junto al formulario.
      - `fill`:  ocupa la pantalla entera. En un teléfono el marco sobra —el
                 dispositivo ya es el marco—, y dibujarlo dentro de otro marco
                 hace la tarjeta más pequeña justo cuando se la enseña a alguien.
  */
  const isFill = variant === 'fill';

  /*
    Máscara que desvanece el retrato hacia abajo. Se repite con el prefijo
    `-webkit-`: WebKit —todo navegador en iPhone, que es donde más se va a
    mostrar esta tarjeta— sólo entiende la propiedad prefijada, y sin ella la
    foto terminaría en un borde recto a media tarjeta.
  */
  const portraitFade =
    '[mask-image:linear-gradient(to_bottom,#000_45%,transparent_100%)] '
    + '[-webkit-mask-image:linear-gradient(to_bottom,#000_45%,transparent_100%)]';

  return (
    /*
      `bg-zinc-950` no es el fondo que se ve, es la red de seguridad: si la foto
      no carga, sin él la tarjeta quedaría transparente y se vería la página por
      debajo. El color de verdad lo pone la capa ambiental.
    */
    <div
      className={`relative overflow-hidden bg-zinc-950 ${isFill
        ? 'h-full w-full'
        : 'mx-auto h-[650px] w-[320px] rounded-[2.5rem] border-4 border-zinc-900 shadow-2xl'}`}
    >
      {/* Capa 0 — Ambiental: la foto convertida en luz de color */}
      {avatarUrl && (
        <div className="absolute inset-0" aria-hidden="true">
          {/*
            `scale-110` es obligatorio, no decorativo: un desenfoque de este
            tamaño arrastra los píxeles del borde hacia dentro y deja un halo
            claro en el perímetro, que sólo queda fuera del marco si la imagen
            sobresale.
          */}
          <img
            src={avatarUrl}
            alt=""
            referrerPolicy="no-referrer"
            className="absolute inset-0 h-full w-full scale-110 object-cover opacity-60 blur-3xl"
          />
          {/* Baja el contraste del color para que el texto blanco no compita. */}
          <div className="absolute inset-0 bg-black/50" />
        </div>
      )}

      {/* Capa 1 — Retrato: nítido, en el 60% superior */}
      <div className="absolute left-0 top-0 h-[60%] w-full" aria-hidden="true">
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt=""
            referrerPolicy="no-referrer"
            className={`h-full w-full object-cover object-top ${portraitFade}`}
          />
        ) : (
          <div
            className={`h-full w-full bg-gradient-to-br from-zinc-700 via-zinc-800
                        to-zinc-950 ${portraitFade}`}
          >
            {/* Marca de agua de la inicial mientras no hay foto. */}
            <span
              className="absolute inset-x-0 top-20 text-center text-[7rem] font-black
                         leading-none text-white/[0.07]"
            >
              {(fullName || '?').trim().charAt(0).toUpperCase()}
            </span>
          </div>
        )}
      </div>

      {/*
        Capa 2 — Legibilidad. Va sobre toda la tarjeta y no sólo sobre la foto:
        el nombre cae en la frontera de las dos zonas, y un velo que terminara
        al 60% dejaría la primera línea sin respaldo. Son transparencias, así
        que el color ambiental sigue leyéndose por debajo.
      */}
      <div
        className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/25 to-transparent"
        aria-hidden="true"
      />

      {/* Capa 3 — Contenido */}
      <div
        className={`relative z-10 flex h-full flex-col justify-end text-left text-white
                    ${isFill ? 'p-6 pb-24' : 'p-5 pb-20'}`}
      >
        {/* Pulso de disponibilidad, encima del nombre */}
        <div
          className="animate-fade-in-up mb-2.5 flex w-max items-center gap-2 rounded-full
                     border border-white/15 bg-white/10 px-3 py-1 backdrop-blur-md"
        >
          <span className="h-2 w-2 animate-pulse rounded-full bg-green-500" aria-hidden="true" />
          <span className="text-[10px] uppercase tracking-wider text-zinc-100">
            Disponible para asesoría
          </span>
        </div>

        <div className="animate-fade-in-up">
          <h2 className="text-3xl font-bold uppercase leading-none tracking-tight drop-shadow-lg">
            {fullName || <span className="text-white/40">Tu nombre</span>}
          </h2>

          <p className="mt-1.5 text-sm text-zinc-200 drop-shadow">
            {title || <span className="text-white/35">Tu título profesional</span>}
          </p>

          {company && (
            <p className="mt-0.5 text-xs font-semibold uppercase tracking-wider text-zinc-300">
              {company}
            </p>
          )}

          {license && (
            <p className="mt-1.5 text-[11px] text-zinc-300">Cédula: {license}</p>
          )}
        </div>

        {specialties.length > 0 && (
          <ul
            className="animate-fade-in-up mt-2.5 flex flex-wrap gap-1.5"
            style={{ animationDelay: '100ms' }}
          >
            {specialties.map((item) => (
              <li
                key={item}
                className="rounded-full border border-white/15 bg-white/15 px-2 py-1 text-xs
                           font-medium backdrop-blur-md"
              >
                {item}
              </li>
            ))}
          </ul>
        )}

        {/*
          Fila de contacto. Cada icono lleva su propio movimiento y su propio
          ritmo: con la misma animación en los cuatro, la fila se leería como un
          solo bloque parpadeando en vez de cuatro accesos con vida propia.
        */}
        <div
          className="animate-fade-in-up mt-4 flex gap-2.5"
          style={{ animationDelay: '200ms' }}
        >
          <SocialButton label="Llamar" href={phone ? `tel:${digits(phone)}` : ''}>
            {/* Repique corto cada tres segundos, como un teléfono sonando bajito. */}
            <Phone size={18} className={phone ? 'animate-ring' : ''} />
          </SocialButton>

          <SocialButton label="Enviar correo" href={email ? `mailto:${email}` : ''}>
            <Mail size={18} className={email ? 'animate-float' : ''} />
          </SocialButton>

          {/* Mensaje: el destello va en el contorno del círculo, no en el icono. */}
          <SocialButton
            label="Enviar mensaje"
            href={phone ? `sms:${digits(phone)}` : ''}
            glow
          >
            <MessageSquare size={18} />
          </SocialButton>

          <SocialButton
            label="Abrir WhatsApp"
            href={whatsapp ? `https://wa.me/${digits(whatsapp).replace(/^\+/, '')}` : ''}
          >
            <WhatsAppMark size={19} className={whatsapp ? 'animate-soft-pulse' : ''} />
          </SocialButton>
        </div>

        {/*
          "About Me" en cristal puro: el desenfoque de fondo deja pasar los
          colores abstractos de la capa ambiental, y el borde claro es lo que
          define el canto del cristal —sin él, sobre un fondo de color el bloque
          pierde su silueta y parece una mancha.
        */}
        <div
          className="animate-fade-in-up relative mt-4 overflow-hidden rounded-2xl border
                     border-white/20 bg-white/10 p-4 backdrop-blur-md"
          style={{ animationDelay: '300ms' }}
        >
          {/*
            Reflejo que recorre el cristal. Va como capa aparte y no como fondo
            del bloque: encima del texto lo atenuaría, y el degradado tiene que
            pasar por debajo para que parezca luz sobre la superficie.
          */}
          <span
            className="animate-shimmer pointer-events-none absolute inset-0
                       bg-gradient-to-r from-transparent via-white/10 to-transparent
                       bg-[length:200%_100%]"
            aria-hidden="true"
          />

          <div className="relative">
            <p className="text-[11px] font-bold uppercase tracking-wider text-zinc-200">
              About Me
            </p>
            <p className="mt-1.5 text-xs leading-relaxed text-zinc-100">
              {bio || (
                <span className="text-white/40">
                  Escribe unas líneas sobre a quién ayudas y cómo. Es lo que hace que
                  un prospecto te escriba.
                </span>
              )}
            </p>
          </div>
        </div>
      </div>

      {/*
        Barra de acción del celular. Pasa de negro casi opaco a cristal: dejarla
        sólida cortaría en seco la luz de color justo en el borde inferior, que
        es donde el efecto ambiental se ve mejor.
      */}
      <div
        className={`absolute bottom-0 left-0 z-20 flex w-full items-center justify-between
                    border-t border-white/10 bg-black/40 px-4 py-3 backdrop-blur-md
                    ${isFill ? 'pb-safe' : 'rounded-b-[2rem]'}`}
      >
        <span className="flex items-center gap-1">
          {/*
            El QR pasa de adorno a botón: es la forma más rápida de entregar el
            contacto en persona, sin dictar un número ni pedirle al prospecto
            que escriba nada.
          */}
          <button
            type="button"
            onClick={() => { tapFeedback(); setQrOpen(true); }}
            aria-label="Mostrar mi código QR a pantalla completa"
            className="grid h-9 w-9 place-items-center rounded-full text-white/80
                       transition-colors hover:bg-white/10 hover:text-white
                       active:scale-90 focus-visible:outline-none
                       focus-visible:ring-2 focus-visible:ring-white/60"
          >
            <QrCode size={20} />
          </button>

          <span
            className="grid h-9 w-9 place-items-center text-white/80"
            aria-hidden="true"
          >
            <Share2 size={19} />
          </span>
        </span>

        {/*
          Sin `onAddContact` la pieza es sólo un adorno de la vista previa: en el
          editor no debe capturar prospectos, y un botón que no hace nada
          confundiría más que un rótulo.
        */}
        {onAddContact ? (
          <button
            type="button"
            onClick={() => { tapFeedback(); onAddContact(); }}
            className="flex items-center gap-1.5 rounded-full bg-white px-4 py-2 text-xs
                       font-semibold text-black transition-transform will-change-transform
                       active:scale-90 hover:shadow-[0_0_15px_rgba(255,255,255,0.4)]"
          >
            <UserPlus size={14} />
            Add to Contact
          </button>
        ) : (
          <span
            className="flex items-center gap-1.5 rounded-full bg-white px-4 py-2 text-xs
                       font-semibold text-black"
          >
            <UserPlus size={14} />
            Add to Contact
          </span>
        )}
      </div>

      {/*
        Va al final y como hermano de las capas, no dentro del contenido: al ser
        `absolute inset-0` cubre la tarjeta entera, incluida la barra inferior
        que lo abre.
      */}
      <QrPassModal card={card} isOpen={isQrOpen} onClose={() => setQrOpen(false)} />
    </div>
  );
}
