import { useState, useEffect, useRef, useId } from 'react';
import { createPortal } from 'react-dom';
import { HelpCircle } from 'lucide-react';

/** Ancho de la burbuja, en píxeles. Tiene que coincidir con el `w-60` que sustituye. */
const WIDTH = 240;

/** Separación entre la burbuja y el icono. */
const GAP = 8;

/** Margen mínimo con el borde de la ventana, para no salirse por los lados. */
const EDGE = 8;

/** Espacio que hace falta arriba para abrir hacia arriba en lugar de hacia abajo. */
const SPACE_ABOVE = 120;

/**
 * Ayuda contextual. Funciona con hover en escritorio y con tap en móvil.
 *
 * LA BURBUJA SE DIBUJA EN UN PORTAL A `document.body`, Y ES LO QUE LA HACE VISIBLE.
 *
 * Antes era un `absolute bottom-full` dentro del propio icono, y no se veía. La culpa no
 * era del `z-index` —ya tenía `z-50`— sino del recorte: `StatCard` es
 * `relative overflow-hidden`, y el recorte de un antepasado no lo salta ninguna capa,
 * porque no es un problema de orden sino de tijera. La burbuja se abría justo por encima
 * de la etiqueta, que vive pegada al borde superior de la tarjeta, así que quedaba entera
 * fuera del área visible. Y aunque se hubiera abierto hacia dentro, sus 240 px tampoco
 * caben en una tarjeta de una cuarta parte de la rejilla: se habría cortado de lado.
 *
 * Ese `overflow-hidden` no se puede quitar: recorta a las esquinas redondeadas el
 * resplandor de `.glow::before`, que se dibuja con `inset: -1px`, es decir un píxel por
 * fuera del borde. Sin él, las tarjetas destacadas mostrarían el degradado desbordado.
 *
 * Desde el portal la burbuja cuelga de `body`, así que ningún antepasado puede recortarla
 * ni contenerla, ni ahora ni cuando alguien añada otra tarjeta con overflow. La posición
 * se calcula del rectángulo del icono y se sujeta a la ventana, de modo que el tooltip de
 * la primera y de la última tarjeta de la fila tampoco se salen por los lados.
 */
export default function Tooltip({ text, children }) {
  const id = useId();
  const btnRef = useRef(null);

  /** `null` = cerrado. Con objeto = abierto, y ese objeto es su posición fija. */
  const [pos, setPos] = useState(null);

  const show = () => {
    const r = btnRef.current?.getBoundingClientRect();
    if (!r) return;

    /*
      Centrada en el icono, pero sin salirse de la ventana. Sin esta sujeción, el
      tooltip de la tarjeta más a la izquierda se abría medio fuera de la pantalla y el
      de la última provocaba scroll horizontal en el teléfono.
    */
    const left = Math.max(EDGE, Math.min(
      r.left + r.width / 2 - WIDTH / 2,
      window.innerWidth - WIDTH - EDGE,
    ));

    /*
      Hacia arriba si hay hueco; si no, hacia abajo. Anclar por `bottom` cuando abre
      hacia arriba evita tener que medir el alto de la burbuja antes de pintarla: el
      texto puede ocupar dos líneas o cinco, y el navegador resuelve la diferencia.
    */
    setPos(r.top > SPACE_ABOVE
      ? { left, bottom: window.innerHeight - r.top + GAP }
      : { left, top: r.bottom + GAP });
  };

  const hide = () => setPos(null);

  /*
    Al desplazar o redimensionar se cierra, en lugar de recalcular.

    La posición es fija y se midió una vez: si la página se mueve, la burbuja se queda
    señalando un sitio vacío. Cerrarla es honesto y es lo que el usuario espera —el gesto
    de scroll ya dice que dejó de mirar ahí—, y cuesta un evento en lugar de recalcular en
    cada fotograma. El `true` engancha también el scroll de contenedores internos, como el
    de una hoja modal abierta.
  */
  useEffect(() => {
    if (!pos) return undefined;
    window.addEventListener('scroll', hide, true);
    window.addEventListener('resize', hide);
    return () => {
      window.removeEventListener('scroll', hide, true);
      window.removeEventListener('resize', hide);
    };
  }, [pos]);

  return (
    <span className="relative inline-flex">
      <button
        ref={btnRef}
        type="button"
        aria-label="Más información"
        aria-describedby={pos ? id : undefined}
        aria-expanded={!!pos}
        onClick={(e) => { e.preventDefault(); if (pos) hide(); else show(); }}
        /*
          Sólo el ratón abre al pasar por encima. En una pantalla táctil el navegador
          emula un `pointerenter` justo antes del `click`, así que sin este filtro el
          primer toque abría y cerraba la burbuja en el mismo gesto: parecía que el icono
          no hacía nada.
        */
        onPointerEnter={(e) => { if (e.pointerType === 'mouse') show(); }}
        onPointerLeave={(e) => { if (e.pointerType === 'mouse') hide(); }}
        onFocus={show}
        onBlur={hide}
        onKeyDown={(e) => { if (e.key === 'Escape') hide(); }}
        className="text-zinc-500 transition-colors hover:text-indigo-400"
      >
        {children || <HelpCircle size={13} />}
      </button>

      {pos && createPortal(
        <span
          id={id}
          role="tooltip"
          style={{ position: 'fixed', width: WIDTH, ...pos }}
          /*
            `z-[70]` por encima de la hoja modal, que vive en `z-[60]`: los campos de las
            hojas de captura llevan tooltips, y con un valor menor se abrirían por detrás.

            El color va escrito y no con variantes `dark:`. La burbuja cuelga de `body`,
            fuera del contenedor que fuerza el tema oscuro, así que una clase `dark:` no
            se aplicaría: saldría un texto claro sobre fondo claro, ilegible, que es
            justo el síntoma que se venía a arreglar.
          */
          className="animate-rise pointer-events-none rounded-xl border border-zinc-700
                     bg-zinc-900/95 px-3 py-2.5 text-[11px] font-normal normal-case
                     leading-relaxed tracking-normal text-zinc-100 shadow-2xl
                     shadow-zinc-950/80 backdrop-blur z-[70]"
        >
          {text}
        </span>,
        document.body,
      )}
    </span>
  );
}
