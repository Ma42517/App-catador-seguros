# Diagnóstico Financiero 360

Descripción funcional completa de la sección. Documenta lo que la aplicación hace
hoy, con los números y las etiquetas exactas que verá un asesor en pantalla.

---

## 1. Qué es

Un sistema que toma la información financiera de una persona, la normaliza a una
**única matriz mensual**, y de ahí deriva todo: semáforos, hallazgos de
consistencia, recomendaciones priorizadas, proyecciones y escenarios.

La idea que gobierna el diseño es que **todas las cifras salen de una sola fuente**.
Ninguna pantalla calcula nada por su cuenta: cada componente lee la matriz. Por eso
un cambio en un gasto reordena el semáforo, mueve la brecha de retiro y reescribe
las recomendaciones en la misma tecla.

`runDiagnosis(state, scenario, activeMode)` es el único punto de entrada del motor y
se vuelve a ejecutar completo en cada cambio. No hay cálculo incremental ni caché
parcial: se recalcula todo, siempre.

---

## 2. Cómo se entra

La app abre en **Hoy**. El diagnóstico se alcanza desde **Ver más → Diagnóstico
360**, que despliega dos opciones:

- **Diagnóstico V1 (Actual)** — el tablero completo en uso.
- **Diagnóstico V2 (Nueva Propuesta)** — el lienzo del rediseño, todavía sin diseño.

La fila muestra un distintivo con la versión activa sin necesidad de desplegarla, y
la elección se recuerda en el navegador.

**Cabecera de la sección:** marca "Diagnóstico Financiero **360**", subtítulo
"Sistema de inteligencia financiera personal", y:

- **NavPill** (sólo en pantallas medianas o mayores): alterna entre **Captura** (va
  al paso 1) y **Diagnóstico** (va al paso 7).
- **Cargar ejemplo** — llena todo con la familia de demostración.
- **Exportar** — menú con tres acciones: *Exportar diagnóstico (CSV)*, *Respaldar
  mis datos (JSON)* y *Empezar de cero* (en rojo, pide confirmación).

**Direcciones enlazables:** cada paso tiene su ancla en la URL, y sobrevive a una
recarga: `#profile`, `#income`, `#expenses`, `#debt`, `#assets`, `#goals`,
`#diagnosis`, `#optimization`.

---

## 3. Los ocho pasos

| # | Paso | Contenido |
|---|---|---|
| 1 | **Perfil** | Quién eres y cómo se interpreta tu captura |
| 2 | **Ingresos** | Fuentes de ingreso e impuestos |
| 3 | **Gastos** | Gasto recurrente por categoría y prioridad |
| 4 | **Deudas** | Créditos, tasas y estrategias de liquidación |
| 5 | **Activos** | Ahorro, inversiones y patrimonio |
| 6 | **Metas** | Metas de vida y retiro |
| 7 | **Diagnóstico** | El tablero ejecutivo |
| 8 | **Optimización** | Palancas y comparación de escenarios |

Los seis primeros son de captura; los dos últimos, de lectura. En los de captura
aparece arriba la **cinta de totales en vivo** (`LiveTotals`) con cuatro tarjetas
—Ingreso sostenible, Gastos, Deuda, Flujo libre— y el medidor de **Salud financiera
N/100**. Existe para que se vea que el motor recalcula mientras se teclea.

No hay validación que bloquee el avance: se puede pasar de paso con datos vacíos.

### 3.1 Perfil

**Datos personales:** nombre o alias, ciudad, estado civil (Soltero(a), Casado(a),
Unión libre, Divorciado(a), Viudo(a)), edad (16–100), perceptores de ingreso del
hogar (1–10), dependientes (0–20), hijos (0–20).

**Reglas de captura** — las dos decisiones que determinan cómo el motor interpreta
todo lo demás:

- **¿Tu ingreso es neto o bruto?** Si es neto, el motor **no** vuelve a restar
  impuestos. Si es bruto, los descuenta **una sola vez**. Es la protección central
  contra la doble deducción.
- **Frecuencia habitual de captura** (mensual o anual): sólo afecta el valor por
  omisión de los formularios.
- **Factor de uso del ingreso variable** (0–100%, por omisión **70%**): qué
  proporción del ingreso variable se considera sostenible.

**Coberturas actuales:** dos casillas, Gastos Médicos Mayores y seguro de vida. No
son decorativas: alimentan los banners de riesgo del tablero.

