import { useState, useEffect, useCallback } from 'react';
import { Loader2, Pencil } from 'lucide-react';
import DigitalCardPreview from './DigitalCardPreview';
import LeadCaptureModal from './LeadCaptureModal';
import Toast from '../Layout/Toast';
import { saveLead, downloadVCard } from '../../data/leads';
import { useSession } from '../../context/SessionContext';
import { fetchProfile } from '../../data/profilesRepo';

/**
 * La tarjeta digital a pantalla completa.
 *
 * No usa la carcasa habitual de estas vistas a propósito: su cabecera con el
 * título "Mi Tarjeta Digital" y el botón "Volver" delataban que esto es una
 * pantalla de una app. Aquí el teléfono se gira hacia otra persona, y lo que
 * debe verse es la tarjeta, nada más.
 *
 * Para volver hay un botón redondo translúcido sobre la esquina. Va encima de la
 * foto y no en una barra: ocupa lo mínimo, se distingue sobre cualquier imagen
 * por el desenfoque y el filo claro, y sale del encuadre en cuanto la otra
 * persona mira la tarjeta.
 */
export default function DigitalCardScreen({ isOpen, onClose, onEdit }) {
  const { identity } = useSession();
  const [card, setCard] = useState(null);
  const [isLoading, setLoading] = useState(false);
  const [isCapturing, setCapturing] = useState(false);
  const [toast, setToast] = useState('');

  const load = useCallback(async () => {
    if (!identity?.key) return;
    setLoading(true);
    const { data } = await fetchProfile(identity.key);
    setLoading(false);

    // Aunque la lectura falle se muestra lo que se sabe por la sesión, en lugar
    // de una pantalla vacía delante de un prospecto.
    setCard({
      /*
        El identificador es lo que convierte la tarjeta en algo compartible: de
        él salen la dirección pública, el QR y el enlace del panel de compartir.
        Al construir este objeto campo por campo se había quedado fuera, y sin él
        el QR mostraba "guarda tu tarjeta" —aunque estuviera guardada— y el botón
        de compartir se dibujaba desactivado.

        Se cae a `identity.key`, que es el mismo valor: la sesión guarda ahí el
        `id` del perfil. Así la tarjeta sigue siendo compartible incluso si la
        lectura de la base falla, que es justo el caso en que esta pantalla se
        alimenta de la sesión.
      */
      id: data?.id || identity.key,
      fullName: data?.fullName || identity.name || '',
      title: data?.title || '',
      company: data?.company || '',
      specialties: data?.specialties || [],
      bio: data?.bio || '',
      phone: data?.phone || '',
      email: identity.email || '',
      whatsapp: data?.whatsapp || '',
      avatarUrl: data?.avatarUrl || identity.avatarUrl || '',
      photoFocus: data?.photoFocus || '',
    });
  }, [identity]);

  useEffect(() => {
    if (isOpen) load();
  }, [isOpen, load]);

  // Cerrar con Escape y congelar el scroll del fondo, igual que el resto de las
  // pantallas completas.
  useEffect(() => {
    if (!isOpen) return undefined;
    const onKeyDown = (event) => { if (event.key === 'Escape') onClose(); };
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previous;
    };
  }, [isOpen, onClose]);

  /**
   * Cierra el intercambio: guarda al prospecto y entrega el contacto.
   *
   * El orden importa. Primero se guarda y después se descarga: si la descarga
   * falla —un navegador que la bloquea— el asesor al menos se queda con el dato
   * de la persona, que es lo que no se puede recuperar después.
   */
  const completeExchange = useCallback(async (lead) => {
    saveLead(identity?.key, lead);
    setCapturing(false);

    try {
      downloadVCard(card ?? {});
      setToast(`Gracias, ${lead.name.split(' ')[0]}. Contacto descargado.`);
    } catch {
      setToast('Tus datos quedaron guardados, pero el contacto no se pudo descargar.');
    }
  }, [identity, card]);

  const clearToast = useCallback(() => setToast(''), []);

  if (!isOpen) return null;

  /*
    "Vacía" se mide por los campos que la persona tiene que llenar, no por el
    nombre: ese se deduce del correo cuando falta, así que nunca está vacío y el
    atajo para completarla no llegaría a aparecer nunca.
  */
  const isEmpty = card
    && !card.title && !card.avatarUrl && !card.bio && !card.company;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Mi tarjeta digital"
      className="animate-rise fixed inset-0 z-[75] bg-black"
    >
      {/*
        En escritorio la tarjeta se centra con su maqueta de celular; en un
        teléfono ocupa la pantalla completa, porque el dispositivo ya es el marco.
      */}
      <div className="relative h-full w-full sm:grid sm:place-items-center sm:bg-zinc-950">
        <div className="h-full w-full sm:h-[650px] sm:w-[320px] sm:overflow-hidden
                        sm:rounded-[2.5rem] sm:border-4 sm:border-zinc-800 sm:shadow-2xl"
        >
          {isLoading || !card ? (
            <p className="grid h-full place-items-center text-sm text-zinc-400">
              <Loader2 size={20} className="animate-spin" />
            </p>
          ) : (
            /*
              El botón de retroceso lo dibuja la tarjeta, no esta pantalla.
              Vive donde vive el estado de sus capas —QR, video, cara volteada—,
              que es lo único que permite decidir si toca cerrar lo de encima o
              salir de verdad. Desde aquí sólo se le dice qué significa "salir".
            */
            <DigitalCardPreview
              card={card}
              variant="fill"
              onAddContact={() => setCapturing(true)}
              onExit={onClose}
            />
          )}
        </div>
      </div>

      {/*
        El acceso a editar sólo aparece si la tarjeta está vacía: con datos, esta
        pantalla es para mostrar, y editar vive en Mi Perfil. Sin este atajo, una
        tarjeta recién creada sería un callejón sin salida.
      */}
      <LeadCaptureModal
        isOpen={isCapturing}
        onClose={() => setCapturing(false)}
        onSubmit={completeExchange}
        advisorName={(card?.fullName || '').split(' ')[0]}
      />

      <Toast message={toast} onDone={clearToast} />

      {isEmpty && (
        <button
          type="button"
          onClick={onEdit}
          className="absolute inset-x-6 bottom-24 z-30 flex items-center justify-center gap-2
                     rounded-xl bg-white/95 px-4 py-3.5 text-sm font-semibold text-zinc-900
                     shadow-xl backdrop-blur transition-transform active:scale-[0.98]"
        >
          <Pencil size={15} />
          Completar mi tarjeta
        </button>
      )}
    </div>
  );
}
