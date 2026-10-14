import ExpandiaMark from './Auth/ExpandiaMark';

/**
 * Pantalla de introducción de marca. Se muestra brevemente al iniciar la
 * app (ver lógica de tiempos en App.jsx) mientras el resto de la UI está
 * lista para montarse. No contiene lógica de negocio ni depende de los
 * contexts: es puramente presentacional.
 */
export default function SplashScreen() {
  return (
    <div className="fixed inset-0 z-50 flex min-h-screen w-full max-w-full flex-col items-center justify-center overflow-hidden bg-black px-4">
      <div className="animate-pulse">
        <ExpandiaMark theme="dark" size="text-6xl sm:text-7xl md:text-8xl" />
      </div>
      <p className="mt-5 text-sm tracking-widest text-zinc-500 md:text-lg">
        MULTIPLICA TUS POSIBILIDADES
      </p>
    </div>
  );
}
