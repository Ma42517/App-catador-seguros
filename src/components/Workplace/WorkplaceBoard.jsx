import { useState, useEffect, useCallback } from 'react';
import {
  Share2, Loader2, PenSquare, Trash2, Lock, FileText, Download, Inbox,
} from 'lucide-react';
import FullScreenView from '../Layout/FullScreenView';
import Toast from '../Layout/Toast';
import AccessBar from '../Access/AccessBar';
import PublishSheet from './PublishSheet';
import { readAdvisorProfile } from '../../data/advisorProfile';
import { stampWatermark } from '../../data/watermark';
import { useAccess } from '../../context/AccessContext';
import { useSession } from '../../context/SessionContext';
import PromotoriaWaitingRoom from '../Promotoria/PromotoriaWaitingRoom';
import { PROFILE_ROLES } from '../../data/profilesRepo';
import JoinPromotoria from '../Promotoria/JoinPromotoria';
import PromotoriaBadge from '../Promotoria/PromotoriaBadge';
import FeaturedRow from './FeaturedRow';
import { fetchMyPromotoria } from '../../data/promotoriaRepo';
import { categoryOf, relativeTime } from '../../data/announcements';
import { attachmentKind, attachmentName, documentLabel } from '../../data/attachments';
import {
  fetchAnnouncements, publishAnnouncement, deleteAnnouncement, describeError,
} from '../../data/announcementsRepo';

/** Imagen de prueba mientras la promotoría no suba flyers reales. */
const FLYER_FILE_NAME = 'promocion.jpg';

/**
 * Comparte el archivo de imagen por el menú nativo del sistema.
 *
 * Devuelve el desenlace para que la interfaz avise lo correcto:
 *  - 'shared'    → se abrió la hoja nativa y se compartió
 *  - 'cancelled' → el usuario cerró la hoja (no es un error)
 *  - 'downloaded'→ el navegador no soporta compartir archivos; se descargó
 */
async function shareImageFile({ imageUrl, fileName, title, text, watermark }) {
  const response = await fetch(imageUrl);
  if (!response.ok) throw new Error(`La imagen no se pudo descargar (${response.status})`);

  const original = await response.blob();
  // El flyer viaja solo por WhatsApp, así que los datos del asesor tienen que
  // quedar dibujados dentro del archivo, no acompañarlo como texto aparte.
  const blob = await stampWatermark(original, watermark);
  const file = new File([blob], fileName, { type: blob.type || 'image/jpeg' });

  // `canShare` con `files` es la única forma fiable de saber si el sistema
  // acepta archivos: hay navegadores con `share` pero sin soporte de archivos.
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title, text });
      return 'shared';
    } catch (error) {
      // Cerrar la hoja nativa lanza AbortError; no es un fallo que reportar.
      if (error?.name === 'AbortError') return 'cancelled';
      throw error;
    }
  }

  // Respaldo: descarga directa del archivo.
  const objectUrl = URL.createObjectURL(blob);
  try {
    const link = document.createElement('a');
    link.href = objectUrl;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
  } finally {
    // Sin revocar, el blob queda retenido en memoria toda la sesión.
    URL.revokeObjectURL(objectUrl);
  }
  return 'downloaded';
}

/**
 * Adapta un comunicado de la base al formato que dibuja la tarjeta.
 *
 * Sólo los que traen imagen ofrecen compartir: sin archivo no hay nada que
 * estampar ni enviar.
 */
function toCardModel(item) {
  const category = categoryOf(item.category);
  const kind = attachmentKind(item.fileUrl);
  const isImage = kind === 'image';

  return {
    id: item.id,
    tag: category.label,
    tagTone: category.tone,
    title: item.title,
    time: relativeTime(item.createdAt),
    description: item.content || undefined,
    flyer: isImage ? item.fileUrl : undefined,
    document: kind === 'document' ? item.fileUrl : undefined,

    // Compartir con marca de agua sólo tiene sentido sobre una imagen: el
    // estampado dibuja en un canvas, y un PDF no se puede dibujar ahí.
    share: isImage
      ? {
        imageUrl: item.fileUrl,
        fileName: FLYER_FILE_NAME,
        title: item.title,
        text: '¡Revisa esto!',
      }
      : undefined,
  };
}

/**
 * Adjunto que no es imagen: se ofrece como descarga, no como vista previa.
 *
 * `download` no funciona entre dominios distintos, así que el navegador abrirá
 * el archivo en otra pestaña. Se acepta a propósito: para un PDF de bases,
 * verlo es tan válido como descargarlo, y forzar la descarga requeriría traer
 * el archivo a memoria sin ganancia real.
 */