**Horizonte de retiro:** edad deseada de retiro (mínimo edad+1, máximo 95) y años
estimados de vida (mínimo retiro+1, máximo 110).

### 3.2 Ingresos e impuestos

Cada fila captura concepto, **categoría**, **tipo**, monto, **frecuencia** y
**estabilidad**.

- **Categorías y tipos:**
  - *Ingreso Laboral:* Sueldo, Sueldo del cónyuge, Comisiones, Bonos, Reparto de
    utilidades (PTU), Negocio propio, Honorarios / Freelance, Ingreso extraordinario.
  - *Ingreso Pasivo:* Rentas, Dividendos, Intereses, Rendimientos de inversión.
  - *Otros Flujos:* Pagos de préstamos recibidos, Venta de activos, Apoyo familiar,
    Otro.
- **Frecuencia:** Mensual, Trimestral, Anual, Única vez.
- **Estabilidad** — decide cuánto de ese ingreso es comprometible:
  - **Estable** → se usa al 100%.
  - **Variable** → se usa al porcentaje del factor de variabilidad (70% por omisión).
  - **Extraordinario** → **se excluye por completo** del ingreso sostenible.

**Resumen:** ingreso bruto recurrente, **ingreso sostenible**, extraordinario anual
excluido, y **concentración de ingreso** con semáforo (rojo si una sola fuente pesa
más del 80%, amarillo por encima del 60%).

**Bloque de Impuestos** (plegable): impuesto retenido, impuestos adicionales
pagados, pagos provisionales, devoluciones recibidas y un **saldo fiscal anual
estimado** de sólo lectura (positivo = a cargo, negativo = a favor). Muestra la tasa
efectiva. Aviso explícito: *"Ningún parámetro fiscal está preprogramado: todo es
editable."* No hay tablas de ISR embebidas.

### 3.3 Gastos

Arranca con un **aviso en ámbar**: no registrar aquí los pagos de créditos, porque
van en el paso de Deudas y registrarlos dos veces duplicaría el monto.

- **14 categorías:** Vivienda, Servicios, Alimentación, Transporte, Educación, Salud,
  Seguros, Cuidado personal, Vestimenta, Apoyo familiar, Entretenimiento, Viajes,
  Servicios profesionales, Varios.
- **4 prioridades**, que definen qué tan comprimible es cada gasto: **Esencial**,
  **Importante**, **Discrecional**, **Lujo**. Lo esencial **nunca** se recorta en los
  escenarios.

**Composición del gasto:** dona por prioridad, razón gasto/ingreso con semáforo
(rojo sobre 75%, amarillo sobre 50%), **margen comprimible** (discrecional + lujo),
**piso de vida** (base del fondo de emergencia) y **top 5 de categorías**.

### 3.4 Deudas

- **9 tipos:** Hipoteca, Crédito automotriz, Tarjeta de crédito, Préstamo personal,
  Crédito educativo, Crédito de nómina, Crédito de negocio, Préstamo familiar, Otra.
- Por deuda: saldo, tasa anual, **pago mínimo**, **pago real**, línea de crédito
  (sólo tarjetas) y activo vinculado.
- El motor usa **el pago real, con el mínimo como piso**: nunca calcula con un pago
  por debajo del mínimo.

**Por fila** se ve interés mensual, cuánto va a capital, interés total, utilización
de la tarjeta (rojo sobre 70%, amarillo sobre 30%) y una alerta cuando **el pago no
cubre el interés** — esa deuda se marca como que nunca se liquida.

**Carga de deuda:** saldo total, pago mensual, interés mensual, qué porcentaje del
pago es interés, y una lista de barras por saldo coloreada por tasa (rojo sobre 35%,
naranja sobre 15%).

**Estrategias de liquidación acelerada** — dos simulaciones mes a mes con el
excedente actual:

- **Avalancha:** ataca la tasa más alta primero.
- **Bola de nieve:** ataca el saldo más chico primero.

Cada una reporta plazo, interés total y cuánto flujo libera al terminar. Al
liquidarse una deuda, su pago se reinvierte en la siguiente (efecto bola de nieve).
Si la avalancha ahorra intereses, lo dice con la cifra.

### 3.5 Activos y patrimonio

- **10 tipos**, con dos marcas que cambian el cálculo:
  - *Líquidos:* Efectivo, Cuentas bancarias, Fondo de emergencia, CETES / Bonos,
    Acciones, ETFs.
  - *De retiro:* **Cuenta de retiro / PPR / Afore** — alimenta el módulo de retiro
    automáticamente.
  - *No líquidos:* Bienes raíces, Negocios, Otro activo.
