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

## Despliegue

Todo trabajo termina en `main`. Dejarlo en una rama no cuenta como entregado:
Vercel sólo publica en Producción lo que está en `main`, así que un cambio
parado en una rama es un cambio que nadie puede ver ni probar.

**Sin pull requests.** Se empuja directo a `main` una vez verificado. Abrir un PR
para fusionarlo un segundo después sólo genera una notificación de revisión por
tarea, y aquí no hay nadie más revisando: el dueño del repo pidió expresamente
que se dejara de hacer.

El recorrido de cada cambio:

1. **Verificar antes.** `npm run build` y `oxlint`, más el script de
   comprobación si la lógica lo admite. Sin eso no se empuja.
2. **Commit y `git push origin main`.**
3. **Producción sale sola.** Vercel despliega al recibir `main`, en
   https://app-catador-seguros.vercel.app. No hay que ejecutar nada de Vercel a
   mano, y no existe CLI de Vercel en este entorno.

Después de empujar se confirma que el despliegue quedó en `success` y que el
bundle publicado trae de verdad el cambio.

Las órdenes `gh pr` y `gh issue` fallan siempre aquí porque van por GraphQL. Se
usa `gh api` con las rutas REST.

## Supabase no viaja en el git

Empujar a `main` NO cambia la base de datos. Supabase se administra desde su
panel: el esquema son las sentencias SQL documentadas en `.env.example` y los
archivos de `supabase/migrations/`, que son la referencia de lo que hay que
correr, no algo que se aplique al desplegar.

Así que un cambio que necesite columna, tabla, política o permiso nuevo se
entrega en dos partes: el código en `main` y **el SQL escrito en la respuesta
para pegarlo en el editor de Supabase**. Callarse esa segunda parte deja la app
publicada fallando contra una base que no tiene lo que el código espera.

Las variables `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` viven en el panel
de Vercel. Sin ellas la app no truena: se queda en almacenamiento local.
