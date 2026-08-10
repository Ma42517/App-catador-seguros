# Cómo se escribe el código aquí

## Los comentarios explican el por qué

Un comentario que narra lo que el código ya dice es ruido. El comentario existe
para lo que el código no puede contar: qué se intentó antes, qué restricción
obligó a esta forma, qué pasa si alguien lo "simplifica".

```js
// Mal: repite el código
// Recorre las especialidades
specialties.map(...)

// Bien: explica una decisión
// Se arranca en 0.2 y no centrado: en un retrato la cara está en el tercio
// superior, y encuadrar al centro la dejaba cortada por arriba.
```

Comentarios y textos de interfaz, en español.

## El diseño visual queda libre

A propósito no hay reglas de paleta, espaciado ni composición. Las decisiones
estéticas se toman en cada caso y se discuten con quien pide el cambio, no se
heredan de este archivo.

Lo único que sí aplica al diseño es lo de abajo, y no es cuestión de gusto.

## La interfaz no miente

Un control que no hace nada se apaga y se explica por qué, en lugar de dejarlo
disponible fingiendo que sirve. Un texto no afirma algo que el código no cumple:
si los datos se guardan en el navegador, no se anuncia que están encriptados.

## Antes de dar por terminado

`npx oxlint` y `npx vite build`, ambos limpios. Cero avisos nuevos: comparar
contra `main` si hace falta, porque un aviso preexistente no cuenta como propio.

## Detalles de Tailwind que ya costaron una depuración

- Las clases `delay-*` fijan `transition-delay` y **no** afectan animaciones de
  keyframes. Para encadenar entradas, `animation-delay` en línea más
  `fill-mode: both`.
- `innerText` devuelve el texto ya transformado por CSS. Un elemento con
  `uppercase` no coincide con una expresión regular en minúsculas — cosa que
  invalida pruebas en silencio.
