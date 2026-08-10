# Prospecta: qué es y dónde no meter mano

App de asesoría en seguros. React + Vite + Tailwind. El asesor levanta un
diagnóstico financiero del prospecto, comparte su tarjeta digital y captura
datos de contacto.

## Zonas intocables

No modificar nunca:

- `src/engine/` — los cálculos financieros. Son la razón de ser de la app y
  están validados. Un cambio ahí altera resultados que el asesor ya presentó a
  clientes reales.
- `src/context/FinanceContext.jsx` y `src/context/ReferralContext.jsx`.

Si algo parece exigir tocarlos, el camino correcto es leerlos y adaptar lo de
alrededor, o preguntar. No reescribirlos.

## Entorno

Node no está en el PATH. Toda orden va precedida de:

```bash
export PATH="$HOME/.nvm/versions/node/v22.23.2/bin:$PATH"
```

## Supabase

Backend y autenticación (Google OAuth y correo/contraseña). Detalles que ya
costaron una depuración y conviene no volver a descubrir:

- La columna de la base se llama `license_number`, no `license`. En la app el
  campo es `license`, y la traducción ocurre sólo en `fromRow` y `saveMyCard`.
- Los roles son minúsculas y sensibles a mayúsculas: `admin`, `asesor`,
  `promotor`, `pending`. `ADMIN` o `Asesor` no entran.
- La puerta de acceso falla cerrada: sólo pasa quien tenga un rol aprobado.
  Ante la duda, no entra.
- Las fotos alojadas por Google devuelven 403 si el navegador manda la cabecera
  de referencia. Las etiquetas `img` que las muestren llevan
  `referrerPolicy="no-referrer"`.

## Git

Empujar a `main` después de verificar, no antes. Un cambio sin verificar no se
empuja, aunque compile.
