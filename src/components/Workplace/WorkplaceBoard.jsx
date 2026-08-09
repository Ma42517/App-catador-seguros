import { useState, useCallback } from 'react';
import { Share2, FileText, Link2, Loader2 } from 'lucide-react';
import FullScreenView from '../Layout/FullScreenView';
import Toast from '../Layout/Toast';
import { readAdvisorProfile } from '../../data/advisorProfile';
import { stampWatermark } from '../../data/watermark';

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

/** Campo de vinculación: aún no operativo, se muestra como adelanto. */
function LinkPromoteria() {
  return (
    <div className="mb-6">
      <div
        className="flex items-center gap-3 rounded-xl border border-dashed border-zinc-300
                   bg-zinc-50 px-3 py-2.5 dark:border-zinc-700 dark:bg-zinc-900/60"
      >
        <Link2 size={16} className="shrink-0 text-zinc-400" aria-hidden="true" />
        <input
          type="text"
          disabled
          readOnly
          aria-label="Vincular promotoría con código de invitación"
          placeholder="¿Tienes un código de invitación?"
          className="min-w-0 flex-1 cursor-not-allowed bg-transparent text-sm text-zinc-500
                     placeholder:text-zinc-400 focus:outline-none dark:placeholder:text-zinc-500"
        />
        <span
          className="shrink-0 rounded-full border border-zinc-300 px-2 py-0.5 text-[10px]
                     font-semibold uppercase tracking-wide text-zinc-400
                     dark:border-zinc-700 dark:text-zinc-500"
        >
          Pronto
        </span>
      </div>
      <p className="mt-1.5 px-1 text-[11px] text-zinc-500">
        Vincular Promotoría para recibir sus comunicados.
      </p>
    </div>
  );
}

/** Tarjeta de anuncio. */
function AnnouncementCard({ announcement, onShare, isSharing }) {
  const { tag, tagTone, title, time, flyer, description, action, share } = announcement;
  const ActionIcon = action?.icon;

  return (
    <article
      className="mb-5 overflow-hidden rounded-2xl border border-zinc-200 bg-white p-5
                 dark:border-zinc-800 dark:bg-zinc-900"
    >
      <p className={`mb-1 text-xs font-bold ${tagTone}`}>{tag}</p>

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
  const [sharingId, setSharingId] = useState(null);
  const [toast, setToast] = useState('');

  const clearToast = useCallback(() => setToast(''), []);

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
      <LinkPromoteria />

      {ANNOUNCEMENTS.map((announcement) => (
        <AnnouncementCard
          key={announcement.id}
          announcement={announcement}
          isSharing={sharingId === announcement.id}
          onShare={(share) => handleShare(announcement.id, share)}
        />
      ))}

      <Toast message={toast} onDone={clearToast} />
    </FullScreenView>
  );
}
