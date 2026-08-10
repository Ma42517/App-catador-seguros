import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Save, Loader2, Check, AlertTriangle, Sparkles,
} from 'lucide-react';
import FullScreenView from '../Layout/FullScreenView';
import DigitalCardPreview from './DigitalCardPreview';
import ContactDrawer from './ContactDrawer';
import ImageCropperModal from './ImageCropperModal';
import { useSession } from '../../context/SessionContext';
import { fetchProfile, saveMyCard, describeError } from '../../data/profilesRepo';
import { uploadAttachment } from '../../data/announcementsRepo';
import { readImageFile, dataUrlToFile } from '../../data/cardPhoto';
import { saveAdvisorProfile } from '../../data/advisorProfile';

const SPECIALTIES = [
  'Vida', 'GMM', 'Ahorro', 'Retiro', 'Educativo', 'Inversiones', 'Empresarial', 'Auto',
];

/** Cuántas etiquetas caben en la tarjeta sin que el bloque se desborde. */
const MAX_SPECIALTIES = 3;

const EMPTY_CARD = {
  id: '',
  fullName: '', title: '', company: '',
  specialties: [], bio: '', phone: '', email: '', whatsapp: '', avatarUrl: '',
};

/**
 * Editor de la tarjeta digital: se escribe encima de la tarjeta.
 *
 * Antes había un formulario a un lado y la tarjeta al otro. Funcionaba, pero
 * obligaba a traducir todo el tiempo: se escribía en un campo llamado "Título de
 * alto impacto" y había que mirar a la derecha para ver si cabía, si se cortaba,
 * si pesaba demasiado junto al nombre. Con el texto editable en su sitio, esa
 * traducción desaparece —lo que se escribe ya está en su tamaño, su color y su
 * ancho definitivo—.
 *
 * Queda fuera de la tarjeta lo que la tarjeta no muestra como texto: los números
 * de contacto, que viven en los botones redondos, y las especialidades, que son
 * una lista cerrada y se eligen, no se escriben.
 *
 * Guardar es explícito y no automático. Es la tarjeta con la que alguien se
 * presenta: escribir a medias el título y que eso quede publicado al instante,
 * sin haberlo decidido, sería peor que tener que pulsar un botón.
 */