- Por activo: saldo, aportación mensual, rendimiento anual (puede ser **negativo**,
  para lo que se deprecia) y horizonte en años. Muestra el valor proyectado.

**Verificación de ahorro** — una de las piezas más útiles: se compara *"¿cuánto crees
que ahorras al mes?"* contra lo que el flujo permite. Si la diferencia pasa del 25%
y de $500, salta el aviso **"Inconsistencia financiera detectada"** con el monto
exacto. Sirve para descubrir gasto no registrado.

**Fondo de emergencia:** barra contra la meta de 6 meses (rojo bajo 3, amarillo hasta
6) y el cálculo de cuánto se necesita para cubrirlos.

**Patrimonio neto:** dona de líquidos / no líquidos / pasivos, apalancamiento con
semáforo (amarillo sobre 60%) y las tres columnas Activos, Pasivos, Neto.

### 3.6 Metas y retiro

- **8 categorías de meta:** Comprar auto, Comprar casa, Educación, Viaje, Inversión,
  Crear un negocio, Fondo de retiro, Otra.
- **3 prioridades:** Alta, Media, Baja. Determinan el orden en que las metas consumen
  el excedente.
- Por meta: costo hoy, ya ahorrado, años para lograrla, **inflación del bien**
  (educación y salud se inflan más) y rendimiento esperado del ahorro. Devuelve el
  **costo futuro**, la aportación mensual requerida y una barra de **viabilidad**.

El excedente se reparte **en cascada por prioridad**: la meta de mayor prioridad se
sirve primero, y lo que sobra pasa a la siguiente. Por eso una meta puede quedar en
0% de viabilidad no porque sea imposible, sino porque las de arriba se llevaron el
excedente.

**Retiro:** pensión mensual deseada **en pesos de hoy**, inflación esperada,
rendimiento antes del retiro y rendimiento durante el retiro (suele ser menor). Todo
el cálculo se hace **en términos reales**, con la tasa real
`(1 + rendimiento) / (1 + inflación) − 1`.

El capital y la aportación **no se capturan aquí**: se toman de los activos marcados
como cuenta de retiro. Es a propósito, para no contar el mismo ahorro dos veces.

Muestra capital necesario, capital proyectado, brecha, aportación faltante al mes, la
**trayectoria del capital** en una gráfica contra la línea del capital necesario, y
la comparación entre la pensión sostenible y la deseada.

---

## 4. La matriz financiera

Todo lo monetario es **mensual y en pesos**. Estas son las cifras que gobiernan el
tablero:

| Cifra | Qué es |
|---|---|
| **Ingreso sostenible** | Lo único comprometible. Excluye lo extraordinario, aplica el factor de variabilidad y **ya viene neto de impuestos** |
| **Gastos totales** | Todo el gasto recurrente, normalizado a mensual |
| **Servicio de deuda** | Suma de los pagos reales, con el mínimo como piso |
| **Flujo de caja libre** | Ingreso sostenible − gastos − deuda |
| **Compromiso de ahorro** | Aportaciones mensuales a los activos |
| **Costo de metas** | Aportación mensual que exigen todas las metas |
| **Ingreso requerido** | Gastos + deuda + ahorro + metas + impuestos |
| **Brecha de ingreso** | Ingreso requerido − ingreso sostenible |
| **Patrimonio neto** | Activos − pasivos |
| **Excedente final** | Flujo libre − ahorro − metas |
| **Tasa de ahorro** | Flujo libre / ingreso sostenible |

A esa lista se añade una cifra que no se muestra pero que sostiene la brecha:
**el ingreso sostenible bruto**, es decir el mismo ingreso antes de impuestos. El
*ingreso requerido* lleva los impuestos dentro —responde a "cuánto necesito
ganar"—, así que la brecha se mide contra el bruto. Compararlo contra el neto
contaba la carga fiscal dos veces.

### Garantías contra la doble contabilidad

Son decisiones explícitas del motor y vale la pena conocerlas, porque explican
resultados que a primera vista sorprenden:

1. **Los impuestos se restan una sola vez**, y sólo si el ingreso se declaró bruto.
2. **La brecha compara bruto contra bruto**, nunca bruto contra neto.
3. **La aportación de retiro se deriva de los activos**, nunca se suma aparte.
4. **El ingreso extraordinario nunca entra** al ingreso sostenible.
5. **Un ingreso de "única vez" aporta 0** al flujo mensual; se acumula como anual.
6. **Los pagos de crédito viven sólo en Deudas**, no en Gastos.
7. **Al eliminar una deuda en un escenario**, su pago se libera en el mismo instante.

