import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Save, Loader2, ImagePlus, X, Check, AlertTriangle, User, Mail, Phone, Building2,
  BadgeCheck, Sparkles, Video,
} from 'lucide-react';
import FullScreenView from '../Layout/FullScreenView';
import DigitalCardPreview from './DigitalCardPreview';
import { useSession } from '../../context/SessionContext';
import { fetchProfile, saveMyCard, describeError } from '../../data/profilesRepo';
import { uploadAttachment } from '../../data/announcementsRepo';
import ImageCropperModal from './ImageCropperModal';
import { readImageFile, dataUrlToFile } from '../../data/cardPhoto';
import { isEmbeddableVideoUrl } from '../../data/videoEmbed';
import { saveAdvisorProfile } from '../../data/advisorProfile';

const INPUT =
  'w-full rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-900 '
  + 'placeholder:text-zinc-400 transition-colors focus:border-indigo-500 focus:outline-none '
  + 'focus:ring-2 focus:ring-indigo-500 dark:border-zinc-700 dark:bg-zinc-950/60 '
  + 'dark:text-zinc-100 dark:placeholder:text-zinc-600';

const LABEL = 'mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-zinc-500';

/** Títulos sugeridos. Es un `datalist`: sugiere sin obligar. */
const TITLE_SUGGESTIONS = [
  'Consultor Financiero Patrimonial',
  'Especialista en Retiro',
  'Agente de Seguros',
  'Asesor Patrimonial Certificado',
  'Consultor en Protección Familiar',
];

const SPECIALTIES = [
  'Vida', 'GMM', 'Ahorro', 'Retiro', 'Educativo', 'Inversiones', 'Empresarial', 'Auto',
];

/** Cuántas etiquetas caben en la tarjeta sin que el bloque se desborde. */
const MAX_SPECIALTIES = 3;

const EMPTY_CARD = {
  fullName: '', title: '', license: '', company: '',
  specialties: [], bio: '', phone: '', email: '', whatsapp: '', avatarUrl: '',
  presentationVideoUrl: '',
};

/** Campo de texto con icono, para que el formulario se lea de un barrido. */
function Field({ id, label, icon: Icon, hint, children }) {
  return (
    <div>
      <label className={LABEL} htmlFor={id}>
        <span className="inline-flex items-center gap-1.5">
          {Icon && <Icon size={12} aria-hidden="true" />}
          {label}
        </span>
      </label>
      {children}
      {hint && <p className="mt-1 text-[11px] text-zinc-500">{hint}</p>}
    </div>
  );
}

/**
 * Edición de la tarjeta digital. Se entra desde Mi Perfil.
 *
 * Pantalla partida: el formulario a la izquierda y la tarjeta a la derecha. Un
 * solo estado alimenta las dos columnas, así que lo escrito aparece al momento:
 * es la única forma de decidir si un título cabe o si la biografía es larga.
 *
 * Mostrar la tarjeta es otra pantalla (`DigitalCardScreen`), sin cabecera y a
 * pantalla completa. Aquí sí hay cabecera y botones: esto es capturar datos, no
 * presentarse.
 *
 * En celular las columnas se apilan y la vista previa va primero: sin verla, el
 * formulario es una lista de campos sin contexto.
 */
