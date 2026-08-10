import { useState, useEffect, useRef } from 'react';
import {
  Copy, Check, Mail, MessageSquare, Share2, Link2,
} from 'lucide-react';
import { publicCardUrl } from '../../lib/publicRoute';
import { tapFeedback } from '../../lib/haptics';

/** Icono de WhatsApp: lucide no lo trae, así que va como trazo propio. */
function WhatsAppMark({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M17.47 14.38c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.35.22-.64.07-.3-.15-1.13-.42-2.15-1.33-.8-.71-1.34-1.6-1.5-1.9-.15-.3-.01-.46.13-.61.16-.16.3-.35.45-.53.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.07-.15-.65-1.57-.89-2.15-.23-.56-.47-.49-.65-.5h-.55c-.2 0-.5.07-.77.37-.27.3-1.02 1-1.02 2.42s1.04 2.8 1.19 3c.15.2 2.05 3.13 4.96 4.27 2.42.95 2.9.76 3.42.71.52-.05 1.68-.68 1.92-1.35.24-.66.24-1.23.17-1.35-.07-.12-.27-.2-.57-.35z" />
      <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.46 1.32 4.96L2 22l5.25-1.38c1.45.79 3.08 1.2 4.79 1.2 5.46 0 9.91-4.45 9.91-9.91S17.5 2 12.04 2zm0 18.02c-1.55 0-3.07-.42-4.4-1.2l-.32-.19-3.26.86.87-3.18-.2-.33a8.09 8.09 0 0 1-1.24-4.32c0-4.47 3.64-8.11 8.11-8.11s8.11 3.64 8.11 8.11-3.64 8.11-8.11 8.11z" />
    </svg>
  );
}

/**
 * Copia un texto al portapapeles, probando de lo moderno a lo antiguo.
 *
 * Tres intentos y no uno porque el portapapeles moderno falla más de lo que
 * parece: exige contexto seguro, permiso del navegador y que el documento tenga
 * el foco. Cualquiera de las tres cosas puede no cumplirse en el momento del
 * toque, y entonces la copia se pierde sin que nada lo indique.
 *
 * @returns {Promise<boolean>} Si se logró copiar.
 */
async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    /* Se sigue al respaldo. */
  }

  /*
    `execCommand` está obsoleto, pero es el único que funciona sin permisos y en
    navegadores donde el portapapeles moderno está bloqueado. El campo va fuera
    de la vista: visible, robaría el foco y movería la página.
  */
  try {
    const field = document.createElement('textarea');
    field.value = text;
    field.setAttribute('readonly', '');
    field.style.position = 'fixed';
    field.style.top = '-1000px';
    document.body.appendChild(field);
    field.select();
    const ok = document.execCommand('copy');
    field.remove();
    return ok;
  } catch {
    return false;
  }
}

/** Fila de una vía de envío. */
function ShareRow({ label, hint, icon: Icon, href, onClick, tone = 'neutral' }) {
  const common = 'flex w-full items-center gap-3 rounded-2xl border p-3.5 text-left'
    + ' transition-all active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2'
    + ' focus-visible:ring-white/50';

  const skin = tone === 'whatsapp'
    ? 'border-emerald-400/30 bg-emerald-500/15 hover:bg-emerald-500/25'
    : 'border-white/10 bg-white/[0.07] hover:bg-white/[0.12]';

  const body = (
    <>
      <span
        className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl border
                    border-white/10 ${tone === 'whatsapp' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-white/10 text-sky-300'}`}
        aria-hidden="true"
      >
        <Icon size={18} strokeWidth={1.9} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold leading-tight text-white">{label}</span>
        <span className="mt-0.5 block text-[11px] leading-snug text-zinc-400">{hint}</span>
      </span>
    </>
  );

  // Un enlace externo tiene que ser un enlace: con un botón que navega por
  // JavaScript se pierde el "abrir en otra pestaña" y el menú contextual.
  if (href) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => tapFeedback()}
        className={`${common} ${skin}`}
      >
        {body}
      </a>
    );
  }

  return (
    <button type="button" onClick={onClick} className={`${common} ${skin}`}>
      {body}
    </button>
  );
}

/**
 * Panel para entregar el enlace de la tarjeta.
 *
 * Sustituye al intento de usar sólo la hoja de compartir del sistema. Esa hoja
 * no existe en escritorio, y en el móvil el navegador la rechaza en silencio si
 * el documento no tiene el foco: el resultado era un botón que no hacía nada y
 * no explicaba por qué.
 *
 * Aquí las vías están a la vista y cada una funciona por su cuenta. El enlace se
 * muestra escrito, además de los botones, porque es la única forma que no
 * depende de ningún permiso ni de ninguna aplicación instalada: si todo lo demás
 * falla, se puede leer y escribir a mano.
 */
