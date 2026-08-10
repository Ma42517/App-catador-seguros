import { useState } from 'react';
import {
  Phone, Mail, MessageSquare, QrCode, Share2, UserPlus, RotateCcw, ChevronLeft,
  ImagePlus,
} from 'lucide-react';
import { tapFeedback } from '../../lib/haptics';
import QrPassModal from './QrPassModal';
import ShareSheet from './ShareSheet';
import { InlineInput, InlineTextarea } from './InlineField';
import ServicesHubBack from './ServicesHubBack';

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
 * Tarjeta digital de dos caras.
 *
 * El frente está pensado para convencer a un desconocido; el reverso, para
 * resolverle un trámite a quien ya es cliente. Son dos públicos con necesidades
 * opuestas, así que en lugar de alargar una sola cara con botones que sólo le
 * sirven a la mitad de quien la ve, la tarjeta se voltea.
 *
 * El giro es una rotación 3D real: el contenedor exterior aporta la
 * perspectiva, el interior gira, y cada cara oculta su reverso. Por eso el
 * marco —borde, redondeo y recorte— vive en cada cara y no en el contenedor:
 * `overflow-hidden` en el elemento que gira aplana el espacio 3D y el efecto se
 * pierde.
 *
 * El frente conserva el diseño Split con fondo Ambient Blur: la foto ocupa el
 * 60% superior y, por debajo del contenido, la misma foto desenfocada al
 * extremo tiñe la tarjeta con los colores del retrato.
 */
