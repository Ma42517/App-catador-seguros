/**
 * Pantalla de introducción de marca. Se muestra brevemente al iniciar la
 * app (ver lógica de tiempos en App.jsx) mientras el resto de la UI está
 * lista para montarse. No contiene lógica de negocio ni depende de los
 * contexts: es puramente presentacional.
 */
export default function SplashScreen() {
  return (
    <div className="fixed inset-0 z-50 flex min-h-screen w-full flex-col items-center justify-center overflow-hidden bg-black">
      <h1 className="animate-pulse text-7xl font-black tracking-tighter text-white sm:text-9xl md:text-[12vw] lg:text-[10vw]">
        PROSPECTA
      </h1>
      <p className="mt-4 text-sm tracking-widest text-zinc-500 md:text-xl">
        Diagnóstico Financiero 360
      </p>
    </div>
  );
}
