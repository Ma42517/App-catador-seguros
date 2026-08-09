import { useState, useEffect, useCallback } from 'react';
import { Share2, FileText, Loader2, PenSquare, Trash2, Lock } from 'lucide-react';
import FullScreenView from '../Layout/FullScreenView';
import Toast from '../Layout/Toast';
import AccessBar from '../Access/AccessBar';
import PublishSheet from './PublishSheet';
import { readAdvisorProfile } from '../../data/advisorProfile';
import { stampWatermark } from '../../data/watermark';
import { useAccess } from '../../context/AccessContext';
import {
  readAnnouncements, addAnnouncement, removeAnnouncement, TAGS, relativeTime,
} from '../../data/announcements';

/** Imagen de prueba mientras la promotoría no suba flyers reales. */
const FLYER_IMAGE_URL = 'https://picsum.photos/800/1200';
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
 * Comunicados de la promotoría. El tablero es unidireccional —el asesor lee,
 * no responde—, así que cada entrada es un anuncio con su etiqueta, su fecha y
 * a lo sumo un archivo adjunto.
 */
const ANNOUNCEMENTS = [
  {
    id: 'campana-vida-gmm',
    tag: '📌 IMPORTANTE',
    tagTone: 'text-rose-500 dark:text-rose-400',
    title: 'Nueva Campaña de Vida y Gastos Médicos',
    time: 'Hace 2 horas',
    flyer: '[Flyer de la Campaña]',
    share: {
      imageUrl: FLYER_IMAGE_URL,
      fileName: FLYER_FILE_NAME,
      title: 'Promoción',
      text: '¡Revisa esto!',
    },
  },
  {
    id: 'bases-convencion-2026',
    tag: '📄 BASES',
    tagTone: 'text-blue-600 dark:text-blue-400',
    title: 'Actualización: Bases Convención 2026',
    time: 'Ayer',
    description:
      'Revisa los nuevos lineamientos de primas pagadas para calificar al viaje.',
    action: { label: 'Leer Documento', icon: FileText },
  },
];



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
  const { tag, tagTone, title, time, flyer, description, action, share } = announcement;
  const ActionIcon = action?.icon;

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

      {flyer && (
        <div
          className="mt-3 flex h-40 w-full items-center justify-center rounded-lg bg-zinc-100
                     text-sm text-zinc-500 dark:bg-zinc-800"
        >
          {flyer}
        </div>
      )}

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

      {action && (
        <button
          type="button"
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border
                     border-zinc-200 bg-zinc-50 px-4 py-2.5 text-sm font-semibold text-zinc-700
                     transition-colors hover:bg-zinc-100 active:scale-[0.98]
                     dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200
                     dark:hover:bg-zinc-700/70"
        >
          {ActionIcon && <ActionIcon size={16} />}
          {action.label}
        </button>
      )}
    </article>
  );
}

/** Tablero de anuncios de la promotoría. */
export default function WorkplaceBoard({ isOpen, onClose, username }) {
  const { isLinked, isPromoter } = useAccess();
  const [sharingId, setSharingId] = useState(null);
  const [toast, setToast] = useState('');
  const [isPublishOpen, setPublishOpen] = useState(false);
  const [published, setPublished] = useState([]);

  // Se releen al abrir para reflejar lo que se haya publicado entretanto.
  useEffect(() => {
    if (isOpen) setPublished(readAnnouncements());
  }, [isOpen]);

  const clearToast = useCallback(() => setToast(''), []);

  const handlePublish = useCallback((draft) => {
    addAnnouncement(draft);
    setPublished(readAnnouncements());
    setToast('Comunicado publicado al equipo');
  }, []);

  const handleDelete = useCallback((id) => {
    removeAnnouncement(id);
    setPublished(readAnnouncements());
  }, []);

  /*
    Los comunicados del promotor van arriba de los de ejemplo: lo recién
    publicado es lo que el asesor debe ver primero al abrir el tablero.
  */
  const feed = [
    ...published.map((a) => ({
      id: a.id,
      tag: TAGS[a.tag].label,
      tagTone: TAGS[a.tag].tone,
      title: a.title,
      time: relativeTime(a.createdAt),
      description: a.description || undefined,
      publishedByPromoter: true,
    })),
    ...ANNOUNCEMENTS,
  ];

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
      <AccessBar onNotify={setToast} />

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
          {isPromoter && (
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

          {feed.map((announcement) => (
            <AnnouncementCard
              key={announcement.id}
              announcement={announcement}
              isSharing={sharingId === announcement.id}
              onShare={(share) => handleShare(announcement.id, share)}
              canDelete={isPromoter && announcement.publishedByPromoter}
              onDelete={() => handleDelete(announcement.id)}
            />
          ))}

          <PublishSheet
            isOpen={isPublishOpen}
            onClose={() => setPublishOpen(false)}
            onPublish={handlePublish}
          />
        </>
      )}

      <Toast message={toast} onDone={clearToast} />
    </FullScreenView>
  );
}
