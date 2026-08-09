# Cómo comunicar los pasos de configuración

## Guía paso a paso, siempre

Cuando algo dependa de configurar un panel externo (Supabase, Vercel, Google
Cloud), no basta con describir el objetivo: hay que guiar la ejecución.

Cada paso lleva estas cuatro cosas:

1. **El enlace directo** a la pantalla exacta, no el nombre del panel.
2. **El nombre literal** del campo, casilla o botón que hay que tocar.
3. **Qué escribir**, listo para copiar.
4. **Qué se debe ver después**, para que se pueda confirmar solo si funcionó.

## Reglas

- Numerar los pasos y ponerlos en el orden real de ejecución. Si el paso 3
  depende de que el 2 haya ocurrido, decirlo.
- Nada de explicaciones técnicas dentro de la lista. El "por qué" va aparte,
  al final, para quien quiera leerlo.
- Verificar el estado antes de escribir la guía y omitir lo que ya esté hecho.
  Mandar a configurar algo que ya está configurado hace perder la confianza en
  el resto de la lista.
- Un bloque de SQL o de comandos debe ser copiable de una sola vez, completo.
  Partirlo en trozos obliga a pegar varias veces y a equivocarse.
