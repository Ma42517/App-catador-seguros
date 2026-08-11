import { Sparkles, FileText } from 'lucide-react';
import { attachmentKind } from '../../data/attachments';
import { categoryOf } from '../../data/announcements';

/**
 * Destacados: los últimos comunicados como cuadros que se deslizan.
 *
 * Es el patrón de las apps de reparto —una fila horizontal de piezas cuadradas
 * que se arrastra con el pulgar— y aquí resuelve un problema concreto: el muro es
 * una columna, así que el cuarto comunicado ya está fuera de la pantalla y sólo
 * se descubre desplazando. En una fila, ocho caben de un vistazo.
 *
 * Cuadrados y no rectángulos anchos: el flyer es lo que el asesor va a compartir,
 * y un cuadrado deja ver de qué es la imagen sin recortarla tanto como una tira
 * apaisada.
 *
 * Tocar uno **no** comparte: lleva al comunicado completo de la lista de abajo.
 * Compartir desde aquí saltaría el texto —las bases, la fecha, las condiciones— y
 * el flyer llegaría al prospecto sin el contexto que el promotor escribió.
 */
export default function FeaturedRow({ items, onSelect }) {
  if (items.length === 0) return null;

  return (
    <section className="mb-6">
      <h3 className="mb-2.5 flex items-center gap-2 text-[11px] font-bold uppercase
                     tracking-widest text-indigo-500 dark:text-indigo-400"
      >
        <Sparkles size={13} aria-hidden="true" />
        Destacados
      </h3>

      {/*
        `snap-x` con `snap-start` en cada pieza hace que el arrastre se detenga
        encajado en un cuadro y no a media pieza: es lo que separa un carrusel de
        una fila que simplemente se desborda.

        La barra se esconde en móvil porque ahí se arrastra con el dedo y sólo
        robaría alto. En escritorio, `lg:grid` convierte la fila en cuadrícula: con
        ratón, arrastrar en horizontal es incómodo y ahí sí sobra el ancho.
      */}
      <div
        className="-mx-1 flex snap-x snap-mandatory gap-3 overflow-x-auto px-1 pb-2
                   [scrollbar-width:none] [&::-webkit-scrollbar]:hidden
                   lg:mx-0 lg:grid lg:grid-cols-4 lg:snap-none lg:overflow-visible lg:px-0"
      >
        {items.map((item) => {
          const category = categoryOf(item.category);
          const isImage = item.fileUrl && attachmentKind(item.fileUrl) === 'image';

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelect?.(item.id)}
              className="group relative aspect-square w-[8.5rem] shrink-0 snap-start
                         overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-100
                         text-left transition-transform active:scale-[0.97]
                         focus-visible:outline-none focus-visible:ring-2
                         focus-visible:ring-indigo-500 lg:w-auto
                         dark:border-white/10 dark:bg-zinc-900"
            >
              {isImage ? (
                <img
                  src={item.fileUrl}
                  alt=""
                  loading="lazy"
                  className="absolute inset-0 h-full w-full object-cover transition-transform
                             duration-300 group-hover:scale-105"
                />
              ) : (
                <span
                  className="absolute inset-0 grid place-items-center bg-gradient-to-br
                             from-zinc-800 to-zinc-950 text-zinc-600"
                  aria-hidden="true"
                >
                  <FileText size={30} strokeWidth={1.6} />
                </span>
              )}

              {/*
                Velo desde abajo. Va sobre la imagen y no como fondo del texto: un
                recuadro sólido taparía justo la parte del flyer que dice de qué
                es, y con la foto elegida por cada promotoría no se puede contar
                con ningún color de fondo.
              */}
              <span
                className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25
                           to-transparent"
                aria-hidden="true"
              />

              <span className="absolute inset-x-0 bottom-0 p-2.5">
                <span className={`block text-[9px] font-bold uppercase tracking-wider
                  ${category.tone}`}
                >
                  {category.short}
                </span>
                <span className="mt-0.5 line-clamp-2 block text-[11px] font-semibold
                                 leading-tight text-white"
                >
                  {item.title}
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
