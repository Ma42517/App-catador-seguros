import { useRef, useState } from 'react';
import {
  AlignLeft, ArrowLeft, BadgeCheck, Briefcase, Building2, CalendarCheck, Check, Copy, Crop, Eye,
  IdCard, ImageUp, LayoutTemplate, Lightbulb, Loader2, LogOut, Mail, MapPin, Megaphone,
  MessageCircle, Phone, Share2, Tags, UserRound, X,
} from 'lucide-react';
import { getGiftCardSupabase } from '../../lib/supabaseClient';
import { giftCardUrl } from '../../lib/giftCardRoute';
import { saveGiftCard, uploadGiftCardPhoto } from '../../data/giftCardsRepo';
import { readImageFile, shrinkImageForUpload, dataUrlToFile } from '../../data/cardPhoto';
import { whatsAppLink } from '../../lib/advisorPhone';
import { MAX_PILDORAS, toSavePatch } from '../../data/cardData';
import DigitalCard from './DigitalCard';
import PhotoCropModal from './PhotoCropModal';

/*
  Panel del cliente en TEMA CLARO.

  La tarjeta es negra por diseño aprobado y no se toca; el panel que la edita, en
  cambio, era negro también y eso hacía que formulario y tarjeta se fundieran en
  una sola masa oscura: no se distinguía dónde acababa la herramienta y dónde
  empezaba el producto. Con lienzo claro (neutral-50) y paneles blancos la tarjeta
  destaca como la pieza protagonista y los campos se leen sin esfuerzo a plena luz,
  que es donde se rellena esto: en el móvil, de pie, en la calle.
*/

/*
  Todos los campos del editor usan text-[16px] a propósito.

  Safari en iPhone hace un zoom automático al enfocar un input cuyo texto mida
  menos de 16px, y ese acercamiento descoloca el editor y la vista previa. Con
  16px justos el zoom no se dispara y la experiencia queda estable. Es una clase
  aparte de la INPUT de las pantallas de acceso (EmailAuth/PhoneAccess) para no
  tener que tocar aquéllas; aquí, en el editor, sí es requisito.
*/
const FIELD = 'w-full rounded-xl border border-neutral-300 bg-white px-3.5 py-2.5 text-[16px] '
  + 'font-light text-neutral-900 outline-none transition-colors placeholder:text-neutral-400 '
  + 'focus:border-neutral-900 disabled:bg-neutral-100 disabled:text-neutral-400';
/* Con icono a la izquierda hay que dejarle sitio: el texto arrancaría encima. */
const FIELD_ICON = `${FIELD} pl-10`;
/** Botón principal: oscuro y sobrio, del mismo negro que la tarjeta. */
const BTN_PRIMARY = 'flex w-full items-center justify-center gap-2 rounded-xl bg-neutral-900 '
  + 'px-4 py-3.5 text-sm font-medium text-white transition-colors hover:bg-black '
  + 'disabled:cursor-wait disabled:opacity-60';
/** Botón secundario: contorno, sin peso visual que compita con el principal. */
const BTN_GHOST = 'flex w-full items-center justify-center gap-2 rounded-xl border '
  + 'border-neutral-300 bg-white px-4 py-3 text-sm font-light text-neutral-700 '
  + 'transition-colors hover:border-neutral-400 hover:text-neutral-900';

/** Rótulo pequeño y sobrio para agrupar bloques dentro de un panel. */
function SectionLabel({ children }) {
  return (
    <p className="mb-3 text-[10px] uppercase tracking-[0.22em] text-neutral-400">
      {children}
    </p>
  );
}

/**
 * Panel blanco con cabecera: icono, título y una línea que explica para qué sirve
 * el bloque. Antes el formulario era una columna larga de inputs separados sólo
 * por rótulos; en paneles, cada decisión ("quién soy", "cómo me contactan") se ve
 * como un paso corto y acabado, y en escritorio da ritmo a la lectura.
 */
function Panel({ icon: Icon, title, hint, children }) {
  return (
    <section
      className="rounded-2xl border border-neutral-200 bg-white p-5
                 shadow-[0_1px_2px_rgba(16,24,40,0.04)] sm:p-6"
    >
      <header className="mb-5 flex items-start gap-3">
        <span
          className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl border
                     border-neutral-200 bg-neutral-50 text-neutral-500"
        >
          <Icon size={16} strokeWidth={1.6} aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <h2 className="text-sm font-medium tracking-tight text-neutral-900">{title}</h2>
          {hint && (
            <p className="mt-0.5 text-xs font-light leading-relaxed text-neutral-500">{hint}</p>
          )}
        </div>
      </header>
      {children}
    </section>
  );
}

