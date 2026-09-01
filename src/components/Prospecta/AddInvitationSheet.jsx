import {
  useEffect, useLayoutEffect, useRef, useState,
} from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Gift } from 'lucide-react';

/*
  Campo de banca privada: fondo casi negro con un filo apenas visible que se
  aclara al enfocar. Mismo criterio que `VIPPassFields`, pero con `text-[16px]`
  a propósito: por debajo de 16px, Safari en iOS hace auto-zoom al enfocar un
  input y descuadra la hoja. El precio de evitarlo es un texto un punto mayor,
  que en un campo de captura no molesta.
*/
const INPUT = 'w-full min-w-0 rounded-xl border border-neutral-800 bg-neutral-900 '
  + 'px-4 py-4 text-[16px] text-white placeholder-neutral-600 transition-colors '
  + 'focus:border-neutral-500 focus:outline-none';

/** Código de país fijo. Vive aparte para no repetirlo entre la UI y el valor guardado. */
const COUNTRY_CODE = '+52';

/** ¿Hay suficiente para agregar el contacto? Nombre y un teléfono verosímil. */
function canSubmit(name, phone) {
  return name.trim().length > 1 && phone.replace(/\D/g, '').length >= 10;
}

/**
 * src/components/Prospecta/AddInvitationSheet.jsx
 *
 * Hoja inferior para agregar una invitación de cortesía (un "pase VIP").
 *
 * Reemplaza la captura en línea que antes crecía dentro de `VIPPassFields`:
 * en lugar de desplegar un par de campos que deformaban la vista, el botón
 * "+ Agregar invitación" abre esta hoja, se captura un contacto de una vez y
 * al confirmar se devuelve al padre vía `onAdd`. El padre sigue siendo el
 * dueño de la lista de pases; esta hoja no guarda estado entre aperturas.
 *
 * Se dibuja en un portal a `document.body`, por la misma razón documentada en
 * `BottomSheet.jsx`: cualquier ancestro con `transform`/`filter` (como el
 * `.animate-rise` del diagnóstico) se vuelve el bloque contenedor de un
 * `position: fixed` y la hoja quedaría anclada a media pantalla. Y como el
 * tema `.dark` tampoco cruza el portal, un ancla en el árbol original
 * pregunta con `closest` si toca tema oscuro y se reaplica en la raíz del
 * portal.
 *
 * Móvil: hoja inferior con esquinas superiores redondeadas y barra de
 * arrastre. Escritorio (`sm:`): tarjeta centrada. En ambos casos ocupa sólo
 * lo necesario para los campos, el banner y el botón — no la pantalla entera.
 *
 * @param {boolean} isOpen
 * @param {() => void} onClose
 * @param {(contact: {name: string, phone: string}) => void} onAdd El teléfono llega ya con el código de país.
 */
