import {
  Users, UserCheck, PenSquare, Megaphone, Activity,
} from 'lucide-react';

/**
 * Las cinco pestañas de arriba, que son la navegación del panel.
 *
 * Antes eran un resumen que sólo se miraba, y tres de sus cinco cifras no
 * existían en ninguna tabla: ocupaban el mejor sitio de la pantalla para no decir
 * nada. Como pestañas, cada una lleva a algo que se puede hacer.
 *
 * ── Rediseño: una barra pareja, sin huecos ────────────────────────────────
 *
 * Antes dos pestañas enseñaban un número gigante y las otras tres dejaban un
 * hueco en blanco para alinearse con él: la fila se veía escalonada e incompleta.
 * Ahora TODAS tienen la misma forma —ícono y etiqueta a la misma altura— y el
 * conteo de "Asesores"/"Por Aprobar" viaja como un distintivo pequeño sobre el
 * ícono, que es donde un número informa sin desequilibrar la fila.
 *
 * Un solo acento: índigo para la activa. El violeta anterior competía con el
 * índigo que domina el resto del panel y era parte de lo que se veía disperso.
 */
const TEAM_TABS = [
  { key: 'asesores', label: 'Asesores', Icon: Users, counts: true },
  { key: 'aprobar', label: 'Por Aprobar', Icon: UserCheck, counts: true },
  { key: 'workspace', label: 'Publicar en el Muro', Icon: PenSquare },
  { key: 'alerta', label: 'Publicar Alerta', Icon: Megaphone },
  { key: 'actividad', label: 'Actividad General', Icon: Activity },
];

export default function TeamTabs({ activeTab, onChange, total, pendingCount }) {
  const valueFor = (key) => {
    if (key === 'asesores') return total;
    if (key === 'aprobar') return pendingCount;
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
      className="mb-6 flex snap-x overscroll-x-contain gap-2.5 overflow-x-auto pb-1
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
            className={`group flex min-w-[7.5rem] shrink-0 snap-start flex-col items-start gap-2.5
              rounded-xl border p-3 text-left transition-all active:scale-[0.98] sm:min-w-0
              focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500
              ${isActive
                ? 'border-indigo-500 bg-indigo-500/15 shadow-lg shadow-indigo-600/20'
                : alerts
                  ? 'border-amber-500/40 bg-amber-500/10 hover:border-amber-500/60'
                  : 'border-white/10 bg-white/[0.03] hover:border-white/20 hover:bg-white/[0.06]'}`}
          >
            {/*
              El ícono en su caja, y el conteo colgado de la esquina como
              distintivo: así el número informa sin robarle la fila a una
              etiqueta. Donde no hay cifra, la caja va sola —misma altura para
              todas, que es lo que endereza la fila.
            */}
            <span className="relative">
              <span
                className={`grid h-9 w-9 place-items-center rounded-lg transition-colors
                  ${isActive
                    ? 'bg-indigo-500/20 text-indigo-200'
                    : alerts
                      ? 'bg-amber-500/15 text-amber-300'
                      : 'bg-white/5 text-zinc-400 group-hover:text-zinc-300'}`}
                aria-hidden="true"
              >
                <Icon size={17} strokeWidth={1.9} />
              </span>

              {counts && value > 0 && (
                <span
                  className={`absolute -right-1.5 -top-1.5 grid h-5 min-w-[1.25rem] place-items-center
                    rounded-full px-1 text-[10px] font-bold tabular-nums ring-2 ring-[#111111]
                    ${alerts
                      ? 'bg-amber-500 text-black'
                      : 'bg-indigo-500 text-white'}`}
                >
                  {value}
                </span>
              )}
            </span>

            <span className={`text-[11px] font-semibold uppercase leading-tight tracking-wide
              ${isActive ? 'text-indigo-100' : 'text-zinc-400 group-hover:text-zinc-300'}`}
            >
              {label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
