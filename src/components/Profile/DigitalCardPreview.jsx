import { useState, useEffect, useRef } from 'react';
import {
  Phone, Mail, MessageSquare, QrCode, Share2, UserPlus, RotateCcw, ChevronLeft,
  Camera, Plus, Minus,
} from 'lucide-react';
import { tapFeedback } from '../../lib/haptics';
import { focusStyle, serializeFocus } from '../../data/cardPhoto';
import usePhotoFraming from './usePhotoFraming';
import QrPassModal from './QrPassModal';
import ShareSheet from './ShareSheet';
import { InlineInput } from './InlineField';
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
      className={`grid h-10 w-10 place-items-center rounded-full transition-transform
        will-change-transform
        ${enabled
          ? `bg-white text-zinc-900 shadow-md shadow-black/20 active:scale-90
             hover:shadow-[0_0_12px_rgba(255,255,255,0.35)]
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
    fullName, title, company, specialties = [], phone, email, whatsapp,
    avatarUrl, photoFocus,
  } = card;

  const digits = (value) => String(value ?? '').replace(/[^\d+]/g, '');

  /*
    Encuadre en vivo. El gesto escribe en el mismo campo que la tarjeta lee, así
    que la foto se recoloca mientras el dedo la arrastra: no hay un paso de
    confirmación porque no hay nada que confirmar, lo que se ve ya es el
    resultado.
  */
  /*
    Modo acomodar, activo o no.

    Existe porque arrastrar la foto y desplazar la página son el mismo gesto
    físico, y sólo uno de los dos puede ganar. Con el modo apagado gana la página
    —que es lo que se hace el 99% del tiempo— y un toque simple, que no compite
    con ningún arrastre, es lo que cede el gesto a la foto.
  */
  const [isFraming, setFraming] = useState(false);

  /*
    El modo se enciende solo al subir una foto nueva, que es el único momento en
    que hace falta: la imagen acaba de llegar centrada por el sistema y es ahí
    donde se decide cómo queda. No hay botón para entrar porque no hay que
    recordar entrar —se entra por sí mismo, se acomoda y se sale con "Listo"—.

    Se compara contra la dirección anterior y no se activa en el primer render:
    abrir el editor con una foto ya colocada no debe secuestrar el gesto de
    desplazar, que es lo que rompía el scroll sobre la tarjeta.
  */
  const knownPhoto = useRef(null);

  useEffect(() => {
    if (!editable) return;

    const previous = knownPhoto.current;
    knownPhoto.current = avatarUrl;

    // `previous` nulo es la carga inicial; sin foto no hay nada que acomodar.
    if (previous !== null && avatarUrl && avatarUrl !== previous) setFraming(true);
  }, [avatarUrl, editable]);

  const framing = usePhotoFraming({
    focus: photoFocus,
    enabled: isFraming,
    onChange: (next) => onChange('photoFocus', serializeFocus(next)),
  });

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
  /*
    El alto tiene que estar DEFINIDO, no sólo acotado con un mínimo.

    Las dos caras van en `absolute inset-0`, que es lo que permite superponerlas
    para el giro. Al estar fuera del flujo no aportan alto, así que el contenido
    no puede definirlo: si aquí sólo se pone `min-h`, el elemento que gira —que
    mide `h-full`— resuelve su alto contra un padre sin alto y colapsa a cero.
    Las caras se dibujan entonces dentro de una caja de cero píxeles y la tarjeta
    desaparece por completo.

    En edición se usa la medida del diseño y es la página la que se desplaza. En
    presentación se limita a la pantalla disponible, donde no hay nada más
    alrededor con lo que compartir el espacio.
  */
  const sizeClasses = isFill
    ? 'h-full w-full'
    : `mx-auto w-full max-w-[320px] ${editable
      ? 'h-[650px]'
      : 'h-[min(650px,calc(100dvh-11rem))] sm:h-[650px]'}`;

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
    '[mask-image:linear-gradient(to_bottom,#000_82%,transparent_100%)] '
    + '[-webkit-mask-image:linear-gradient(to_bottom,#000_82%,transparent_100%)]';

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
            <div className="pointer-events-none absolute inset-0" aria-hidden="true">
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

          {/*
            Capa 1 — Retrato: nítido, en los dos tercios superiores.

            En edición este contenedor deja de ser decorativo y pasa a recibir los
            gestos, pero sólo cuando el modo acomodar está encendido. Fuera de
            edición vuelve a ser una capa muerta que no intercepta nada.
          */}
          <div
            ref={framing.frameRef}
            {...(isFraming ? framing.handlers : {})}
            aria-hidden={!editable}
            /*
              `touch-none` sólo mientras se está acomodando, y ahí está la clave.

              Esa propiedad le quita al navegador el gesto de desplazar, que es lo
              que permite arrastrar la foto… y también lo que rompía el scroll de
              la página: pasar el dedo por la franja del retrato dejaba de mover la
              pantalla. El mismo movimiento no puede significar dos cosas a la vez.

              Fuera del modo acomodar el contenedor no reclama nada: el dedo
              desplaza la página como en cualquier otro sitio, y un toque simple
              —que no es un arrastre y por tanto no compite con él— es lo que
              entra a colocar la foto.
            */
            className={`absolute left-0 top-0 h-[64%] w-full ${
              isFraming
                ? 'z-20 cursor-move touch-none select-none'
                : 'pointer-events-none'}`}
          >
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt=""
                referrerPolicy="no-referrer"
                /*
                  El encuadre viene del ajustador y se aplica al mirar, no al
                  guardar: `objectPosition` decide qué parte de la foto entra en el
                  hueco y `scale` cuánto se acerca. La imagen guardada está
                  completa, así que se puede recolocar tantas veces como se quiera
                  sin perder nada.

                  Antes esto llevaba `object-top`, que anclaba la imagen al borde
                  superior por su cuenta y descartaba cualquier ajuste. Y sin
                  ningún ajuste, el sistema la centraba a ciegas: en un retrato de
                  cuerpo entero eso dejaba la cara fuera del hueco.
                */
                style={focusStyle(photoFocus)}
                className={`h-full w-full object-cover ${portraitFade}`}
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
            className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/70
                       via-black/25 to-transparent"
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
            className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-gradient-to-b
                       from-black/60 via-black/25 to-transparent"
            aria-hidden="true"
          />

          {/*
            Un solo control de foto: subir. El encuadre ya no necesita botón
            porque se hace con el dedo sobre la propia imagen.

            Antes había dos rótulos apilados en la esquina, "Cambiar foto" y
            "Ajustar foto", que competían por el mismo sitio y obligaban a
            distinguir entre dos acciones que la persona vive como una sola:
            poner bien su foto. Queda el icono a secas —la acción de reemplazar es
            la única que necesita un botón— y el ajuste pasa a ser el gesto obvio
            sobre la imagen.
          */}
          {editable && onPickPhoto && (
            <button
              type="button"
              onClick={onPickPhoto}
              aria-label={avatarUrl ? 'Cambiar mi foto' : 'Subir mi foto'}
              title={avatarUrl ? 'Cambiar foto' : 'Subir foto'}
              className="absolute left-4 top-4 z-50 grid h-9 w-9 place-items-center rounded-full
                         bg-black/55 text-white ring-1 ring-white/30 backdrop-blur-md
                         transition-colors hover:bg-black/75 active:scale-95
                         focus-visible:outline-none focus-visible:ring-2
                         focus-visible:ring-white"
            >
              <Camera size={16} strokeWidth={2} aria-hidden="true" />
            </button>
          )}

          {/*
            Contorno del área activa mientras se acomoda. Es lo único que queda
            sobre la foto, y no intercepta ni un toque: `pointer-events-none`.

            Los controles —el aviso, el zoom y el botón "Listo"— se fueron a una
            barra propia dentro de la zona de datos. Encima de la foto se
            superponían al retrato y a los campos de texto, así que al buscar
            "Listo" se acababa abriendo la edición del nombre.
          */}
          {isFraming && (
            <span
              className="pointer-events-none absolute left-0 top-0 z-30 h-[64%] w-full
                         ring-2 ring-inset ring-indigo-400/70"
              aria-hidden="true"
            />
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
            className="animate-attention-halo absolute right-4 top-4 z-50 flex items-center
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
            /*
              Zona de datos, delimitada de verdad.

              `max-h-[58%]` con `mt-auto` es lo que impide que el texto invada la
              foto. Antes era `flex-1`: crecía hasta llenar todo el alto libre, así
              que con un nombre largo, tres especialidades y una descripción de
              varias líneas el bloque subía hasta la cara. En un teléfono alto
              sobraba sitio y se veía bien; en uno más bajo, el mismo contenido
              tapaba el retrato. De ahí que se viera distinto en cada aparato.

              Con el tope, la foto siempre conserva su 42% superior libre y lo que
              no cabe se desplaza dentro de esta zona en lugar de comerse la
              imagen.

              `pointer-events-none` aquí y `auto` en el bloque de dentro: el hueco
              vacío deja pasar los toques y el gesto de desplazar la página, que
              es lo que antes moría contra esta capa.
            */
            /*
              Sin `overscroll-contain`, y ésta era la causa del scroll trabado.

              Esa propiedad hace justo lo contrario de lo que parece: **prohíbe**
              que el gesto se propague al elemento de detrás. Al llegar esta zona a
              su tope —o incluso sin nada que desplazar dentro— el movimiento moría
              aquí y la página no se movía. De ahí que sólo se pudiera desplazar
              tocando fuera de la tarjeta.

              En edición tampoco lleva `overflow-y-auto`: el contenido cabe en la
              zona reservada, así que un contenedor desplazable sólo servía para
              competir con la página por el mismo gesto.
            */
            className={`pointer-events-none relative z-40 mt-auto flex max-h-[50%] w-full
                        flex-col justify-end ${editable
                          ? ''
                          : 'overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden'}`}
          >
            {/*
              Este bloque mide sólo lo que ocupa su texto. Sin `min-h-full`: con
              él se estiraría hasta el techo de la zona y su `pointer-events-auto`
              volvería a tapar el retrato y los controles de arriba. El padre ya lo
              apoya abajo con `justify-end`.
            */}
            <div
              className={`pointer-events-auto flex flex-col justify-end text-left text-white
                          ${isFill ? 'p-6' : 'p-5'}`}
            >
            {/*
              Barra de acciones del modo acomodar.

              Vive en la zona de datos, separada de la foto, y por eso se puede
              pulsar sin miedo: no hay ningún campo de texto ni ninguna imagen
              debajo con la que competir. "Listo" queda a la derecha, donde la vista
              termina de leer la fila.
            */}
            {isFraming && (
              <div
                className="animate-fade-in-up mb-2.5 flex items-center gap-2 rounded-2xl
                           border border-indigo-400/40 bg-zinc-900/90 p-2 pl-3 backdrop-blur-md"
              >
                <span className="min-w-0 flex-1 text-[11px] font-semibold leading-tight
                                 text-indigo-200"
                >
                  Arrastra o pellizca tu foto
                </span>

                <button
                  type="button"
                  onClick={() => framing.stepZoom(-0.15)}
                  aria-label="Alejar la foto"
                  className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white/10
                             text-white transition-colors hover:bg-white/20 active:scale-95"
                >
                  <Minus size={14} strokeWidth={2.5} aria-hidden="true" />
                </button>

                <button
                  type="button"
                  onClick={() => framing.stepZoom(0.15)}
                  aria-label="Acercar la foto"
                  className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white/10
                             text-white transition-colors hover:bg-white/20 active:scale-95"
                >
                  <Plus size={14} strokeWidth={2.5} aria-hidden="true" />
                </button>

                <button
                  type="button"
                  onClick={() => setFraming(false)}
                  className="shrink-0 rounded-full bg-indigo-600 px-4 py-2 text-[11px]
                             font-bold text-white transition-colors hover:bg-indigo-500
                             active:scale-95"
                >
                  Listo
                </button>
              </div>
            )}

            {/*
              ── Identidad ──

              Sin recuadro: el texto va directo sobre el degradado, que es lo que
              hace que la tarjeta se lea como una sola pieza y no como fichas
              apiladas. Un bloque opaco resolvía el contraste, pero partía la
              composición en dos y pesaba más que la foto.

              Lo que evita que tape la cara no es una caja, es el sitio: la foto
              ocupa la franja de arriba y esto se apoya en el borde inferior, así que
              queda sobre el fondo ambiental y no sobre el retrato.
            */}
            <div className="animate-fade-in-up">
            {/* Pulso de disponibilidad, encima del nombre */}
            <div
              className="mb-2 flex w-max items-center gap-1.5 rounded-full
                         border border-white/10 bg-white/[0.07] px-2.5 py-[3px] backdrop-blur-md"
            >
              <span
                className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400"
                aria-hidden="true"
              />
              <span className="text-[9px] font-medium uppercase tracking-[0.14em] text-zinc-300">
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
            <div className="mt-1">
              {editable ? (
                <InlineInput
                  value={fullName}
                  onChange={(v) => onChange('fullName', v)}
                  label="Tu nombre completo"
                  placeholder="Tu nombre"
                  className="text-2xl font-semibold uppercase leading-tight tracking-[0.01em]
                             drop-shadow-md"
                />
              ) : (
                <h2 className="text-2xl font-semibold uppercase leading-tight tracking-[0.01em]
                               drop-shadow-md"
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
                  className="mt-0.5 text-[13px] font-light text-zinc-300/90 drop-shadow"
                />
              ) : (
                <p className="mt-0.5 text-[13px] font-light text-zinc-300/90 drop-shadow">
                  {title || <span className="text-white/35">Tu título profesional</span>}
                </p>
              )}

              {/*
                La empresa sólo aparece si tiene contenido, pero en
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
                  className="mt-1 text-[10px] font-medium uppercase tracking-[0.16em]
                             text-zinc-400"
                />
              ) : company && (
                <p className="mt-1 text-[10px] font-medium uppercase tracking-[0.16em]
                              text-zinc-400"
                >
                  {company}
                </p>
              )}

            </div>

            {specialties.length > 0 && (
              <ul className="mt-2.5 flex flex-wrap gap-1.5">
                {specialties.map((item) => (
                  <li
                    key={item}
                    className="rounded-full border border-white/10 bg-white/[0.07] px-2 py-0.5
                               text-[10px] font-medium tracking-wide text-zinc-200
                               backdrop-blur-md"
                  >
                    {item}
                  </li>
                ))}
              </ul>
            )}
            </div>

            {/*
              Fila de contacto. Cada icono lleva su propio movimiento y su propio
              ritmo: con la misma animación en los cuatro, la fila se leería como
              un solo bloque parpadeando en vez de cuatro accesos con vida propia.
            */}
            <div
              className="animate-fade-in-up mt-3.5 flex gap-2"
              style={{ animationDelay: '200ms' }}
            >
              <SocialButton label="Llamar" href={phone ? `tel:${digits(phone)}` : ''}>
                {/* Repique corto cada tres segundos, como un teléfono sonando bajito. */}
                <Phone size={16} className={phone ? 'animate-ring' : ''} />
              </SocialButton>

              <SocialButton label="Enviar correo" href={email ? `mailto:${email}` : ''}>
                <Mail size={16} className={email ? 'animate-float' : ''} />
              </SocialButton>

              {/* Mensaje: el destello va en el contorno del círculo, no en el icono. */}
              <SocialButton
                label="Enviar mensaje"
                href={phone ? `sms:${digits(phone)}` : ''}
                glow
              >
                <MessageSquare size={16} />
              </SocialButton>

              <SocialButton
                label="Abrir WhatsApp"
                href={whatsapp ? `https://wa.me/${digits(whatsapp).replace(/^\+/, '')}` : ''}
              >
                <WhatsAppMark size={17} className={whatsapp ? 'animate-soft-pulse' : ''} />
              </SocialButton>
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
          {/*
            `isActive` le dice al reverso que está a la vista. Lo necesita el
            video: arrancar solo tiene sentido cuando alguien acaba de girar la
            tarjeta, y mientras la cara frontal está al frente el reverso existe
            en el DOM pero nadie lo ve —un video sonando ahí sería un ruido sin
            origen visible—.
          */}
          <ServicesHubBack
            card={card}
            onBack={() => flipTo(false)}
            isActive={isFlipped}
          />
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
