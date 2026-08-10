import { useState, useEffect, useRef, forwardRef } from 'react';
import { X, User, Phone, Lock, Loader2 } from 'lucide-react';

const INPUT =
  'w-full rounded-xl border border-white/10 bg-white/5 py-3 pl-11 pr-4 text-white '
  + 'outline-none transition-colors placeholder:text-zinc-500 focus:border-blue-500';

/**
 * Espera antes de arrastrar el campo a la vista.
 *
 * El teclado del sistema tarda en desplegarse, y hasta que termina el navegador
 * no ha recalculado el alto visible. Desplazar antes de eso mueve el campo a un
 * centro que está por dejar de existir, y el teclado acaba tapándolo igual.
 */
const KEYBOARD_SETTLE_MS = 300;

/**
 * Campo con el icono dentro, para guiar sin necesidad de etiqueta visible.
 *
 * Va con `forwardRef` porque el modal enfoca el primer campo al abrirse: sin
 * reenviar la referencia, ésta apuntaría al componente y no al `input`, y el
 * foco nunca llegaría.
 *
 * Al recibir el foco, el campo se arrastra al centro de lo que queda visible.
 * Esa lógica vive aquí y no en cada uso: repetida campo por campo, el día que
 * se añada un tercero se olvidaría justo en el que quede más abajo, que es el
 * que más lo necesita.
 */
