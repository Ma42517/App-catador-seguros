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

/** Botón circular blanco de contacto. Deshabilitado si no hay dato que usar. */
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
          ? 'bg-white text-zinc-900 shadow-lg hover:scale-105 active:scale-95'
          : 'cursor-default bg-white/30 text-zinc-600'}`}
    >
      {children}
    </a>
  );
}

/**
 * Vista previa de la tarjeta digital, dentro de un marco de celular.
 *
 * Es lo que verá el prospecto, así que se dibuja con los datos tal como están:
 * los campos vacíos muestran un texto de relleno en gris para que se note qué
 * falta, en lugar de dejar huecos que hagan parecer que la tarjeta está rota.
 *
 * Las tres capas van en este orden y ninguna es opcional: la foto ocupa todo el
 * fondo, el degradado negro la cubre de abajo hacia arriba, y el contenido va
 * encima. Sin el degradado, un retrato con fondo claro deja el nombre ilegible.
 */
export default function DigitalCardPreview({ card }) {
  const {
    fullName, title, company, license, specialties = [], bio, phone, email, whatsapp, avatarUrl,
  } = card;

  const digits = (value) => String(value ?? '').replace(/[^\d+]/g, '');

  return (
    <div
      className="relative mx-auto h-[650px] w-[320px] overflow-hidden rounded-[2.5rem]
                 border-4 border-zinc-900 shadow-2xl"
    >
      {/* Capa 1: la foto como fondo completo */}
      {avatarUrl ? (
        <img
          src={avatarUrl}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : (
        <div
          className="absolute inset-0 bg-gradient-to-br from-zinc-700 via-zinc-800 to-zinc-950"
          aria-hidden="true"
        >
          {/*
            Marca de agua de la inicial mientras no hay foto. Va en el tercio
            superior y no centrada: al centro caía justo sobre el nombre y la
            empresa, y se leía como un defecto de dibujo en lugar de un relleno.
          */}
          <span
            className="absolute inset-x-0 top-24 text-center text-[7rem] font-black leading-none
                       text-white/[0.07]"
          >
            {(fullName || '?').trim().charAt(0).toUpperCase()}
          </span>

        </div>
      )}

      {/* Capa 2: degradado que hace legible el texto */}
      <div
        className="absolute inset-0 bg-gradient-to-t from-black via-black/80 to-transparent"
        aria-hidden="true"
      />

      {/* Capa 3: contenido */}
      <div className="relative z-10 flex h-full flex-col justify-end p-5 text-white">
        <h2 className="text-3xl font-bold uppercase leading-none tracking-tight">
          {fullName || <span className="text-white/40">Tu nombre</span>}
        </h2>

        <p className="mt-1.5 text-sm text-zinc-300">
          {title || <span className="text-white/35">Tu título profesional</span>}
        </p>

        {company && (
          <p className="mt-0.5 text-xs font-semibold uppercase tracking-wider text-zinc-400">
            {company}
          </p>
        )}

        {license && (
          <p className="mt-1.5 text-[11px] text-zinc-400">
            Cédula: {license}
          </p>
        )}

        {specialties.length > 0 && (
          <ul className="mt-2.5 flex flex-wrap gap-1.5">
            {specialties.map((item) => (
              <li
                key={item}
                className="rounded-full bg-white/20 px-2 py-1 text-xs font-medium
                           backdrop-blur-sm"
              >
                {item}
              </li>
            ))}
          </ul>
        )}

        {/* Contacto */}
        <div className="mt-4 flex gap-2.5">
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

        {/* Sobre mí. `mb-16` deja libre el alto de la barra inferior. */}
        <div className="mb-16 mt-4 rounded-2xl bg-white/10 p-4 backdrop-blur-md">
          <p className="text-[11px] font-bold uppercase tracking-wider text-zinc-300">
            About Me
          </p>
          <p className="mt-1.5 text-xs leading-relaxed text-zinc-200">
            {bio || (
              <span className="text-white/40">
                Escribe unas líneas sobre a quién ayudas y cómo. Es lo que hace que
                un prospecto te escriba.
              </span>
            )}
          </p>
        </div>
      </div>

      {/* Barra de acción del celular */}
      <div
        className="absolute bottom-0 left-0 z-20 flex w-full items-center justify-between
                   rounded-b-[2rem] bg-black/90 px-4 py-3 backdrop-blur-lg"
      >
        <span className="flex items-center gap-3 text-white/80" aria-hidden="true">
          <QrCode size={20} />
          <Share2 size={19} />
        </span>

        <span
          className="flex items-center gap-1.5 rounded-full bg-white px-4 py-2 text-xs
                     font-semibold text-black"
        >
          <UserPlus size={14} />
          Add to Contact
        </span>
      </div>
    </div>
  );
}
