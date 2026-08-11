import { Users, TrendingUp } from 'lucide-react';

/**
 * Gestión de Promotoría: el cascarón.
 *
 * Vive aparte del hub de Productividad a propósito, aunque las dos hablen de
 * rendimiento. Productividad mide **lo propio**: las metas, los bloques de
 * tiempo y las rachas de quien está mirando. Esto mide **a otros**, y esa
 * diferencia cambia todo lo que va dentro —una cifra baja aquí es una
 * conversación con una persona, no una tarea que hacer—. Mezclarlas obligaría a
 * que cada tarjeta explicara de quién habla.
 *
 * No recibe props ni consulta la base todavía: es la estructura donde entrará la
 * lista de asesores. Mantenerlo sin datos hace que esta fase se pueda desplegar
 * sin esperar a que exista la relación promotor–asesor en Supabase, que es la
 * pieza que falta y la que hay que diseñar con cuidado.
 *
 * El ancho, el centrado y el hueco de la barra inferior los pone la carcasa
 * (`AdminLayout`), así que aquí no se repiten: duplicarlos daría un doble
 * margen en escritorio.
 */
export default function PromotorDashboard() {
  return (
    <div className="animate-rise py-6">
      <header className="mb-6">
        <p className="text-[11px] font-bold uppercase tracking-widest text-indigo-400">
          Mi Promotoría
        </p>
        <h1 className="mt-1 flex items-center gap-2.5 text-2xl font-bold leading-tight
                       tracking-tight text-white"
        >
          <Users size={24} strokeWidth={1.9} className="shrink-0 text-indigo-400" aria-hidden="true" />
          Gestión de Equipo y Rendimiento
        </h1>
        <p className="mt-2 text-xs leading-relaxed text-zinc-400">
          Desde aquí darás seguimiento a tus asesores: quién está activo, quién
          necesita apoyo y cómo va el equipo contra su meta.
        </p>
      </header>

      {/*
        Marcador de posición con borde discontinuo, que es la convención del
        proyecto para lo que todavía no existe (`EmptyState`). Sólido parecería
        una tarjeta cargando y alguien se quedaría esperando.
      */}
      <div
        className="rounded-2xl border border-dashed border-zinc-700 bg-zinc-900/40 px-6 py-12
                   text-center"
      >
        <span
          className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-xl border
                     border-indigo-500/30 bg-indigo-500/10 text-indigo-300"
          aria-hidden="true"
        >
          <TrendingUp size={22} strokeWidth={1.9} />
        </span>

        <p className="text-sm font-semibold text-zinc-200">
          Aquí se mostrará la lista de asesores activos y sus métricas de
          productividad.
        </p>
        <p className="mx-auto mt-2 max-w-sm text-xs leading-relaxed text-zinc-500">
          Todavía no existe la relación entre promotor y asesor en la base, así que
          no hay a quién listar. Es lo siguiente que hay que construir.
        </p>
      </div>
    </div>
  );
}
