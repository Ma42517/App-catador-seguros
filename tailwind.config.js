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
      },
      animation: {
        breathe: 'breathe 6s ease-in-out infinite',
        'ring-active': 'ring-active 1.4s ease-in-out infinite',
      },
      backgroundImage: {
        'grid-fade':
          'radial-gradient(ellipse 80% 50% at 50% -20%, rgb(79 70 229 / 0.16), transparent)',
      },
    },
  },
  plugins: [],
}
