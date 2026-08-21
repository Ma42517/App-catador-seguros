import { useState } from 'react';
import {
  Phone, Mail, CalendarClock, ChevronUp, ChevronDown, Sparkles, Video,
} from 'lucide-react';
import { videoKind } from '../../data/videoEmbed';
import VideoUploadField from './VideoUploadField';

const INPUT =
  'w-full rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-900'
  + ' placeholder:text-zinc-400 transition-colors focus:border-indigo-500 focus:outline-none'
  + ' focus:ring-2 focus:ring-indigo-500 dark:border-zinc-700 dark:bg-zinc-950/60'
  + ' dark:text-zinc-100 dark:placeholder:text-zinc-600';

const LABEL = 'mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-zinc-500';

/** Logo real de WhatsApp (burbuja + auricular): lucide no lo trae, así que va como trazo propio — mismo trazo completo que ya usan `ShareSheet.jsx`/`DigitalCardPreview.jsx`/`LeadsList.jsx`. */
function WhatsAppMark({ size = 12 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M17.47 14.38c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.35.22-.64.07-.3-.15-1.13-.42-2.15-1.33-.8-.71-1.34-1.6-1.5-1.9-.15-.3-.01-.46.13-.61.16-.16.3-.35.45-.53.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.07-.15-.65-1.57-.89-2.15-.23-.56-.47-.49-.65-.5h-.55c-.2 0-.5.07-.77.37-.27.3-1.02 1-1.02 2.42s1.04 2.8 1.19 3c.15.2 2.05 3.13 4.96 4.27 2.42.95 2.9.76 3.42.71.52-.05 1.68-.68 1.92-1.35.24-.66.24-1.23.17-1.35-.07-.12-.27-.2-.57-.35z" />
      <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.46 1.32 4.96L2 22l5.25-1.38c1.45.79 3.08 1.2 4.79 1.2 5.46 0 9.91-4.45 9.91-9.91S17.5 2 12.04 2zm0 18.02c-1.55 0-3.07-.42-4.4-1.2l-.32-.19-3.26.86.87-3.18-.2-.33a8.09 8.09 0 0 1-1.24-4.32c0-4.47 3.64-8.11 8.11-8.11s8.11 3.64 8.11 8.11-3.64 8.11-8.11 8.11z" />
    </svg>
  );
}

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
 * Panel de los datos que no se ven escritos en la tarjeta.
 *
 * El teléfono, el WhatsApp y el correo no aparecen como texto: son lo que hace
 * funcionar los botones redondos. No se pueden editar sobre la tarjeta porque ahí
 * no hay nada que editar, sólo un icono, y escribir un número dentro de un
 * círculo de 44 píxeles no es escribir en su sitio, es esconderlo.
 *
 * Va cerrado por omisión. Lo que se cambia a diario son el título y la
 * biografía; el teléfono se pone una vez y no se vuelve a tocar, así que ocupar
 * con él la mitad de la pantalla sería cobrarle a todos los días el trabajo de
 * un solo día.
 *
 * Cada campo dice qué botón enciende. Sin eso, "WhatsApp" y "Teléfono" parecen
 * lo mismo y no se entiende por qué hay dos.
 */