export default function DigitalCardPreview({
  card, variant = 'frame', onAddContact, onExit,
  editable = false, onChange = () => {}, onPickPhoto,
}) {
  const {
    fullName, title, company, license, specialties = [], bio, phone, email, whatsapp,
    avatarUrl,
  } = card;

  const digits = (value) => String(value ?? '').replace(/[^\d+]/g, '');

  const [isQrOpen, setQrOpen] = useState(false);
  const [isFlipped, setIsFlipped] = useState(false);
  const [isShareOpen, setShareOpen] = useState(false);

  const flipTo = (next) => {
    tapFeedback();
    setIsFlipped(next);
  };

  /*
    Retroceso jerárquico: la flecha deshace lo último que se abrió en lugar de
    abandonar la tarjeta.

    El botón vive aquí y no en la pantalla que contiene la tarjeta, y ésa es la
    razón de que funcione: el estado de cada capa —el QR, el video, la cara
    volteada— es de la tarjeta, y un botón de atrás que no sabe qué hay abierto
    sólo puede hacer una cosa, salir. Antes salía al menú incluso con el QR a
    pantalla completa encima, así que un toque de más en la esquina hacía perder
    la tarjeta que se estaba enseñando.

    Hoy sólo hay una capa que cerrar, el QR, pero la forma se conserva: cuando
    se añada otra, el orden de cierre tiene que decidirse aquí y no repartirse
    entre los componentes que la abren.
  */
  const layerToDismiss = () => {
    if (isShareOpen) return () => setShareOpen(false);
    if (isQrOpen) return () => setQrOpen(false);
    return null;
  };

  const dismissLayer = layerToDismiss();

  /*
    En el reverso no se dibuja: su propio botón de giro ya es el camino de
    vuelta, y dos flechas de regreso a la vez dejan al prospecto adivinando cuál
    le hace perder lo que está viendo.

    Se dibuja también cuando hay una capa abierta aunque no haya `onExit`. Ese es
    el caso de la tarjeta compartida: ahí no existe salida —no hay app detrás a la
    que volver— pero sí se puede abrir el QR o el panel de compartir, y sin este
    botón el prospecto quedaba encerrado en ellos, con la tarjeta tapada y ningún
    gesto para descubrirla.
  */
  const showBackButton = (Boolean(onExit) || Boolean(dismissLayer)) && !isFlipped;

  const handleBack = () => {
    tapFeedback();
    if (dismissLayer) {
      dismissLayer();
      return;
    }
    onExit?.();
  };

  /*
    Dos presentaciones de la misma tarjeta:
      - `frame`: maqueta de celular, para verla junto al formulario.
      - `fill`:  ocupa la pantalla entera. En un teléfono el marco sobra —el
                 dispositivo ya es el marco—, y dibujarlo dentro de otro marco
                 hace la tarjeta más pequeña justo cuando se la enseña a alguien.
  */
  const isFill = variant === 'fill';

  /*
    En `fill` la tarjeta ocupa lo que le da su contenedor. En `frame` era
    `h-[650px]` fijo, y ahí estaba el desbordamiento: en un teléfono la pantalla
    útil ronda los 600 px y con la cabecera del editor encima la tarjeta no
    cabía, así que la barra inferior quedaba fuera de la vista.

    Ahora el alto se limita a lo que queda de pantalla —`100dvh` mide el espacio
    real, descontando las barras del navegador, que `100vh` no hace— sin pasar de
    los 650 px del diseño. Desde `sm` recupera la medida fija, porque en
    escritorio siempre hay sitio y la maqueta debe verse igual.
  */
  const sizeClasses = isFill
    ? 'h-full w-full'
    : 'mx-auto h-[min(650px,calc(100dvh-11rem))] w-full max-w-[320px] sm:h-[650px]';

  // El marco se repite en las dos caras: si viviera en el contenedor que gira,
  // el recorte aplanaría la escena 3D y el giro dejaría de verse.
  const faceFrame = isFill
    ? ''
    : 'rounded-[2.5rem] border-4 border-zinc-900 shadow-2xl';

  /*
    Máscara que desvanece el retrato hacia abajo. Se repite con el prefijo
    `-webkit-`: WebKit —todo navegador en iPhone, que es donde más se va a
    mostrar esta tarjeta— sólo entiende la propiedad prefijada, y sin ella la
    foto terminaría en un borde recto a media tarjeta.
  */
  const portraitFade =
    '[mask-image:linear-gradient(to_bottom,#000_45%,transparent_100%)] '
    + '[-webkit-mask-image:linear-gradient(to_bottom,#000_45%,transparent_100%)]';

  /*
    La cara que está de espaldas se apaga para el ratón y para el lector de
    pantalla. `backface-visibility` sólo la esconde a la vista: sin esto, los
    botones del reverso seguirían siendo pulsables a través del frente, y un
    lector leería las dos caras como si estuvieran juntas.
  */
  const hiddenFace = 'pointer-events-none';

  return (
    <div className={`relative [perspective:1000px] ${sizeClasses}`}>
      <div
        className="relative h-full w-full transition-transform duration-700"
        /*
          El 3D va en estilos en línea y no sólo en clases. Safari necesita las
          propiedades prefijadas, y Tailwind no las genera: con la clase
          `[transform-style:preserve-3d]` sola, WebKit aplanaba la escena y las
          dos caras se mezclaban —se veía el frente en espejo encima del reverso—.

          La rotación también se declara aquí para que salga en la misma
          propiedad `transform` que el resto y no compita con ninguna clase.
        */
        style={{
          WebkitTransformStyle: 'preserve-3d',
          transformStyle: 'preserve-3d',
          transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
        }}
      >
        {/* ───────── Cara frontal: prospectos ───────── */}
        <div
          aria-hidden={isFlipped}
          className={`absolute inset-0 flex h-full w-full flex-col overflow-hidden
                      bg-zinc-950 ${faceFrame} ${isFlipped ? hiddenFace : ''}`}
          /*
            `translateZ(0)` no es un truco de rendimiento aquí: obliga a WebKit a
            dar a esta cara su propia capa en el espacio 3D. Sin ella, Safari la
            trata como plana y la sigue dibujando cuando está de espaldas.
          */
          style={{
            WebkitBackfaceVisibility: 'hidden',
            backfaceVisibility: 'hidden',
            transform: 'translateZ(0)',
          }}
        >
          {/* Capa 0 — Ambiental: la foto convertida en luz de color */}
          {avatarUrl && (
            <div className="absolute inset-0" aria-hidden="true">
              {/*
                `scale-110` es obligatorio, no decorativo: un desenfoque de este
                tamaño arrastra los píxeles del borde hacia dentro y deja un halo
                claro en el perímetro, que sólo queda fuera del marco si la
                imagen sobresale.
              */}
              <img
                src={avatarUrl}
                alt=""
                referrerPolicy="no-referrer"
                className="absolute inset-0 h-full w-full scale-110 object-cover opacity-60
                           blur-3xl"
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
            Capa 2 — Legibilidad. Va sobre toda la tarjeta y no sólo sobre la
            foto: el nombre cae en la frontera de las dos zonas, y un velo que
            terminara al 60% dejaría la primera línea sin respaldo. Son
            transparencias, así que el color ambiental sigue leyéndose debajo.
          */}
          <div
            className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/25
                       to-transparent"
            aria-hidden="true"
          />

          {/*
            Capa 2b — Sombra de los controles superiores.

            El velo de legibilidad sube desde abajo y termina transparente, así
            que arriba no protege nada: los botones de esa franja quedaban sobre
            la foto desnuda y desaparecían en cuanto el retrato tenía un fondo
            claro —cielo, pared blanca, camisa clara—. Con la foto elegida por
            cada asesor, ahí no se puede contar con ningún color.

            Es el mismo recurso que usan los reproductores de video para sus
            controles: una sombra corta que sólo cubre la banda donde hay
            botones. A 8 rem no alcanza la cara del retrato, y al ser un
            degradado que muere en transparente no se percibe como una barra.
          */}
          <div
            className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-black/60
                       via-black/25 to-transparent"
            aria-hidden="true"
          />

          {/*
            Cambiar la foto: se toca el retrato, que es lo que se quiere cambiar.

            El botón cubre la zona nítida —el 60% superior— y no un icono en una
            esquina: así el gesto es "toco mi foto para cambiarla" en lugar de
            buscar un control. El rótulo aparece al pasar por encima o al enfocar,
            para no tapar el retrato mientras se editan los textos de abajo.
          */}
          {editable && onPickPhoto && (
            <button
              type="button"
              onClick={onPickPhoto}
              aria-label={avatarUrl ? 'Cambiar mi foto' : 'Subir mi foto'}
              className="group absolute left-0 top-0 z-20 flex h-[60%] w-full items-start
                         justify-center pt-8 transition-colors hover:bg-black/30
                         focus-visible:bg-black/30 focus-visible:outline-none"
            >
              <span
                className="flex items-center gap-1.5 rounded-full bg-black/55 px-3 py-1.5
                           text-[11px] font-semibold text-white opacity-0 ring-1
                           ring-white/30 backdrop-blur-md transition-opacity
                           group-hover:opacity-100 group-focus-visible:opacity-100"
              >
                <ImagePlus size={13} strokeWidth={2.2} aria-hidden="true" />
                {avatarUrl ? 'Cambiar foto' : 'Subir foto'}
              </span>
            </button>
          )}

          {/* Paso al reverso, discreto y siempre alcanzable */}
          <button
            type="button"
            onClick={() => flipTo(true)}
            /*
              El rótulo visible dice "Servicios", que es lo que se busca, pero no
              dice qué va a pasar al tocarlo. Quien navega a ciegas necesita
              saber que la tarjeta se voltea, o el cambio de contenido llega sin
              explicación.
            */
            aria-label="Ver servicios y soluciones, voltea la tarjeta"
            /*
              El contraste no se deja al azar de la foto. El botón lleva su
              propio fondo oscuro —no un cristal claro, que sobre un retrato
              luminoso se volvía invisible— y encima un aro claro.

              Los dos juntos cubren los dos extremos: sobre una foto clara
              destaca el fondo negro, y sobre una oscura destacan el aro y el
              texto blancos. La sombra del texto es el último respaldo, para el
              caso en que el fondo de la foto sea exactamente igual de oscuro
              que el del botón.
            */
            className="animate-attention-halo absolute right-4 top-4 z-30 flex items-center
                       gap-1.5 rounded-full bg-black/55 py-1.5 pl-2.5 pr-3 text-[11px]
                       font-semibold text-white ring-1 ring-white/30 backdrop-blur-md
                       transition-colors [text-shadow:0_1px_2px_rgb(0_0_0/0.9)]
                       hover:bg-black/70 active:scale-95 focus-visible:outline-none
                       focus-visible:ring-2 focus-visible:ring-white"
          >
            {/*
              La rotación va sólo en el icono. En el botón entero arrastraría la
              palabra "Servicios" en el giro y quedaría ilegible o del revés
              durante buena parte del ciclo, que es justo lo que el rótulo tiene
              que evitar. El halo sí puede ir en el botón porque una sombra no
              mueve ni atenúa nada de lo que hay dentro.
            */}
            <RotateCcw
              size={12}
              strokeWidth={2.4}
              className="animate-flip-hint shrink-0"
              aria-hidden="true"
            />
            Servicios
          </button>

          {/*
            Capa 3 — Contenido, en el flujo y con desplazamiento propio.

            Antes ocupaba todo el alto con la barra inferior encima en posición
            absoluta, y el hueco se reservaba a mano con `pb-20`. Eso se rompía en
            cuanto la pantalla era más baja que el diseño: el contenido no tenía a
            dónde ir y los últimos bloques quedaban cortados, con la barra tapando
            lo que faltaba por leer.

            Ahora la barra es un hermano que no se encoge y esta zona absorbe lo
            que sobra. El contenedor interior lleva `min-h-full` con
            `justify-end`: así el contenido se apoya abajo mientras cabe, y cuando
            no cabe crece hacia arriba y se puede desplazar. Poner `justify-end`
            directamente en el elemento que se desplaza dejaría el principio del
            contenido fuera de alcance, que es un defecto conocido de flexbox.
          */}
          <div
            className="relative z-10 flex-1 overflow-y-auto overscroll-contain
                       [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            <div
              className={`flex min-h-full flex-col justify-end text-left text-white
                          ${isFill ? 'p-6' : 'p-5'}`}
            >
            {/* Pulso de disponibilidad, encima del nombre */}
            <div
              className="animate-fade-in-up mb-2.5 flex w-max items-center gap-2 rounded-full
                         border border-white/15 bg-white/10 px-3 py-1 backdrop-blur-md"
            >
              <span
                className="h-2 w-2 animate-pulse rounded-full bg-green-500"
                aria-hidden="true"
              />
              <span className="text-[10px] uppercase tracking-wider text-zinc-100">
                Disponible para asesoría
              </span>
            </div>

            {/*
              Los mismos textos, editables o no según `editable`. Comparten estas
              clases a propósito: si el editor tuviera su propio marcado, lo que
              se escribe y lo que ve el prospecto empezarían a separarse con cada
              cambio de diseño, y la promesa de "editas lo que se ve" se rompería
              sin que nadie lo note.
            */}
            <div className="animate-fade-in-up">
              {editable ? (
                <InlineInput
                  value={fullName}
                  onChange={(v) => onChange('fullName', v)}
                  label="Tu nombre completo"
                  placeholder="Tu nombre"
                  className="text-3xl font-bold uppercase leading-none tracking-tight
                             drop-shadow-lg"
                />
              ) : (
                <h2 className="text-3xl font-bold uppercase leading-none tracking-tight
                               drop-shadow-lg"
                >
                  {fullName || <span className="text-white/40">Tu nombre</span>}
                </h2>
              )}

              {editable ? (
                <InlineInput
                  value={title}
                  onChange={(v) => onChange('title', v)}
                  label="Tu título profesional"
                  placeholder="Tu título profesional"
                  className="mt-1.5 text-sm text-zinc-200 drop-shadow"
                />
              ) : (
                <p className="mt-1.5 text-sm text-zinc-200 drop-shadow">
                  {title || <span className="text-white/35">Tu título profesional</span>}
                </p>
              )}

              {/*
                Empresa y cédula sólo aparecen si tienen contenido, pero en
                edición se muestran siempre: un campo que se oculta cuando está
                vacío no se puede llenar, y sería invisible justo para quien
                todavía no lo ha puesto.
              */}
              {editable ? (
                <InlineInput
                  value={company}
                  onChange={(v) => onChange('company', v)}
                  label="Empresa o promotoría"
                  placeholder="Empresa o promotoría"
                  className="mt-0.5 text-xs font-semibold uppercase tracking-wider
                             text-zinc-300"
                />
              ) : company && (
                <p className="mt-0.5 text-xs font-semibold uppercase tracking-wider
                              text-zinc-300"
                >
                  {company}
                </p>
              )}

              {editable ? (
                <span className="mt-1.5 flex items-baseline gap-1 text-[11px] text-zinc-300">
                  Cédula:
                  <InlineInput
                    value={license}
                    onChange={(v) => onChange('license', v)}
                    label="Cédula profesional"
                    placeholder="123456"
                    className="text-[11px] text-zinc-300"
                  />
                </span>
              ) : license && (
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
                    className="rounded-full border border-white/15 bg-white/15 px-2 py-1
                               text-xs font-medium backdrop-blur-md"
                  >
                    {item}
                  </li>
                ))}
              </ul>
            )}

            {/*
              Fila de contacto. Cada icono lleva su propio movimiento y su propio
              ritmo: con la misma animación en los cuatro, la fila se leería como
              un solo bloque parpadeando en vez de cuatro accesos con vida propia.
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
              "About Me" en cristal: el desenfoque de fondo deja pasar los
              colores abstractos de la capa ambiental, y el borde claro es lo que
              define el canto del cristal —sin él, sobre un fondo de color el
              bloque pierde su silueta y parece una mancha.
            */}
            <div
              className="animate-fade-in-up relative mt-4 overflow-hidden rounded-2xl border
                         border-white/20 bg-white/10 p-4 backdrop-blur-md"
              style={{ animationDelay: '300ms' }}
            >
              {/*
                Reflejo que recorre el cristal. Va como capa aparte y no como
                fondo del bloque: encima del texto lo atenuaría, y el degradado
                tiene que pasar por debajo para que parezca luz sobre la
                superficie.
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

                {editable ? (
                  <InlineTextarea
                    value={bio}
                    onChange={(v) => onChange('bio', v)}
                    label="Sobre mí"
                    placeholder="Escribe unas líneas sobre a quién ayudas y cómo."
                    className="mt-1.5 text-xs leading-relaxed text-zinc-100"
                  />
                ) : (
                  <p className="mt-1.5 text-xs leading-relaxed text-zinc-100">
                    {bio || (
                      <span className="text-white/40">
                        Escribe unas líneas sobre a quién ayudas y cómo. Es lo que hace que
                        un prospecto te escriba.
                      </span>
                    )}
                  </p>
                )}
              </div>
            </div>
          </div>
          </div>

          {/*
            Barra de acción del celular. Pasa de negro casi opaco a cristal:
            dejarla sólida cortaría en seco la luz de color justo en el borde
            inferior, que es donde el efecto ambiental se ve mejor.

            `shrink-0` es lo que garantiza que "Add to Contact" nunca se recorte:
            es la acción por la que existe la tarjeta, y en una pantalla baja el
            contenedor flex la habría comprimido antes que nada.
          */}
          <div
            className={`relative z-20 flex w-full shrink-0 items-center justify-between
                        border-t border-white/10 bg-black/40 px-4 py-3 backdrop-blur-md
                        ${isFill ? 'pb-safe' : 'rounded-b-[2rem]'}`}
          >
            <span className="flex items-center gap-1">
              {/*
                El QR pasa de adorno a botón: es la forma más rápida de entregar
                el contacto en persona, sin dictar un número ni pedirle al
                prospecto que escriba nada.
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

              {/*
                Compartir el enlace público. Deja de ser un adorno porque sin él
                la tarjeta compartible no llega a nadie: el asesor tendría que
                armar la dirección a mano.

                Sin `id` —una tarjeta que todavía no existe en la base, como la
                del editor sin guardar— queda apagado, en vez de compartir una
                dirección que daría error al abrirse.
              */}
              <button
                type="button"
                onClick={() => { tapFeedback(); setShareOpen(true); }}
                disabled={!card.id}
                aria-label="Compartir el enlace de mi tarjeta"
                className="grid h-9 w-9 place-items-center rounded-full text-white/80
                           transition-colors hover:bg-white/10 hover:text-white
                           active:scale-90 disabled:cursor-default disabled:text-white/30
                           disabled:hover:bg-transparent focus-visible:outline-none
                           focus-visible:ring-2 focus-visible:ring-white/60"
              >
                <Share2 size={19} />
              </button>
            </span>

            {/*
              Sin `onAddContact` la pieza es sólo un adorno de la vista previa:
              en el editor no debe capturar prospectos, y un botón que no hace
              nada confundiría más que un rótulo.
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
        </div>

        {/* ───────── Cara trasera: clientes activos ───────── */}
        <div
          aria-hidden={!isFlipped}
          className={`absolute inset-0 h-full w-full overflow-hidden bg-zinc-900
                      ${faceFrame} ${isFlipped ? '' : hiddenFace}`}
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
          <ServicesHubBack card={card} onBack={() => flipTo(false)} />
        </div>
      </div>

      {/*
        El panel vive fuera del elemento que gira. Dentro heredaría la rotación
        de la cara y se vería en espejo, y al voltear la tarjeta se iría con ella.
      */}
      <QrPassModal card={card} isOpen={isQrOpen} onClose={() => setQrOpen(false)} />

      <ShareSheet card={card} isOpen={isShareOpen} onClose={() => setShareOpen(false)} />

      {/*
        La flecha se dibuja al final y con `z-50`, por encima de los paneles
        —que van en `z-40`—: si quedara debajo, al abrir el QR desaparecería
        justo cuando sirve para volver.

        `mt-safe` la baja del área del sistema en los teléfonos con muesca.
      */}
      {showBackButton && (
        <button
          type="button"
          onClick={handleBack}
          aria-label={dismissLayer ? 'Volver a la tarjeta' : 'Volver'}
          /*
            Mismo fondo y mismo aro que el botón de servicios: los dos viven en
            la misma franja, sobre la misma foto imprevisible, y con opacidades
            distintas uno de los dos acabaría siendo el que no se ve.
          */
          className="mt-safe absolute left-4 top-4 z-50 grid h-11 w-11 place-items-center
                     rounded-full bg-black/55 text-white ring-1 ring-white/30 backdrop-blur-md
                     transition-colors hover:bg-black/70 active:scale-95
                     focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
        >
          <ChevronLeft size={22} />
        </button>
      )}
    </div>
  );
}
