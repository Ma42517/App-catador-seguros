/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  // 'class' (en vez del 'media' por defecto) para que el <html class="dark">
  // gobierne el tema: la app es oscura siempre, sin depender del SO.
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: [
          'Inter var', 'Inter', 'ui-sans-serif', 'system-ui',
          '-apple-system', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', 'sans-serif',
        ],
      },
      boxShadow: {
        // Resplandores de acento para tarjetas de métrica y botones primarios.
        'glow-emerald': '0 0 0 1px rgb(16 185 129 / 0.18), 0 8px 30px -8px rgb(16 185 129 / 0.35)',
        'glow-indigo': '0 0 0 1px rgb(79 70 229 / 0.2), 0 8px 30px -8px rgb(79 70 229 / 0.45)',
        'glow-rose': '0 0 0 1px rgb(244 63 94 / 0.2), 0 8px 30px -8px rgb(244 63 94 / 0.4)',
        'glow-amber': '0 0 0 1px rgb(245 158 11 / 0.2), 0 8px 30px -8px rgb(245 158 11 / 0.4)',
      },
      keyframes: {
        // Respiración lenta: el asistente en reposo.
        breathe: {
          '0%, 100%': { transform: 'scale(1)', opacity: '0.9' },
          '50%': { transform: 'scale(1.05)', opacity: '1' },
        },
        // Latido corto mientras "piensa"/escribe: vivo, sin ser inquietante.
        'ring-active': {
          '0%, 100%': {
            transform: 'scale(1)',
            boxShadow: '0 0 20px rgba(251,191,36,0.4)',
          },
          '50%': {
            transform: 'scale(1.03)',
            boxShadow: '0 0 30px rgba(251,191,36,0.7)',
          },
        },
        // Desplaza el gradiente de fondo de las tarjetas del hub: el
        // movimiento es lento y continuo, para que se sientan "vivas".
        'gradient-shift': {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
        },
        // Deriva lenta de los resplandores borrosos del banner principal.
        'orb-drift': {
          '0%, 100%': { transform: 'translate(-8%, -6%) scale(1)' },
          '50%': { transform: 'translate(10%, 8%) scale(1.18)' },
        },
        // Campana del Workplace: repica y se queda quieta un rato. La pausa
        // importa; balanceándose sin parar se convertiría en ruido visual.
        swing: {
          '0%, 65%, 100%': { transform: 'rotate(0deg)' },
          '70%': { transform: 'rotate(12deg)' },
          '76%': { transform: 'rotate(-10deg)' },
          '82%': { transform: 'rotate(7deg)' },
          '88%': { transform: 'rotate(-4deg)' },
          '94%': { transform: 'rotate(2deg)' },
        },
        // Llama de las rachas: late rápido y desigual, como algo que arde.
        flicker: {
          '0%, 100%': { transform: 'scale(1) translateY(0)', opacity: '0.9' },
          '25%': { transform: 'scale(1.12) translateY(-1px)', opacity: '1' },
          '45%': { transform: 'scale(0.97) translateY(0)', opacity: '0.85' },
          '70%': { transform: 'scale(1.07) translateY(-0.5px)', opacity: '1' },
        },
        // El anillo de metas se dibuja al aparecer la tarjeta.
        'draw-ring': {
          from: { strokeDashoffset: 'var(--ring-length)' },
          to: { strokeDashoffset: 'var(--ring-target)' },
        },
        /*
          Ken Burns del fondo de la tarjeta: acerca y aleja muy despacio. Un solo
          ciclo hace ida y vuelta (0 y 100 iguales, 50 en el extremo), así no se
          necesita `alternate` ni se ve un salto al reiniciar.
        */
        'ken-burns': {
          '0%, 100%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.1)' },
        },
        /*
          Igual que el anterior, pero nunca baja de 1.15. Se usa sobre el fondo
          desenfocado de la tarjeta: un desenfoque fuerte arrastra los píxeles
          del borde hacia dentro y deja un halo claro en el perímetro, que sólo
          se tapa si la imagen sobresale del marco. Empezar en 1 —como hace
          `ken-burns`— destaparía ese halo en cada vuelta del ciclo.
        */
        'ken-burns-blur': {
          '0%, 100%': { transform: 'scale(1.15)' },
          '50%': { transform: 'scale(1.25)' },
        },
        // Entrada en cascada del contenido de la tarjeta.
        'fade-in-up': {
          from: { opacity: '0', transform: 'translateY(12px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        // Reflejo que recorre el cristal de "About Me".
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        // Reflejo que recorre el monto de Dinero en la Mesa.
        shine: {
          '0%': { backgroundPosition: '-150% 50%' },
          '100%': { backgroundPosition: '250% 50%' },
        },
        /*
          Iconos de contacto de la tarjeta digital. Los tres son lentos y de
          recorrido corto a propósito: la tarjeta se le muestra a un prospecto
          mientras se le habla, y un movimiento que se note le roba la atención
          a la conversación. La idea es que la tarjeta parezca viva, no que los
          botones pidan ser tocados.
        */

        /*
          Teléfono que repica. El giro se concentra en el primer tercio del
          ciclo y el resto es reposo: un vaivén continuo parecería un error de
          maquetación, mientras que un repique corto cada tres segundos se lee
          como intención.
        */
        ring: {
          '0%, 35%, 100%': { transform: 'rotate(0deg)' },
          '7%': { transform: 'rotate(-8deg)' },
          '14%': { transform: 'rotate(8deg)' },
          '21%': { transform: 'rotate(-6deg)' },
          '28%': { transform: 'rotate(4deg)' },
        },
        // WhatsApp: pulso de tamaño suave y continuo.
        'soft-pulse': {
          '0%, 100%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.1)' },
        },
        /*
          Correo: flotación vertical de 4 px, el equivalente a `-translate-y-1`.
          Se escribe en píxeles y no con la utilidad porque una animación de
          keyframes necesita el valor final, no una clase.
        */
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-4px)' },
        },
        /*
          Mensaje: brillo que recorre el contorno del círculo. Se anima la
          sombra y no la opacidad para que el destello quede en el canto y no
          apague el icono, que es lo que hay que seguir leyendo.
        */
        'glow-outline': {
          '0%, 100%': { boxShadow: '0 0 0 0 rgb(255 255 255 / 0)' },
          '50%': { boxShadow: '0 0 10px 2px rgb(255 255 255 / 0.55)' },
        },
      },
      animation: {
        breathe: 'breathe 6s ease-in-out infinite',
        'ring-active': 'ring-active 1.4s ease-in-out infinite',
        'gradient-shift': 'gradient-shift 9s ease-in-out infinite',
        'orb-drift': 'orb-drift 14s ease-in-out infinite',
        swing: 'swing 4s ease-in-out infinite',
        flicker: 'flicker 1.6s ease-in-out infinite',
        // `forwards` deja el anillo en su valor final en vez de volver a cero.
        'draw-ring': 'draw-ring 1.4s cubic-bezier(0.22, 1, 0.36, 1) forwards',
        shine: 'shine 3.4s ease-in-out infinite',
        'spin-slow': 'spin 10s linear infinite',
        'ken-burns': 'ken-burns 18s ease-in-out infinite',
        'ken-burns-blur': 'ken-burns-blur 22s ease-in-out infinite',
        /*
          `both` es imprescindible con retraso: sin él el elemento se vería en su
          estado final durante la espera y la cascada no existiría.
        */
        'fade-in-up': 'fade-in-up 0.55s cubic-bezier(0.22, 1, 0.36, 1) both',
        shimmer: 'shimmer 4.5s linear infinite',
        /*
          Ciclos distintos entre sí (3, 2.5, 3 y 2.8 s) y sin divisores comunes
          evidentes. Con la misma duración los cuatro iconos se moverían al
          unísono y la fila parecería un solo bloque animado en lugar de cuatro
          accesos con vida propia.
        */
        ring: 'ring 3s ease-in-out infinite',
        'soft-pulse': 'soft-pulse 2.5s ease-in-out infinite',
        float: 'float 3s ease-in-out infinite',
        'glow-outline': 'glow-outline 2.8s ease-in-out infinite',
      },
      backgroundImage: {
        'grid-fade':
          'radial-gradient(ellipse 80% 50% at 50% -20%, rgb(79 70 229 / 0.16), transparent)',
      },
    },
  },
  plugins: [],
}
