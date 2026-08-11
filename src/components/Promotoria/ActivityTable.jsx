import { Activity, Info } from 'lucide-react';
import { isOnline } from '../../data/presence';
import { relativeTime } from '../../data/announcements';

/**
 * Actividad de toda la promotoría, asesor por asesor.
 *
 * Tabla y no gráfica, y es una decisión y no una simplificación: con doce
 * asesores, una gráfica de barras compara pero no deja leer el dato de nadie en
 * concreto, y lo que un promotor hace con esta pantalla es decidir a quién
 * llamar. La tabla ordena, permite buscar un nombre y suma al final.
 *
 * Las tres columnas de actividad van vacías porque no existen en ninguna tabla:
 * las llamadas y las citas viven en el `localStorage` del teléfono de cada asesor
 * —nunca salen de ahí— y de cierres no hay registro. La estructura está completa
 * para el día que existan; los números, no inventados.
 *
 * Lo que sí es real es la última conexión: sale de `last_seen`, y ya sirve para lo
 * que se usaría la tabla. Que sea la única columna con datos deja claro, sin
 * explicarlo, cuál se puede creer.
 */
export default function ActivityTable({ advisors }) {
  if (advisors.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-zinc-700 bg-zinc-900/40 px-6 py-10
                      text-center"
      >
        <p className="text-sm font-semibold text-zinc-300">Todavía no hay equipo que medir</p>
        <p className="mx-auto mt-1.5 max-w-sm text-xs leading-relaxed text-zinc-500">
          Cuando apruebes a tus primeros asesores, su actividad aparecerá aquí.
        </p>
      </div>
    );
  }

  return (
    <section>
      <h2 className="mb-2.5 flex items-center gap-2 text-[11px] font-bold uppercase
                     tracking-widest text-zinc-500"
      >
        <Activity size={13} aria-hidden="true" />
        Actividad de la promotoría
      </h2>

      {/*
        `overflow-x-auto` en lugar de apilar las filas en móvil: son cinco
        columnas cortas y numéricas, y convertidas en tarjetas se pierde la
        comparación entre personas, que es para lo único que sirve una tabla.
      */}
      <div className="overflow-x-auto rounded-xl border border-white/10 bg-[#1a1a1a]">
        <table className="w-full min-w-[30rem] border-collapse text-left">
          <thead>
            <tr className="border-b border-white/10">
              <th className="px-3 py-2.5 text-[10px] font-bold uppercase tracking-wide text-zinc-500">
                Asesor
              </th>
              <th className="px-2 py-2.5 text-right text-[10px] font-bold uppercase tracking-wide text-zinc-500">
                Llamadas
              </th>
              <th className="px-2 py-2.5 text-right text-[10px] font-bold uppercase tracking-wide text-zinc-500">
                Citas
              </th>
              <th className="px-2 py-2.5 text-right text-[10px] font-bold uppercase tracking-wide text-zinc-500">
                Cierres
              </th>
              <th className="px-3 py-2.5 text-right text-[10px] font-bold uppercase tracking-wide text-zinc-500">
                Conexión
              </th>
            </tr>
          </thead>

          <tbody>
            {advisors.map((advisor) => {
              const online = isOnline(advisor.lastSeen);
              return (
                <tr key={advisor.id} className="border-b border-white/5 last:border-0">
                  <td className="px-3 py-2.5">
                    <p className="truncate text-xs font-semibold text-zinc-200">
                      {advisor.fullName || 'Sin nombre'}
                    </p>
                    <p className="truncate text-[10px] text-zinc-600">{advisor.email}</p>
                  </td>
                  <td className="px-2 py-2.5 text-right text-sm tabular-nums text-zinc-600">—</td>
                  <td className="px-2 py-2.5 text-right text-sm tabular-nums text-zinc-600">—</td>
                  <td className="px-2 py-2.5 text-right text-sm tabular-nums text-zinc-600">—</td>
                  <td className="px-3 py-2.5 text-right">
                    <span className={`whitespace-nowrap text-[10px] font-semibold ${online === true
                      ? 'text-emerald-400'
                      : 'text-zinc-500'}`}
                    >
                      {online === true
                        ? 'En línea'
                        : online === false ? relativeTime(advisor.lastSeen) : 'Sin dato'}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>

          <tfoot>
            <tr className="border-t border-white/10 bg-black/30">
              <td className="px-3 py-2.5 text-[10px] font-bold uppercase tracking-wide text-zinc-400">
                Total del equipo
              </td>
              <td className="px-2 py-2.5 text-right text-sm font-bold tabular-nums text-zinc-600">—</td>
              <td className="px-2 py-2.5 text-right text-sm font-bold tabular-nums text-zinc-600">—</td>
              <td className="px-2 py-2.5 text-right text-sm font-bold tabular-nums text-zinc-600">—</td>
              <td className="px-3 py-2.5 text-right text-[10px] font-bold tabular-nums text-zinc-400">
                {advisors.filter((a) => isOnline(a.lastSeen) === true).length}
                {' '}
                en línea
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      <p className="mt-2.5 flex items-start gap-2 text-[11px] leading-relaxed text-zinc-600">
        <Info size={12} className="mt-0.5 shrink-0" aria-hidden="true" />
        Llamadas, citas y cierres todavía no se registran en la base: viven en el
        teléfono de cada asesor. La conexión sí es real. Para que las tres columnas
        se llenen hay que sincronizar la agenda de cada asesor, que es el siguiente
        paso.
      </p>
    </section>
  );
}
