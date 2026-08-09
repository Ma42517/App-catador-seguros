import AISequence from './AISequence';

const DATE_FORMAT = { weekday: 'long', day: 'numeric', month: 'long' };

/**
 * Pantalla de inicio ("Hoy"). Es el punto de entrada de la app: el Diagnóstico
 * 360 ya no ocupa la vista principal, se abre desde "Ver más".
 *
 * El día y el saludo viven arriba; el centro lo ocupa la secuencia de inicio.
 */
export default function TodayView({ name }) {
  const fecha = new Date().toLocaleDateString('es-MX', DATE_FORMAT);
  const saludo = name ? name.charAt(0).toUpperCase() + name.slice(1) : '';

  return (
    <AISequence
      name={name}
      header={(
        <div className="mx-auto max-w-2xl px-4 pt-8">
          <p className="text-[11px] font-bold uppercase tracking-widest text-indigo-400">
            {fecha}
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-zinc-900 md:text-3xl dark:text-white">
            Hola{saludo ? `, ${saludo}` : ''}
          </h1>
        </div>
      )}
    />
  );
}
