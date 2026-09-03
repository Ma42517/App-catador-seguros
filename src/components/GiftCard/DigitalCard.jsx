import { useState } from 'react';
import {
  Phone, Mail, Globe, MapPin, UserPlus, RotateCcw, ChevronLeft,
  Camera, Image as ImageIcon, Volume2, VolumeX, CalendarCheck, Play,
} from 'lucide-react';
import WhatsAppMark from '../Activities/WhatsAppMark';
import { normalizeCardData } from '../../data/cardData';
import { buildVCard, canBuildVCard } from '../../data/vcard';
import { resolveVideo, videoPosterUrl } from '../../data/videoEmbed';
import { whatsAppLink } from '../../lib/advisorPhone';

/**
 * src/components/GiftCard/DigitalCard.jsx
 *
 * La tarjeta digital del CLIENTE con giro 3D. Sustituye al visor de una sola
 * cara (GiftCardVisual): ahora tiene un anverso —en dos plantillas, Editorial o
 * Ejecutiva, según cardData.template— y un reverso interactivo compartido con
 * video, tarjeta de valor y botón de reservación.
 *
 * ## Por qué el giro va con estilos EN LÍNEA y no sólo con clases Tailwind
 * Safari (todo navegador en iPhone, que es donde más se abre esta tarjeta) no
 * respeta `transform-style: preserve-3d` ni `backface-visibility` cuando llegan
 * por clase: aplana la escena y las dos caras se mezclan —se ve el anverso en
 * espejo encima del reverso—. Con las propiedades prefijadas en el `style` de
 * cada pieza el efecto funciona. Es exactamente el patrón ya probado en
 * producción en src/components/Profile/DigitalCardPreview.jsx (mundo asesor),
 * que aquí se replica sin tocar aquel archivo.
 *
 * El correo del dueño NUNCA se publica como texto: sólo se ofrece como acción
 * (`mailto:`) si viene en contactos. Publicar la dirección en una página abierta
 * es regalarla a los recolectores de spam.
 */

/**
 * Icono de Instagram como trazo propio: esta versión de lucide-react no exporta
 * el glifo `Instagram`, así que se dibuja aquí —igual que ya se hace con el de
 * WhatsApp, que lucide tampoco trae—.
 */
function InstagramMark({ size = 17 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
    </svg>
  );
}

/**
 * Botón circular blanco de contacto. Apagado si no hay dato que usar, porque un
 * enlace vacío daría error a quien lo toque.
 */
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
 * Bloque de píldoras (tags). Las clases son EXACTAMENTE las del brief y se
 * comparten entre las dos plantillas: son el mismo dato y deben verse igual.
 */
function Pildoras({ items }) {
  if (!items?.length) return null;
  return (
    <div className="mt-3 flex flex-wrap gap-1.5">
      {items.map((item) => (
        <span
          key={item}
          className="bg-neutral-900/80 border border-neutral-800 text-xs px-3 py-1
                     rounded-full text-neutral-300"
        >
          {item}
        </span>
      ))}
    </div>
  );
}

/**
 * Botonera circular de contacto rápido. Sólo aparecen los accesos con dato: un
 * botón muerto promete algo que no cumple.
 */
function ContactRow({ card }) {
  const whatsapp = String(card.whatsapp ?? '').replace(/[^\d+]/g, '').replace(/^\+/, '');
  const phone = String(card.phone ?? '').replace(/[^\d+]/g, '');
  const { maps, instagram, email, web } = card.contactos ?? {};

  return (
    <div className="mt-5 flex flex-wrap items-center gap-2.5">
      <ContactButton
        label="Escribir por WhatsApp"
        href={whatsapp ? `https://wa.me/${whatsapp}` : ''}
      >
        <WhatsAppMark size={18} />
      </ContactButton>
      <ContactButton label="Llamar" href={phone ? `tel:${phone}` : ''}>
        <Phone size={17} />
      </ContactButton>
      {maps && (
        <ContactButton label="Ver ubicación en el mapa" href={maps}>
          <MapPin size={17} />
        </ContactButton>
      )}
      {instagram && (
        <ContactButton label="Abrir Instagram" href={instagram}>
          <InstagramMark size={17} />
        </ContactButton>
      )}
      {web && (
        <ContactButton label="Abrir sitio web" href={web}>
          <Globe size={17} />
        </ContactButton>
      )}
      {email && (
        <ContactButton label="Enviar correo" href={`mailto:${email}`}>
          <Mail size={17} />
        </ContactButton>
      )}
    </div>
  );
}

