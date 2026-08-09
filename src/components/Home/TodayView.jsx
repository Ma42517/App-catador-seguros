import AISequence from './AISequence';

const DATE_FORMAT = { weekday: 'long', day: 'numeric', month: 'long' };

/**
 * Pantalla de inicio ("Hoy"). Es el punto de entrada de la app: el Diagnóstico
 * 360 ya no ocupa la vista principal, se abre desde "Ver más".
 *
 * El saludo lo da la secuencia de inicio, así que aquí sólo vive el resumen
 * del día, que es lo que se revela al terminar el mensaje.
 */
export default function TodayView({ name }) {
  const fecha = new Date().toLocaleDateString('es-MX', DATE_FORMAT);

  return (
    <AISequence name={name}>
      <div className="mx-auto max-w-2xl px-4 pb-10 text-center">
        <p className="text-[11px] font-bold uppercase tracking-widest text-indigo-400">
          {fecha}
        </p>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Este es tu resumen del día.
        </p>
      </div>
    </AISequence>
  );
}
