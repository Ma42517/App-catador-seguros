# Verificar antes de decir que está hecho

Que un comando termine sin error no prueba que la función sirva. Compilar no es
funcionar. Dicho esto, la verificación misma tiene un costo — de tiempo y de
contexto — y las reglas de abajo existen para gastarlo donde rinde, no en cada
cambio por igual.

## Cambios de UI, componentes o estado local: sin E2E por defecto

Regla operativa vigente desde 2026-08-18. Para este tipo de cambio, **no**
correr flujos completos de Playwright/`agent-browser` ni inyectar el arnés de
sesión simulada como paso rutinario. Basta con:

- Verificación estática del código (lectura, revisión de que el mapeo de datos
  sea correcto contra el motor y el V1).
- El linter (ver regla de abajo).
- Una prueba de aislamiento rápida si hace falta ver el renderizado: una ruta
  `/dev/sandbox` libre de autenticación es preferible a montar el arnés de
  sesión completo para un vistazo.

El arnés de sesión simulada (documentado más abajo) sigue existiendo para
cuando sí haga falta —cambios que tocan el flujo de autenticación mismo, o
cuando el usuario pide explícitamente ver el resultado en el navegador—, pero
deja de ser el paso obligatorio de cada tarea de UI.

## Sólo *lint* iterativo mientras se desarrolla

Mientras se construye o ajusta un componente: `npx oxlint`, no
`npx vite build`. El build completo de producción se reserva para cuando el
usuario pida explícitamente preparar un pase a producción — no antes de cada
commit intermedio.

## Decisiones de arquitectura ágiles

Con luz verde para decidir sin detener el flujo cuando la decisión protege la
integridad de los datos compartidos (el mismo criterio ya aplicado con la meta
principal del Asistente Interactivo: vive como hilo narrativo local, nunca se
escribe al contexto compartido para no ensuciarlo con un dato sin sustento
numérico). Se documenta brevemente en el reporte al usuario — motivo y
consecuencia — y se avanza; no se pausa a pedir confirmación para decisiones
de este tipo.

## Cuando sí se prueba en el navegador

Si el cambio afecta autenticación, un flujo crítico de varios pasos, o el
usuario pide explícitamente verlo correr, la prueba se escribe como una lista
de comprobaciones que imprimen su resultado, para poder leerlas después. Una
comprobación tiene que poder fallar: si pasa igual con el código roto, no está
comprobando nada.

## Arnés de sesión simulada

Para entrar sin credenciales reales, cuando la verificación sí lo amerita
(ver regla de arriba):

1. Copiar `src/context/SessionContext.jsx` a un respaldo fuera del repo.
2. Inyectar una rama que lea `mockSession` de los parámetros de la URL, justo
   antes del comentario `// Sin credenciales de Supabase no hay forma de entrar`.
3. Lanzar el script con `trap '...' EXIT` que mate el servidor y **restaure el
   respaldo**, pase lo que pase.
4. Confirmar la limpieza con `grep -rn "mockSession" src/`. Sin esa
   confirmación, el arnés se cuela a un commit.

Los scripts van en `.kiro/scratch/`. Escribir en `/tmp` falla sin avisar. Las
órdenes que contienen `--port` o un número de puerto no corren en línea: van
dentro de un archivo de script.

## Verificar una vez, no en bucle

Verificar cuesta tiempo y contexto, así que se hace bien una vez y no se repite:

- Lo ya comprobado en la sesión no se vuelve a comprobar. Tampoco se releen
  archivos que ya se leyeron.
- Una sola corrida de comprobaciones al final, no una por cada archivo tocado.
- Se lee sólo lo que hace falta para el cambio. Recorrer el proyecto entero
  "por si acaso" no es rigor, es desperdicio.
- Ante un fallo, dos intentos de arreglo como máximo. Si al segundo sigue
  fallando, se para y se reporta con lo que se sabe. Insistir a ciegas gasta más
  de lo que resuelve.
- Si el fallo estaba en la prueba y no en el código, se corrige la prueba y se
  sigue. No se rediseña el código para complacer una prueba mal escrita.

## Reportar con honestidad

Al terminar se dice qué quedó comprobado y qué no, y por qué. Si algo se probó
con datos simulados en vez de reales, se dice. Si una comprobación falló, se
investiga si el error está en el código o en la prueba antes de tocar nada:
varias veces la prueba estaba mal y el código bien.

Inventar que algo está verificado es peor que dejarlo pendiente, porque destruye
el valor de todo lo demás que se afirmó.