/**
 * Etiqueta visible y asociada a su campo por `htmlFor`.
 *
 * Antes sólo había placeholders: al escribir desaparecen y ya no se sabe qué pide
 * cada casilla, y los lectores de pantalla se quedaban sin nombre que anunciar.
 * Lo opcional se marca en palabras, no adivinando por ausencia de asterisco.
 */
function FieldLabel({ htmlFor, optional = false, children }) {
  return (
    <label
      htmlFor={htmlFor}
      className="mb-1.5 flex items-baseline gap-1.5 text-[11px] font-medium uppercase
                 tracking-[0.12em] text-neutral-500"
    >
      {children}
      {optional && (
        <span className="text-[10px] font-light normal-case tracking-normal text-neutral-400">
          opcional
        </span>
      )}
    </label>
  );
}

/**
 * Campo de texto con etiqueta arriba, icono guía a la izquierda y ayuda debajo.
 * Un solo componente para todo el formulario: así ningún campo se queda sin
 * etiqueta por descuido y el alto de todos coincide en las rejillas de dos
 * columnas.
 */
function TextField({
  id, label, icon: Icon, optional = false, hint, value, onChange,
  placeholder, type = 'text', rows = 0,
}) {
  const inputMode = type === 'tel' ? 'tel' : type === 'email' ? 'email' : type === 'url' ? 'url' : undefined;
  return (
    <div>
      <FieldLabel htmlFor={id} optional={optional}>{label}</FieldLabel>
      <div className="relative">
        {Icon && rows === 0 && (
          <Icon
            size={15}
            aria-hidden="true"
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400"
          />
        )}
        {rows > 0 ? (
          <textarea
            id={id}
            rows={rows}
            className={`${FIELD} resize-none`}
            value={value}
            placeholder={placeholder}
            onChange={(e) => onChange(e.target.value)}
          />
        ) : (
          <input
            id={id}
            type={type}
            inputMode={inputMode}
            className={Icon ? FIELD_ICON : FIELD}
            value={value}
            placeholder={placeholder}
            onChange={(e) => onChange(e.target.value)}
          />
        )}
      </div>
      {hint && <p className="mt-1.5 text-[11px] font-light leading-relaxed text-neutral-500">{hint}</p>}
    </div>
  );
}

/**
 * Zona de subida de foto tipo dropzone.
 *
 * El único acceso a la foto era el botón de cámara sobre la tarjeta, que se
 * confunde con un adorno de la vista previa. Aquí la subida vive donde se
 * espera —junto al nombre, en Identidad— y admite arrastrar el archivo en
 * escritorio, que es como se sube una foto desde una computadora. El botón de la
 * tarjeta sigue funcionando: los dos disparan el mismo input.
 */
function PhotoDropzone({ avatarUrl, uploading, onOpenPicker, onFile, onEdit }) {
  const [dragging, setDragging] = useState(false);

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        const file = e.dataTransfer?.files?.[0];
        if (file) onFile(file);
      }}
      /* En md+ ocupa todo el alto de su columna para no dejar un hueco al lado
         de los campos; en móvil se queda con su alto natural. */
      className="flex h-full flex-col"
    >
      <FieldLabel htmlFor="card-photo-button" optional>Foto</FieldLabel>
      <button
        id="card-photo-button"
        type="button"
        onClick={onOpenPicker}
        disabled={uploading}
        className={`grid w-full flex-1 content-center justify-items-center gap-2 rounded-2xl
                    border border-dashed px-4 py-6 text-center transition-colors ${dragging
          ? 'border-neutral-900 bg-neutral-50'
          : 'border-neutral-300 bg-neutral-50/60 hover:border-neutral-400 hover:bg-neutral-50'}`}
      >
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt="Tu foto de la tarjeta"
            className="h-24 w-24 rounded-2xl object-cover ring-1 ring-neutral-200"
          />
        ) : (
          <span
            className="grid h-12 w-12 place-items-center rounded-full border border-neutral-200
                       bg-white text-neutral-400"
          >
            <ImageUp size={20} strokeWidth={1.5} aria-hidden="true" />
          </span>
        )}
        <span className="text-xs font-medium text-neutral-800">
          {uploading
            ? 'Subiendo tu foto…'
            : avatarUrl ? 'Cambiar por otra foto' : 'Sube tu foto'}
        </span>
        <span className="text-[11px] font-light leading-relaxed text-neutral-500">
          {uploading
            ? 'Un momento, se está optimizando.'
            : 'Toca aquí o arrastra una imagen. Se recorta sola a la tarjeta.'}
        </span>
        {uploading && <Loader2 size={15} className="animate-spin text-neutral-500" aria-hidden="true" />}
      </button>

      {/*
        Editar la foto que ya está: reabre el recortador con la MISMA foto para
        recolocarla o acercarla, sin obligar a buscar otra en el teléfono. Sólo
        aparece cuando hay foto.
      */}
      {avatarUrl && !uploading && (
        <button
          type="button"
          onClick={onEdit}
          className="mt-2 flex items-center justify-center gap-1.5 rounded-xl border
                     border-neutral-300 bg-white py-2 text-xs font-medium text-neutral-700
                     transition-colors hover:border-neutral-400 hover:text-neutral-900"
        >
          <Crop size={13} /> Ajustar esta foto
        </button>
      )}
    </div>
  );
}