export default function AddInvitationSheet({ isOpen, onClose, onAdd }) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');

  // Cada apertura arranca en blanco: es un contacto nuevo, no la continuación
  // del anterior.
  useEffect(() => {
    if (isOpen) {
      setName('');
      setPhone('');
    }
  }, [isOpen]);

  /*
    El tema no se hereda a través de un portal (ver la nota de `BottomSheet.jsx`):
    sin este ancla y sin reaplicar `.dark`, la hoja saldría en tema claro en
    medio de una pantalla negra.
  */
  const anchorRef = useRef(null);
  const [isDarkContext, setDarkContext] = useState(false);
  useLayoutEffect(() => {
    if (isOpen) setDarkContext(!!anchorRef.current?.closest('.dark'));
  }, [isOpen]);

  // Escape para cerrar y congelar el scroll de la página mientras está abierta.
  useEffect(() => {
    if (!isOpen) return undefined;
    const onKeyDown = (e) => { if (e.key === 'Escape') onClose(); };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen, onClose]);

  const ready = canSubmit(name, phone);

  const submit = (e) => {
    e.preventDefault();
    if (!ready) return;
    /*
      El teléfono se guarda con el código de país delante: el prefijo es un
      adorno en pantalla, pero `vipPassLink` arma el `wa.me` a partir del valor
      guardado, así que sin el código el enlace saldría a un número local
      inválido.
    */
    onAdd({ name: name.trim(), phone: `${COUNTRY_CODE} ${phone.trim()}` });
    onClose();
  };

  const anchor = <span ref={anchorRef} className="hidden" aria-hidden="true" />;

  return (
    <>
      {anchor}
      {createPortal(
        <div className={isDarkContext ? 'dark' : undefined}>
          <AnimatePresence>
            {isOpen && (
              <motion.div
                className="fixed inset-0 z-[95] flex items-end justify-center sm:items-center sm:p-4"
                role="dialog"
                aria-modal="true"
                aria-label="Regalar un Pase VIP"
              >
                {/* Overlay oscuro con desenfoque. */}
                <motion.button
                  type="button"
                  aria-label="Cerrar"
                  onClick={onClose}
                  className="absolute inset-0 h-full w-full cursor-default bg-black/60 backdrop-blur-sm"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                />

                {/*
                  El panel. En móvil sube desde abajo (`y`) y se ancla al borde
                  inferior con esquinas superiores redondeadas; en escritorio
                  queda como tarjeta centrada. No ocupa toda la pantalla: sólo
                  crece con su contenido, con tope de 90vh por si el teclado
                  reduce el alto disponible.
                */}
                <motion.div
                  initial={{ y: '100%', opacity: 1 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: '100%', opacity: 1 }}
                  transition={{ type: 'spring', damping: 32, stiffness: 320 }}
                  className="relative flex max-h-[90vh] w-full max-w-lg flex-col overflow-y-auto
                             overscroll-contain rounded-t-3xl bg-neutral-950 p-6 shadow-2xl
                             shadow-black/70 pb-[max(1.5rem,env(safe-area-inset-bottom))]
                             sm:rounded-3xl"
                >
                  {/* Barra de arrastre: indica que la hoja se puede deslizar hacia abajo. */}
                  <div
                    className="mx-auto mb-6 h-1.5 w-12 shrink-0 rounded-full bg-neutral-800"
                    aria-hidden="true"
                  />

                  <h2 className="mb-6 text-xl font-medium text-white">Regalar un Pase VIP</h2>

                  <form onSubmit={submit} className="space-y-3">
                    {/* Campo 1: nombre limpio. */}
                    <input
                      className={INPUT}
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Nombre"
                      aria-label="Nombre del invitado"
                      autoComplete="off"
                      autoFocus
                    />

                    {/*
                      Campo 2: teléfono con prefijo fijo. El código de país queda
                      a la izquierda, desaturado, y el resto del campo es sólo
                      para los números. El borde envuelve ambos para que se lea
                      como un único input y no como dos cajas pegadas.
                    */}
                    <div className="flex items-center gap-2 rounded-xl border border-neutral-800
                                    bg-neutral-900 px-4 transition-colors
                                    focus-within:border-neutral-500"
                    >
                      <span className="shrink-0 text-[16px] text-neutral-500" aria-hidden="true">
                        {COUNTRY_CODE}
                      </span>
                      <input
                        className="w-full min-w-0 border-0 bg-transparent py-4 text-[16px] text-white
                                   placeholder-neutral-600 focus:outline-none"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="Teléfono (WhatsApp)"
                        aria-label="Teléfono del invitado"
                        type="tel"
                        inputMode="tel"
                        autoComplete="off"
                      />
                    </div>

                    {/* Banner de valor: informativo y sutil, sin brillo ni color saturado. */}
                    <div className="mt-4 flex items-start gap-3 rounded-xl border border-neutral-800
                                    bg-neutral-900/50 p-4"
                    >
                      <Gift
                        size={18}
                        strokeWidth={1.75}
                        className="mt-0.5 shrink-0 text-neutral-500"
                        aria-hidden="true"
                      />
                      <p className="text-sm text-neutral-400">
                        Esta persona recibirá un pase VIP para un análisis patrimonial a tu nombre.
                      </p>
                    </div>

                    {/*
                      CTA de alto contraste: blanco sobre negro. En una hoja de
                      puro negro el contraste es el énfasis; cualquier color
                      neón rompería la sobriedad de la vista.
                    */}
                    <button
                      type="submit"
                      disabled={!ready}
                      className="mt-4 w-full rounded-xl bg-neutral-100 px-4 py-4 text-[16px]
                                 font-medium text-black transition-colors hover:bg-white
                                 active:scale-[0.99] disabled:cursor-not-allowed
                                 disabled:bg-neutral-800 disabled:text-neutral-500"
                    >
                      Agregar contacto
                    </button>
                  </form>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>,
        document.body,
      )}
    </>
  );
}
