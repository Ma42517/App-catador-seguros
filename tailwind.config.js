/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
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
        'glow-indigo': '0 0 0 1px rgb(99 102 241 / 0.2), 0 8px 30px -8px rgb(99 102 241 / 0.45)',
        'glow-red': '0 0 0 1px rgb(239 68 68 / 0.2), 0 8px 30px -8px rgb(239 68 68 / 0.4)',
        'glow-amber': '0 0 0 1px rgb(245 158 11 / 0.2), 0 8px 30px -8px rgb(245 158 11 / 0.4)',
      },
      backgroundImage: {
        'grid-fade':
          'radial-gradient(ellipse 80% 50% at 50% -20%, rgb(99 102 241 / 0.14), transparent)',
      },
    },
  },
  plugins: [],
}