function DocumentAttachment({ url }) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      download
      className="mt-3 flex items-center gap-3 rounded-xl border border-zinc-200 bg-zinc-50 p-3
                 transition-colors hover:border-indigo-500/50 hover:bg-indigo-500/5
                 dark:border-zinc-700 dark:bg-zinc-800/60"
    >
      <span
        className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border
                   border-zinc-200 bg-white text-zinc-500
                   dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400"
        aria-hidden="true"
      >
        <FileText size={18} />
      </span>

      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold text-zinc-900 dark:text-white">
          {documentLabel(url)}
        </span>
        <span className="block truncate text-[11px] text-zinc-500">
          {attachmentName(url)}
        </span>
      </span>

      <Download size={16} className="shrink-0 text-zinc-400" aria-hidden="true" />
    </a>
  );
}


/** Estado del muro cuando no hay vínculo: explica qué falta, sin adelantar contenido. */
function LockedWall() {
  return (
    <div className="py-12 text-center">
      <span
        className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl border
                   border-zinc-200 bg-zinc-50 text-zinc-400
                   dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-500"
        aria-hidden="true"
      >
        <Lock size={24} />
      </span>

      <p className="text-sm font-semibold text-zinc-700 dark:text-zinc-200">
        Muro privado de la promotoría
      </p>
      <p className="mx-auto mt-1.5 max-w-xs text-xs leading-relaxed text-zinc-500">
        Ingresa el código de invitación que te compartieron para ver campañas, bases
        y comunicados oficiales.
      </p>
    </div>
  );
}

/** Tarjeta de anuncio. */
function AnnouncementCard({ announcement, onShare, isSharing, canDelete, onDelete }) {
  const { tag, tagTone, title, time, flyer, document: documentUrl, description, share } = announcement;

  return (
    <article
      className="mb-5 overflow-hidden rounded-2xl border border-zinc-200 bg-white p-5
                 dark:border-zinc-800 dark:bg-zinc-900"
    >
      <div className="flex items-start justify-between gap-2">
        <p className={`mb-1 text-xs font-bold ${tagTone}`}>{tag}</p>

        {/* Retirar un comunicado es privilegio de quien puede publicarlos. */}
        {canDelete && (
          <button
            type="button"
            onClick={onDelete}
            aria-label="Eliminar comunicado"
            title="Eliminar comunicado"
            className="-mt-1 grid h-7 w-7 shrink-0 place-items-center rounded-lg text-zinc-400
                       transition-colors hover:bg-rose-500/10 hover:text-rose-500"
          >
            <Trash2 size={14} />
          </button>
        )}
      </div>

      <h2 className="text-lg font-semibold leading-snug text-zinc-900 dark:text-white">
        {title}
      </h2>

      <p className="mt-0.5 text-xs text-zinc-500">{time}</p>

      {description && (
        <p className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
          {description}
        </p>
      )}

      {/*
        Se muestra la imagen real, no un marcador: así el asesor ve exactamente
        el flyer que va a compartir.
      */}
      {flyer && (
        <img
          src={flyer}
          alt={`Flyer de ${title}`}
          loading="lazy"
          className="mt-3 h-40 w-full rounded-lg bg-zinc-100 object-cover dark:bg-zinc-800"
        />
      )}

      {documentUrl && <DocumentAttachment url={documentUrl} />}

      {share && (
        <button
          type="button"
          onClick={() => onShare(share)}
          disabled={isSharing}
          className="mt-4 flex items-center gap-2 rounded-lg border border-zinc-300 px-4 py-2
                     text-sm font-semibold text-zinc-600 transition-colors hover:bg-zinc-100
                     disabled:cursor-wait disabled:opacity-60
                     dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
          {isSharing
            ? <Loader2 size={16} className="animate-spin" />
            : <Share2 size={16} />}
          {isSharing ? 'Preparando...' : 'Compartir Flyer'}
        </button>
      )}
    </article>
  );
}

