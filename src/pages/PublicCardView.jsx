import { useState, useEffect, useCallback } from 'react';
import { Loader2, UserX } from 'lucide-react';
import DigitalCardPreview from '../components/Profile/DigitalCardPreview';
import LeadCaptureModal from '../components/Profile/LeadCaptureModal';
import Toast from '../components/Layout/Toast';
import { fetchPublicCard } from '../data/publicCardRepo';
import { createLead } from '../data/leadsRepo';
import { downloadVCard } from '../data/leads';

/**
 * La tarjeta de un asesor, vista por alguien que no ha entrado a la app.
 *
 * Es la única pantalla que se muestra sin sesión, y por eso no monta ninguno de
 * los proveedores de la aplicación —ni agenda, ni metas, ni permisos—: quien
 * abre este enlace no tiene cuenta, y cargar ese andamiaje sólo añadiría
 * consultas y superficie de fallo para dibujar una tarjeta.
 *
 * Tampoco hay barra inferior, menú ni acceso a editar. La tarjeta ocupa la
 * pantalla completa y no hay ningún camino desde aquí al resto de la app: si el
 * prospecto escribe otra dirección, la puerta de acceso lo manda al inicio de
 * sesión como a cualquier visitante.
 */
export default function PublicCardView({ advisorId }) {
  const [card, setCard] = useState(null);
  const [status, setStatus] = useState('loading');
  const [isCapturing, setCapturing] = useState(false);
  const [toast, setToast] = useState('');

  useEffect(() => {
    let alive = true;

    (async () => {
      const { card: found, error } = await fetchPublicCard(advisorId);
      if (!alive) return;

      if (error) {
        setStatus('error');
        return;
      }
      /*
        Una tarjeta sin nombre se trata como inexistente. Puede pasar con una
        cuenta recién creada que aún no llenó nada, y dibujar un marco vacío con
        textos de ejemplo haría creer que el enlace es el equivocado.
      */
      if (!found || !found.fullName.trim()) {
        setStatus('missing');
        return;
      }

      setCard(found);
      setStatus('ready');
    })();

    return () => { alive = false; };
  }, [advisorId]);

  /*
    El título de la pestaña se ajusta al asesor: este enlace se comparte, y una
    pestaña que dice "Diagnóstico Financiero 360" no ayuda a quien la guarda para
    volver luego.
  */
  useEffect(() => {
    if (status !== 'ready' || !card) return;
    document.title = `${card.fullName}${card.title ? ` · ${card.title}` : ''}`;
  }, [status, card]);

  /**
   * Cierre del intercambio: los datos del prospecto por el contacto del asesor.
   *
   * La descarga de la tarjeta de contacto ocurre incluso si la inserción falla, y
   * es deliberado: la otra persona ya cumplió su parte, y castigarla con las
   * manos vacías por un problema de red rompería el trato. El asesor pierde un
   * registro; el prospecto, no lo que vino a buscar.
   */
  const completeExchange = useCallback(async (lead) => {
    const { error } = await createLead(advisorId, lead);

    setCapturing(false);

    try {
      downloadVCard(card ?? {});
      setToast(error
        ? `Gracias, ${lead.name.split(' ')[0]}. Contacto descargado.`
        : `Listo, ${lead.name.split(' ')[0]}. Contacto descargado.`);
    } catch {
      setToast('No se pudo descargar el contacto. Guarda el número a mano.');
    }
  }, [advisorId, card]);

  if (status === 'loading') {
    return (
      <div className="grid min-h-screen place-items-center bg-black">
        <Loader2 size={22} className="animate-spin text-zinc-500" aria-hidden="true" />
        <span className="sr-only">Cargando la tarjeta</span>
      </div>
    );
  }

  if (status !== 'ready') {
    return (
      <div className="grid min-h-screen place-items-center bg-black px-6">
        <div className="max-w-xs text-center">
          <span
            className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl border
                       border-white/10 bg-white/5 text-zinc-400"
            aria-hidden="true"
          >
            <UserX size={26} />
          </span>
          <h1 className="text-base font-semibold text-white">
            Esta tarjeta no está disponible
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-zinc-400">
            {status === 'error'
              ? 'No pudimos cargarla. Revisa tu conexión e inténtalo de nuevo.'
              : 'El enlace puede estar incompleto o el asesor aún no publicó su tarjeta.'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[100dvh] w-full overflow-hidden bg-black">
      {/*
        En escritorio se dibuja la maqueta del teléfono; en un móvil la tarjeta
        ocupa todo, porque el aparato ya es el marco.
      */}
      <div className="relative h-full w-full sm:grid sm:place-items-center sm:bg-zinc-950">
        <div className="h-full w-full sm:h-[650px] sm:w-[320px] sm:overflow-hidden
                        sm:rounded-[2.5rem] sm:border-4 sm:border-zinc-800 sm:shadow-2xl"
        >
          {/*
            Sin `onExit`: la tarjeta no dibuja su flecha de salida porque aquí no
            hay ningún sitio al que volver. El giro al reverso y los paneles del
            QR y del video siguen teniendo sus propios controles.
          */}
          <DigitalCardPreview
            card={card}
            variant="fill"
            onAddContact={() => setCapturing(true)}
          />
        </div>
      </div>

      <LeadCaptureModal
        isOpen={isCapturing}
        onClose={() => setCapturing(false)}
        onSubmit={completeExchange}
        advisorName={(card.fullName || '').split(' ')[0]}
      />

      <Toast message={toast} onDone={() => setToast('')} />
    </div>
  );
}