Las tres primeras están verificadas por `scripts/verifica-diagnostico.mjs`, que
ejecuta el motor con casos donde estos errores estaban vivos.

---

## 5. El tablero (V1)

En orden de aparición:

1. **Selector de escenario:** Realidad Actual · Vida Aspiracional · Plan Optimizado.
2. **Banners de riesgo** (sólo si aplican):
   - **Rojo — Riesgo patrimonial crítico:** eventualidad médica sin GMM. Muestra
     patrimonio expuesto, liquidez disponible en meses y gasto actual en seguros.
   - **Violeta — Brecha de retiro:** "Te faltan $X para el retiro que quieres", con
     brecha, avance, años restantes y la aportación que la cierra.
3. **Matriz central**, ocho tarjetas: Ingreso sostenible, Gastos totales, Servicio de
   deuda, Flujo de caja libre, Compromiso de ahorro, Costo de metas, Ingreso
   requerido y Brecha de ingreso.
4. **A dónde va cada peso:** barra de composición (Gastos, Deuda, Ahorro, Metas y,
   si aplica, Impuestos) con un marcador vertical en "Tu ingreso". Debajo, la
   aritmética en una frase: cuánto cuesta la vida objetivo, cuánto hay, y cuánto
   falta al mes y al año.
5. **Semáforo financiero:** anillo con el puntaje global y cinco filas — Flujo de
   caja, Riesgo de deuda, Fondo de emergencia, Viabilidad de metas y Preparación para
   el retiro — cada una con su cifra, su veredicto en palabras y su ayuda.
6. **Distribución del gasto** (dona por prioridad) y **Deuda por saldo** (barras por
   tasa, con saldo total e intereses anuales).
7. **Proyección de patrimonio:** curva a partir del patrimonio actual y el flujo
   libre, a la tasa real, hasta el retiro. Con el descargo *"No es una promesa de
   rendimiento."*
8. **Camino al retiro:** avance, capital proyectado contra el necesario, brecha,
   aportación faltante y los años que quedan.
9. **Avance de metas:** una barra por meta.
10. **Verificación de consistencia** y **Recomendaciones priorizadas** (las 3 más
    importantes; el resto en Optimización).

### Umbrales del semáforo

| Indicador | Verde | Amarillo | Rojo |
|---|---|---|---|
| **Flujo de caja** | tasa de ahorro ≥ 10% | tasa < 10% | flujo ≤ 0 |
| **Riesgo de deuda** | < 30% del ingreso | 30% – 50% | > 50% |
| **Fondo de emergencia** | > 6 meses | 3 – 6 meses | < 3 meses |
| **Viabilidad de metas** | 100% | ≥ 60% | < 60% |
| **Preparación de retiro** | ≥ 90% | ≥ 50% | < 50% |

**Hay un cuarto estado: gris.** Un indicador se queda en gris mientras no haya con
qué juzgarlo — sin gastos esenciales no hay fondo de emergencia que medir, sin metas
no hay viabilidad, sin pensión deseada no hay avance de retiro. El gris **no es
verde**: verde afirma que algo está bien, gris dice que todavía no se sabe. La fila
muestra entonces qué falta capturar.

**Salud financiera (0–100):** promedia **sólo los indicadores evaluables**. Verde
vale 2 puntos, amarillo 1, rojo 0. Si no hay ninguno evaluable, no hay puntaje: la
sección muestra un guion e invita a capturar, en lugar de inventar un veredicto.

---

## 6. Verificación de consistencia

Un auditor que revisa que la información sea internamente coherente. Cuando no
encuentra nada, lo dice: *"Sin contradicciones detectadas. Tu modelo financiero es
internamente consistente."*

Tres severidades: **error** (hay que corregir antes de confiar en el diagnóstico),
**advertencia** e **informativo**. Las diez reglas:

