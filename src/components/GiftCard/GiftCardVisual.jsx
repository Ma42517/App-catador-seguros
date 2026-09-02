import { Camera, Image as ImageIcon, Phone } from 'lucide-react';

/**
 * src/components/GiftCard/GiftCardVisual.jsx
 *
 * La tarjeta digital del CLIENTE, con el mismo lenguaje visual que la del
 * asesor: retrato a sangre como fondo tipo póster, degradado oscuro encima y los
 * datos apoyados abajo, con botones circulares de contacto.
 *
 * ## Por qué es un componente aparte y no reutiliza `DigitalCardPreview`
 * Aquél está atado al mundo del asesor: guarda en `profiles`, usa `useSession`,
 * y trae QR, reverso de servicios y encuadre interactivo. Enchufarlo aquí
 * obligaría a desacoplarlo, y eso significa editar código que ya funciona en
 * producción para los asesores. Se replica el diseño en un archivo propio: la
 * tarjeta del asesor queda intacta, y ésta puede evolucionar para el cliente sin
 * arrastrar nada suyo.
 *
 * El correo no se muestra nunca, ni siquiera teniéndolo: publicar la dirección
 * del dueño en una página abierta es regalarla a los recolectores de spam. Es la
 * misma decisión que ya toma la tarjeta pública del asesor.
 */

/** Icono de WhatsApp: lucide no lo trae, así que va como trazo propio. */
function WhatsAppMark({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M17.47 14.38c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.35.22-.64.07-.3-.15-1.13-.42-2.15-1.33-.8-.71-1.34-1.6-1.5-1.9-.15-.3-.01-.46.13-.61.16-.16.3-.35.45-.53.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.07-.15-.65-1.57-.89-2.15-.23-.56-.47-.49-.65-.5h-.55c-.2 0-.5.07-.77.37-.27.3-1.02 1-1.02 2.42s1.04 2.8 1.19 3c.15.2 2.05 3.13 4.96 4.27 2.42.95 2.9.76 3.42.71.52-.05 1.68-.68 1.92-1.35.24-.66.24-1.23.17-1.35-.07-.12-.27-.2-.57-.35z" />
      <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.46 1.32 4.96L2 22l5.25-1.38c1.45.79 3.08 1.2 4.79 1.2 5.46 0 9.91-4.45 9.91-9.91S17.5 2 12.04 2zm0 18.02c-1.55 0-3.07-.42-4.4-1.2l-.32-.19-3.26.86.87-3.18-.2-.33a8.09 8.09 0 0 1-1.24-4.32c0-4.47 3.64-8.11 8.11-8.11s8.11 3.64 8.11 8.11-3.64 8.11-8.11 8.11z" />
    </svg>
  );
}

/** Botón circular blanco de contacto. Apagado si no hay dato que usar. */
function ContactButton({ label, href, children }) {
  const enabled = Boolean(href);
  return (
    <a
      href={enabled ? href : undefined}
      aria-label={label}
      aria-disabled={!enabled}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(event) => { if (!enabled) event.preventDefault(); }}
      className={`grid h-11 w-11 place-items-center rounded-full transition-transform ${enabled
        ? 'bg-white text-zinc-900 shadow-md shadow-black/25 active:scale-90'
        : 'cursor-default bg-white/25 text-zinc-500'}`}
    >
      {children}
    </a>
  );
}

/**
 * @param card       Datos a pintar: fullName, title, company, specialties, bio, phone, whatsapp, avatarUrl.
 * @param onPickPhoto Si viene, aparece el botón de cámara para cambiar la foto.
 * @param uploading  Muestra el velo de carga sobre el retrato.
 */
export default function GiftCardVisual({ card, onPickPhoto, uploading = false }) {
  const whatsapp = String(card?.whatsapp ?? '').replace(/\D/g, '');
  const phone = String(card?.phone ?? '').replace(/\D/g, '');
  const specialties = Array.isArray(card?.specialties) ? card.specialties : [];

  return (
    /*
      Marco vertical tipo póster de celular, igual que la tarjeta del asesor: en
      escritorio se ve como una tarjeta centrada; en el teléfono ocupa el ancho.
      El alto fijo es lo que sostiene la composición —foto arriba, datos abajo—.
    */
    <div className="relative mx-auto h-[600px] w-full max-w-[340px] overflow-hidden
                    rounded-[2rem] border border-neutral-800 bg-neutral-950 shadow-2xl
                    shadow-black/60"
    >
      {/* Capa 1 — el retrato, a sangre */}
      {card?.avatarUrl ? (
        <img
          src={card.avatarUrl}
          alt={card.fullName || 'Tarjeta'}
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : (
        <div className="absolute inset-0 grid place-items-center bg-neutral-900 text-neutral-700">
          <ImageIcon size={44} strokeWidth={1.2} />
        </div>
      )}

      {/*
        Capa 2 — degradado. Sube desde abajo y es lo que hace legible el texto
        sobre cualquier foto, clara u oscura, sin tener que teñir el retrato.
      */}
      <div
        className="absolute inset-0 bg-gradient-to-t from-black via-black/75 to-transparent"
        aria-hidden="true"
      />

      {onPickPhoto && (
        <button
          type="button"
          onClick={onPickPhoto}
          aria-label={card?.avatarUrl ? 'Cambiar mi foto' : 'Subir mi foto'}
          className="absolute left-4 top-4 z-30 grid h-9 w-9 place-items-center rounded-full
                     bg-black/55 text-white ring-1 ring-white/30 backdrop-blur-md
                     transition-colors hover:bg-black/75 active:scale-95"
        >
          <Camera size={16} strokeWidth={2} aria-hidden="true" />
        </button>
      )}

      {uploading && (
        <span className="absolute inset-0 z-40 grid place-items-center bg-black/60">
          <span className="h-6 w-6 animate-spin rounded-full border-2 border-white/30
                           border-t-white"
          />
        </span>
      )}

      {/* Capa 3 — los datos, apoyados abajo */}
      <div className="absolute inset-x-0 bottom-0 z-20 p-6">
        <h1 className="text-[26px] font-light leading-tight tracking-tight text-white
                       [text-shadow:0_1px_3px_rgb(0_0_0/0.6)]"
        >
          {card?.fullName || 'Tu nombre'}
        </h1>

        {card?.title && (
          <p className="mt-1 text-sm font-light text-white/85">{card.title}</p>
        )}
        {card?.company && (
          <p className="text-xs font-light text-white/60">{card.company}</p>
        )}

        {specialties.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {specialties.map((s) => (
              <span
                key={s}
                className="rounded-full bg-white/15 px-2.5 py-1 text-[10px] font-medium
                           text-white/90 backdrop-blur-sm"
              >
                {s}
              </span>
            ))}
          </div>
        )}

        {card?.bio && (
          <p className="mt-3 line-clamp-3 text-xs font-light leading-relaxed text-white/70">
            {card.bio}
          </p>
        )}

        <div className="mt-5 flex items-center gap-2.5">
          <ContactButton
            label="Escribir por WhatsApp"
            href={whatsapp ? `https://wa.me/${whatsapp}` : ''}
          >
            <WhatsAppMark />
          </ContactButton>
          <ContactButton label="Llamar" href={phone ? `tel:${phone}` : ''}>
            <Phone size={17} />
          </ContactButton>
        </div>
      </div>
    </div>
  );
}
