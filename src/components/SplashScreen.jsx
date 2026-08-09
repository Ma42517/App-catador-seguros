/**
 * Pantalla de introducción de marca. Se muestra brevemente al iniciar la
 * app (ver lógica de tiempos en App.jsx) mientras el resto de la UI está
 * lista para montarse. No contiene lógica de negocio ni depende de los
 * contexts: es puramente presentacional.
 */
export default function SplashScreen() {
  return (
    <div className="fixed inset-0 z-50 flex min-h-screen flex-col items-center justify-center gap-3 bg-slate-950">
      <h1 className="animate-pulse text-4xl font-bold tracking-tight text-indigo-500 sm:text-5xl">
        PROSPECTA
      </h1>
      <p className="text-sm text-slate-400">Diagnóstico Financiero 360</p>
    </div>
  );
}