| Hallazgo | Tipo | Cuándo salta |
|---|---|---|
| Impuestos no aplicados | error | El ingreso es bruto pero los impuestos no se están descontando |
| Riesgo de doble deducción | error | El ingreso es neto y además se descuentan impuestos |
| Impuestos informativos | info | Ingreso neto con impuestos capturados: informa la tasa efectiva |
| Ahorro declarado vs flujo | advertencia | La diferencia pasa del 25% y de $500 |
| Ingreso extraordinario excluido | info | Recuerda que no cuenta como sostenible |
| Pagos de préstamos como flujo | info | Hay ingresos de tipo "pagos de préstamos recibidos" |
| Deuda que nunca se liquida | error | El pago no cubre el interés |
| Descuadre de la matriz | error | El ingreso requerido no coincide con la suma de sus partes |
| Descuadre del flujo | error | El flujo libre no coincide con su fórmula |
| Descuadre de la brecha | error | La brecha no coincide con el requerido menos el sostenible bruto |
| Ahorro que excede el flujo | advertencia | Se aporta más de lo que el flujo permite |
| Concentración de ingreso | advertencia | Una sola fuente supera el 80% |

Los tres "descuadres" son **auto-auditoría del propio motor**: verifican con
tolerancia de un peso que la aritmética cierre. Si aparecen, el problema está en el
cálculo, no en la captura.

El de la brecha existe porque ahí hubo un error real en producción: los dos primeros
no lo detectaban, porque replicaban la misma fórmula equivocada que auditaban.

---

## 7. Recomendaciones priorizadas

Quince reglas, ordenadas por severidad (**Crítico**, **Alto**, **Medio**, **Bajo**).
Cada una se presenta con la misma estructura de cuatro partes:

> **PROBLEMA** → **IMPACTO** → **CIFRA** → **ACCIÓN**

| Recomendación | Severidad | Se dispara con |
|---|---|---|
| Déficit de flujo | Crítico | Flujo libre negativo. La acción cambia según si el gasto comprimible alcanza a cubrirlo |
| Tasa de ahorro baja | Alto | Tasa bajo 10% |
| Carga de deuda | Crítico sobre 50%, Alto sobre 30% | Razón deuda/ingreso |
| Deuda más cara | Alto | Tasa sobre 25% |
| Deuda impagable | Crítico | El pago no cubre el interés |
| Utilización de tarjetas | Alto sobre 70%, Medio sobre 30% | Saldo contra línea |
| Fondo de emergencia | Crítico bajo 3 meses, Medio bajo 6 | Estima en cuántos meses se llena con el flujo actual |
| Metas inviables | Medio | Hasta 3 metas, con el faltante de cada una |
| Conjunto de metas | Alto bajo 50%, Medio | Viabilidad global incompleta |
| Brecha de retiro | Crítico bajo 30% de avance, Alto bajo 60%, Medio | Da la aportación exacta y menciona el PPR deducible |
| Brecha de ingreso | Alto | Anualiza la brecha y da el porcentaje de aumento necesario |
| Concentración de ingreso | Alto / Medio | Una fuente domina |
| Patrimonio negativo | Crítico | Pasivos sobre activos |
| Apalancamiento alto | Medio | Sobre 60% |
| Concentración de gasto | Bajo | Una categoría pasa del 35% |

---

## 8. Los tres escenarios

Se calculan **los tres a la vez**, en cada recálculo:

- **Realidad Actual** — la línea base, sin ajustes.
- **Vida Aspiracional** — igual, pero sumando al compromiso de ahorro **la aportación
  al retiro que aún no se hace**. Sirve para ver el costo real de la vida deseada:
  sube el ingreso requerido y la brecha.
- **Plan Optimizado** — el único que recibe las palancas del paso de Optimización.

---

## 9. Panel de Optimización

*"Mueve las palancas y observa cómo se reconfigura tu economía completa en tiempo
real. Tus datos originales no se alteran."*

**Cinco palancas** (más el botón Reiniciar):

| Palanca | Rango | Qué hace |
|---|---|---|
| **Incremento de ingreso** | 0 a +100% | Escala todas las fuentes de ingreso |
| **Reducción de gasto** | 0 a 50% | Recorta **en cascada: lujo → discrecional → importante**. Nunca toca lo esencial |
| **Aplazamiento de metas** | 0 a 10 años | Baja la aportación mensual, pero el costo futuro sube por inflación |
| **Ajuste de inflación** | −3 a +6 puntos | Sensibilidad de metas y retiro |
| **Ajuste de rendimiento** | −5 a +5 puntos | Sensibilidad a rendimientos |

**Deudas liquidadas en el escenario:** una casilla por deuda, etiquetada con cuánto
flujo libera cada una. Al marcarlas, el pago desaparece del servicio de deuda y el
saldo de los pasivos, y se reporta el total liberado.

