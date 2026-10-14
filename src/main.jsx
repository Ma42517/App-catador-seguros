import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { purgeDemoState } from './lib/demoSession.js'
import { readTextScale, applyTextScale } from './lib/textScale.js'
import { readAppTheme, applyAppTheme } from './lib/appTheme.js'

/*
  Antes de montar, no después: el contexto financiero lee `localStorage` en su
  primer render, así que limpiar aquí es lo que hace que la app abra vacía sin
  enseñar por un instante los datos de ejemplo de la sesión anterior.
*/
purgeDemoState()

// Mismo motivo: aplicar el tamaño de texto antes del primer render evita un
// parpadeo del tamaño de diseño saltando al tamaño que la persona eligió.
applyTextScale(readTextScale())

// Y el tema (negro/blanco/crema): fija la clase del <html> antes del primer render
// para que toda la app abra en el color elegido, sin parpadeo de oscuro a claro.
applyAppTheme(readAppTheme())

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