export default function DigitalCardBuilder({ isOpen, onClose }) {
  const { identity, refreshIdentity } = useSession();

  const [card, setCard] = useState(EMPTY_CARD);
  const [isLoading, setLoading] = useState(false);
  const [isSaving, setSaving] = useState(false);
  const [isUploading, setUploading] = useState(false);

  // Imagen elegida en espera de encuadre. Mientras exista, se muestran los
  // controles: subir antes de ajustar obligaría a repetir la subida.
  const [pendingImage, setPendingImage] = useState(null);
  const [status, setStatus] = useState(null);
  const fileRef = useRef(null);

  /*
    Última versión confirmada de la tarjeta: lo que se leyó de la base o lo que
    se acabó de guardar. "Cancelar" restaura desde aquí. Sin esta copia, salir
    de la edición dejaba los cambios en pantalla y el botón prometía algo que no
    hacía.
  */
  const savedRef = useRef(EMPTY_CARD);

  const setField = (key) => (event) => {
    setCard((prev) => ({ ...prev, [key]: event.target.value }));
    setStatus(null);
  };

  /** Carga la ficha guardada; el correo sale de la sesión, no se captura. */
  const load = useCallback(async () => {
    if (!identity?.key) return;
    setLoading(true);
    const { data, error } = await fetchProfile(identity.key);
    setLoading(false);

    /*
      Aunque la lectura falle se siembra lo que ya se sabe por la sesión. Salir
      aquí dejaba el formulario en blanco —sin nombre ni correo— y parecía que la
      cuenta no tuviera datos, cuando el problema era la consulta.
    */
    if (error) setStatus({ type: 'error', message: describeError(error) });

    const loaded = {
      ...EMPTY_CARD,
      ...(data ?? {}),
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
   * El fondo de la tarjeta es vertical y mucho más alto que ancho, así que una
   * foto normal necesita decidir qué parte se conserva. Subir antes de eso
   * llevaría a descubrir el recorte malo cuando ya está guardado. Aquí sólo se
   * lee el archivo a una URL de datos; el recorte real ocurre en el modal.
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

  /** Sube el recorte confirmado, que ya viene en la proporción de la tarjeta. */
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

    /*
      Guardar devuelve a presentación. Es lo que se quiere hacer justo después de
      terminar de capturar, y ahorra un toque de más en el momento en que la
      persona ya tiene el prospecto delante.
    */
    savedRef.current = card;

    /*
      Se relee la identidad de la sesión: el nombre con el que la app saluda sale
      de esta misma ficha, y sin refrescar seguiría mostrando el anterior —o el
      correo— hasta que la persona recargara.
    */
    refreshIdentity();
    setStatus({ type: 'ok', message: 'Tarjeta guardada.' });
  };

  const busy = isSaving || isUploading;

  return (
    <FullScreenView
      isOpen={isOpen}
      onClose={onClose}
      title="Editar mi tarjeta"
      label="Editar mi tarjeta digital"
      wide
    >
      {status && (
        <p
          role={status.type === 'error' ? 'alert' : 'status'}
          className={`mb-5 flex items-start gap-2 rounded-xl border p-3 text-xs leading-relaxed
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

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        {/* ── Vista previa. Va primero en el orden del documento para que en
              celular aparezca arriba, y se reordena en escritorio. ── */}
        <div className="lg:order-2">
          <div className="lg:sticky lg:top-20">
            <p className="mb-3 text-center text-[11px] font-semibold uppercase tracking-wider
                          text-zinc-500"
            >
              Así la verá tu prospecto
            </p>
            <DigitalCardPreview card={card} />
          </div>
        </div>

        {/* ── Formulario ── */}
        <div className="lg:order-1">
          {isLoading ? (
            <p className="flex items-center gap-2 py-10 text-sm text-zinc-500">
              <Loader2 size={16} className="animate-spin" />
              Cargando tu tarjeta...
            </p>
          ) : (
            <div className="flex flex-col gap-4">
              {/* Foto */}
              <Field label="Foto de perfil" icon={ImagePlus} id="card-photo">
                <input
                  ref={fileRef}
                  id="card-photo"
                  type="file"
                  accept="image/*"
                  onChange={pickPhoto}
                  disabled={busy}
                  className="peer sr-only"
                />
                <div className="flex items-center gap-3">
                  {card.avatarUrl && (
                    <span className="relative shrink-0">
                      <img
                        src={card.avatarUrl}
                        alt="Tu foto"
                        className="h-16 w-16 rounded-xl object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => setCard((prev) => ({ ...prev, avatarUrl: '' }))}
                        aria-label="Quitar foto"
                        className="absolute -right-1.5 -top-1.5 grid h-6 w-6 place-items-center
                                   rounded-full bg-zinc-900 text-white transition-colors
                                   hover:bg-rose-500"
                      >
                        <X size={12} />
                      </button>
                    </span>
                  )}

                  {/* El botón nativo se rotula en el idioma del navegador y no
                      se puede traducir; la etiqueta hace de disparador. */}
                  <label
                    htmlFor="card-photo"
                    className={`flex flex-1 cursor-pointer items-center justify-center gap-2
                                rounded-xl border border-dashed border-zinc-300 py-5 text-xs
                                font-semibold text-zinc-500 transition-colors
                                hover:border-indigo-500 hover:text-indigo-500
                                peer-focus-visible:border-indigo-500
                                dark:border-zinc-700
                                ${busy ? 'pointer-events-none opacity-60' : ''}`}
                  >
                    {isUploading
                      ? <><Loader2 size={15} className="animate-spin" /> Subiendo...</>
                      : <><ImagePlus size={15} /> {card.avatarUrl ? 'Cambiar foto' : 'Elegir foto'}</>}
                  </label>
                </div>

              </Field>

              <Field label="Nombre completo" icon={User} id="card-name">
                <input
                  id="card-name"
                  className={INPUT}
                  value={card.fullName}
                  onChange={setField('fullName')}
                  placeholder="Marco Antonio Ramírez"
                  autoComplete="name"
                />
              </Field>

              <Field
                label="Título de alto impacto"
                icon={Sparkles}
                id="card-title"
                hint="Escribe el tuyo o elige una sugerencia."
              >
                <input
                  id="card-title"
                  className={INPUT}
                  value={card.title}
                  onChange={setField('title')}
                  placeholder="Consultor Financiero Patrimonial"
                  list="card-title-options"
                  autoComplete="off"
                />
                <datalist id="card-title-options">
                  {TITLE_SUGGESTIONS.map((option) => <option key={option} value={option} />)}
                </datalist>
              </Field>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Cédula profesional" icon={BadgeCheck} id="card-license">
                  <input
                    id="card-license"
                    className={INPUT}
                    value={card.license}
                    onChange={setField('license')}
                    placeholder="123456"
                    autoComplete="off"
                  />
                </Field>

                <Field label="Empresa / Promotoría" icon={Building2} id="card-company">
                  <input
                    id="card-company"
                    className={INPUT}
                    value={card.company}
                    onChange={setField('company')}
                    placeholder="Promotoría Central"
                    autoComplete="organization"
                  />
                </Field>
              </div>

              {/* Especialidades */}
              <div>
                <span className={LABEL}>
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

              {/*
                Video de presentación. Se guarda el enlace y no el archivo: un
                video pesa cientos de megas y se ve unas pocas veces, así que
                subirlo gastaría el almacenamiento del proyecto para hacer peor
                lo que YouTube y Vimeo ya hacen.
              */}
              <Field
                label="Video de presentación"
                icon={Video}
                id="card-video"
                hint="Pega el enlace de YouTube o Vimeo. Aparecerá como un anillo animado sobre tu foto."
              >
                <input
                  id="card-video"
                  className={INPUT}
                  value={card.presentationVideoUrl}
                  onChange={setField('presentationVideoUrl')}
                  placeholder="https://youtu.be/..."
                  inputMode="url"
                  autoComplete="off"
                  spellCheck="false"
                />

                {/*
                  El aviso salta en cuanto el enlace no sirve para incrustarse.
                  Sin él, el asesor pegaría una dirección de un canal o una lista
                  de reproducción, no vería el anillo en la tarjeta y no tendría
                  forma de saber que el problema es el enlace y no la app.
                */}
                {card.presentationVideoUrl.trim()
                  && !isEmbeddableVideoUrl(card.presentationVideoUrl) && (
                  <p className="mt-1.5 flex items-start gap-1.5 text-[11px] text-amber-500 dark:text-amber-400">
                    <AlertTriangle size={12} className="mt-0.5 shrink-0" aria-hidden="true" />
                    Ese enlace no se puede reproducir dentro de la tarjeta. Usa la
                    dirección de un video de YouTube o Vimeo, como
                    {' '}
                    <span className="font-semibold">youtu.be/abc123</span>.
                  </p>
                )}
              </Field>

              <Field label="Sobre mí" id="card-bio" hint="Dos o tres líneas. En la tarjeta hay poco espacio.">
                <textarea
                  id="card-bio"
                  rows={3}
                  maxLength={240}
                  className={`${INPUT} resize-none`}
                  value={card.bio}
                  onChange={setField('bio')}
                  placeholder="Ayudo a familias a proteger su patrimonio y a planear su retiro con claridad."
                />
              </Field>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <Field label="Teléfono" icon={Phone} id="card-phone">
                  <input
                    id="card-phone"
                    className={INPUT}
                    value={card.phone}
                    onChange={setField('phone')}
                    placeholder="5512345678"
                    inputMode="tel"
                    autoComplete="tel"
                  />
                </Field>

                <Field label="WhatsApp" icon={Phone} id="card-whatsapp">
                  <input
                    id="card-whatsapp"
                    className={INPUT}
                    value={card.whatsapp}
                    onChange={setField('whatsapp')}
                    placeholder="525512345678"
                    inputMode="tel"
                  />
                </Field>

                <Field label="Correo" icon={Mail} id="card-email">
                  <input
                    id="card-email"
                    className={`${INPUT} disabled:opacity-70`}
                    value={card.email}
                    disabled
                    readOnly
                  />
                </Field>
              </div>

              <p className="text-[11px] leading-relaxed text-zinc-500">
                El correo es el de tu cuenta y no se edita aquí: cambiarlo separaría
                la tarjeta de la sesión con la que entras.
              </p>

              <div className="mt-1 flex gap-3">
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
        </div>
      </div>

      {/*
        El recortador es una pantalla propia, encima de todo: necesita el
        espacio completo para que arrastrar y acercar la foto se sienta natural,
        y anidarlo dentro del formulario lo encogería justo cuando más espacio
        necesita.
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
