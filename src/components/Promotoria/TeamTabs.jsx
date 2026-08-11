import {
  Users, UserCheck, LayoutDashboard, Megaphone, Activity,
} from 'lucide-react';

/**
 * Las cinco tarjetas de arriba, que además son la navegación.
 *
 * Antes eran un resumen que sólo se miraba, y tres de sus cinco cifras no
 * existían en ninguna tabla: ocupaban el mejor sitio de la pantalla para no decir
 * nada. Como pestañas, cada una lleva a algo que se puede hacer.
 *
 * Las dos primeras siguen mostrando su número porque el número **es** la
 * información —cuántos hay, cuántos esperan—. Las otras tres no llevan cifra: son
 * accesos, y un número inventado encima de un acceso sólo confunde sobre qué pasa
 * al pulsarlo.
 */
const TEAM_TABS = [
  { key: 'asesores', label: 'Asesores', Icon: Users, counts: true },
  { key: 'aprobar', label: 'Por Aprobar', Icon: UserCheck, counts: true },
  { key: 'workspace', label: 'Acceso Workspace', Icon: LayoutDashboard },
  { key: 'alerta', label: 'Publicar Alerta', Icon: Megaphone },
  { key: 'actividad', label: 'Actividad General', Icon: Activity },
];

export default function TeamTabs({ activeTab, onChange, total, pendingCount }) {
  const valueFor = (key) => {
    if (key === 'asesores') return String(total);
    if (key === 'aprobar') return String(pendingCount);
    return null;
  };

  return (
    <div
      /*
        En móvil es una fila que se arrastra y en escritorio una cuadrícula.
        `snap-x` con `snap-start` hace que el arrastre se detenga encajado en una
        tarjeta y no a media pieza, que es la diferencia entre un carrusel y una
        fila que se desborda.
      */
      className="mb-6 flex snap-x snap-mandatory gap-3 overflow-x-auto pb-1
                 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden
                 sm:grid sm:grid-cols-3 sm:snap-none sm:overflow-visible
                 lg:grid-cols-5"
      role="tablist"
      aria-label="Secciones de la promotoría"
    >
      {TEAM_TABS.map(({ key, label, Icon, counts }) => {
        const isActive = activeTab === key;
        const value = valueFor(key);

        /*
          El pendiente se avisa en ámbar aunque su pestaña no esté activa: es lo
          único de esta pantalla que espera una decisión, y perderlo de vista
          significa dejar a alguien esperando sin saberlo.
        */
        const alerts = key === 'aprobar' && pendingCount > 0 && !isActive;

        return (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(key)}
            className={`min-w-[8.5rem] shrink-0 snap-start rounded-xl border p-3 text-left
              transition-all active:scale-[0.98] sm:min-w-0
              focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500
              ${isActive
                ? 'border-violet-500 bg-violet-500/15 shadow-lg shadow-violet-600/20'
                : alerts
                  ? 'border-amber-500/40 bg-amber-500/10 hover:border-amber-500/60'
                  : 'border-white/10 bg-[#1a1a1a] hover:border-white/20 hover:bg-white/[0.06]'}`}
          >
            <Icon
              size={15}
              strokeWidth={1.9}
              className={isActive
                ? 'text-violet-300'
                : alerts ? 'text-amber-400' : 'text-indigo-400'}
              aria-hidden="true"
            />

            {/*
              Donde no hay cifra va la etiqueta sola, alineada al mismo alto que
              los números para que la fila no se vea escalonada.
            */}
            {counts ? (
              <p className={`mt-2 text-2xl font-bold leading-none tabular-nums
                ${isActive ? 'text-white' : 'text-zinc-200'}`}
              >
                {value}
              </p>
            ) : (
              <p className="mt-2 h-6" aria-hidden="true" />
            )}

            <p className={`mt-1 text-[10px] font-semibold uppercase leading-tight
              tracking-wide ${isActive ? 'text-violet-200' : 'text-zinc-500'}`}
            >
              {label}
            </p>
          </button>
        );
      })}
    </div>
  );
}