/**
 * Botón principal [ + Guardar Contacto ].
 *
 * Genera la vCard con buildVCard, la envuelve en un Blob `text/vcard` y dispara
 * la descarga con un enlace efímero: al abrirse en el teléfono, el sistema
 * ofrece guardar el contacto directamente. Se apaga si faltan datos
 * (canBuildVCard), porque un .vcf vacío crea un contacto en blanco —peor que no
 * ofrecerlo, porque el prospecto cree que ya tiene los datos—.
 */
function SaveContactButton({ card }) {
  const enabled = canBuildVCard(card);

  const download = () => {
    if (!enabled) return;
    const blob = new Blob([buildVCard(card)], { type: 'text/vcard;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    // El nombre del archivo usa el del contacto para que se reconozca en Descargas.
    const safeName = String(card.fullName ?? 'contacto').trim().replace(/\s+/g, '-') || 'contacto';
    link.download = `${safeName}.vcf`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    // Se libera la URL tras un instante: revocarla en el mismo tick cancelaría
    // la descarga en algunos navegadores antes de que arranque.
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  return (
    <button
      type="button"
      onClick={download}
      disabled={!enabled}
      className={`mt-5 flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3.5
                  text-sm font-semibold transition-colors ${enabled
        ? 'bg-white text-black hover:bg-neutral-200 active:scale-[0.98]'
        : 'cursor-default bg-white/20 text-white/40'}`}
    >
      <UserPlus size={16} /> Guardar Contacto
    </button>
  );
}

/**
 * Botón discreto que voltea la tarjeta al reverso. Su rótulo dice a dónde va y
 * su aria-label avisa que la tarjeta gira, para quien navega a ciegas.
 */
function FlipToBackButton({ onFlip }) {
  return (
    <button
      type="button"
      onClick={onFlip}
      aria-label="Ver más, voltea la tarjeta"
      className="absolute right-4 top-4 z-30 flex items-center gap-1.5 rounded-full bg-black/55
                 py-1.5 pl-2.5 pr-3 text-[11px] font-semibold text-white ring-1 ring-white/30
                 backdrop-blur-md transition-colors hover:bg-black/70 active:scale-95"
    >
      <RotateCcw size={12} strokeWidth={2.4} aria-hidden="true" /> Más
    </button>
  );
}

/** Botón de cámara del modo edición, idéntico al que tenía GiftCardVisual. */
function PhotoButton({ onPickPhoto, hasPhoto }) {
  if (!onPickPhoto) return null;
  return (
    <button
      type="button"
      onClick={onPickPhoto}
      aria-label={hasPhoto ? 'Cambiar mi foto' : 'Subir mi foto'}
      className="absolute left-4 top-4 z-30 grid h-9 w-9 place-items-center rounded-full
                 bg-black/55 text-white ring-1 ring-white/30 backdrop-blur-md
                 transition-colors hover:bg-black/75 active:scale-95"
    >
      <Camera size={16} strokeWidth={2} aria-hidden="true" />
    </button>
  );
}

/** Velo de carga sobre el retrato mientras se sube una foto nueva. */
function UploadingVeil({ uploading }) {
  if (!uploading) return null;
  return (
    <span className="absolute inset-0 z-40 grid place-items-center bg-black/60">
      <span className="h-6 w-6 animate-spin rounded-full border-2 border-white/30 border-t-white" />
    </span>
  );
}

/**
 * ── Anverso Plantilla EDITORIAL ──
 *
 * Lienzo negro puro con la foto DERRAMADA: el retrato ocupa buena parte del alto
 * y se funde hacia abajo con `mask-image` (con su prefijo `-webkit-`, obligatorio
 * en iOS; si no, la foto termina en un borde recto). La firma de esta plantilla
 * es "revista": el nombre grande y MUY fino cabalga SOBRE la foto, no debajo, con
 * mucho aire alrededor. Nada de recuadros ni separadores: es un póster.
 *
 * Se distingue a propósito de la Ejecutiva —que es una "ficha" enmarcada, con
 * serif y separadores— para que al alternar el selector el cambio sea inequívoco
 * y no parezca la misma tarjeta con la foto más chica.
 */
function EditorialFront({ card, onPickPhoto, uploading, onFlip, hasBack }) {
  // Máscara con prefijo -webkit-: WebKit sólo entiende la versión prefijada.
  const portraitFade =
    '[mask-image:linear-gradient(to_bottom,#000_55%,transparent_100%)] '
    + '[-webkit-mask-image:linear-gradient(to_bottom,#000_55%,transparent_100%)]';

  return (
    <div className="flex h-full w-full flex-col bg-black text-white">
      {/* Retrato derramado: ocupa casi toda la altura y se funde al negro */}
      <div className="absolute inset-x-0 top-0 h-[78%]">
        {card.avatarUrl ? (
          <img
            src={card.avatarUrl}
            alt={card.fullName || 'Tarjeta'}
            referrerPolicy="no-referrer"
            className={`h-full w-full object-cover object-top ${portraitFade}`}
          />
        ) : (
          <div className={`grid h-full w-full place-items-center bg-neutral-900 text-neutral-700
                          ${portraitFade}`}
          >
            <ImageIcon size={44} strokeWidth={1.2} />
          </div>
        )}
      </div>

      <PhotoButton onPickPhoto={onPickPhoto} hasPhoto={Boolean(card.avatarUrl)} />
      {hasBack && <FlipToBackButton onFlip={onFlip} />}
      <UploadingVeil uploading={uploading} />

      {/* Datos apoyados abajo. El nombre cabalga sobre la foto fundida, sin caja
          ni separador: la jerarquía la da el TAMAÑO y el aire, estilo editorial. */}
      <div className="relative z-20 mt-auto p-6">
        {/* Empresa arriba, como antetítulo de revista, para dejar el nombre solo */}
        {card.company && (
          <p className="mb-2 text-[10px] font-light uppercase tracking-[0.32em] text-white/50">
            {card.company}
          </p>
        )}
        <h1 className="text-[34px] font-extralight leading-[1.05] tracking-tight text-white">
          {card.fullName || 'Tu nombre'}
        </h1>
        {card.title && (
          <p className="mt-2 text-sm font-light tracking-wide text-white/85">{card.title}</p>
        )}

        <Pildoras items={card.pildoras} />

        {card.bio && (
          <p className="mt-3 line-clamp-3 text-xs font-light leading-relaxed text-white/70">
            {card.bio}
          </p>
        )}

        <ContactRow card={card} />
        <SaveContactButton card={card} />
      </div>
    </div>
  );
}

/**
 * ── Anverso Plantilla EJECUTIVA ──
 *
 * Estilo "ficha" / dossier de banca privada, deliberadamente distinto del póster
 * editorial: la tarjeta lleva un margen visible (padding en el marco) y la foto
 * va ENMARCADA dentro de él, no derramada a sangre. Sobre el fondo neutral-950
 * se apoya una hoja con borde fino (border-neutral-800/80) que da sensación de
 * documento. La jerarquía tipográfica también cambia a propósito: el nombre en
 * SERIF (`font-serif`) con espaciado amplio, y las etiquetas (puesto/empresa)
 * marcadas en mayúsculas espaciadas. Separadores finos ordenan los bloques.
 *
 * ## Solapamiento del badge de estado (corregido)
 * El botón de cámara vive arriba a la izquierda y el de "voltear" arriba a la
 * derecha, ambos DENTRO de la foto. El badge de estado con punto verde se apoya
 * por eso en el BORDE INFERIOR de la foto (`bottom-3 left-3`), donde no lo pisa
 * ningún control y además refuerza la lectura de "ficha con pie de foto".
 */
function ExecutiveFront({ card, onPickPhoto, uploading, onFlip, hasBack }) {
  return (
    <div className="flex h-full w-full flex-col bg-neutral-950 p-4 text-white">
      {/* Hoja/ficha con borde fino: el encuadre es la firma de esta plantilla */}
      <div className="flex h-full w-full flex-col overflow-hidden rounded-2xl border
                      border-neutral-800/80 bg-black"
      >
        {/* Foto enmarcada dentro del margen, no a sangre */}
        <div className="relative h-[46%] w-full overflow-hidden">
          {card.avatarUrl ? (
            <img
              src={card.avatarUrl}
              alt={card.fullName || 'Tarjeta'}
              referrerPolicy="no-referrer"
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="grid h-full w-full place-items-center bg-neutral-900 text-neutral-700">
              <ImageIcon size={44} strokeWidth={1.2} />
            </div>
          )}
          {/* Degradado sutil que funde la foto con la hoja negra, sin neón */}
          <div
            className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black
                       via-black/25 to-transparent"
            aria-hidden="true"
          />

          <PhotoButton onPickPhoto={onPickPhoto} hasPhoto={Boolean(card.avatarUrl)} />
          {hasBack && <FlipToBackButton onFlip={onFlip} />}
          <UploadingVeil uploading={uploading} />

          {/* Badge de estado con punto verde apoyado en el PIE de la foto, para no
              encimarse con la cámara (arriba-izq) ni el botón de voltear (arriba-der). */}
          {card.estadoPill && (
            <div className="absolute bottom-3 left-3 flex items-center gap-1.5 rounded-full
                            border border-white/10 bg-black/55 px-2.5 py-1 backdrop-blur-md"
            >
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" aria-hidden="true" />
              <span className="text-[10px] font-medium tracking-wide text-neutral-200">
                {card.estadoPill}
              </span>
            </div>
          )}
        </div>

        {/* Cuerpo tipo dossier: nombre en serif, etiquetas marcadas y separadores */}
        <div className="flex flex-1 flex-col px-5 pb-5 pt-4">
          <h1 className="font-serif text-[26px] font-medium leading-tight tracking-wide text-white">
            {card.fullName || 'Tu nombre'}
          </h1>
          {card.title && (
            <p className="mt-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-neutral-300">
              {card.title}
            </p>
          )}
          {card.company && (
            <p className="mt-0.5 text-[10px] font-medium uppercase tracking-[0.16em] text-neutral-500">
              {card.company}
            </p>
          )}

          {/* Separador fino: ordena la ficha como un documento */}
          <div className="my-3 h-px w-full bg-neutral-800/80" aria-hidden="true" />

          <Pildoras items={card.pildoras} />

          <div className="mt-auto">
            {/* Segundo separador antes de las acciones */}
            <div className="mb-3 mt-4 h-px w-full bg-neutral-800/80" aria-hidden="true" />
            <ContactRow card={card} />
            <SaveContactButton card={card} />
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Reproductor de video del reverso. El video es un ENLACE que el cliente pega
 * (no un archivo subido): resolveVideo restringe los hosts a YouTube, Loom,
 * Vimeo y archivos de video conocidos, porque un iframe libre sería una puerta
 * abierta en una página pública.
 *
 * El silenciar/activar audio sólo se ofrece para archivos (`<video>`), que es
 * donde el reproductor lo controla; en los iframes de terceros el sonido lo
 * gobierna su propio reproductor y no se puede tocar desde fuera.
 */
function VideoPlayer({ url }) {
  const [muted, setMuted] = useState(true);
  const { kind, embedUrl, fileUrl } = resolveVideo(url);

  if (!kind) {
    return (
      <div className="grid aspect-video w-full place-items-center rounded-xl border
                      border-neutral-800 bg-neutral-900 text-neutral-600"
      >
        <Play size={28} strokeWidth={1.4} aria-hidden="true" />
      </div>
    );
  }

  if (kind === 'file') {
    const poster = videoPosterUrl(url);
    return (
      <div className="relative overflow-hidden rounded-xl border border-neutral-800 bg-black">
        <video
          src={fileUrl}
          poster={poster || undefined}
          controls
          playsInline
          muted={muted}
          className="aspect-video w-full"
        />
        <button
          type="button"
          onClick={() => setMuted((m) => !m)}
          aria-label={muted ? 'Activar audio' : 'Silenciar'}
          className="absolute bottom-2 right-2 grid h-9 w-9 place-items-center rounded-full
                     bg-black/60 text-white ring-1 ring-white/20 backdrop-blur-md
                     transition-colors hover:bg-black/80 active:scale-95"
        >
          {muted ? <VolumeX size={16} /> : <Volume2 size={16} />}
        </button>
      </div>
    );
  }

  // YouTube / Loom / Vimeo: iframe del host permitido.
  return (
    <div className="overflow-hidden rounded-xl border border-neutral-800 bg-black">
      <iframe
        src={embedUrl}
        title="Video de presentación"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        className="aspect-video w-full"
      />
    </div>
  );
}

/**
 * ── Reverso compartido ──
 *
 * Video compacto arriba, tarjeta de valor con badge/título/subtítulo en medio y
 * un botón ancho de reservación abajo. Si falta bookingUrl, se degrada a un
 * enlace de WhatsApp con el número de la tarjeta (whatsAppLink), para que el
 * botón nunca quede muerto.
 */
function CardBack({ card, onBack }) {
  const { videoUrl, ctaBadge, ctaTitulo, ctaSubtitulo, bookingUrl, bookingTexto } = card.reverso ?? {};

  // Degradado sensato del botón de reserva: si no hay agenda pero sí número, se
  // escribe por WhatsApp con el texto ya puesto. Si NO hay ni agenda ni número,
  // no se pinta el botón: un `wa.me/?text=` sin destinatario abre WhatsApp pero
  // no lleva a nadie, y un botón "Agendar" que no agenda confunde al prospecto.
  const bookingNumber = String(card.whatsapp || card.phone || '').replace(/[^\d+]/g, '');
  const canBook = Boolean(bookingUrl) || Boolean(bookingNumber);
  const bookingHref = bookingUrl
    || whatsAppLink(card.whatsapp || card.phone, 'Hola, me gustaría agendar una reunión.');
  const bookingLabel = bookingTexto || 'Agendar una reunión';

  return (
    <div className="flex h-full w-full flex-col bg-neutral-950 p-6 text-white">
      {/* Botón para regresar al frente */}
      <button
        type="button"
        onClick={onBack}
        aria-label="Volver al frente de la tarjeta"
        className="mb-4 grid h-11 w-11 place-items-center rounded-full bg-black/55 text-white
                   ring-1 ring-white/25 backdrop-blur-md transition-colors hover:bg-black/75
                   active:scale-95"
      >
        <ChevronLeft size={22} />
      </button>

      {videoUrl && <VideoPlayer url={videoUrl} />}

      {/* Tarjeta de valor interactiva */}
      {(ctaBadge || ctaTitulo || ctaSubtitulo) && (
        <div className="mt-4 rounded-2xl border border-neutral-800/80 bg-neutral-900/60 p-5">
          {ctaBadge && (
            <span className="inline-block rounded-full border border-neutral-700 bg-neutral-800/70
                             px-3 py-1 text-[11px] font-medium tracking-wide text-neutral-300"
            >
              {ctaBadge}
            </span>
          )}
          {ctaTitulo && (
            <h2 className="mt-3 text-lg font-medium leading-snug text-white">{ctaTitulo}</h2>
          )}
          {ctaSubtitulo && (
            <p className="mt-1.5 text-sm font-light leading-relaxed text-neutral-400">
              {ctaSubtitulo}
            </p>
          )}
        </div>
      )}

      {/* Botón ancho de reservación, sobrio (blanco sobre negro), sin neón. Sólo
          se pinta si hay a dónde llevar (agenda o número); si no, se omite para
          no ofrecer un enlace muerto. */}
      {canBook && (
        <a
          href={bookingHref}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-auto flex w-full items-center justify-center gap-2 rounded-xl bg-white
                     px-4 py-3.5 text-sm font-semibold text-black transition-colors
                     hover:bg-neutral-200 active:scale-[0.98]"
        >
          <CalendarCheck size={16} /> {bookingLabel}
        </a>
      )}
    </div>
  );
}

/**
 * Tarjeta digital de dos caras con giro 3D.
 *
 * @param cardData   Datos de la tarjeta en cualquiera de sus formas (la del repo
 *                   normalizado o la del formulario del editor). Se normaliza
 *                   aquí dentro para no depender de qué shape llegue.
 * @param card       Alias de cardData, por compatibilidad con quien pasaba `card`.
 * @param onPickPhoto Si viene, aparece el botón de cámara (modo edición).
 * @param uploading  Muestra el velo de carga sobre el retrato.
 */
export default function DigitalCard({ cardData, card, onPickPhoto, uploading = false }) {
  const [isFlipped, setIsFlipped] = useState(false);

  // Se acepta `cardData` o `card` y se normaliza: así el visor no depende de si
  // le llega el shape del repo o el del formulario (specialties → pildoras, etc.).
  const data = normalizeCardData(cardData ?? card ?? {});

  // El reverso sólo existe si hay algo que enseñar: sin video ni CTA ni agenda,
  // un botón para voltear llevaría a una cara vacía.
  const r = data.reverso ?? {};
  const hasBack = Boolean(
    r.videoUrl || r.ctaBadge || r.ctaTitulo || r.ctaSubtitulo || r.bookingUrl,
  );

  const Front = data.template === 'executive' ? ExecutiveFront : EditorialFront;

  // La cara de espaldas se apaga para el ratón y el lector de pantalla:
  // backface-visibility sólo la esconde a la vista, no a los toques.
  const hiddenFace = 'pointer-events-none';

  return (
    /*
      Marco vertical tipo póster. La perspectiva vive en el contenedor exterior;
      el marco (borde, redondeo, recorte) vive en cada cara y NO aquí: un
      `overflow-hidden` en el elemento que gira aplanaría la escena 3D.
    */
    <div className="relative mx-auto h-[620px] w-full max-w-[340px] [perspective:1000px]">
      <div
        className="relative h-full w-full transition-transform duration-700"
        /*
          El 3D va en estilos en línea, no sólo en clases: Safari necesita las
          propiedades prefijadas, que Tailwind no genera. La rotación se declara
          aquí para que salga en la misma propiedad `transform` y no compita con
          ninguna clase.
        */
        style={{
          WebkitTransformStyle: 'preserve-3d',
          transformStyle: 'preserve-3d',
          transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
        }}
      >
        {/* ───────── Anverso ───────── */}
        <div
          aria-hidden={isFlipped}
          className={`absolute inset-0 h-full w-full overflow-hidden rounded-[2rem]
                      border border-neutral-800/80 bg-black shadow-2xl shadow-black/60
                      ${isFlipped ? hiddenFace : ''}`}
          /*
            `translateZ(0)` fuerza a WebKit a dar a esta cara su propia capa en el
            espacio 3D; sin ella la trata como plana y la sigue dibujando cuando
            está de espaldas.
          */
          style={{
            WebkitBackfaceVisibility: 'hidden',
            backfaceVisibility: 'hidden',
            transform: 'translateZ(0)',
          }}
        >
          <Front
            card={data}
            onPickPhoto={onPickPhoto}
            uploading={uploading}
            onFlip={() => setIsFlipped(true)}
            hasBack={hasBack}
          />
        </div>

        {/* ───────── Reverso ───────── */}
        <div
          aria-hidden={!isFlipped}
          className={`absolute inset-0 h-full w-full overflow-hidden rounded-[2rem]
                      border border-neutral-800/80 bg-neutral-950 shadow-2xl shadow-black/60
                      ${isFlipped ? '' : hiddenFace}`}
          /*
            La media vuelta va junta con `translateZ(0)` en la misma propiedad:
            declaradas por separado, la segunda sustituiría a la primera y el
            reverso se vería del derecho, con el texto en espejo.
          */
          style={{
            WebkitBackfaceVisibility: 'hidden',
            backfaceVisibility: 'hidden',
            transform: 'rotateY(180deg) translateZ(0)',
          }}
        >
          <CardBack card={data} onBack={() => setIsFlipped(false)} />
        </div>
      </div>
    </div>
  );
}