export default function ShareSheet({ card, isOpen, onClose }) {
  const [copied, setCopied] = useState(false);
  const fieldRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return undefined;
    setCopied(false);
    const onKeyDown = (event) => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  // El aviso de copiado se apaga solo: dejarlo fijo haría dudar de si el
  // segundo toque copió otra vez.
  useEffect(() => {
    if (!copied) return undefined;
    const timer = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(timer);
  }, [copied]);

  if (!isOpen) return null;

  const url = card?.id ? publicCardUrl(card.id) : '';
  const name = String(card?.fullName ?? '').trim();

  /*
    El mensaje va en primera persona y nombra a quien lo manda. Es el texto que
    va a leer un desconocido: sin el nombre, un enlace suelto en WhatsApp parece
    reenviado o sospechoso.
  */
  const message = name
    ? `Hola, soy ${name}. Te comparto mi tarjeta digital: ${url}`
    : `Te comparto mi tarjeta digital: ${url}`;

  const subject = name ? `Tarjeta digital de ${name}` : 'Mi tarjeta digital';

  const handleCopy = async () => {
    tapFeedback();
    const ok = await copyText(url);
    setCopied(ok);

    // Si no se pudo copiar, se selecciona el enlace para que baste un gesto.
    if (!ok) {
      fieldRef.current?.focus();
      fieldRef.current?.select();
    }
  };

  const openSystemSheet = async () => {
    tapFeedback();
    try {
      await navigator.share({ title: subject, text: message, url });
    } catch {
      /* Cancelar entra aquí; no es un fallo y no se avisa de nada. */
    }
  };

  return (
    <div
      role="dialog"
      aria-label="Compartir mi tarjeta"
      className="absolute inset-0 z-40 flex flex-col bg-black/95 backdrop-blur-sm"
    >
      {/* `pt-16` reserva la banda de la flecha de retroceso de la tarjeta. */}
      <div className="flex flex-1 flex-col overflow-y-auto overscroll-contain px-5 pb-6 pt-16">
        <div className="mb-4">
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-sky-400">
            Compartir
          </p>
          <h2 className="mt-1 text-xl font-bold leading-tight text-white">
            Envía tu tarjeta
          </h2>
        </div>

        {url ? (
          <>
            {/*
              El enlace, escrito y seleccionable. Es el respaldo que no depende de
              permisos ni de aplicaciones: si el portapapeles está bloqueado y no
              hay WhatsApp instalado, todavía se puede leer.
            */}
            <div className="mb-3 flex items-center gap-2 rounded-2xl border border-white/10
                            bg-black/40 p-2.5"
            >
              <Link2 size={15} className="ml-1 shrink-0 text-zinc-500" aria-hidden="true" />
              <input
                ref={fieldRef}
                readOnly
                value={url}
                aria-label="Enlace de mi tarjeta"
                onFocus={(event) => event.target.select()}
                className="min-w-0 flex-1 bg-transparent text-[11px] text-zinc-300
                           outline-none"
              />
            </div>

            <div className="flex flex-col gap-2.5">
              <ShareRow
                label={copied ? 'Enlace copiado' : 'Copiar enlace'}
                hint={copied ? 'Ya puedes pegarlo donde quieras' : 'Para pegarlo donde necesites'}
                icon={copied ? Check : Copy}
                onClick={handleCopy}
              />

              <ShareRow
                label="Enviar por WhatsApp"
                hint="Elige el contacto y se envía con mensaje"
                icon={WhatsAppMark}
                tone="whatsapp"
                href={`https://wa.me/?text=${encodeURIComponent(message)}`}
              />

              <ShareRow
                label="Enviar por correo"
                hint="Abre tu aplicación de correo"
                icon={Mail}
                href={`mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(message)}`}
              />

              <ShareRow
                label="Enviar por mensaje"
                hint="Mensaje de texto del teléfono"
                icon={MessageSquare}
                href={`sms:?&body=${encodeURIComponent(message)}`}
              />

              {/*
                La hoja del sistema va al final y sólo si existe: es la vía más
                cómoda cuando está disponible, pero no se puede confiar en ella
                como única opción porque en escritorio no existe.
              */}
              {typeof navigator !== 'undefined' && navigator.share && (
                <ShareRow
                  label="Más opciones"
                  hint="Usa el menú de compartir del sistema"
                  icon={Share2}
                  onClick={openSystemSheet}
                />
              )}
            </div>
          </>
        ) : (
          <p className="text-sm leading-relaxed text-zinc-400">
            Guarda tu tarjeta para obtener su enlace. La dirección existe a partir
            de que la guardas.
          </p>
        )}
      </div>
    </div>
  );
}
