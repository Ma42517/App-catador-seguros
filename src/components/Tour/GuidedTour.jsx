import { useState, useEffect, useLayoutEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';

/**
 * src/components/Tour/GuidedTour.jsx
 *
 * Motor de los mini-tutoriales tipo "spotlight" (Call of Duty): el fondo se
 * oscurece y queda iluminado sólo el elemento del paso actual, con una tarjeta
 * que lo explica y una flecha que lo señala.
 *
 * ── Cómo ilumina (opción recorte, no interactivo) ──
 * No clona ni mueve el elemento real: dibuja un rectángulo transparente sobre su
 * posición y le da un `box-shadow` ENORME de color oscuro, que tapa toda la
 * pantalla MENOS ese rectángulo. Así el elemento se ve "iluminado" sin tocar el
 * DOM de la app, y el fondo entero queda bloqueado al tacto (sólo se avanza con
 * los botones de la tarjeta). Un halo verde suave rodea el recorte.
 *
 * ── Posicionamiento ──
 * Lee la posición real del elemento con `getBoundingClientRect()` y recoloca el
 * recorte y la tarjeta en cada cambio de paso, al redimensionar y al hacer
 * scroll. La tarjeta se pone debajo del elemento si hay sitio, o arriba si no,
 * para no salirse de la pantalla en móvil ni en escritorio.
 *
 * ── Reutilizable ──
 * No sabe nada de "Hoy": recibe `steps` (de `lib/tours.js`), el `name` para
 * personalizar el saludo, y avisa con `onFinish`/`onSkip`. Sirve igual para los
 * tutoriales de las otras pestañas.
 */

const PAD = 10; // Aire alrededor del elemento iluminado.
const CARD_W = 320; // Ancho de referencia de la tarjeta.
const GAP = 14; // Separación entre el recorte y la tarjeta.

/**
 * Lee el rect del elemento marcado con `data-tour={target}`, o null si todavía
 * no existe o no está REALMENTE visible. "Visible" aquí es estricto a propósito:
 * la pantalla "Hoy" entra con una máquina de escribir y un fundido, así que un
 * elemento puede estar ya en el DOM pero con `opacity: 0` o aún sin tamaño. Si se
 * iluminara en ese estado, el tour señalaría un hueco vacío (como pasó: el botón
 * "+" todavía no había aparecido). Devolver null mantiene el tour en espera.
 */
function readRect(target) {
  const el = document.querySelector(`[data-tour="${target}"]`);
  if (!el) return null;

  const r = el.getBoundingClientRect();
  // Sin tamaño real → aún no montado/medible.
  if (r.width === 0 && r.height === 0) return null;
  // Fuera del viewport (todavía por entrar) → esperar.
  if (r.bottom < 0 || r.top > window.innerHeight) return null;

  /*
    Opacidad del elemento o de cualquier ancestro cercano: si algo en la cadena
    está en transición de fundido (opacity < 1), aún no "terminó de aparecer".
    Se recorre hacia arriba unos niveles, que es donde viven los wrappers con
    `transition-opacity` de AISequence.
  */
  let node = el;
  for (let i = 0; i < 6 && node; i += 1) {
    const op = parseFloat(window.getComputedStyle(node).opacity);
    if (!Number.isNaN(op) && op < 0.99) return null;
    node = node.parentElement;
  }

  return r;
}

export default function GuidedTour({
  isOpen, steps, name = '', onFinish, onSkip,
}) {
  const [index, setIndex] = useState(0);
  const [rect, setRect] = useState(null);
  const [shown, setShown] = useState(false);
  /*
    `visible` separa "ya hay elemento medido" (rect) de "pintarlo a plena
    opacidad". Es la clave para que la entrada sea SUAVE y no un corte seco: el
    overlay se monta primero en opacidad 0 y, un frame después, `visible` pasa a
    true y la transición CSS lo lleva a opacidad 1. Sin este desfase de un frame,
    el navegador pinta directo al estado final y no hay fundido que ver.
  */
  const [visible, setVisible] = useState(false);

  const total = steps?.length ?? 0;
  const step = steps?.[index] ?? null;
  const isLast = index === total - 1;

  // Al abrir, arranca en el primer paso y hace el fundido de entrada.
  useEffect(() => {
    if (isOpen) {
      setIndex(0);
      const raf = requestAnimationFrame(() => setShown(true));
      return () => cancelAnimationFrame(raf);
    }
    setShown(false);
    return undefined;
  }, [isOpen]);

  // Mide el elemento del paso actual; re-mide al cambiar de paso, al
  // redimensionar y al hacer scroll (el layout puede moverse).
  const measure = useCallback(() => {
    if (!isOpen || !step) return null;
    const r = readRect(step.target);
    setRect(r);
    return r;
  }, [isOpen, step]);

  /*
    Espera ACTIVA a que el elemento del paso aparezca y esté visible. La pantalla
    "Hoy" entra con una animación (máquina de escribir + fundido), así que al
    arrancar el tour el elemento puede no estar listo todavía. En vez de adivinar
    un tiempo fijo, se reintenta la medición cada 150 ms hasta que `readRect`
    devuelve algo (ya visible); mientras tanto `rect` es null y no se pinta ni el
    recorte ni la tarjeta —el tour queda "esperando" sin señalar un hueco vacío—.
    Un tope de ~8 s evita quedarse reintentando para siempre si un paso apunta a
    algo que de verdad no existe.
  */
  useLayoutEffect(() => {
    if (!isOpen) return undefined;

    // Cada paso arranca "esperando" (sin rect) y en opacidad 0, para que su
    // aparición —o el paso al siguiente— sea un fundido suave y no un salto.
    setRect(null);
    setVisible(false);
    let tries = 0;
    const poll = setInterval(() => {
      tries += 1;
      const r = measure();
      if (r || tries > 50) clearInterval(poll);
    }, 150);

    window.addEventListener('resize', measure);
    window.addEventListener('scroll', measure, true);
    return () => {
      clearInterval(poll);
      window.removeEventListener('resize', measure);
      window.removeEventListener('scroll', measure, true);
    };
  }, [measure, isOpen, index]);

  /*
    Paso interactivo (`awaitClick`): en vez de avanzar con un botón, se espera a
    que la persona TOQUE el elemento real (el botón "+"). Se engancha un listener
    al propio elemento; cuando se activa, el tour pasa al siguiente paso. El menú
    que ese toque abre se vuelve el objetivo del paso siguiente, así que el
    avance se siente natural: toco "+", el tour ya está explicando el menú.
  */
  useEffect(() => {
    if (!isOpen || !step?.awaitClick) return undefined;
    const el = document.querySelector(`[data-tour="${step.target}"]`);
    if (!el) return undefined;
    const onClick = () => setIndex((i) => (i < total - 1 ? i + 1 : i));
    el.addEventListener('click', onClick);
    return () => el.removeEventListener('click', onClick);
  }, [isOpen, step, index, total]);

  /*
    Cuando el elemento ya está medido (`rect`), se enciende `visible` en el frame
    siguiente —no en el mismo— para que la transición CSS de opacidad/escala
    arranque desde el estado inicial y se vea el fundido. Encenderlo en el mismo
    render haría que el navegador pintara directo al estado final, sin animación.
  */
  useLayoutEffect(() => {
    if (!rect) return undefined;
    const raf = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(raf);
  }, [rect]);

  // Al cerrar, se apaga `visible` (fade-out) y se desmonta tras la transición
  /*
    Si al dejar un paso el elemento era un panel que el propio tour hizo abrir
    (el menú del botón "+"), se avisa para cerrarlo —si no, quedaría abierto
    tapando los pasos siguientes o la pantalla al terminar—. Desacoplado por un
    evento de ventana, que AdminLayout escucha para cerrar el QuickAdd.
  */
  const closeMenuIfOnMenu = () => {
    if (step?.target === 'hoy-step-menu') {
      window.dispatchEvent(new Event('expandia:tour-close-quickadd'));
    }
  };

  // de 500 ms, para que la salida también sea suave y no un corte seco.
  const finish = () => {
    closeMenuIfOnMenu();
    setVisible(false); setShown(false); setTimeout(() => onFinish?.(), 420);
  };
  const skip = () => {
    closeMenuIfOnMenu();
    setVisible(false); setShown(false); setTimeout(() => onSkip?.(), 420);
  };

  const next = () => {
    if (isLast) finish();
    else { closeMenuIfOnMenu(); setIndex((i) => i + 1); }
  };

  // Cerrar con Escape = omitir. Bloquea el scroll del fondo mientras está abierto.
  useEffect(() => {
    if (!isOpen) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') skip(); };
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  if (!isOpen || !step) return null;

  /*
    Mientras el elemento del paso no esté medido y visible (`rect` null), el tour
    NO pinta nada: ni el fondo oscuro ni la tarjeta. Así se evita el defecto de
    mostrar la tarjeta flotando en el centro sobre una pantalla a medio cargar
    —que es justo lo que se veía—. El polling del effect sigue intentando; en
    cuanto el elemento aparece y termina su fundido, se pinta todo de una vez.
  */
  if (!rect) return null;

  const vw = window.innerWidth;
  const vh = window.innerHeight;

  // Geometría del recorte iluminado.
  const hole = {
    top: rect.top - PAD,
    left: rect.left - PAD,
    width: rect.width + PAD * 2,
    height: rect.height + PAD * 2,
  };

  /*
    ¿El elemento es casi cuadrado (como el botón "+")? Entonces el recorte es
    circular; si es alargado (barra, mensaje) se usan esquinas suaves. Así el
    halo abraza la forma real en lugar de encajonarla.
  */
  const isRound = Math.abs(rect.width - rect.height) < 12;
  const holeRadius = isRound ? '9999px' : '18px';

  /*
    El resplandor es una ELIPSE que sigue la forma del elemento, no un círculo
    basado en el lado mayor —eso hacía que un mensaje ancho tuviera un halo del
    tamaño de media pantalla—. Se extiende un margen fijo alrededor del elemento,
    igual en ancho y alto, para que el halo "respire" sin desbordarse.
  */
  const GLOW_MARGIN = 40;
  const glowCx = hole.left + hole.width / 2;
  const glowCy = hole.top + hole.height / 2;
  const glowW = hole.width + GLOW_MARGIN * 2;
  const glowH = hole.height + GLOW_MARGIN * 2;

  /*
    Posición de la tarjeta: debajo del elemento si cabe, si no arriba. Centrada
    horizontalmente respecto al elemento pero sin salirse de los bordes. Si no
    se encontró el elemento, la tarjeta se centra en la pantalla (respaldo).
  */
  let cardStyle;
  let caretBelow = false; // true = la flecha sale de la parte de ARRIBA de la tarjeta (elemento arriba).
  const spaceBelow = vh - (hole.top + hole.height);
  const placeBelow = spaceBelow > 220;
  const cx = hole.left + hole.width / 2;
  const left = Math.min(Math.max(cx - CARD_W / 2, 12), vw - CARD_W - 12);
  const caretLeft = Math.min(Math.max(cx, left + 24), left + CARD_W - 24);
  if (placeBelow) {
    cardStyle = { top: hole.top + hole.height + GAP, left, width: CARD_W };
    caretBelow = true;
  } else {
    cardStyle = { bottom: vh - hole.top + GAP, left, width: CARD_W };
    caretBelow = false;
  }

  const title = (step.title || '').replace('{name}', name || '');

  // Entrada suave: el fondo se funde y la tarjeta sube y crece un poco. Ambos
  // gobernados por `visible` (que se enciende un frame después de medir), y por
  // `shown` para el cierre. El recorte también transiciona su posición/tamaño,
  // así que al pasar de un paso a otro el halo se "desliza" al nuevo elemento.
  const on = shown && visible;
  const awaitClick = Boolean(step.awaitClick);

  return createPortal(
    <div
      /*
        En un paso interactivo el contenedor entero deja pasar los toques
        (`pointer-events-none`) para que el clic llegue al elemento real (el botón
        "+"); la tarjeta vuelve a capturarlos con `pointer-events-auto` para que
        "Omitir" siga funcionando. En un paso normal, el contenedor sí intercepta
        (bloquea el fondo y avanza al tocar fuera de la tarjeta).
      */
      className={`fixed inset-0 z-[120] ${awaitClick ? 'pointer-events-none' : ''}`}
      role="dialog"
      aria-modal="true"
      aria-label={`Tutorial, paso ${index + 1} de ${total}`}
    >
      {/*
        Capa que oscurece y recorta: una caja sobre el elemento con una sombra
        gigante que tapa todo MENOS ese hueco. El hueco es circular si el
        elemento es redondo (botón "+") o de esquinas suaves si es rectangular.
        Sin aro/borde duro: el resplandor lo pone la capa de abajo. Hace fade-in
        suave. Tocar fuera de la tarjeta avanza el tour.
      */}
      <div
        aria-hidden="true"
        onClick={awaitClick ? undefined : next}
        className={`absolute transition-all duration-500 ease-out
                    ${awaitClick ? 'pointer-events-none' : ''}`}
        style={{
          top: hole.top,
          left: hole.left,
          width: hole.width,
          height: hole.height,
          borderRadius: holeRadius,
          opacity: on ? 1 : 0,
          boxShadow: '0 0 0 9999px rgba(0,0,0,0.55)',
        }}
      />

      {/*
        Resplandor que ABRAZA el elemento: una elipse que sigue su forma (ancho y
        alto propios, no un círculo del lado mayor), así un mensaje ancho no tiene
        un halo de media pantalla. El centro es TRANSPARENTE para que el elemento
        apuntado se vea nítido —la luz vive en el anillo exterior y se desvanece—.
        No intercepta toques (`pointer-events-none`).
      */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute transition-opacity duration-500 ease-out"
        style={{
          top: glowCy - glowH / 2,
          left: glowCx - glowW / 2,
          width: glowW,
          height: glowH,
          opacity: on ? 1 : 0,
          /*
            Centro transparente hasta ~55% (no tapa el elemento), luego el brillo
            marfil/verde y desvanecido a transparente en el borde. `closest-side`
            hace que el degradado respete la proporción de la elipse.
          */
          background: 'radial-gradient(ellipse closest-side, transparent 52%, rgba(255,253,249,0.5) 70%, rgba(190,242,210,0.3) 84%, transparent 100%)',
          filter: 'blur(10px)',
        }}
      />

      {/* ── Tarjeta del tutorial (fade + deslizamiento/escala suaves) ── */}
      <div
        className="pointer-events-auto absolute rounded-2xl border-2 border-[#1B4332]
                   bg-[#F9F6F0] p-4 text-left shadow-2xl transition-all duration-500 ease-out
                   dark:border-emerald-500/60 dark:bg-zinc-900"
        style={{
          ...cardStyle,
          opacity: on ? 1 : 0,
          transform: `${cardStyle.transform ? `${cardStyle.transform} ` : ''}translateY(${on ? '0' : '10px'}) scale(${on ? 1 : 0.97})`,
        }}
      >
        {/* Caret: triángulo que apunta al elemento. Acompaña el fade de la tarjeta. */}
        <span
          aria-hidden="true"
          className="fixed h-3 w-3 rotate-45 border-[#1B4332] bg-[#F9F6F0] transition-opacity
                     duration-500 ease-out dark:border-emerald-500/60 dark:bg-zinc-900"
          style={caretBelow
            ? { top: (cardStyle.top ?? 0) - 6, left: caretLeft - 6, borderLeftWidth: 2, borderTopWidth: 2, opacity: on ? 1 : 0 }
            : { bottom: (cardStyle.bottom ?? 0) - 6, left: caretLeft - 6, borderRightWidth: 2, borderBottomWidth: 2, opacity: on ? 1 : 0 }}
        />

        {/* Badge: PASO X DE N 🌟 */}
        <span
          className="inline-flex items-center gap-1 rounded-full bg-[#1B4332] px-2.5 py-1
                     text-[11px] font-bold uppercase tracking-wide text-[#F9F6F0]
                     dark:bg-emerald-600"
        >
          Paso {index + 1} de {total} 🌟
        </span>

        <h2 className="mt-3 text-lg font-bold leading-snug text-[#231F1B] dark:text-white">
          {title}
        </h2>
        <p className="mt-1.5 text-base leading-relaxed text-[#5C5346] dark:text-zinc-300">
          {step.body}
        </p>

        {awaitClick ? (
          /*
            Paso interactivo: no hay "Entendido". Se muestra la llamada a la acción
            (que invita a tocar el elemento real, iluminado abajo) con un pulso
            suave, y sólo queda "Omitir" por si la persona no quiere continuar.
          */
          <>
            <p className="mt-3 animate-pulse text-sm font-bold text-[#1B4332] dark:text-emerald-400">
              {step.cue || 'Tócalo para continuar'}
            </p>
            <div className="mt-2 flex justify-end">
              <button
                type="button"
                onClick={skip}
                className="rounded-full px-3 py-2 text-sm font-semibold text-[#5C5346]
                           transition-colors hover:text-[#231F1B] dark:text-zinc-400
                           dark:hover:text-white"
              >
                Omitir
              </button>
            </div>
          </>
        ) : (
          <div className="mt-4 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={skip}
              className="rounded-full px-3 py-2 text-sm font-semibold text-[#5C5346]
                         transition-colors hover:text-[#231F1B] dark:text-zinc-400
                         dark:hover:text-white"
            >
              Omitir
            </button>
            <button
              type="button"
              onClick={next}
              className="rounded-full bg-[#1B4332] px-5 py-2.5 text-sm font-bold text-white
                         shadow-md transition-all hover:brightness-110 active:scale-95
                         dark:bg-emerald-600"
            >
              {isLast ? '¡Listo, empezar! ✓' : 'Entendido ➔'}
            </button>
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
