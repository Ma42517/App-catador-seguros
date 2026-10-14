import ExpandiaMark from './Auth/ExpandiaMark';
import { readAppTheme, themeFor } from '../lib/appTheme';

/**
 * Pantalla de introducción de marca. Se muestra brevemente al iniciar la
 * app (ver lógica de tiempos en App.jsx) mientras el resto de la UI está
 * lista para montarse. No contiene lógica de negocio ni depende de los
 * contexts: es puramente presentacional.
 *
 * Se pinta en el tema que la persona eligió en la bienvenida (negro/blanco/crema),
 * para que el arranque no "salte" de color al llegar al login/onboarding. Si aún no
 * eligió, cae en el oscuro por omisión.
 */
export default function SplashScreen() {
  const t = themeFor(readAppTheme());
  const bg = t.bgStyle ? '' : t.bg;

  return (
    <div
      className={`fixed inset-0 z-50 flex min-h-screen w-full max-w-full flex-col items-center
                  justify-center overflow-hidden px-4 ${bg}`}
      style={t.bgStyle}
    >
      <div className="animate-pulse">
        <ExpandiaMark theme={t.value} size="text-6xl sm:text-7xl md:text-8xl" />
      </div>
      <p className={`mt-5 text-sm tracking-widest md:text-lg ${t.faint}`}>
        MULTIPLICA TUS POSIBILIDADES
      </p>
    </div>
  );
}
