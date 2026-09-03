import { useRef, useState } from 'react';
import {
  ArrowLeft, Check, Copy, Eye, Loader2, LogOut, Share2, X,
  MessageCircle, Phone, MapPin, Mail, Globe, LayoutTemplate, IdCard,
} from 'lucide-react';
import { getGiftCardSupabase } from '../../lib/supabaseClient';
import { giftCardUrl } from '../../lib/giftCardRoute';
import { saveGiftCard, uploadGiftCardPhoto } from '../../data/giftCardsRepo';
import { readImageFile, shrinkImageForUpload, dataUrlToFile } from '../../data/cardPhoto';
import { whatsAppLink } from '../../lib/advisorPhone';
import { MAX_PILDORAS, toSavePatch } from '../../data/cardData';
import DigitalCard from './DigitalCard';

/*
  Todos los campos del editor usan text-[16px] a propósito.

  Safari en iPhone hace un zoom automático al enfocar un input cuyo texto mida
  menos de 16px, y ese acercamiento descoloca el editor y la vista previa. Con
  16px justos el zoom no se dispara y la experiencia queda estable. Es una clase
  aparte de la INPUT de las pantallas de acceso (EmailAuth/PhoneAccess) para no
  tener que tocar aquéllas; aquí, en el editor, sí es requisito.
*/
const FIELD = 'w-full rounded-xl border border-neutral-800 bg-neutral-900 px-4 py-3 text-[16px] '
  + 'font-light text-neutral-100 outline-none placeholder:text-neutral-600 focus:border-neutral-500';

/** Rótulo pequeño y sobrio para agrupar secciones del formulario. */
function SectionLabel({ children }) {
  return (
    <p className="mb-3 mt-8 text-[10px] uppercase tracking-[0.22em] text-neutral-600">
      {children}
    </p>
  );
}

