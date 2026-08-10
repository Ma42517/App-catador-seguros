# Verificar antes de decir que está hecho

Que un comando termine sin error no prueba que la función sirva. Compilar no es
funcionar.

## Todo cambio visible se prueba en el navegador

Si el cambio se ve o se toca, hay que abrirlo y comprobarlo. La prueba se escribe
como una lista de comprobaciones que imprimen su resultado, para poder leerlas
después.

Una comprobación tiene que poder fallar. Si pasa igual con el código roto, no
está comprobando nada: hay que hacerla fallar a propósito una vez para confiar
en ella.

## Arnés de sesión simulada

Para entrar sin credenciales reales:

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

## Reportar con honestidad

Al terminar se dice qué quedó comprobado y qué no, y por qué. Si algo se probó
con datos simulados en vez de reales, se dice. Si una comprobación falló, se
investiga si el error está en el código o en la prueba antes de tocar nada:
varias veces la prueba estaba mal y el código bien.

Inventar que algo está verificado es peor que dejarlo pendiente, porque destruye
el valor de todo lo demás que se afirmó.
