import { ChevronRight } from 'lucide-react';
import { isOnline } from '../../data/presence';
import { relativeTime } from '../../data/announcements';

/** Iniciales para cuando no hay foto: mejor que un icono genérico repetido. */
function Avatar({ url, name }) {
  if (url) {
    return (
      <img
        src={url}
        alt=""
        referrerPolicy="no-referrer"
        className="h-11 w-11 shrink-0 rounded-full border border-white/15 object-cover"
      />
    );
  }
  return (
    <span
      className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-white/10
                 bg-white/5 text-sm font-bold text-zinc-400"
      aria-hidden="true"
    >
      {(name || '?').trim().charAt(0).toUpperCase()}
    </span>
  );
}

/**
 * "Ingresó hace X" en palabras.
 *
 * Se calcula en meses y días, sin librería: `Intl.RelativeTimeFormat` daría un
 * resultado más pulido pero exige elegir la unidad por su cuenta y aquí sólo hay
 * dos casos que importan —días para el recién llegado, meses para el resto—.
 */
function joinedLabel(createdAt) {
  if (!createdAt) return 'Fecha de ingreso desconocida';

  const days = Math.floor((Date.now() - createdAt) / 86400000);
  if (days < 1) return 'Ingresó hoy';
  if (days === 1) return 'Ingresó ayer';
  if (days < 30) return `Ingresó hace ${days} días`;

  const months = Math.floor(days / 30);
  if (months === 1) return 'Ingresó hace 1 mes';
  if (months < 12) return `Ingresó hace ${months} meses`;

  const years = Math.floor(months / 12);
  return years === 1 ? 'Ingresó hace 1 año' : `Ingresó hace ${years} años`;
}

/**
 * Tarjeta de un asesor del equipo.
 *
 * Las tres métricas son de ejemplo, y se ven como tales: van en gris con un
 * guion, no con números. Pediste mockups y la estructura está completa, pero
 * pintar "4 pólizas" inventadas en la pantalla donde un promotor decide a quién
 * llamar es peor que dejar el hueco: no hay forma de que sepa que ese número no
 * salió de ningún sitio.
 *
 * El badge dice "Activo" cuando el asesor está aprobado, y eso es literalmente lo
 * que significa. La última vez que entró vive en `auth.users.last_sign_in_at`, que
 * sólo se lee con la llave de servicio —imposible desde el navegador—, así que un
 * "Activo" basado en actividad real todavía no se puede calcular.
 */
export default function AdvisorCard({ advisor, onOpenDetail }) {
  /*
    Actividad, no resultados: llamadas, citas y cierres son los tres pasos del
    mismo embudo, así que puestos juntos dicen dónde se atora cada asesor —muchas
    llamadas y pocas citas es un problema distinto de muchas citas y pocos
    cierres—. "Pólizas del mes" y "tasa de cierre" contaban lo mismo dos veces y
    no decían nada del proceso.

    Siguen en gris con un guion porque no existen en ninguna tabla: las llamadas y
    las citas viven en el `localStorage` del teléfono de cada asesor, y de cierres
    no hay registro. Un número inventado aquí decidiría a quién llamar.
  */
  const metrics = [
    { key: 'llamadas', label: 'Llamadas', value: '—' },
    { key: 'citas', label: 'Citas', value: '—' },
    { key: 'cierres', label: 'Cierres', value: '—' },
  ];

  const online = isOnline(advisor.lastSeen);
  const presenceLabel = online === true
    ? 'En línea'
    : online === false ? relativeTime(advisor.lastSeen) : 'Sin actividad';

  return (
    <article className="flex flex-col rounded-xl border border-white/10 bg-[#1a1a1a] p-4">
      {/* ── Cabecera ── */}
      <header className="flex items-start gap-3">
        <Avatar url={advisor.avatarUrl} name={advisor.fullName || advisor.email} />

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold leading-tight text-white">
            {advisor.fullName || 'Sin nombre'}
          </p>
          <p className="mt-0.5 truncate text-[11px] text-zinc-500">
            {joinedLabel(advisor.createdAt)}
          </p>
        </div>

        {/*
          El estado sale de `last_seen`, no de que la ficha esté aprobada.

          Tres casos y no dos, porque "sin dato" no es "desconectado": la columna
          puede no existir todavía, o esa persona no ha abierto la app desde que
          existe. Decir "desconectado" ahí afirmaría algo que no se sabe, y el
          promotor llamaría a alguien creyendo que lleva días ausente.
        */}
        <span
          className={`flex shrink-0 items-center gap-1.5 rounded-full border px-2 py-0.5
            ${online === true
            ? 'border-emerald-500/30 bg-emerald-500/10'
            : 'border-white/10 bg-white/5'}`}
        >
          <span
            className={`h-1.5 w-1.5 rounded-full ${online === true
              ? 'animate-pulse bg-emerald-400'
              : 'bg-zinc-500'}`}
            aria-hidden="true"
          />
          <span className={`whitespace-nowrap text-[10px] font-bold uppercase tracking-wide
            ${online === true ? 'text-emerald-300' : 'text-zinc-500'}`}
          >
            {presenceLabel}
          </span>
        </span>
      </header>

      <p className="mt-2 truncate text-[11px] text-zinc-600">{advisor.email}</p>

      {/* ── Métricas ── */}
      <div className="mt-4 grid grid-cols-3 gap-2 rounded-lg border border-white/5 bg-black/30 p-2.5">
        {metrics.map(({ key, label, value }) => (
          <div key={key} className="text-center">
            <p className="text-lg font-bold leading-none tabular-nums text-zinc-600">
              {value}
            </p>
            <p className="mt-1 text-[9px] font-semibold uppercase leading-tight tracking-wide
                          text-zinc-600"
            >
              {label}
            </p>
          </div>
        ))}
      </div>

      {/* ── Pie ── */}
      <button
        type="button"
        onClick={() => onOpenDetail?.(advisor)}
        className="mt-3 flex items-center justify-between rounded-lg px-1 py-1.5 text-left
                   text-[11px] font-semibold text-zinc-500 transition-colors
                   hover:text-indigo-300 focus-visible:outline-none focus-visible:ring-2
                   focus-visible:ring-indigo-500"
      >
        Ver detalles
        <ChevronRight size={14} aria-hidden="true" />
      </button>
    </article>
  );
}
