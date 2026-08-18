import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { purgeDemoState } from './lib/demoSession.js'
import { readTextScale, applyTextScale } from './lib/textScale.js'

/*
  Antes de montar, no después: el contexto financiero lee `localStorage` en su
  primer render, así que limpiar aquí es lo que hace que la app abra vacía sin
  enseñar por un instante los datos de ejemplo de la sesión anterior.
*/
purgeDemoState()

// Mismo motivo: aplicar el tamaño de texto antes del primer render evita un
// parpadeo del tamaño de diseño saltando al tamaño que la persona eligió.
applyTextScale(readTextScale())

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