/**
 * Selector visual de plantilla: dos tarjetas pequeñas seleccionables en vez de
 * un <select> plano, para que el dueño vea de un vistazo la diferencia entre la
 * Editorial (foto fundida) y la Ejecutiva (enmarcada). En tema claro la activa se
 * realza con borde y fondo oscuros —el mismo negro de la tarjeta— porque en
 * blanco un borde claro no distinguiría nada.
 */
function TemplatePicker({ value, onChange }) {
  const options = [
    { key: 'editorial', label: 'Editorial', hint: 'Foto grande, estilo revista.' },
    { key: 'executive', label: 'Ejecutivo', hint: 'Enmarcada y sobria.' },
  ];
  return (
    <div className="grid grid-cols-2 gap-3">
      {options.map((opt) => {
        const active = value === opt.key;
        return (
          <button
            key={opt.key}
            type="button"
            onClick={() => onChange(opt.key)}
            aria-pressed={active}
            className={`rounded-2xl border p-3 text-left transition-colors ${active
              ? 'border-neutral-900 bg-neutral-900'
              : 'border-neutral-200 bg-white hover:border-neutral-400'}`}
          >
            <span className={`flex items-center gap-1.5 text-sm font-medium ${active
              ? 'text-white' : 'text-neutral-800'}`}
            >
              <LayoutTemplate size={14} aria-hidden="true" /> {opt.label}
            </span>
            <span className={`mt-1 block text-[11px] font-light leading-snug ${active
              ? 'text-neutral-400' : 'text-neutral-500'}`}
            >
              {opt.hint}
            </span>
          </button>
        );
      })}
    </div>
  );
}

/**
 * Gestor de píldoras dinámico: el dueño escribe una especialidad y con Enter la
 * agrega como chip; cada chip tiene una x para borrarla. El tope es MAX_PILDORAS
 * (4) porque la tarjeta no muestra más y saturarla estropea la lectura; al
 * llegar al tope el input se apaga con un aviso sutil.
 */
function PildorasEditor({ items, onChange }) {
  const [draft, setDraft] = useState('');
  const full = items.length >= MAX_PILDORAS;

  const add = () => {
    const value = draft.trim();
    if (!value || full) return;
    // Sin duplicados: repetir un chip no aporta y ocupa uno de los cuatro cupos.
    if (items.some((x) => x.toLowerCase() === value.toLowerCase())) { setDraft(''); return; }
    onChange([...items, value]);
    setDraft('');
  };

  const remove = (target) => onChange(items.filter((x) => x !== target));

  return (
    <div>
      {items.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-2">
          {items.map((item) => (
            <span
              key={item}
              className="flex items-center gap-1.5 rounded-full border border-neutral-200
                         bg-neutral-50 px-3 py-1.5 text-xs text-neutral-700"
            >
              {item}
              <button
                type="button"
                onClick={() => remove(item)}
                aria-label={`Quitar ${item}`}
                className="text-neutral-400 hover:text-neutral-900"
              >
                <X size={13} />
              </button>
            </span>
          ))}
        </div>
      )}
      <FieldLabel htmlFor="card-pildora">Nueva etiqueta</FieldLabel>
      <input
        id="card-pildora"
        className={FIELD}
        value={draft}
        disabled={full}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') { e.preventDefault(); add(); }
        }}
        placeholder={full ? 'Máximo 4 etiquetas' : 'Escribe una etiqueta y pulsa Enter'}
      />
      <p className="mt-1.5 text-[11px] font-light leading-relaxed text-neutral-500">
        {full
          ? 'Llegaste al máximo de 4 etiquetas. Quita una para agregar otra.'
          : 'Ej.: Autos, Vida, Gastos médicos. Pulsa Enter para agregar cada una.'}
      </p>
    </div>
  );
}

