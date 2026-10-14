# Plan: "que lo use un niño de 5 años"

Norte de diseño pedido por el dueño: la app debe ser tan fácil que **un niño de
5 años la pueda usar**. Esto es una iniciativa en curso, no una tarea cerrada.
Esta nota es la constancia para retomarla.

## Cómo se traduce "fácil para un niño" en esta app

Cinco frentes, de mayor impacto / menor riesgo a mayor alcance:

1. **Lenguaje / textos.** Cambiar palabras técnicas por lenguaje humano.
   Ej.: "Prima Anual" → "¿Cuánto paga al año?"; "Perceptores de ingreso" →
   "¿Cuántos traen dinero a casa?". (Ya se hizo algo así antes en el
   diagnóstico.) Es el cambio de mayor impacto y menor riesgo.
2. **Qué hacer siempre claro.** En cada pantalla, que sea obvio "¿y ahora qué
   toco?". Un solo botón principal grande, no muchas opciones compitiendo.
3. **Menos pasos / menos decisiones.** Esconder lo avanzado, pedir sólo lo
   mínimo, valores por defecto inteligentes.
4. **Pistas visuales.** Íconos reconocibles, estados claros (hecho ✓ /
   pendiente), confirmaciones amables ("¡Listo!").
5. **Onboarding guiado.** Que la primera vez la app lleve de la mano paso a paso.

## POR DÓNDE EMPEZAR (decisión tomada)

Empezar **desde cero: el recorrido del USUARIO NUEVO al entrar por primera vez**,
pantalla por pantalla, en orden. No atacar "toda la app" de golpe.

### El flujo de entrada, en orden (archivos reales)

1. **Splash** — `src/components/SplashScreen.jsx` (marca EXPANDIA, respeta tema).
2. **Bienvenida pre-registro** — `src/components/Auth/WelcomeOnboarding.jsx`
   (texto en cascada estilo Sesame, elección de tema).
3. **Login** — `src/components/Auth/Login.jsx` (frases motivacionales rotativas,
   "Continuar con correo" / "Google").
4. **Registro / alta** — flujo de `OnboardingFlow.jsx`.
5. **Pendiente de aprobación** — `src/components/Auth/PendingApproval.jsx`
   (pantalla cálida mientras un admin aprueba).
6. **Onboarding post-registro (primer ingreso)** —
   `src/components/Home/FirstLoginIntro.jsx` (captura progresiva, código de
   promotoría `PROMO-XXX-XX`, Zona Segura).
7. **Pantalla "Hoy"** — `src/components/Home/TodayView.jsx` → `AISequence.jsx`
   (primera vez que ve el día a día).

Marca de acceso / branding: `src/components/Auth/ExpandiaMark.jsx`.

### Método de trabajo acordado

- Ir **pantalla por pantalla** en ese orden.
- Por cada una: revisar textos (lenguaje humano), claridad del siguiente paso,
  y pistas visuales.
- Cambios grandes → presentar plan y esperar aprobación antes de empujar.
  Cambios pequeños → empujar directo a `main` tras verificar (build + oxlint).
- El dueño es "los ojos": no se puede levantar servidor en el entorno, así que
  tras cada cambio se le pide que confirme en su teléfono.

## Estado del rediseño previo (ya hecho, base de este plan)

- Marca **EXPANDIA** ("Multiplica tus posibilidades").
- **2 temas**: Negro (default) y Beige/Crema. Se retiró el Blanco. El selector
  vive en **Ver más → Configuración** (`src/components/Profile/SettingsView.jsx`,
  "Cambia el color de tu app"). Motor en `src/lib/appTheme.js`.
- Tematización crema aplicada a: acceso, barra inferior, embudo, bloques de
  tiempo, menú Ver más, Obtener Referidos, hojas inferiores, Diagnóstico 360 y
  pantallas de Mi Perfil. Patrón: clase marcadora + reglas en `index.css` bajo
  `html.theme-cream`.

## Recordatorios de entorno (ver también proyecto.md)

- No tocar `src/engine/` ni `FinanceContext`/`ReferralContext`.
- Verificar con `./node_modules/.bin/vite build` y `./node_modules/.bin/oxlint`
  antes de empujar (`npx` no funciona aquí).
- Empujar directo a `main`, sin PR, sólo tras verificar.