const IconInput = forwardRef(({ id, label, icon: Icon, onFocus, ...props }, ref) => {
  const scrollTimer = useRef(null);

  // Si el modal se cierra durante la espera, el temporizador queda vivo. El
  // desplazamiento ya no haría nada visible, pero dejarlo suelto es una fuga.
  useEffect(() => () => clearTimeout(scrollTimer.current), []);

  const handleFocus = (event) => {
    const field = event.target;
    clearTimeout(scrollTimer.current);
    scrollTimer.current = setTimeout(() => {
      field.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, KEYBOARD_SETTLE_MS);

    // Se respeta el manejador que llegue por props en lugar de sustituirlo.
    onFocus?.(event);
  };

  return (
    <div>
      {/* La etiqueta existe para el lector de pantalla: sin ella, el campo se
          anuncia sólo por su texto de ejemplo, que desaparece al escribir. */}
      <label htmlFor={id} className="sr-only">{label}</label>
      <div className="relative">
        <Icon
          size={17}
          className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400"
          aria-hidden="true"
        />
        <input ref={ref} id={id} className={INPUT} onFocus={handleFocus} {...props} />
      </div>
    </div>
  );
});

IconInput.displayName = 'IconInput';

/**
 * Captura del prospecto antes de entregar el contacto del asesor.
 *
 * Quien llena esto no es el asesor: es la persona que tiene el teléfono en la
 * mano un momento. De ahí las decisiones de esta pantalla —dos campos y nada
 * más, textos en segunda persona, y el teclado correcto en cada uno—: cada
 * fricción extra es una probabilidad de que devuelva el teléfono sin escribir.
 * El nombre y el WhatsApp bastan para dar seguimiento; pedir además el correo
 * alargaba el trámite sin añadir una vía de contacto que se use.
 *
 * El intercambio es explícito: sus datos a cambio del contacto. Por eso el botón
 * dice qué obtiene y la nota de privacidad va debajo, donde se lee justo antes
 * de decidir.
 */
export default function LeadCaptureModal({ isOpen, onClose, onSubmit, advisorName }) {
  const [name, setName] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [error, setError] = useState('');
  const [isSending, setSending] = useState(false);

  const firstFieldRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return undefined;

    setName('');
    setWhatsapp('');
    setError('');
    setSending(false);

    const onKeyDown = (event) => { if (event.key === 'Escape') onClose(); };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKeyDown);

    // El foco entra al primer campo: quien recibe el teléfono ya puede escribir.
    const timer = setTimeout(() => firstFieldRef.current?.focus(), 80);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const submit = async (event) => {
    event.preventDefault();

    if (!name.trim()) {
      setError('Escribe tu nombre completo.');
      return;
    }
    // Diez dígitos es el número nacional en México; se cuentan sólo dígitos para
    // aceptar espacios, guiones y paréntesis como los escriba cada persona.
    if (whatsapp.replace(/\D/g, '').length < 10) {
      setError('Escribe tu WhatsApp a 10 dígitos.');
      return;
    }
    setSending(true);
    await onSubmit({ name: name.trim(), whatsapp: whatsapp.trim() });
    setSending(false);
  };

  return (
    /*
      El overlay desplaza en lugar de recortar. Con el modal centrado a la
      fuerza, al abrirse el teclado el alto visible se parte por la mitad y el
      centro de esa mitad cae detrás del teclado: los campos quedaban
      inalcanzables, sin forma de llegar a ellos.

      Ahora el contenido se ancla arriba en móvil y puede deslizarse, y el
      `pb-32` reserva el hueco que el teclado va a ocupar, para que el último
      campo pueda subir por encima de él. En pantallas medianas vuelve al
      centro, donde no hay teclado que estorbe.

      Ese hueco se iguala a partir de `md` (`md:pb-8 md:pt-8`). Centrar con
      128 px de relleno abajo y 48 arriba no centra: el desequilibrio empuja la
      tarjeta unos 40 px sobre el eje, y en escritorio —donde no hay teclado que
      justifique el hueco— se nota como un error de alineación.

      `z-[80]` se conserva en lugar del `z-50` indicado: este modal se monta
      dentro de `DigitalCardScreen`, que es `fixed z-[75]`, y la app tiene una
      escala de capas ya establecida —hojas en 60, pantallas completas en 70,
      avisos en 80—. El z-index no influye en el solape del teclado, así que
      bajarlo no arreglaría nada y sí dejaría el modal por debajo de esas capas
      el día que se monte desde otro sitio.
    */
    <div
      className="fixed inset-0 z-[80] flex items-start justify-center overflow-y-auto
                 bg-black/60 px-4 pb-32 pt-12 backdrop-blur-md
                 md:items-center md:pb-8 md:pt-8"
      role="dialog"
      aria-modal="true"
      aria-labelledby="lead-title"
    >
      {/* Toque fuera para cerrar, como botón para que responda al teclado */}
      <button
        type="button"
        aria-label="Cerrar"
        onClick={onClose}
        className="fixed inset-0 h-full w-full cursor-default"
      />

      {/*
        `shrink-0` evita que el contenedor flex comprima la tarjeta cuando el
        alto disponible se queda corto: aplastada, los campos se solapan entre
        sí en vez de poder deslizarse. `my-8` mantiene aire arriba y abajo
        durante el desplazamiento.
      */}
      <div
        className="animate-rise relative my-8 w-full max-w-sm shrink-0 overflow-hidden
                   rounded-3xl border border-white/10 bg-zinc-900/90 p-6 shadow-2xl
                   md:my-auto"
      >
        {/* Resplandor de fondo: es lo que da profundidad al cristal */}
        <span
          className="pointer-events-none absolute -right-10 -top-14 h-44 w-44 rounded-full
                     bg-blue-500/20 blur-3xl"
          aria-hidden="true"
        />
        <span
          className="pointer-events-none absolute -bottom-16 -left-10 h-40 w-40 rounded-full
                     bg-indigo-600/15 blur-3xl"
          aria-hidden="true"
        />

        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar"
          className="absolute right-4 top-4 z-10 grid h-8 w-8 place-items-center rounded-full
                     text-zinc-400 transition-colors hover:bg-white/10 hover:text-white
                     focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
        >
          <X size={17} />
        </button>

        <div className="relative">
          <h2 id="lead-title" className="mb-1 pr-8 text-xl font-semibold text-white">
            Intercambiemos datos
          </h2>
          <p className="mb-6 text-sm leading-relaxed text-zinc-400">
            Por favor, ingresa tu información para que
            {advisorName ? ` ${advisorName}` : ' el asesor'} pueda darte un seguimiento
            personalizado.
          </p>

          {/*
            `noValidate` deja la validación en nuestras manos: las burbujas del
            navegador salen en su propio idioma, no en el de la app.
          */}
          <form onSubmit={submit} noValidate className="flex flex-col gap-3">
            <IconInput
              ref={firstFieldRef}
              id="lead-name"
              label="Tu nombre completo"
              icon={User}
              value={name}
              onChange={(event) => { setName(event.target.value); setError(''); }}
              placeholder="Tu Nombre Completo"
              autoComplete="name"
              autoCapitalize="words"
            />

            <IconInput
              id="lead-whatsapp"
              label="Tu WhatsApp"
              icon={Phone}
              value={whatsapp}
              onChange={(event) => { setWhatsapp(event.target.value); setError(''); }}
              placeholder="Tu WhatsApp"
              inputMode="tel"
              autoComplete="tel"
            />

            {error && (
              <p role="alert" className="text-xs font-medium text-rose-400">{error}</p>
            )}

            <button
              type="submit"
              disabled={isSending}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl
                         bg-gradient-to-r from-blue-600 to-indigo-600 py-3 font-semibold
                         text-white transition-all hover:shadow-[0_0_20px_rgba(79,70,229,0.4)]
                         active:scale-[0.98] disabled:cursor-wait disabled:opacity-70"
            >
              {isSending && <Loader2 size={16} className="animate-spin" />}
              {isSending ? 'Preparando contacto...' : 'Desbloquear Contacto'}
            </button>
          </form>

          {/*
            La nota dice lo que de verdad ocurre. Prometer "encriptados" sería
            falso: los datos quedan en el teléfono del asesor en texto plano, y
            es una afirmación sobre los datos personales de un tercero que no se
            puede sostener.
          */}
          <p className="mt-4 flex items-center justify-center gap-1.5 text-center text-xs text-zinc-500">
            <Lock size={12} className="shrink-0" aria-hidden="true" />
            Sólo tu asesor recibirá estos datos
          </p>
        </div>
      </div>
    </div>
  );
}
