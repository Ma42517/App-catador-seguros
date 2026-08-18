---
name: design-review
description: >-
  Auditoría visual con ojo de diseñador: detecta inconsistencias, problemas de
  jerarquía, espaciado, "AI slop" (patrones genéricos de interfaz generada por
  IA) e interacciones sin pulir — y propone o aplica el arreglo. Usar cuando
  piden "auditar el diseño", "revisar que se vea bien", "pulir la interfaz",
  o al terminar una tanda de cambios visuales antes de darla por cerrada.
---

# Design Review

Adaptación de `/design-review` de [garrytan/gstack](https://github.com/garrytan/gstack)
(MIT © Garry Tan). El original depende de binarios y un navegador propios de
Claude Code; esta versión usa las herramientas de Kiro: el power `playwright`
para navegar y capturar pantallas, `grep_search`/`read_file` para inspeccionar
el código cuando haga falta, y reporta en texto plano en el chat.
Content was rephrased for compliance with licensing restrictions.

## Cuándo usar esta skill

- Auditoría visual de una pantalla o flujo ya construido.
- Antes de decir "terminado" en cualquier cambio que se vea o se toque (esto
  ya lo exige `.kiro/steering/verificacion.md`: compilar no es probar).
- Cuando el usuario menciona que algo "se ve raro", "genérico", o pide pulir.

No se activa para trabajo puramente de backend, lógica de `src/engine/` (zona
intocable, ver `.kiro/steering/proyecto.md`) o cambios sin superficie visual.

## Cómo correrla aquí

1. Si hay un servidor corriendo (`npm run dev`), usar la URL local; si no,
   levantarlo en segundo plano antes de empezar.
2. Usar el power `playwright` (activarlo con `kiro_powers action=activate`) para
   navegar a la pantalla objetivo y tomar una captura de página completa.
3. Recorrer las fases 1-6 de abajo, en orden. Documentar cada hallazgo con su
   captura antes de seguir a la siguiente fase — no acumular todo para el final.
4. Cerrar con el reporte de la Fase 6. Si el usuario pidió "audita y arregla",
   aplicar los arreglos de mayor impacto y volver a capturar para confirmar.

## Modos

- **Rápido:** sólo Fase 1 (primera impresión) + checklist abreviado en la
  pantalla principal. Para cuando sólo se quiere un pulso rápido.
- **Completo (por defecto):** las 6 fases sobre la pantalla o flujo señalado.
- **Por cambios:** si el pedido es "revisa lo que acabo de tocar", usar
  `git diff main...HEAD --name-only` para ubicar qué pantallas cambiaron y
  auditar sólo esas.

---

## Fase 1: Primera impresión

Antes de analizar nada, forma una reacción de bote. Navega a la pantalla,
toma la captura, y describe en primera persona qué ves, en este orden:

- **Qué comunica** la pantalla a simple vista (¿competencia? ¿confusión?).
- **Qué te llama la atención**, positivo o negativo — con detalle concreto,
  nombrando el elemento exacto y su posición. Si no puedes nombrarlo, no estás
  observando de verdad, estás generando frases genéricas.
- **Las primeras 3 cosas** a las que va el ojo. ¿Son las que el diseño quería
  destacar? Si no, la jerarquía visual está mintiendo.
- **Prueba del tronco:** parado en esa pantalla sin contexto, ¿puedes responder
  en segundos: qué app es, en qué pantalla estoy, cuáles son las secciones
  principales, cuáles son mis opciones aquí, dónde estoy dentro del flujo, y
  cómo busco algo? Si 3 o más fallan, es un hallazgo de impacto alto sin
  importar qué tan pulido se vea el resto.

## Fase 2: Sistema de diseño extraído

No lo que un documento dice, sino lo que de verdad se renderiza. Con
`playwright`, inspecciona (vía snapshot o evaluando JS en la página):

- **Tipografías en uso.** Marca si hay más de 3 familias distintas.
- **Paleta de color en uso.** Marca si hay más de 12 colores no-grises únicos.
- **Escala de encabezados** (h1-h6): tamaños, saltos de nivel sin usar.
- **Espaciados de muestra**: ¿siguen una escala (4px/8px), o son arbitrarios?

## Fase 3: Auditoría visual página por página

Para cada pantalla en alcance, captura escritorio y móvil, y revisa contra
este checklist (marca cada hallazgo con impacto alto/medio/pulido):

**Jerarquía y composición**
- ¿Un punto focal claro? ¿Un solo CTA primario por vista?
- ¿El ojo fluye de arriba-izquierda a abajo-derecha sin ruido competidor?
- Prueba del entrecerrado: ¿la jerarquía se sigue viendo con la vista borrosa?

**Tipografía**
- ≤3 familias de fuente.
- Interlineado ~1.5x en cuerpo, 1.15-1.25x en encabezados.
- Medida de línea 45-75 caracteres.
- Sin saltos de nivel de encabezado (h1→h3 sin h2).
- Texto de cuerpo ≥16px, texto secundario ≥12px.
- Comillas tipográficas, no rectas; elipsis (`…`) no tres puntos.

**Color y contraste**
- Paleta coherente (≤12 colores no-gris).
- WCAG AA: texto de cuerpo 4.5:1, texto grande (18px+) 3:1.
- Colores semánticos consistentes (éxito=verde, error=rojo, aviso=ámbar).
- Nunca codificar información sólo con color (agregar etiqueta o ícono también).
- Modo oscuro (si aplica): texto casi blanco, no blanco puro; superficies con
  elevación, no sólo inversión de luminosidad.

**Espaciado y layout**
- Grid consistente en todos los breakpoints.
- Espaciados en escala (4px u 8px base), no valores sueltos.
- Sin scroll horizontal en móvil.
- Radios de borde con jerarquía, no el mismo radio grande en todo.

**Estados de interacción**
- Estado hover en todo elemento interactivo.
- Anillo de foco visible (`focus-visible`) — nunca `outline: none` sin reemplazo.
- Estado deshabilitado con opacidad reducida + cursor `not-allowed`.
- Estados vacíos con mensaje cálido + acción, no sólo "No hay elementos".
- Mensajes de error específicos: qué pasó + qué hacer.
- Objetivos táctiles ≥44px.
- **Prueba del clic sin pensar:** cada punto de decisión (botón, link,
  dropdown) debe ser obvio en su efecto. Si requiere pensar si es la opción
  correcta, es hallazgo de impacto alto — conecta directo con la regla de
  `.kiro/steering/codigo.md`: "la interfaz no miente".

**Responsive**
- El layout móvil tiene sentido de diseño, no son sólo columnas de escritorio
  apiladas.
- Formularios usables en móvil (tipos de input correctos).
- Nada de `user-scalable=no` ni `maximum-scale=1`.

**Movimiento**
- Cada animación comunica algo (cambio de estado, atención, relación espacial).
- Duración 50-700ms. Sin `transition: all` — propiedades explícitas.
- Sólo `transform` y `opacity` animados, no propiedades de layout.
- Nota de este proyecto (`.kiro/steering/codigo.md`): las clases `delay-*` de
  Tailwind fijan `transition-delay` y no afectan `@keyframes` — para encadenar
  entradas animadas usar `animation-delay` inline + `fill-mode: both`.

**Contenido y microcopy**
- Sin lorem ipsum ni placeholders visibles.
- Etiquetas de botón específicas ("Guardar diagnóstico", no "Continuar").
- Voz activa. Sin "bla bla bla" de bienvenida que no aporta.
- Acciones destructivas con confirmación o ventana de deshacer.
- Todo el texto de interfaz en español, por convención de este proyecto.

**Detección de "AI slop"** — la prueba es: ¿un diseñador de un estudio serio
enviaría esto a producción?
- Fondos con gradiente morado/violeta/índigo, o azul-a-morado.
- La grilla de 3 columnas con ícono-en-círculo-de-color + título + 2 líneas,
  repetida simétricamente 3 veces — el patrón más reconocible de IA genérica.
- Todo centrado (`text-align: center` en todos los encabezados y tarjetas).
- Radio de borde uniforme y burbujeante en cada elemento.
- Blobs decorativos, círculos flotantes, separadores de SVG ondulados.
- Emoji como elemento de diseño (cohetes en títulos, emoji como viñetas).
- Copy genérico de héroe ("Bienvenido a...", "Desbloquea el poder de...").
- `system-ui` o fuente por defecto como tipografía principal — señal de
  "me rendí con la tipografía".

**Rendimiento como diseño**
- Sin salto de layout visible durante la carga (CLS).
- Imágenes con `loading="lazy"` y dimensiones fijadas.
- Sin destello de cambio de fuente visible (FOUT).

## Fase 4: Revisión de flujos de interacción

Camina 2-3 flujos clave narrando en primera persona la sensación, no sólo si
funciona: "hago clic en 'Cargar Demo'... ¿aparece feedback inmediato o hay
un salto sin aviso?". Evalúa:
- **Sensación de respuesta:** ¿el clic se siente inmediato? ¿hay demoras sin
  estado de carga?
- **Claridad del feedback:** ¿la acción confirmó éxito o falla con claridad?
- **Pulido de formularios:** ¿foco visible? ¿validación en el momento correcto?

## Fase 5: Consistencia entre pantallas

Compara capturas y observaciones entre pasos del wizard:
- ¿La cabecera y el stepper se ven y comportan igual en todos los pasos?
- ¿Reutilización de componentes o versiones distintas del mismo botón?
- ¿El tono se mantiene (nada de una pantalla informal y otra corporativa)?

## Fase 6: Reporte

Cierra con:

1. **Calificación de Diseño (A-F)** y **Calificación de AI Slop (A-F)**,
   independientes entre sí.
2. Tabla de hallazgos: impacto (alto/medio/pulido), categoría, descripción,
   captura de referencia, y arreglo sugerido concreto ("cambia X por Y porque
   Z" — nunca "el espaciado se siente raro").
3. **Quick wins**: 3-5 arreglos de alto impacto que toman menos de 30 minutos.
4. Si se hicieron arreglos, capturas de antes/después.

**Calificación por categoría:** A = intencional y pulido. B = sólido con
inconsistencias menores. C = funcional pero genérico. D = problemas notorios.
F = está dañando la experiencia activamente.

## Reglas importantes

1. Piensa como diseñador, no como QA: importa que se sienta bien, no sólo que
   "funcione".
2. Cada hallazgo necesita al menos una captura de respaldo.
3. Se específico y accionable: "cambia X por Y porque Z".
4. Evalúa lo renderizado, no el código — salvo que se pida explícitamente
   revisar la implementación.
5. Prioriza profundidad sobre cantidad: 5-10 hallazgos bien documentados con
   captura y sugerencia concreta valen más que 20 observaciones vagas.
6. Muestra las capturas al usuario en el chat — sin eso, son invisibles para
   quien no tiene acceso al sistema de archivos (ver reglas de "Frontend File
   Visibility" del entorno).
