import { useState } from 'react';
import {
  Phone, Mail, CalendarClock, ChevronUp, ChevronDown, Sparkles,
} from 'lucide-react';

const INPUT =
  'w-full rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-900'
  + ' placeholder:text-zinc-400 transition-colors focus:border-indigo-500 focus:outline-none'
  + ' focus:ring-2 focus:ring-indigo-500 dark:border-zinc-700 dark:bg-zinc-950/60'
  + ' dark:text-zinc-100 dark:placeholder:text-zinc-600';

const LABEL = 'mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-zinc-500';

/** Icono de WhatsApp: lucide no lo trae, así que va como trazo propio. */
function WhatsAppMark({ size = 12 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
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
 * El teléfono, el WhatsApp, el correo y el enlace de agenda no aparecen como
 * texto: son lo que hace funcionar los botones redondos. No se pueden editar
 * sobre la tarjeta porque ahí no hay nada que editar, sólo un icono, y escribir
 * un número dentro de un círculo de 44 píxeles no es escribir en su sitio, es
 * esconderlo.
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

          <Field
            label="Enlace de agenda"
            icon={CalendarClock}
            id="contact-agenda"
            hint="Calendly, Google Calendar o similar, para que agenden sin escribirte."
          >
            <input
              id="contact-agenda"
              className={INPUT}
              value={card.agendaUrl}
              onChange={(e) => onChange('agendaUrl', e.target.value)}
              placeholder="https://calendly.com/tu-usuario"
              inputMode="url"
              autoComplete="off"
              spellCheck="false"
            />
          </Field>

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