/**
 * Selector visual de plantilla: dos tarjetas pequeñas seleccionables en vez de
 * un <select> plano, para que el dueño vea de un vistazo la diferencia entre la
 * Editorial (foto fundida) y la Ejecutiva (enmarcada). La activa se realza con
 * un borde claro sobrio (border-neutral-100); la inactiva queda apagada.
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
              ? 'border-neutral-100 bg-neutral-900'
              : 'border-neutral-800 bg-neutral-950 hover:border-neutral-600'}`}
          >
            <span className={`flex items-center gap-1.5 text-sm font-medium ${active
              ? 'text-white' : 'text-neutral-300'}`}
            >
              <LayoutTemplate size={14} aria-hidden="true" /> {opt.label}
            </span>
            <span className="mt-1 block text-[11px] font-light leading-snug text-neutral-500">
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
 * llegar al tope el input se apaga con un aviso sutil. Sustituye a la antigua
 * lista fija de especialidades.
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
              className="flex items-center gap-1.5 rounded-full border border-neutral-700
                         bg-neutral-900 px-3 py-1.5 text-xs text-neutral-200"
            >
              {item}
              <button
                type="button"
                onClick={() => remove(item)}
                aria-label={`Quitar ${item}`}
                className="text-neutral-500 hover:text-neutral-200"
              >
                <X size={13} />
              </button>
            </span>
          ))}
        </div>
      )}
      <input
        className={FIELD}
        value={draft}
        disabled={full}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') { e.preventDefault(); add(); }
        }}
        placeholder={full ? 'Máximo 4 etiquetas' : 'Escribe una etiqueta y pulsa Enter'}
      />
      <p className="mt-1.5 text-[11px] font-light text-neutral-600">
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
  icon: Icon, label, enabled, onToggle, value, onChange, type = 'url', placeholder, hint,
}) {
  const inputMode = type === 'tel' ? 'tel' : type === 'email' ? 'email' : 'url';
  return (
    <div className="rounded-2xl border border-neutral-800 bg-neutral-950 p-3">
      <div className="flex items-center justify-between gap-3">
        <span className="flex items-center gap-2 text-sm font-light text-neutral-200">
          <Icon size={15} className="text-neutral-500" aria-hidden="true" /> {label}
        </span>
        <button
          type="button"
          role="switch"
          aria-checked={enabled}
          aria-label={`${enabled ? 'Ocultar' : 'Mostrar'} ${label}`}
          onClick={() => onToggle(!enabled)}
          className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${enabled
            ? 'bg-neutral-100' : 'bg-neutral-800'}`}
        >
          <span
            className={`absolute top-0.5 h-5 w-5 rounded-full bg-black transition-transform ${enabled
              ? 'translate-x-[22px]' : 'translate-x-0.5'}`}
          />
        </button>
      </div>
      {enabled && (
        <div className="mt-3">
          <input
            className={FIELD}
            value={value}
            type={type}
            inputMode={inputMode}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
          />
          {hint && <p className="mt-1.5 text-[11px] font-light text-neutral-600">{hint}</p>}
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
      web: initial.contactos?.web ?? '',
    },
    reverso: {
      videoUrl: initial.reverso?.videoUrl ?? '',
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
    web: Boolean(initial.contactos?.web),
  }));
  const [avatarUrl, setAvatarUrl] = useState(initial.avatarUrl ?? '');
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
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
      web: channels.web ? form.contactos.web : '',
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

  const pickPhoto = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setUploading(true);
    setError('');
    try {
      const dataUrl = await readImageFile(file);
      const shrunk = await shrinkImageForUpload(dataUrl);
      const finalFile = await dataUrlToFile(shrunk, 'tarjeta.jpg');
      const { data, error: e } = await uploadGiftCardPhoto(cardId, finalFile, deviceSecret);
      if (e || !data?.avatarUrl) throw new Error('upload');
      setAvatarUrl(data.avatarUrl);
    } catch {
      setError('No pudimos subir la foto. Prueba con otra imagen.');
    } finally {
      setUploading(false);
    }
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
    <input ref={fileRef} type="file" accept="image/*" onChange={pickPhoto} className="hidden" />
  );

  if (mode === 'preview') {
    return (
      <main className="min-h-[100dvh] bg-black px-5 py-8">
        <div className="mx-auto max-w-md">
          <button
            type="button"
            onClick={() => setMode('edit')}
            className="mb-6 flex items-center gap-1 text-xs font-light text-neutral-400
                       hover:text-neutral-200"
          >
            <ArrowLeft size={14} /> Volver a editar
          </button>

          <DigitalCard cardData={preview} />

          <div className="mx-auto mt-6 max-w-[340px] space-y-2">
            <a
              href={whatsAppLink('', shareMessage)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600
                         px-4 py-3.5 text-sm font-medium text-white hover:bg-emerald-500"
            >
              <Share2 size={16} /> Compartir mi tarjeta
            </a>
            <button
              type="button"
              onClick={copyLink}
              className="flex w-full items-center justify-center gap-2 rounded-xl border
                         border-neutral-700 px-4 py-3 text-sm font-light text-neutral-200
                         hover:border-neutral-500"
            >
              {copied ? <><Check size={15} /> Enlace copiado</> : <><Copy size={15} /> Copiar enlace</>}
            </button>
          </div>
        </div>
        {hidden}
      </main>
    );
  }

  return (
    <main className="min-h-[100dvh] bg-black px-5 py-8 text-neutral-100">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6 flex items-center justify-between">
          <p className="text-[10px] uppercase tracking-[0.25em] text-neutral-600">
            Tu tarjeta digital
          </p>
          <button
            type="button"
            onClick={() => getGiftCardSupabase().auth.signOut()}
            className="flex items-center gap-1 text-[11px] font-light text-neutral-500
                       hover:text-neutral-300"
          >
            <LogOut size={12} /> Salir
          </button>
        </div>

        {/*
          Dos columnas en pantallas anchas (lg): el formulario a la izquierda y la
          vista previa fija a un costado; en móvil se apilan y la tarjeta queda
          como sección "Así se ve tu tarjeta" debajo.
        */}
        <div className="grid gap-8 lg:grid-cols-2 lg:items-start">
          <div>
            {/* ── Datos ── */}
            <div className="space-y-3">
              <input className={FIELD} value={form.fullName}
                onChange={(e) => set('fullName', e.target.value)} placeholder="Tu nombre completo" />
              <input className={FIELD} value={form.title}
                onChange={(e) => set('title', e.target.value)} placeholder="A qué te dedicas" />
              <input className={FIELD} value={form.company}
                onChange={(e) => set('company', e.target.value)} placeholder="Empresa (opcional)" />
              <textarea className={`${FIELD} resize-none`} rows={3} value={form.bio}
                onChange={(e) => set('bio', e.target.value)} placeholder="Una línea sobre ti" />
              <input className={FIELD} value={form.estadoPill}
                onChange={(e) => set('estadoPill', e.target.value)}
                placeholder="Estado (ej.: Disponible) — sólo plantilla Ejecutivo" />
            </div>

            {/* ── Plantilla ── */}
            <SectionLabel>Plantilla</SectionLabel>
            <TemplatePicker value={form.template} onChange={(t) => set('template', t)} />

            {/* ── Píldoras ── */}
            <SectionLabel>Etiquetas</SectionLabel>
            <PildorasEditor items={form.pildoras} onChange={(p) => set('pildoras', p)} />

            {/* ── Contactos ── */}
            <SectionLabel>Contactos</SectionLabel>
            <div className="space-y-2.5">
              <ContactChannel
                icon={MessageCircle} label="WhatsApp"
                enabled={channels.whatsapp} onToggle={(on) => toggleChannel('whatsapp', on)}
                value={form.contactos.whatsapp} onChange={(v) => setContacto('whatsapp', v)}
                type="tel" placeholder="Tu WhatsApp"
              />
              <ContactChannel
                icon={Phone} label="Teléfono"
                enabled={channels.telefono} onToggle={(on) => toggleChannel('telefono', on)}
                value={form.contactos.telefono} onChange={(v) => setContacto('telefono', v)}
                type="tel" placeholder="Tu teléfono"
              />
              <ContactChannel
                icon={MapPin} label="Ubicación (Maps)"
                enabled={channels.maps} onToggle={(on) => toggleChannel('maps', on)}
                value={form.contactos.maps} onChange={(v) => setContacto('maps', v)}
                type="url" placeholder="https://maps.google.com/…"
              />
              <ContactChannel
                icon={IdCard} label="Instagram"
                enabled={channels.instagram} onToggle={(on) => toggleChannel('instagram', on)}
                value={form.contactos.instagram} onChange={(v) => setContacto('instagram', v)}
                type="url" placeholder="https://instagram.com/tu_usuario"
              />
              <ContactChannel
                icon={Mail} label="Correo"
                enabled={channels.email} onToggle={(on) => toggleChannel('email', on)}
                value={form.contactos.email} onChange={(v) => setContacto('email', v)}
                type="email" placeholder="tu@correo.com"
              />
              <ContactChannel
                icon={Globe} label="Sitio web"
                enabled={channels.web} onToggle={(on) => toggleChannel('web', on)}
                value={form.contactos.web} onChange={(v) => setContacto('web', v)}
                type="url" placeholder="https://tu-sitio.com"
              />
            </div>

            {/* ── Reverso ── */}
            <SectionLabel>Reverso de la tarjeta</SectionLabel>
            <div className="space-y-3">
              <div>
                <input className={FIELD} value={form.reverso.videoUrl} type="url" inputMode="url"
                  onChange={(e) => setReverso('videoUrl', e.target.value)}
                  placeholder="Enlace de video de bienvenida" />
                <p className="mt-1.5 text-[11px] font-light text-neutral-600">
                  Acepta YouTube, Loom, Vimeo o un archivo de video (MP4).
                </p>
              </div>
              <input className={FIELD} value={form.reverso.ctaBadge}
                onChange={(e) => setReverso('ctaBadge', e.target.value)}
                placeholder="Etiqueta (ej.: Asesoría gratis)" />
              <input className={FIELD} value={form.reverso.ctaTitulo}
                onChange={(e) => setReverso('ctaTitulo', e.target.value)}
                placeholder="Título de la llamada a la acción" />
              <input className={FIELD} value={form.reverso.ctaSubtitulo}
                onChange={(e) => setReverso('ctaSubtitulo', e.target.value)}
                placeholder="Subtítulo o descripción breve" />
              <div>
                <input className={FIELD} value={form.reverso.bookingUrl} type="url" inputMode="url"
                  onChange={(e) => setReverso('bookingUrl', e.target.value)}
                  placeholder="Enlace de agenda o WhatsApp de reserva" />
                <p className="mt-1.5 text-[11px] font-light text-neutral-600">
                  Si lo dejas vacío, el botón escribirá por WhatsApp a tu número.
                </p>
              </div>
              <input className={FIELD} value={form.reverso.bookingTexto}
                onChange={(e) => setReverso('bookingTexto', e.target.value)}
                placeholder="Texto del botón (ej.: Agendar una reunión)" />
            </div>

            {error && <p role="alert" className="mt-5 text-xs font-light text-rose-400">{error}</p>}

            <button
              type="button"
              onClick={save}
              disabled={saving}
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-neutral-100
                         px-4 py-3.5 text-sm font-medium text-black hover:bg-white
                         disabled:cursor-wait disabled:opacity-50"
            >
              {saving
                ? <><Loader2 size={16} className="animate-spin" /> Guardando…</>
                : savedAt ? <><Check size={16} /> Guardado</> : 'Guardar mi tarjeta'}
            </button>

            <button
              type="button"
              onClick={() => setMode('preview')}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border
                         border-neutral-700 px-4 py-3 text-sm font-light text-neutral-200
                         hover:border-neutral-500"
            >
              <Eye size={15} /> Ver y compartir mi tarjeta
            </button>
          </div>

          {/*
            Vista previa en vivo: la tarjeta de verdad, con su giro y el botón de
            cámara. En lg queda pegada arriba (sticky) para verla mientras se
            edita; en móvil es una sección más abajo.
          */}
          <div className="lg:sticky lg:top-8">
            <p className="mb-3 text-[10px] uppercase tracking-[0.22em] text-neutral-600 lg:hidden">
              Así se ve tu tarjeta
            </p>
            <DigitalCard
              cardData={preview}
              onPickPhoto={() => fileRef.current?.click()}
              uploading={uploading}
            />
          </div>
        </div>
        {hidden}
      </div>
    </main>
  );
}
