import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  /*
    Rutas absolutas. Antes eran relativas (`./`) para poder servir el build desde
    cualquier subdirectorio, y eso funcionaba mientras la app vivía en una sola
    dirección: en la raíz, `./assets/x.js` resuelve a `/assets/x.js`.

    Con la tarjeta pública dejó de servir. Desde `/p/<id>`, ese mismo `./assets/`
    resuelve a `/p/assets/x.js`; la reescritura del servidor devuelve el
    index.html para cualquier ruta desconocida, así que el navegador recibía HTML
    donde esperaba un módulo, lo rechazaba por tipo de contenido y no ejecutaba
    nada: la página quedaba en negro sin un solo error visible en el DOM.

    Con `/` los recursos se piden siempre desde la raíz, sin importar la
    profundidad de la dirección. Si algún día hace falta servir la app desde un
    subdirectorio, se pone aquí esa ruta, no `./`.
  */
  base: '/',
})