/**
 * Fila de canal de contacto con switch: al encenderlo aparece su input; apagado
 * no se envía y no aparece en la botonera de la tarjeta. Así el dueño elige qué
 * mostrar sin dejar botones muertos que no llevan a ningún lado.
 */
function ContactChannel({
  id, icon: Icon, label, enabled, onToggle, value, onChange,
  type = 'url', placeholder, hint,
}) {
  const inputMode = type === 'tel' ? 'tel' : type === 'email' ? 'email' : 'url';
  return (
    <div
      className={`rounded-2xl border p-3.5 transition-colors ${enabled
        ? 'border-neutral-300 bg-white' : 'border-neutral-200 bg-neutral-50/60'}`}
    >
      <div className="flex items-center justify-between gap-3">
        <span className="flex items-center gap-2 text-sm font-light text-neutral-800">
          <Icon size={15} className="text-neutral-400" aria-hidden="true" /> {label}
        </span>
        <button
          type="button"
          role="switch"
          aria-checked={enabled}
          aria-label={`${enabled ? 'Ocultar' : 'Mostrar'} ${label}`}
          onClick={() => onToggle(!enabled)}
          className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${enabled
            ? 'bg-neutral-900' : 'bg-neutral-300'}`}
        >
          <span
            className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm
                        transition-transform ${enabled ? 'translate-x-[22px]' : 'translate-x-0.5'}`}
          />
        </button>
      </div>
      {enabled && (
        <div className="mt-3">
          {/* La etiqueta ya la da el nombre del canal; el input se nombra igual. */}
          <input
            id={id}
            aria-label={label}
            className={FIELD}
            value={value}
            type={type}
            inputMode={inputMode}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
          />
          {hint && (
            <p className="mt-1.5 text-[11px] font-light leading-relaxed text-neutral-500">{hint}</p>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Editor del dueño: datos primero, la tarjeta real como vista previa girable.
 *
 * Extraído de src/pages/GiftCardPage.jsx (donde vivía como componente interno)
 * para poder crecer sin inflar aquel archivo. Conserva la misma firma y la misma
 * lógica de guardado con deviceSecret, subida de foto y compartir.
 */
export default function CardEditor({ cardId, initial, deviceSecret = '' }) {
  const [mode, setMode] = useState('edit'); // 'edit' | 'preview'
  const [form, setForm] = useState(() => ({
    fullName: initial.fullName ?? '',
    title: initial.title ?? '',
    company: initial.company ?? '',
    bio: initial.bio ?? '',
    phone: initial.phone ?? '',
    whatsapp: initial.whatsapp ?? '',
    template: initial.template ?? 'editorial',
    estadoPill: initial.estadoPill ?? '',
    // Las píldoras salen de initial.pildoras (modelo nuevo) o de specialties (viejo).
    pildoras: Array.isArray(initial.pildoras)
      ? initial.pildoras.slice(0, MAX_PILDORAS)
      : Array.isArray(initial.specialties)
        ? initial.specialties.slice(0, MAX_PILDORAS)
        : [],
    // Contactos: teléfono/whatsapp arrancan desde las columnas propias; el resto
    // desde cardExtra.contactos (o los objetos ya derivados).
    contactos: {
      telefono: initial.phone ?? '',
      whatsapp: initial.whatsapp ?? '',
      maps: initial.contactos?.maps ?? '',
      instagram: initial.contactos?.instagram ?? '',
      email: initial.contactos?.email ?? '',
    },
    reverso: {
      ctaTitulo: initial.reverso?.ctaTitulo ?? '',
      ctaBadge: initial.reverso?.ctaBadge ?? '',
      ctaSubtitulo: initial.reverso?.ctaSubtitulo ?? '',
      bookingUrl: initial.reverso?.bookingUrl ?? '',
      bookingTexto: initial.reverso?.bookingTexto ?? '',
    },
  }));
  // Qué canales están encendidos. Arrancan encendidos los que ya traían dato,
  // para no esconder de golpe lo que la tarjeta vieja ya mostraba.
  const [channels, setChannels] = useState(() => ({
    whatsapp: Boolean(initial.whatsapp),
    telefono: Boolean(initial.phone),
    maps: Boolean(initial.contactos?.maps),
    instagram: Boolean(initial.contactos?.instagram),
    email: Boolean(initial.contactos?.email),
  }));
  const [avatarUrl, setAvatarUrl] = useState(initial.avatarUrl ?? '');
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  // Imagen elegida a la espera de encuadre en el modal. Vacío = modal cerrado.
  const [cropSrc, setCropSrc] = useState('');
  const fileRef = useRef(null);

  const set = (key, value) => setForm((f) => ({ ...f, [key]: value }));
  const setContacto = (key, value) => setForm((f) => ({
    ...f, contactos: { ...f.contactos, [key]: value },
  }));
  const setReverso = (key, value) => setForm((f) => ({
    ...f, reverso: { ...f.reverso, [key]: value },
  }));
  const toggleChannel = (key, on) => setChannels((c) => ({ ...c, [key]: on }));

  /*
    Construye el cardData de guardado a partir del formulario y del estado de los
    switches: un canal apagado viaja vacío, así no aparece en la tarjeta. phone y
    whatsapp son columnas propias (van en el nivel superior); maps/instagram/
    email/web viajan dentro de cardExtra.contactos, y por eso toSavePatch separa
    ese bloque. Se delega en toSavePatch (FEAT-002) para no duplicar la forma del
    patch aquí.
  */
  const buildCardData = () => ({
    ...form,
    phone: channels.telefono ? form.contactos.telefono : '',
    whatsapp: channels.whatsapp ? form.contactos.whatsapp : '',
    photoFocus: initial.photoFocus ?? null,
    contactos: {
      maps: channels.maps ? form.contactos.maps : '',
      instagram: channels.instagram ? form.contactos.instagram : '',
      email: channels.email ? form.contactos.email : '',
    },
  });

  const save = async () => {
    setSaving(true);
    setError('');
    const patch = toSavePatch(buildCardData());
    const { data, error: e } = await saveGiftCard(cardId, patch, deviceSecret);
    setSaving(false);
    if (e || data?.outcome !== 'SAVED') {
      setError('No pudimos guardar. Revisa tu conexión e inténtalo nuevamente.');
      return;
    }
    setSavedAt(Date.now());
  };

  /*
    Subida de la foto a partir de un File, no de un evento: así sirve igual al
    input oculto, al botón de cámara de la tarjeta y al archivo arrastrado sobre
    la dropzone, sin duplicar el encogido ni el manejo de errores.
  */
  /*
    Al elegir una foto ya no se sube directo: primero se abre el recortador para
    encuadrarla contra la tarjeta real. Se guarda la imagen entera como URL de
    datos y se le pasa al modal; el recorte definitivo lo hace él al confirmar.
  */
  const openCropper = async (file) => {
    if (!file) return;
    setError('');
    try {
      const dataUrl = await readImageFile(file);
      setCropSrc(dataUrl);
    } catch {
      setError('No pudimos leer la imagen. Prueba con otra.');
    }
  };

  /*
    Sube el recorte que devuelve el modal (ya en la proporción de la tarjeta): se
    reduce de peso y se manda por el mismo pipeline de siempre. Cierra el modal al
    terminar.
  */
  const uploadCropped = async (dataUrl) => {
    setUploading(true);
    setError('');
    try {
      const shrunk = await shrinkImageForUpload(dataUrl);
      const finalFile = await dataUrlToFile(shrunk, 'tarjeta.jpg');
      const { data, error: e } = await uploadGiftCardPhoto(cardId, finalFile, deviceSecret);
      if (e || !data?.avatarUrl) throw new Error('upload');
      setAvatarUrl(data.avatarUrl);
      setCropSrc('');
    } catch {
      setError('No pudimos subir la foto. Prueba con otra imagen.');
    } finally {
      setUploading(false);
    }
  };

  const pickPhoto = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    await openCropper(file);
  };

  /*
    Reajustar la foto que YA está subida, sin volver a elegir uno del teléfono. Se
    abre el mismo modal con la foto actual como origen: mover, acercar y guardar de
    nuevo. Útil cuando la cara quedó tapada por el texto y sólo hace falta recolocar.
  */
  const editCurrentPhoto = () => {
    if (!avatarUrl) return;
    setError('');
    setCropSrc(avatarUrl);
  };

  const shareUrl = giftCardUrl(cardId);
  const shareMessage = `Hola, te comparto mi tarjeta digital:\n${shareUrl}`;
  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setError('No pudimos copiar. Selecciona el enlace manualmente.');
    }
  };

  // La vista previa refleja el formulario en vivo: se arma el mismo cardData que
  // se guardaría, más la foto actual, para que lo que se ve sea lo que se envía.
  const preview = { ...buildCardData(), avatarUrl };
  const hidden = (
    <>
      <input ref={fileRef} type="file" accept="image/*" onChange={pickPhoto} className="hidden" />
      {/* El recortador vive junto al input: se usa igual en el modo editar y en
          el modo previa, y sobre la tarjeta muestra el encuadre en vivo. */}
      {cropSrc && (
        <PhotoCropModal
          src={cropSrc}
          cardData={preview}
          onCancel={() => setCropSrc('')}
          onConfirm={uploadCropped}
        />
      )}
    </>
  );

  /* Botonera de compartir: se usa igual en el modo previa y bajo la tarjeta. */
  const shareButtons = (
    <div className="space-y-2">
      <a
        href={whatsAppLink('', shareMessage)}
        target="_blank"
        rel="noopener noreferrer"
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600
                   px-4 py-3.5 text-sm font-medium text-white transition-colors hover:bg-emerald-500"
      >
        {/* El verde se queda: aquí no es decoración, identifica el canal WhatsApp. */}
        <Share2 size={16} /> Compartir mi tarjeta
      </a>
      <button type="button" onClick={copyLink} className={BTN_GHOST}>
        {copied ? <><Check size={15} /> Enlace copiado</> : <><Copy size={15} /> Copiar enlace</>}
      </button>
    </div>
  );

  if (mode === 'preview') {
    return (
      <main className="min-h-[100dvh] bg-neutral-50 px-5 py-8">
        <div className="mx-auto max-w-md">
          <button
            type="button"
            onClick={() => setMode('edit')}
            className="mb-6 flex items-center gap-1.5 text-xs font-light text-neutral-500
                       hover:text-neutral-900"
          >
            <ArrowLeft size={14} /> Volver a editar
          </button>

          <DigitalCard cardData={preview} />

          <div className="mx-auto mt-6 max-w-[340px]">{shareButtons}</div>
          {error && (
            <p role="alert" className="mt-4 text-center text-xs font-light text-rose-600">{error}</p>
          )}
        </div>
        {hidden}
      </main>
    );
  }

  return (
    <main className="min-h-[100dvh] bg-neutral-50 px-4 py-6 text-neutral-900 sm:px-6 sm:py-10">
      <div className="mx-auto max-w-6xl">
        {/* ── Cabecera: qué es esta pantalla, y la salida de la sesión ── */}
        <header className="mb-6 flex items-start justify-between gap-4 sm:mb-8">
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-[0.25em] text-neutral-400">
              Tu tarjeta digital
            </p>
            <h1 className="mt-1.5 text-2xl font-light tracking-tight text-neutral-900 sm:text-3xl">
              Arma tu tarjeta de presentación
            </h1>
            <p className="mt-2 max-w-xl text-sm font-light leading-relaxed text-neutral-500">
              Completa tus datos y mira cómo queda al instante. Puedes guardar y volver a
              editarla cuando quieras: el enlace que compartes siempre muestra la última versión.
            </p>
          </div>
          <button
            type="button"
            onClick={() => getGiftCardSupabase().auth.signOut()}
            className="flex shrink-0 items-center gap-1 rounded-full border border-neutral-200
                       bg-white px-3 py-1.5 text-[11px] font-light text-neutral-500
                       hover:border-neutral-400 hover:text-neutral-900"
          >
            <LogOut size={12} /> Salir
          </button>
        </header>

        {/*
          Dos columnas en escritorio: el formulario se estira y la vista previa
          tiene ancho fijo (384px) y queda pegada arriba (sticky). El ancho fijo
          no es capricho: la tarjeta mide 340px y con columnas proporcionales se
          quedaba estrecha justo a partir de lg, deformando la composición.
          En tableta (md) los campos se reparten en dos columnas dentro de cada
          panel; en móvil todo cae a una sola columna y la tarjeta queda al final,
          con el atajo "Ver mi tarjeta" arriba de los botones para no obligar a
          bajar hasta ella.
        */}
        <div
          className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_384px] lg:items-start lg:gap-8"
        >
          <div className="space-y-5">
            {/* ── Identidad ── */}
            <Panel
              icon={UserRound}
              title="Quién eres"
              hint="Lo primero que se lee en tu tarjeta. La foto y el nombre hacen casi todo el trabajo."
            >
              <div className="grid gap-5 md:grid-cols-[210px_minmax(0,1fr)]">
                <PhotoDropzone
                  avatarUrl={avatarUrl}
                  uploading={uploading}
                  onOpenPicker={() => fileRef.current?.click()}
                  onFile={openCropper}
                  onEdit={editCurrentPhoto}
                />
                <div className="grid gap-4 sm:grid-cols-2">
                  <TextField
                    id="card-fullname"
                    label="Nombre completo"
                    icon={UserRound}
                    value={form.fullName}
                    onChange={(v) => set('fullName', v)}
                    placeholder="Ej.: María Fernanda Ruiz"
                  />
                  <TextField
                    id="card-title"
                    label="A qué te dedicas"
                    icon={Briefcase}
                    value={form.title}
                    onChange={(v) => set('title', v)}
                    placeholder="Ej.: Asesora de seguros"
                  />
                  <TextField
                    id="card-company"
                    label="Empresa"
                    icon={Building2}
                    optional
                    value={form.company}
                    onChange={(v) => set('company', v)}
                    placeholder="Ej.: Catador Seguros"
                  />
                  <TextField
                    id="card-estado"
                    label="Estado"
                    icon={BadgeCheck}
                    optional
                    value={form.estadoPill}
                    onChange={(v) => set('estadoPill', v)}
                    placeholder="Ej.: Disponible"
                    hint="Se muestra sólo en la plantilla Ejecutivo."
                  />
                  <div className="sm:col-span-2">
                    <TextField
                      id="card-bio"
                      label="Una línea sobre ti"
                      icon={AlignLeft}
                      optional
                      rows={3}
                      value={form.bio}
                      onChange={(v) => set('bio', v)}
                      placeholder="Qué haces por tus clientes, en una frase."
                    />
                  </div>
                </div>
              </div>
            </Panel>

            {/* ── Plantilla ── */}
            <Panel
              icon={LayoutTemplate}
              title="Estilo de la tarjeta"
              hint="Dos diseños listos. El color y la tipografía ya están resueltos: elige la composición."
            >
              <TemplatePicker value={form.template} onChange={(t) => set('template', t)} />
            </Panel>

            {/* ── Píldoras ── */}
            <Panel
              icon={Tags}
              title="Tus especialidades"
              hint="Hasta cuatro etiquetas cortas. Dicen en qué puedes ayudar sin leer un párrafo."
            >
              <PildorasEditor items={form.pildoras} onChange={(p) => set('pildoras', p)} />
            </Panel>

            {/* ── Contactos ── */}
            <Panel
              icon={MessageCircle}
              title="Redes sociales y contacto"
              hint="Enciende sólo los canales que usas: los apagados no aparecen como botón en la tarjeta."
            >
              <div className="grid gap-3 md:grid-cols-2">
                <ContactChannel
                  id="contacto-whatsapp"
                  icon={MessageCircle} label="WhatsApp"
                  enabled={channels.whatsapp} onToggle={(on) => toggleChannel('whatsapp', on)}
                  value={form.contactos.whatsapp} onChange={(v) => setContacto('whatsapp', v)}
                  type="tel" placeholder="Tu WhatsApp"
                />
                <ContactChannel
                  id="contacto-telefono"
                  icon={Phone} label="Teléfono"
                  enabled={channels.telefono} onToggle={(on) => toggleChannel('telefono', on)}
                  value={form.contactos.telefono} onChange={(v) => setContacto('telefono', v)}
                  type="tel" placeholder="Tu teléfono"
                />
                <ContactChannel
                  id="contacto-maps"
                  icon={MapPin} label="Ubicación (Maps)"
                  enabled={channels.maps} onToggle={(on) => toggleChannel('maps', on)}
                  value={form.contactos.maps} onChange={(v) => setContacto('maps', v)}
                  type="url" placeholder="https://maps.google.com/…"
                />
                <ContactChannel
                  id="contacto-instagram"
                  icon={IdCard} label="Instagram"
                  enabled={channels.instagram} onToggle={(on) => toggleChannel('instagram', on)}
                  value={form.contactos.instagram} onChange={(v) => setContacto('instagram', v)}
                  type="url" placeholder="https://instagram.com/tu_usuario"
                />
                <ContactChannel
                  id="contacto-email"
                  icon={Mail} label="Correo"
                  enabled={channels.email} onToggle={(on) => toggleChannel('email', on)}
                  value={form.contactos.email} onChange={(v) => setContacto('email', v)}
                  type="email" placeholder="tu@correo.com"
                />
              </div>
            </Panel>

            {/* ── Reverso ── */}
            <Panel
              icon={Megaphone}
              title="Reverso de la tarjeta"
              hint="La cara de atrás, con una invitación a agendar. Todo es opcional: sin nada aquí, la tarjeta no gira."
            >
              {/*
                Dos bloques —mensaje y agenda— en vez de una lista plana de
                inputs: son dos decisiones distintas y así se entiende qué texto
                acaba en qué sitio de la tarjeta. El video se quitó a propósito:
                en la tarjeta del cliente ya no se puede poner.
              */}
              <div className="space-y-6">
                <div>
                  <SectionLabel>Mensaje destacado</SectionLabel>
                  <div className="grid gap-4 md:grid-cols-2">
                    <TextField
                      id="reverso-badge"
                      label="Etiqueta"
                      icon={Megaphone}
                      optional
                      value={form.reverso.ctaBadge}
                      onChange={(v) => setReverso('ctaBadge', v)}
                      placeholder="Ej.: Agenda tu cita o Miércoles 2x1"
                    />
                    <TextField
                      id="reverso-titulo"
                      label="Título"
                      optional
                      value={form.reverso.ctaTitulo}
                      onChange={(v) => setReverso('ctaTitulo', v)}
                      placeholder="Ej.: Reserva tu espacio"
                    />
                    <div className="md:col-span-2">
                      <TextField
                        id="reverso-subtitulo"
                        label="Subtítulo"
                        optional
                        value={form.reverso.ctaSubtitulo}
                        onChange={(v) => setReverso('ctaSubtitulo', v)}
                        placeholder="Una frase breve que acompañe al título."
                      />
                    </div>
                  </div>
                </div>

                <div className="border-t border-neutral-200 pt-5">
                  <SectionLabel>Agenda</SectionLabel>
                  <div className="grid gap-4 md:grid-cols-2">
                    <TextField
                      id="reverso-booking-url"
                      label="Agenda de Google Calendar"
                      icon={CalendarCheck}
                      optional
                      type="url"
                      value={form.reverso.bookingUrl}
                      onChange={(v) => setReverso('bookingUrl', v)}
                      placeholder="Pega el enlace público de tu agenda de Google Calendar"
                      hint="Aquí irá el enlace de programación de citas de Google Calendar. Si lo dejas vacío, el botón escribirá por WhatsApp a tu número."
                    />
                    <TextField
                      id="reverso-booking-texto"
                      label="Texto del botón"
                      optional
                      value={form.reverso.bookingTexto}
                      onChange={(v) => setReverso('bookingTexto', v)}
                      placeholder="Ej.: Agendar cita"
                    />
                  </div>
                </div>
              </div>
            </Panel>

            {/* ── Acciones ── */}
            <div className="space-y-3">
              {error && <p role="alert" className="text-xs font-light text-rose-600">{error}</p>}
              <button type="button" onClick={save} disabled={saving} className={BTN_PRIMARY}>
                {saving
                  ? <><Loader2 size={16} className="animate-spin" /> Guardando…</>
                  : savedAt ? <><Check size={16} /> Guardado</> : 'Guardar mi tarjeta'}
              </button>
              {/*
                En escritorio la tarjeta ya está a la vista al lado, así que este
                atajo al modo "ver y compartir" sólo se ofrece donde hace falta.
              */}
              <button
                type="button"
                onClick={() => setMode('preview')}
                className={`${BTN_GHOST} lg:hidden`}
              >
                <Eye size={15} /> Ver y compartir mi tarjeta
              </button>
              {savedAt > 0 && !saving && (
                <p className="text-center text-[11px] font-light text-neutral-500">
                  Guardado. Quien abra tu enlace ya ve estos cambios.
                </p>
              )}
            </div>
          </div>

          {/*
            Vista previa en vivo: la tarjeta de verdad, con su giro y su botón de
            cámara, dentro de un panel blanco. La tarjeta sigue siendo negra a
            propósito: sobre el panel claro se lee como el objeto terminado y no
            como parte del formulario.
          */}
          <aside className="space-y-4 lg:sticky lg:top-8">
            <section
              className="rounded-2xl border border-neutral-200 bg-white p-5
                         shadow-[0_1px_2px_rgba(16,24,40,0.04)]"
            >
              <div className="mb-4 flex items-baseline justify-between gap-2">
                <h2 className="text-sm font-medium tracking-tight text-neutral-900">Vista previa</h2>
                <span className="text-[10px] uppercase tracking-[0.18em] text-neutral-400">
                  En vivo
                </span>
              </div>
              <DigitalCard
                cardData={preview}
                onPickPhoto={() => fileRef.current?.click()}
                uploading={uploading}
              />
              <div className="mx-auto mt-5 max-w-[340px]">{shareButtons}</div>
            </section>

            <div
              className="flex items-start gap-3 rounded-2xl border border-neutral-200 bg-white p-4"
            >
              <span
                className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg
                           border border-neutral-200 bg-neutral-50 text-neutral-500"
              >
                <Lightbulb size={15} strokeWidth={1.6} aria-hidden="true" />
              </span>
              <p className="text-[11px] font-light leading-relaxed text-neutral-500">
                Toca la tarjeta para girarla y revisar el reverso. Con el botón de la cámara,
                sobre la foto, también puedes cambiar tu imagen. Recuerda guardar antes de salir.
              </p>
            </div>
          </aside>
        </div>
        {hidden}
      </div>
    </main>
  );
}