/** Tablero de anuncios de la promotoría. */
export default function WorkplaceBoard({ isOpen, onClose, username }) {
  const { isLinked } = useAccess();

  /*
    Quien tiene una solicitud sin responder no ve el muro.

    Es el contenido compartido del equipo, así que la autorización del promotor es
    justo lo que da derecho a leerlo. Se comprueba antes del código de invitación:
    sin esto, un asesor con el código entraba al muro de una promotoría que
    todavía no lo había aceptado.
  */
  const {
    isAwaitingPromotoria, needsPromotoria, role, canManage,
    promotorId, promotoriaStatus,
  } = useSession();

  /*
    Quién puede publicar y borrar en el muro.

    Sale del rol de la cuenta en Supabase —promotor o administrador— y **no** de
    `isPromoter` del código de acceso, que era lo que se usaba antes. La
    diferencia no es teórica: ese código y su contraseña están escritos dentro del
    paquete que descarga cualquier visitante, así que un asesor que los leyera se
    concedía el modo promotor en su propio navegador y le aparecía el botón de
    publicar. El permiso tiene que venir de quién es la persona, no de un secreto
    que viaja en el código.

    Ojo con lo que esto no arregla: esconder el botón no impide llamar a la API.
    Lo que de verdad lo cierra es la política de la base que sólo deja escribir a
    promotores y administradores, y va documentada en .env.example.
  */
  const canPublish = canManage;

  /*
    Vinculado de verdad: tiene promotor **y** ya fue aprobado. Con sólo el
    `promotor_id` bastaría para una solicitud en curso, y ahí no corresponde
    enseñar el muro ni el nombre como si ya perteneciera.
  */
  const isLinkedToPromotoria = Boolean(promotorId)
    && promotoriaStatus === 'approved';

  useEffect(() => {
    if (!isOpen || !isLinkedToPromotoria) return;

    let alive = true;
    fetchMyPromotoria().then(({ data }) => {
      if (alive && data?.promotoria) setPromotoriaName(data.promotoria);
    });
    return () => { alive = false; };
  }, [isOpen, isLinkedToPromotoria]);

  /*
    Quién ve el formulario de "únete con un código".

    Antes se exigía `role === 'advisor'` exacto, y ahí estaba el problema: desde
    otro teléfono, con una cuenta que no era asesor —un administrador probando, o
    alguien recién aprobado— no aparecía este formulario y caía en el heredado,
    que responde "código no válido" sin consultar la base. Ahora lo ve cualquiera
    que no pertenezca a una promotoría y no sea promotor: un promotor no se une a
    la suya propia.
  */
  const canJoinPromotoria = needsPromotoria && role !== PROFILE_ROLES.PROMOTER;
  const [sharingId, setSharingId] = useState(null);
  const [toast, setToast] = useState('');
  const [isPublishOpen, setPublishOpen] = useState(false);
  const [feed, setFeed] = useState([]);
  /*
    Los comunicados en su forma original, además de los ya maquetados.

    Los destacados necesitan la categoría y la URL del archivo tal como vienen de
    la base; `toCardModel` las transforma para la tarjeta grande —etiqueta con
    emoji, tiempo relativo— y deshacer eso para la fila de cuadros sería traducir
    dos veces el mismo dato.
  */
  const [rawFeed, setRawFeed] = useState([]);
  const [isLoadingFeed, setLoadingFeed] = useState(false);

  /*
    Nombre de la promotoría a la que pertenece quien mira. Se pide a la base
    porque RLS no le deja leer la ficha de su promotor; si la función no existe
    todavía, se queda vacío y la cabecera enseña "Tu promotoría".
  */
  const [promotoriaName, setPromotoriaName] = useState('');

  /** Consulta la base cada vez que se abre el tablero con acceso concedido. */
  const loadFeed = useCallback(async () => {
    setLoadingFeed(true);
    const { data, error } = await fetchAnnouncements();
    setLoadingFeed(false);
    if (error) {
      setToast(`No se pudieron cargar los comunicados. ${describeError(error)}`);
      return;
    }
    setRawFeed(data);
    setFeed(data.map(toCardModel));
  }, []);

  useEffect(() => {
    if (isOpen && isLinked) loadFeed();
  }, [isOpen, isLinked, loadFeed]);

  const clearToast = useCallback(() => setToast(''), []);

  /**
   * Devuelve el desenlace para que la hoja decida si cerrarse: ante un fallo
   * conviene que siga abierta con lo ya escrito.
   */
  const handlePublish = useCallback(async (draft) => {
    const { error } = await publishAnnouncement(draft);
    if (error) {
      setToast(`No se pudo publicar. ${describeError(error)}`);
      return { ok: false };
    }
    setToast('Comunicado publicado al equipo');
    loadFeed();
    return { ok: true };
  }, [loadFeed]);

  const handleDelete = useCallback(async (id) => {
    const { error } = await deleteAnnouncement(id);
    if (error) {
      setToast('No se pudo eliminar el comunicado.');
      return;
    }
    loadFeed();
  }, [loadFeed]);

  const handleShare = useCallback(async (id, share) => {
    // Descargar y redibujar toma tiempo: sin este candado, tocar dos veces
    // dispara dos peticiones y dos hojas de compartir.
    if (sharingId) return;
    setSharingId(id);

    // El perfil se lee en el momento de compartir, no al abrir la pantalla:
    // así toma los datos recién guardados sin necesidad de recargar.
    const watermark = readAdvisorProfile(username);
    const hasWatermark = Boolean(watermark.displayName || watermark.phone);

    try {
      const outcome = await shareImageFile({ ...share, watermark });

      if (!hasWatermark) {
        setToast('Agrega tu nombre en Mi Perfil para marcar los flyers.');
      } else if (outcome === 'downloaded') {
        setToast('Imagen guardada en tu galería');
      }
      // Con marca de agua y compartido, el sistema ya dio su confirmación.
      // 'cancelled' tampoco necesita aviso: el usuario decidió no compartir.
    } catch {
      setToast('No se pudo preparar la imagen. Revisa tu conexión.');
    } finally {
      setSharingId(null);
    }
  }, [sharingId, username]);

  return (
    <FullScreenView isOpen={isOpen} onClose={onClose} title="Workplace">
      {/*
        Tres estados en orden: sin promotoría se pide el código, con solicitud en
        curso se espera, y sólo después se ve el muro. El orden importa: al revés,
        un asesor recién llegado vería el formulario del código legado y no sabría
        que existe el suyo.
      */}
      {canJoinPromotoria ? (
        <JoinPromotoria />
      ) : isAwaitingPromotoria ? (
        <PromotoriaWaitingRoom title="El muro de comunicados" />
      ) : (
        <>
      {/*
        Vinculado: el nombre de la promotoría y la salida. El formulario del código
        desaparece porque ya no tiene nada que pedir, y dejarlo obligaba a
        preguntarse si había que escribir algo otra vez.

        Sin vínculo por la vía nueva se conserva la barra heredada: sigue siendo la
        puerta del modo promotor y de los códigos antiguos.
      */}
      {isLinkedToPromotoria ? (
        <PromotoriaBadge
          name={promotoriaName}
          onLeft={() => setToast('Te desvinculaste de la promotoría')}
        />
      ) : (
        <AccessBar onNotify={setToast} />
      )}

      {/*
        El muro es contenido de la promotoría: sin vínculo no se muestra nada,
        ni siquiera los comunicados de ejemplo. Así el código de invitación es
        lo único en pantalla y queda claro qué hace falta para entrar.
      */}
      {!isLinked ? (
        <LockedWall />
      ) : (
        <>
          {/* Publicar sólo existe para el promotor: el asesor únicamente lee */}
          {canPublish && (
            <button
              type="button"
              onClick={() => setPublishOpen(true)}
              className="mb-6 flex w-full items-center justify-center gap-2 rounded-xl
                         bg-indigo-600 px-4 py-3 text-sm font-semibold text-white shadow-lg
                         shadow-indigo-600/30 transition-all hover:bg-indigo-500
                         active:scale-[0.98]"
            >
              <PenSquare size={16} />
              Publicar comunicado
            </button>
          )}

          {isLoadingFeed && (
            <p className="py-8 text-center text-xs text-zinc-500">Cargando comunicados...</p>
          )}

          {/*
            Destacados: los ocho más recientes. Ocho y no todos porque la fila se
            arrastra con el pulgar, y pasadas ocho piezas es más rápido bajar por
            la lista completa que seguir empujando.
          */}
          {!isLoadingFeed && rawFeed.length > 1 && (
            <FeaturedRow
              items={rawFeed.slice(0, 8)}
              onSelect={(id) => {
                document.getElementById(`ann-${id}`)?.scrollIntoView({
                  behavior: 'smooth', block: 'center',
                });
              }}
            />
          )}

          {!isLoadingFeed && feed.length === 0 && (
            <div className="rounded-2xl border border-dashed border-zinc-300 px-6 py-12
                            text-center dark:border-zinc-700"
            >
              <span
                className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-full
                           bg-indigo-500/[0.07] text-indigo-400 ring-1 ring-inset
                           ring-indigo-500/20"
                aria-hidden="true"
              >
                <Inbox size={26} strokeWidth={1.7} />
              </span>

              <p className="text-sm font-semibold leading-relaxed text-zinc-600
                            dark:text-zinc-300"
              >
                {canPublish
                  ? 'Tu muro está vacío. Publica el primer comunicado y tu equipo lo verá aquí.'
                  : 'Esto está muy vacío. Tu promotoría todavía no ha publicado comunicados.'}
              </p>
            </div>
          )}

          {feed.map((announcement) => (
            /*
              El `id` en el DOM es lo que permite a los destacados traer aquí la
              vista. Se pone en una envoltura y no en la tarjeta para no obligar a
              `AnnouncementCard` a aceptar un `id` que sólo sirve para esto.
            */
            <div key={announcement.id} id={`ann-${announcement.id}`} className="scroll-mt-4">
            <AnnouncementCard
              announcement={announcement}
              isSharing={sharingId === announcement.id}
              onShare={(share) => handleShare(announcement.id, share)}
              canDelete={canPublish}
              onDelete={() => handleDelete(announcement.id)}
            />
            </div>
          ))}

          <PublishSheet
            isOpen={isPublishOpen}
            onClose={() => setPublishOpen(false)}
            onPublish={handlePublish}
          />
        </>
      )}

        </>
      )}

      <Toast message={toast} onDone={clearToast} />
    </FullScreenView>
  );
}
