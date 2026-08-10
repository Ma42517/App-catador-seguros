import {
  Phone, Mail, MessageSquare, QrCode, Share2, UserPlus,
} from 'lucide-react';

/** Icono de WhatsApp: lucide no lo trae, así que va como trazo propio. */
function WhatsAppMark({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M17.47 14.38c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.35.22-.64.07-.3-.15-1.13-.42-2.15-1.33-.8-.71-1.34-1.6-1.5-1.9-.15-.3-.01-.46.13-.61.16-.16.3-.35.45-.53.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.07-.15-.65-1.57-.89-2.15-.23-.56-.47-.49-.65-.5h-.55c-.2 0-.5.07-.77.37-.27.3-1.02 1-1.02 2.42s1.04 2.8 1.19 3c.15.2 2.05 3.13 4.96 4.27 2.42.95 2.9.76 3.42.71.52-.05 1.68-.68 1.92-1.35.24-.66.24-1.23.17-1.35-.07-.12-.27-.2-.57-.35z" />
      <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.46 1.32 4.96L2 22l5.25-1.38c1.45.79 3.08 1.2 4.79 1.2 5.46 0 9.91-4.45 9.91-9.91S17.5 2 12.04 2zm0 18.02c-1.55 0-3.07-.42-4.4-1.2l-.32-.19-3.26.86.87-3.18-.2-.33a8.09 8.09 0 0 1-1.24-4.32c0-4.47 3.64-8.11 8.11-8.11s8.11 3.64 8.11 8.11-3.64 8.11-8.11 8.11z" />
      </svg>
  );
}

/**
 * Botón circular blanco de contacto.
 *
 * Se hunde al pulsarlo y se ilumina al pasar por encima: son los dos gestos que
 * hacen que un botón se sienta físico. Deshabilitado si no hay dato que usar,
 * porque enlazar a un `tel:` vacío le daría un error a quien lo toque.
 */
function SocialButton({ label, href, children }) {
  const enabled = Boolean(href);

  return (
    <a
      href={enabled ? href : undefined}
      aria-label={label}
      aria-disabled={!enabled}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(event) => { if (!enabled) event.preventDefault(); }}
      className={`grid h-11 w-11 place-items-center rounded-full transition-transform
        ${enabled
          ? `bg-white text-gray-900 shadow-lg active:scale-90
             hover:shadow-[0_0_15px_rgba(255,255,255,0.4)]`
          : 'cursor-default bg-white/30 text-gray-600'}`}
    >
      {children}
    </a>
  );
}

/**
 * Vista previa de la tarjeta digital, en estilo "Executive Avatar".
 *
 * Es lo que verá el prospecto, así que se dibuja con los datos tal como están:
 * los campos vacíos muestran un texto de relleno en gris para que se note qué
 * falta, en lugar de dejar huecos que hagan parecer que la tarjeta está rota.
 *
 * La foto aparece dos veces y con papeles distintos. Como retrato circular es
 * donde se ve la cara, nítida y a tamaño contenido. Como fondo va desenfocada y
 * oscurecida, y ahí no aporta información: sólo tiñe la tarjeta con los colores
 * de la propia foto, lo que la hace sentir personal sin competir con el texto.
 *
 * Es un cambio de fondo, y la razón importa: antes la foto ocupaba el fondo
 * nítida y a sangre, y el marco —mucho más alto que ancho— la recortaba tanto
 * que parecía un acercamiento accidental. Un retrato dentro de un círculo no
 * tiene ese problema, porque el recorte cuadrado respeta las proporciones de una
 * cara.
 *
 * El contenido entra en cascada. Los retrasos van como `animation-delay` y no
 * con las clases `delay-*` de Tailwind: ésas escriben `transition-delay`, que no
 * afecta a una animación de keyframes y dejaría todo entrando a la vez.
 */
