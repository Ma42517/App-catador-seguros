import { CalendarDays, Sparkles } from 'lucide-react';

const DATE_FORMAT = { weekday: 'long', day: 'numeric', month: 'long' };

/**
 * Pantalla de inicio ("Hoy"). Es el punto de entrada de la app: el Diagnóstico
 * 360 ya no ocupa la vista principal, se abre desde "Ver más".
 *
 * Por ahora es la base sobre la que irá la agenda del asesor.
 */
export default function TodayView({ name }) {
  const now = new Date();
  const fecha = now.toLocaleDateString('es-MX', DATE_FORMAT);
  const saludo = name ? name.charAt(0).toUpperCase() + name.slice(1) : '';

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <p className="text-[11px] font-bold uppercase tracking-widest text-indigo-400">
        {fecha}
      </p>
      <h1 className="mt-1 text-2xl font-bold tracking-tight text-white md:text-3xl">
        Hola{saludo ? `, ${saludo}` : ''}
      </h1>
      <p className="mt-1 text-sm text-slate-400">
        Este es tu resumen del día.
      </p>

      <div className="mt-8 rounded-2xl border border-slate-800 bg-slate-900/80 p-8 text-center backdrop-blur-md">
        <span
          className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-xl border border-slate-800 bg-slate-950/60 text-slate-500"
          aria-hidden="true"
        >
          <CalendarDays size={22} />
        </span>
        <p className="text-sm font-semibold text-slate-200">Sin eventos por ahora</p>
        <p className="mx-auto mt-1 max-w-sm text-xs leading-relaxed text-slate-500">
          Cuando conectemos tu agenda, aquí verás tus citas, seguimientos y recordatorios del día.
        </p>
      </div>

      <div className="mt-4 flex items-start gap-3 rounded-2xl border border-indigo-500/20 bg-indigo-500/5 p-4">
        <span className="mt-0.5 shrink-0 text-indigo-400" aria-hidden="true">
          <Sparkles size={16} />
        </span>
        <p className="text-xs leading-relaxed text-slate-400">
          Tu <span className="font-semibold text-slate-200">Diagnóstico 360</span> está disponible
          en el menú <span className="font-semibold text-slate-200">Ver más</span>, en la barra
          inferior.
        </p>
      </div>
    </div>
  );
}