export default function DigitalCardBuilder({ isOpen, onClose }) {
  const { identity, refreshIdentity } = useSession();

  const [card, setCard] = useState(EMPTY_CARD);
  const [isLoading, setLoading] = useState(false);
  const [isSaving, setSaving] = useState(false);
  const [isUploading, setUploading] = useState(false);

  // Imagen elegida en espera de recorte. Mientras exista, se muestra el
  // recortador: subir antes de encuadrar obligaría a repetir la subida.
  const [pendingImage, setPendingImage] = useState(null);
  const [status, setStatus] = useState(null);
  const fileRef = useRef(null);

  /*
    Última versión confirmada: lo que se leyó de la base o lo que se acabó de
    guardar. "Cancelar" restaura desde aquí. Sin esta copia, salir de la edición
    dejaba los cambios en pantalla y el botón prometía algo que no hacía.
  */
  const savedRef = useRef(EMPTY_CARD);

  /** Un solo manejador para todos los campos, venga de la tarjeta o del panel. */
  const setField = useCallback((key, value) => {
    setCard((prev) => ({ ...prev, [key]: value }));
    setStatus(null);
  }, []);

  const load = useCallback(async () => {
    if (!identity?.key) return;
    setLoading(true);
    const { data, error } = await fetchProfile(identity.key);
    setLoading(false);

    /*
      Aunque la lectura falle se siembra lo que ya se sabe por la sesión. Salir
      aquí dejaba el editor en blanco —sin nombre ni correo— y parecía que la
      cuenta no tuviera datos, cuando el problema era la consulta.
    */
    if (error) setStatus({ type: 'error', message: describeError(error) });

    const loaded = {
      ...EMPTY_CARD,
      ...(data ?? {}),
      // Sin identificador no hay dirección pública, y sin ella el QR y el panel
      // de compartir no tienen nada que entregar.
      id: data?.id || identity.key,
      fullName: data?.fullName || identity.name || '',
      email: identity.email || '',
      avatarUrl: data?.avatarUrl || identity.avatarUrl || '',
    };
    savedRef.current = loaded;
    setCard(loaded);
  }, [identity]);

  useEffect(() => {
    if (!isOpen) return;
    setStatus(null);
    load();
  }, [isOpen, load]);

  const toggleSpecialty = (item) => {
    setStatus(null);
    setCard((prev) => {
      const has = prev.specialties.includes(item);
      if (has) {
        return { ...prev, specialties: prev.specialties.filter((s) => s !== item) };
      }
      // Al llegar al tope no se ignora el toque en silencio: se avisa por qué.
      if (prev.specialties.length >= MAX_SPECIALTIES) {
        setStatus({
          type: 'error',
          message: `Puedes elegir hasta ${MAX_SPECIALTIES} especialidades. Quita una para cambiarla.`,
        });
        return prev;
      }
      return { ...prev, specialties: [...prev.specialties, item] };
    });
  };

  /**
   * Al elegir una foto no se sube: primero se encuadra.
   *
   * El retrato ocupa una zona concreta de la tarjeta, más alta que ancha, y una
   * foto cualquiera no encaja ahí por sí sola. Subir antes de recortar llevaría a
   * descubrir el mal encuadre cuando ya está guardado.
   */
  const pickPhoto = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setStatus(null);
    try {
      setPendingImage(await readImageFile(file));
    } catch (error) {
      setStatus({ type: 'error', message: error.message });
    } finally {
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  /** Sube el recorte confirmado, que ya viene en la proporción del retrato. */
  const uploadFramed = async (dataUrl) => {
    setUploading(true);
    try {
      const file = await dataUrlToFile(dataUrl, `foto-${Date.now()}.jpg`);
      const upload = await uploadAttachment(file, 'perfiles');

      if (upload.error) {
        setStatus({ type: 'error', message: describeError(upload.error) });
        return;
      }
      setCard((prev) => ({ ...prev, avatarUrl: upload.url }));
      setPendingImage(null);
      setStatus({ type: 'ok', message: 'Foto lista. Recuerda guardar la tarjeta.' });
    } catch (error) {
      setStatus({ type: 'error', message: error.message });
    } finally {
      setUploading(false);
    }
  };

  const save = async () => {
    if (!card.fullName.trim()) {
      setStatus({ type: 'error', message: 'La tarjeta necesita tu nombre.' });
      return;
    }

    setSaving(true);
    const { error } = await saveMyCard(identity.key, card);
    setSaving(false);

    if (error) {
      setStatus({ type: 'error', message: describeError(error) });
      return;
    }

    /*
      El nombre y el teléfono se copian también al perfil local de la marca de
      agua. Sin esto habría que capturarlos dos veces —aquí y en Mi Perfil— para
      que los flyers salieran firmados.
    */
    saveAdvisorProfile(identity.key, {
      displayName: card.fullName.trim(),
      phone: card.phone.trim(),
    });

    savedRef.current = card;
    refreshIdentity();
    setStatus({ type: 'ok', message: 'Tarjeta guardada.' });
  };

  const busy = isSaving || isUploading;

  return (
    <FullScreenView
      isOpen={isOpen}
      onClose={onClose}
      title="Mi tarjeta"
      label="Editar mi tarjeta digital"
    >
      {/* El archivo se elige desde la propia foto de la tarjeta. */}
      <input
        ref={fileRef}
        id="card-photo"
        type="file"
        accept="image/*"
        onChange={pickPhoto}
        disabled={busy}
        className="sr-only"
      />

      {status && (
        <p
          role={status.type === 'error' ? 'alert' : 'status'}
          className={`mb-4 flex items-start gap-2 rounded-xl border p-3 text-xs leading-relaxed
            ${status.type === 'error'
              ? 'border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-rose-300'
              : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'}`}
        >
          {status.type === 'error'
            ? <AlertTriangle size={14} className="mt-0.5 shrink-0" aria-hidden="true" />
            : <Check size={14} className="mt-0.5 shrink-0" aria-hidden="true" />}
          {status.message}
        </p>
      )}

      {isLoading ? (
        <p className="flex items-center gap-2 py-16 text-sm text-zinc-500">
          <Loader2 size={16} className="animate-spin" />
          Cargando tu tarjeta...
        </p>
      ) : (
        /*
          `pb-28` deja libre el alto del botón flotante. Sin ese hueco, el último
          bloque queda debajo del botón y no se puede alcanzar.
        */
        <div className="flex flex-col gap-5 pb-28">
          <p className="flex items-start gap-1.5 text-center text-[11px] leading-relaxed
                        text-zinc-500"
          >
            <Sparkles size={12} className="mt-0.5 shrink-0 text-indigo-400" aria-hidden="true" />
            Toca cualquier texto de la tarjeta para escribirlo, o toca tu foto para
            cambiarla.
          </p>

          {/* La tarjeta es el editor. */}
          <DigitalCardPreview
            card={card}
            editable
            onChange={setField}
            onPickPhoto={() => fileRef.current?.click()}
          />

          {/*
            Las especialidades no se editan sobre la tarjeta: son una lista
            cerrada con un tope de tres, y eso se elige tocando, no escribiendo.
            Dentro de la tarjeta habría que inventar un gesto para quitarlas.
          */}
          <div>
            <span className="mb-2 block text-[11px] font-semibold uppercase tracking-wider
                             text-zinc-500"
            >
              Especialidades
              <span className="ml-1 normal-case tracking-normal text-zinc-400">
                ({card.specialties.length} de {MAX_SPECIALTIES})
              </span>
            </span>

            <div role="group" aria-label="Especialidades" className="flex flex-wrap gap-2">
              {SPECIALTIES.map((item) => {
                const active = card.specialties.includes(item);
                const full = card.specialties.length >= MAX_SPECIALTIES;
                return (
                  <button
                    key={item}
                    type="button"
                    aria-pressed={active}
                    onClick={() => toggleSpecialty(item)}
                    className={`rounded-full border px-3 py-1.5 text-xs font-semibold
                      transition-all active:scale-95
                      ${active
                        ? 'border-indigo-500 bg-indigo-500/10 text-indigo-600 dark:text-indigo-300'
                        : `border-zinc-200 text-zinc-500 dark:border-zinc-700
                           ${full ? 'opacity-40' : 'hover:border-zinc-400'}`}`}
                  >
                    {item}
                  </button>
                );
              })}
            </div>
          </div>

          <ContactDrawer card={card} onChange={setField} />
        </div>
      )}

      {/*
        Guardar flota sobre el contenido: se llega a él desde cualquier punto del
        editor, sin tener que bajar hasta el final. En una pantalla donde se toca
        texto por todas partes, obligar a buscar el botón es la forma más fácil de
        perder los cambios.

        `fixed` y no `sticky` porque esta pantalla se desplaza dentro de su propio
        contenedor: con `sticky` el botón se quedaría anclado a un bloque y
        desaparecería al llegar al final.
      */}
      {!isLoading && (
        <div
          className="fixed inset-x-0 bottom-0 z-20 border-t border-zinc-200/70
                     bg-white/85 px-4 pb-6 pt-3 backdrop-blur-md
                     dark:border-zinc-800 dark:bg-zinc-950/85"
        >
          <div className="mx-auto flex max-w-md gap-3">
            <button
              type="button"
              onClick={() => {
                // Descarta lo escrito y cierra sin guardar.
                setCard(savedRef.current);
                setStatus(null);
                onClose();
              }}
              disabled={busy}
              className="rounded-xl border border-zinc-300 px-4 py-3.5 text-sm font-semibold
                         text-zinc-600 transition-colors hover:bg-zinc-100
                         disabled:opacity-60 dark:border-zinc-700 dark:text-zinc-300
                         dark:hover:bg-zinc-900"
            >
              Cancelar
            </button>

            <button
              type="button"
              onClick={save}
              disabled={busy}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl
                         bg-indigo-600 px-4 py-3.5 text-base font-semibold text-white
                         shadow-lg shadow-indigo-600/30 transition-all hover:bg-indigo-500
                         active:scale-[0.98] disabled:cursor-wait disabled:opacity-60"
            >
              {isSaving ? <Loader2 size={17} className="animate-spin" /> : <Save size={17} />}
              {isSaving ? 'Guardando...' : 'Guardar Tarjeta'}
            </button>
          </div>
        </div>
      )}

      {/*
        El recortador es una pantalla propia, encima de todo: necesita el espacio
        completo para que arrastrar y acercar la foto se sienta natural.
      */}
      {pendingImage && (
        <ImageCropperModal
          imageSrc={pendingImage}
          isUploading={isUploading}
          onConfirm={uploadFramed}
          onCancel={() => setPendingImage(null)}
        />
      )}
    </FullScreenView>
  );
}