export default function DigitalCardPreview({ card, variant = 'frame', onAddContact }) {
  const {
    fullName, title, company, license, specialties = [], bio, phone, email, whatsapp, avatarUrl,
  } = card;

  const digits = (value) => String(value ?? '').replace(/[^\d+]/g, '');
  const initial = (fullName || '?').trim().charAt(0).toUpperCase();

  /*
    Dos presentaciones de la misma tarjeta:
      - `frame`: maqueta de celular, para verla junto al formulario.
      - `fill`:  ocupa la pantalla entera. En un teléfono el marco sobra —el
                 dispositivo ya es el marco—, y dibujarlo dentro de otro marco
                 hace la tarjeta más pequeña justo cuando se la enseña a alguien.
  */
  const isFill = variant === 'fill';

  return (
    <div
      className={isFill
        ? 'relative h-full w-full overflow-hidden bg-black'
        : `relative mx-auto h-[650px] w-[320px] overflow-hidden rounded-[2.5rem]
           border-4 border-gray-900 bg-black shadow-2xl`}
    >
      {/*
        Capa 1: la misma foto como espejo desenfocado.
        El contenedor recorta y la imagen se mueve dentro: sin `overflow-hidden`
        aquí, el acercamiento lento desbordaría la tarjeta.
      */}
      <div className="absolute inset-0 overflow-hidden" aria-hidden="true">
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt=""
            referrerPolicy="no-referrer"
            /*
              La animación mantiene la escala por encima de 1.15 en todo el ciclo.
              El desenfoque arrastra los píxeles del borde hacia dentro y deja un
              halo claro en el perímetro, que sólo queda fuera del marco si la
              imagen sobresale. Por eso no se usa `animate-ken-burns`: ése baja
              hasta 1 y destaparía el halo.
            */
            className="animate-ken-burns-blur h-full w-full object-cover opacity-60 blur-2xl"
          />
        ) : (
          <div className="h-full w-full bg-gradient-to-br from-gray-700 via-gray-800 to-gray-950" />
        )}
      </div>

      {/*
        Capa 2: degradado que oscurece hacia abajo.
        Sin él, una foto clara deja el texto ilegible por más desenfoque que
        tenga, y el negro del pie no empalmaría con la barra de acciones.

        Arranca claro y se cierra abajo. Empezar en negro al 80% —y con la foto
        al 40%— dejaba la tarjeta entera negra: el espejo desenfocado
        desaparecía y con él la única cosa que hace que la tarjeta se sienta de
        esta persona y no de cualquiera. El texto sigue legible porque arriba
        sólo hay retrato, y el nombre va en blanco y en grueso.
      */}
      <div
        className="absolute inset-0 bg-gradient-to-b from-black/25 via-black/65 to-black"
        aria-hidden="true"
      />

      {/*
        Capa 3: contenido, centrado y de arriba hacia abajo.
        `pb-20` reserva el alto de la barra inferior, y el desbordamiento va a
        scroll porque una biografía larga, con todo apilado, se sale de los
        650 px del marco. Con `pb-24` sobraban 10 px y aparecía una barra de
        scroll en la maqueta del celular incluso con la tarjeta vacía.
      */}
      <div
        className={`relative z-10 flex h-full flex-col items-center justify-start overflow-y-auto
                    px-5 pb-20 text-white ${isFill ? 'pt-14' : 'pt-12'}`}
      >
        {/* Retrato nítido */}
        <div className="animate-fade-in-up mb-4 shrink-0">
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={fullName ? `Foto de ${fullName}` : 'Tu foto'}
              referrerPolicy="no-referrer"
              className="h-32 w-32 rounded-full border-4 border-gray-800 object-cover
                         shadow-[0_0_30px_rgba(0,0,0,0.8)]"
            />
          ) : (
            <div
              className="grid h-32 w-32 place-items-center rounded-full border-4 border-gray-800
                         bg-gray-800/80 shadow-[0_0_30px_rgba(0,0,0,0.8)]"
            >
              <span className="text-5xl font-black leading-none text-white/25">{initial}</span>
            </div>
          )}
        </div>

        {/* Estado de disponibilidad */}
        <div
          className="animate-fade-in-up mb-3 flex w-max shrink-0 items-center gap-2 rounded-full
                     bg-black/40 px-3 py-1 backdrop-blur-sm"
        >
          <span className="h-2 w-2 animate-pulse rounded-full bg-green-500" aria-hidden="true" />
          <span className="text-[10px] uppercase tracking-wider text-gray-200">
            Disponible para asesoría
          </span>
        </div>

        <div className="animate-fade-in-up w-full shrink-0">
          <h2 className="text-center text-2xl font-bold uppercase leading-tight tracking-tight">
            {fullName || <span className="text-white/40">Tu nombre</span>}
          </h2>

          <p className="mb-3 mt-1 text-center text-sm text-gray-400">
            {title || <span className="text-white/35">Tu título profesional</span>}
            {company && <span className="text-gray-500"> · {company}</span>}
          </p>

          {license && (
            <p className="-mt-2 mb-3 text-center text-[11px] text-gray-500">
              Cédula: {license}
            </p>
          )}
        </div>

        {specialties.length > 0 && (
          <ul
            className="animate-fade-in-up mb-6 flex shrink-0 flex-wrap justify-center gap-2"
            style={{ animationDelay: '100ms' }}
          >
            {specialties.map((item) => (
              <li
                key={item}
                className="rounded-full bg-white/20 px-2 py-1 text-xs font-medium backdrop-blur-sm"
              >
                {item}
              </li>
            ))}
          </ul>
        )}

        {/* Contacto */}
        <div
          className="animate-fade-in-up mb-8 flex shrink-0 justify-center gap-4"
          style={{ animationDelay: '200ms' }}
        >
          <SocialButton label="Llamar" href={phone ? `tel:${digits(phone)}` : ''}>
            <Phone size={18} />
          </SocialButton>
          <SocialButton label="Enviar correo" href={email ? `mailto:${email}` : ''}>
            <Mail size={18} />
          </SocialButton>
          <SocialButton label="Enviar mensaje" href={phone ? `sms:${digits(phone)}` : ''}>
            <MessageSquare size={18} />
          </SocialButton>
          <SocialButton
            label="Abrir WhatsApp"
            href={whatsapp ? `https://wa.me/${digits(whatsapp).replace(/^\+/, '')}` : ''}
          >
            <WhatsAppMark size={19} />
          </SocialButton>
        </div>

        {/* Sobre mí */}
        <div
          className="animate-fade-in-up relative w-full shrink-0 overflow-hidden rounded-2xl
                     bg-white/10 p-4 text-left backdrop-blur-md"
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
            <p className="text-[11px] font-bold uppercase tracking-wider text-gray-300">
              About Me
            </p>
            <p className="mt-1.5 text-xs leading-relaxed text-gray-200">
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

      {/* Barra de acción del celular */}
      <div
        className={`absolute bottom-0 left-0 z-20 flex w-full items-center justify-between
                    bg-black/90 px-4 py-3 backdrop-blur-lg
                    ${isFill ? 'pb-safe' : 'rounded-b-[2rem]'}`}
      >
        <span className="flex items-center gap-3 text-white/80" aria-hidden="true">
          <QrCode size={20} />
          <Share2 size={19} />
        </span>

        {/*
          Sin `onAddContact` la pieza es sólo un adorno de la vista previa: en el
          editor no debe capturar prospectos, y un botón que no hace nada
          confundiría más que un rótulo.
        */}
        {onAddContact ? (
          <button
            type="button"
            onClick={onAddContact}
            className="flex items-center gap-1.5 rounded-full bg-white px-4 py-2 text-xs
                       font-semibold text-black transition-transform active:scale-90
                       hover:shadow-[0_0_15px_rgba(255,255,255,0.4)]"
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
    </div>
  );
}