export default function ContactDrawer({ card, onChange }) {
  const [isOpen, setOpen] = useState(false);

  // Cuántos botones de la tarjeta quedarían apagados. Es la única cifra que
  // importa aquí, y puesta en el encabezado ahorra abrir el panel para mirar.
  const missing = ['phone', 'whatsapp', 'email']
    .filter((key) => !String(card[key] ?? '').trim()).length;

  // El aviso del enlace de video se calcula aquí y no dentro del campo: hay dos
  // estados que decir —"no es de YouTube" y "listo"— y ninguno debe aparecer
  // mientras el campo está vacío, que es lo normal al empezar.
  const hasVideoText = Boolean(String(card.videoUrl ?? '').trim());
  const isVideoValid = hasVideoText && videoKind(card.videoUrl) !== '';
  const hasUploadedVideo = videoKind(card.videoUrl) === 'file';

  return (
    <section
      className="overflow-hidden rounded-3xl border border-zinc-200 bg-white
                 dark:border-zinc-800 dark:bg-zinc-900/60"
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={isOpen}
        className="flex w-full items-center gap-3 p-4 text-left transition-colors
                   hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
      >
        <span
          className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-indigo-500/10
                     text-indigo-500"
          aria-hidden="true"
        >
          <Phone size={17} strokeWidth={1.9} />
        </span>

        <span className="min-w-0 flex-1">
          <span className="block text-sm font-bold text-zinc-900 dark:text-white">
            Configurar botones de contacto
          </span>
          <span className="mt-0.5 block text-[11px] text-zinc-500">
            {missing === 0
              ? 'Todos tus botones están activos'
              : `${missing} ${missing === 1 ? 'botón' : 'botones'} sin datos, no funcionarán`}
          </span>
        </span>

        {isOpen
          ? <ChevronDown size={18} className="shrink-0 text-zinc-400" aria-hidden="true" />
          : <ChevronUp size={18} className="shrink-0 text-zinc-400" aria-hidden="true" />}
      </button>

      {isOpen && (
        <div className="flex flex-col gap-4 border-t border-zinc-200 p-4 dark:border-zinc-800">
          <Field
            label="Teléfono"
            icon={Phone}
            id="contact-phone"
            hint="Enciende los botones de llamada y de mensaje."
          >
            <input
              id="contact-phone"
              className={INPUT}
              value={card.phone}
              onChange={(e) => onChange('phone', e.target.value)}
              placeholder="5512345678"
              inputMode="tel"
              autoComplete="tel"
            />
          </Field>

          <Field
            label="WhatsApp"
            icon={WhatsAppMark}
            id="contact-whatsapp"
            /*
              Se pide con lada porque `wa.me` la exige: sin el 52, el enlace abre
              WhatsApp con un número que no existe y no hay forma de saber por qué.
            */
            hint="Con lada del país, por ejemplo 52 para México. También activa los servicios del reverso."
          >
            <input
              id="contact-whatsapp"
              className={INPUT}
              value={card.whatsapp}
              onChange={(e) => onChange('whatsapp', e.target.value)}
              placeholder="525512345678"
              inputMode="tel"
            />
          </Field>

          <Field label="Correo" icon={Mail} id="contact-email" hint="Es el de tu cuenta y no se edita aquí.">
            <input
              id="contact-email"
              className={`${INPUT} disabled:opacity-70`}
              value={card.email}
              disabled
              readOnly
            />
          </Field>

          {/*
            Video del reverso.

            La subida directa es la vía principal y el enlace de YouTube la
            alternativa, no al revés. Pedir el enlace obliga a una tarea de
            cuatro pasos —abrir YouTube, subir, esperar el proceso, copiar,
            volver, pegar— para algo que el asesor vive como "grabo y listo", y
            la mayoría abandona antes de terminar.

            El archivo no se aloja en Supabase aunque el bucket ya exista: un
            video de iPhone sale en HEVC y ese formato no se reproduce en Chrome
            ni en casi ningún Android. Guardado tal cual, el asesor vería su
            video perfecto y sus prospectos un cuadro negro —el peor fallo
            posible, porque quien publica no puede detectarlo—.
          */}
          <Field
            label="Video de presentación"
            icon={Video}
            id="card-video-file"
            hint="Aparece arriba del reverso de tu tarjeta, antes del botón de agendar."
          >
            <VideoUploadField
              value={card.videoUrl ?? ''}
              onVideoUploaded={(url) => onChange('videoUrl', url)}
            />

            {/*
              El campo del enlace se esconde cuando ya hay un archivo subido: dos
              formas de poner lo mismo, visibles a la vez, obligan a preguntarse
              cuál manda.
            */}
            {!hasUploadedVideo && (
              <div className="mt-4 border-t border-dashed border-zinc-200 pt-3
                              dark:border-zinc-700"
              >
                <label
                  className="mb-1.5 block text-[10px] font-semibold uppercase
                             tracking-wider text-zinc-500"
                  htmlFor="contact-video"
                >
                  O pega un enlace de YouTube
                </label>

                <input
                  id="contact-video"
                  className={INPUT}
                  value={card.videoUrl ?? ''}
                  onChange={(e) => onChange('videoUrl', e.target.value)}
                  placeholder="https://youtu.be/xxxxxxxxxxx"
                  inputMode="url"
                  autoComplete="off"
                  spellCheck="false"
                />

                {hasVideoText && !isVideoValid && (
                  <p className="mt-1.5 text-[11px] leading-relaxed text-amber-500">
                    Ese enlace no se puede incrustar. Copia el que te da el botón
                    "Compartir" de YouTube, o sube el archivo aquí arriba.
                  </p>
                )}

                {isVideoValid && (
                  <p className="mt-1.5 text-[11px] leading-relaxed text-emerald-500">
                    Enlace correcto. Voltea tu tarjeta para verlo.
                  </p>
                )}
              </div>
            )}
          </Field>

          {/*
            Agenda: no hay campo de enlace, hay una conexión pendiente.

            Un campo para pegar una dirección de Calendly resolvía la mitad
            floja del problema: seguiría siendo el asesor quien copia, pega y
            mantiene ese enlace, y el prospecto acabaría en una herramienta
            ajena sin que la app sepa nunca si la cita ocurrió. Conectar la
            cuenta de Google permite crear el evento y leer los huecos libres.

            El botón queda a la vista y desactivado en lugar de escondido: así se
            sabe que la función viene, y el rótulo dice qué falta en vez de dejar
            pulsando algo que no responde.
          */}
          <div className="rounded-2xl border border-indigo-500/25 bg-indigo-500/5 p-4">
            <button
              type="button"
              disabled
              className="flex w-full items-center justify-center gap-2 rounded-xl
                         bg-gradient-to-r from-blue-600 to-indigo-600 py-3 text-sm
                         font-bold text-white opacity-60"
            >
              <CalendarClock size={16} aria-hidden="true" />
              Sincronizar con Google Calendar
            </button>
            <p className="mt-2.5 text-center text-[11px] leading-relaxed text-zinc-500">
              Próximamente. Al conectar tu cuenta, tus prospectos podrán agendar
              en tus horarios libres y la cita entrará directo a tu calendario.
            </p>
          </div>

          <p className="flex items-start gap-1.5 text-[11px] leading-relaxed text-zinc-500">
            <Sparkles size={12} className="mt-0.5 shrink-0" aria-hidden="true" />
            El nombre, el título, la empresa y tu descripción se editan tocándolos
            directamente sobre la tarjeta.
          </p>
        </div>
      )}
    </section>
  );
}