**Comparación de escenarios:** tabla de nueve renglones por tres columnas, con el
delta de cada celda respecto a la realidad actual, coloreado según si el movimiento
es bueno o malo. Cierra con la salud financiera de cada escenario y tres botones para
llevar el escenario elegido al tablero.

**Resultado del plan optimizado:** la barra de composición del escenario, el cambio
en flujo libre, el cambio en brecha, y un veredicto: si el plan se vuelve viable, o
cuánto falta todavía.

**Candado de referidos:** las palancas quedan libres, pero la comparación, el
resultado, la lista completa de recomendaciones y la llamada a la acción están
detrás de un candado que pide **dos contactos** (nombre y WhatsApp de 10 dígitos).
Los contactos se guardan sólo en el navegador y no se envían a ningún servidor. Hay
una salida explícita: *"Prefiero verlo sin compartir contactos."*

Al final, una **llamada a la acción por WhatsApp** con un mensaje prellenado que
incluye el nombre, el flujo libre y la brecha de retiro.

---

## 10. Datos, respaldo y privacidad

- **Todo vive en el navegador.** El diagnóstico se guarda en el almacenamiento local
  del dispositivo, no en un servidor.
- **Respaldo JSON:** `diagnostico-360-AAAA-MM-DD.json` con el estado completo.
- **Exportación CSV:** `diagnostico-360-AAAA-MM-DD.csv`, pensado para Excel en
  español (lleva marca de codificación para que respete los acentos). Secciones:
  encabezado, **matriz central**, ingresos, gastos por categoría, gastos por
  prioridad, deudas, activos, metas y recomendaciones.
- **Empezar de cero:** borra todo lo capturado, con confirmación previa.
- **Datos de ejemplo:** la familia Hernández Ruiz — 41 años, CDMX, dos perceptores,
  dos hijos, sin GMM ni seguro de vida, cuatro deudas (incluidas dos tarjetas al 48%
  y 42%), activos con rendimiento negativo y un ahorro declarado inconsistente a
  propósito, para que se vea funcionar la verificación.

**Descargos que la sección muestra:** *"Herramienta de diagnóstico y simulación. Los
resultados son estimaciones basadas en los supuestos que capturas y no constituyen
asesoría financiera, fiscal ni de inversión. Tu información se guarda únicamente en
este navegador."*

---

## 11. Supuestos por omisión

Todos editables desde la interfaz:

| Supuesto | Valor |
|---|---|
| Inflación | 4% |
| Rendimiento antes del retiro | 9% |
| Rendimiento durante el retiro | 6% |
| Esperanza de vida | 85 años |
| Edad de retiro | 65 años |
| Factor de uso del ingreso variable | 70% |
| Rendimiento por omisión de un activo | 5%, horizonte 10 años |
| Inflación por omisión de una meta | 4%, rendimiento 8%, 5 años |

---

## 12. Detalles que conviene saber

No son fallas de captura, son comportamientos del motor que explican resultados
extraños:

- **La proyección de patrimonio usa el flujo libre completo** como ahorro, no el
  compromiso de ahorro: asume que todo lo que sobra se invierte. Y si el flujo es
  negativo usa cero, así que no dibuja destrucción de patrimonio.
- **Una meta a cero años pide su brecha completa como aportación mensual.** Es la
  única lectura mensual posible de un desembolso inmediato, pero infla el ingreso
  requerido de forma llamativa.
- **La importación de un respaldo JSON existe en el motor pero no tiene pantalla.**
  Se puede exportar, no reimportar desde la interfaz.
- **El rediseño V2 está vacío.** Es un lienzo con los datos ya conectados y tres
  cifras de comprobación; el diseño está pendiente.

## 13. Verificación

`node scripts/verifica-diagnostico.mjs` ejecuta el motor contra ocho casos y afirma
33 comprobaciones. Cada caso corresponde a un error que estuvo en producción, así que
no es una prueba de que el motor funcione en general: es la garantía de que esos
errores concretos no vuelven en silencio.

Los casos: la doble contabilidad fiscal en la brecha, el diagnóstico vacío, la
viabilidad sin metas, el retiro sin pensión deseada, la deuda sin ingreso, la
frecuencia de impuestos por omisión, las simulaciones de liquidación duplicadas y —
como red de seguridad contra correcciones que rompan lo que sí funcionaba — el
diagnóstico completo de los datos de ejemplo.

<!-- Despliegue: 2026-09-03T05:20Z -->
