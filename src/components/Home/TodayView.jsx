import PromoterAssistant from './PromoterAssistant';

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
      <h1 className="mt-1 text-2xl font-bold tracking-tight text-zinc-900 md:text-3xl dark:text-white">
        Hola{saludo ? `, ${saludo}` : ''}
      </h1>
      <p className="mt-1 text-sm text-zinc-400">
        Este es tu resumen del día.
      </p>

      {/*
        El asistente sustituye al estado vacío y queda como único elemento
        central: cualquier tarjeta debajo cortaría la línea visual que va del
        mensaje al botón "+" de la barra inferior.
      */}
      <PromoterAssistant name={name} />
    </div>
  );
}
