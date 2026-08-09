/**
 * Pantalla de introducción de marca. Se muestra brevemente al iniciar la
 * app (ver lógica de tiempos en App.jsx) mientras el resto de la UI está
 * lista para montarse. No contiene lógica de negocio ni depende de los
 * contexts: es puramente presentacional.
 */
export default function SplashScreen() {
  return (
    <div className="fixed inset-0 z-50 flex min-h-screen w-full max-w-full flex-col items-center justify-center overflow-hidden bg-black">
      <h1 className="animate-pulse text-center text-5xl min-[400px]:text-6xl sm:text-7xl md:text-8xl font-black text-white px-4 w-full tracking-tight">
        PROSPECTA
      </h1>
      <p className="mt-4 text-sm tracking-widest text-zinc-500 md:text-xl">
        Diagnóstico Financiero 360
      </p>
    </div>
  );
}
