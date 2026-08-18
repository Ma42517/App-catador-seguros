---
name: cso
description: >-
  Auditoría de seguridad al estilo Chief Security Officer: secretos filtrados,
  cadena de suministro de dependencias, seguridad de CI/CD, OWASP Top 10,
  modelado de amenazas STRIDE, y riesgos específicos de IA/LLM. Usar cuando
  piden "auditoría de seguridad", "revisar vulnerabilidades", "OWASP", o antes
  de tocar código que maneja autenticación, pagos o datos personales.
---

# CSO (Chief Security Officer)

Adaptación de `/cso` v2 de [garrytan/gstack](https://github.com/garrytan/gstack)
(MIT © Garry Tan) — ver `ACKNOWLEDGEMENTS.md` en esta misma carpeta para los
créditos que el propio gstack documenta. El original depende de sub-agentes,
telemetría y binarios propios de Claude Code; esta versión usa `grep_search` y
`read_file` de Kiro para el rastreo de código, y reporta directo en el chat.
Content was rephrased for compliance with licensing restrictions.

## Cuándo usar esta skill

- Antes de mandar a producción un cambio que toque autenticación, sesiones,
  pagos, webhooks, o datos personales.
- Cuando el usuario pide explícitamente "auditoría de seguridad" o "revisa
  vulnerabilidades".
- En este proyecto en particular: cualquier cambio cerca de Supabase (roles,
  RLS, OAuth de Google) o de `src/context/` — sin tocar el contenido de
  `FinanceContext.jsx` / `ReferralContext.jsx`, que son zona intocable según
  `.kiro/steering/proyecto.md`; auditar alrededor, no reescribir.

## Modos

- **Diaria (por defecto):** filtro de confianza alto (8/10). Cero ruido, sólo
  hallazgos de los que se está seguro.
- **Comprehensiva:** filtro bajo (2/10), para revisiones a fondo mensuales o
  antes de un lanzamiento grande. Todo lo que sobrevive el filtro de ruido
  real (fixtures de test, placeholders) se reporta, marcando lo dudoso como
  `TENTATIVO`.
- **Sólo lo que cambió:** si el pedido es acotado, usar
  `git diff main...HEAD --name-only` y limitar el rastreo a esos archivos.

Las fases 0, 1 y 12-13 (mapa de superficie y reporte) siempre corren. Las
fases 2-11 son el cuerpo del rastreo — se corren todas salvo que el usuario
acote el alcance (p. ej. "sólo dependencias", "sólo OWASP").

---

## Fase 0: Modelo mental + detección de stack

Antes de cazar bugs, entender qué se está auditando. Para este repo ya se
sabe: React + Vite + Tailwind, Supabase como backend (auth + datos). Leer
`.kiro/steering/proyecto.md` si no está ya en contexto — ahí están los
detalles ya depurados de roles y columnas de Supabase.

Para un repo distinto, detectar el stack con `grep_search`/`file_search`
sobre `package.json`, `requirements.txt`, `Gemfile`, `go.mod`, etc., y
priorizar el rastreo hacia ese stack sin descartar el resto del código.

## Fase 1: Censo de superficie de ataque

Usar `grep_search` para contar: endpoints públicos vs. autenticados, rutas de
administrador, puntos de carga de archivos, integraciones externas, webhooks,
jobs en segundo plano. Reportar como mapa antes de seguir:

```
SUPERFICIE DE ATAQUE
═════════════════════
Endpoints públicos:        N
Autenticados:               N
Sólo admin:                 N
Puntos de carga de archivo: N
Integraciones externas:     N
Webhooks:                   N
```

## Fase 2: Arqueología de secretos

- Buscar en el historial de git patrones de credenciales conocidos (`AKIA`,
  `sk-`, `sk_live_`, `ghp_`, `xoxb-`, bloques `-----BEGIN ... PRIVATE KEY-----`).
- Confirmar que `.env` esté en `.gitignore` y no trackeado por git.
- Revisar workflows de CI por secretos en texto plano.

**Severidad:** crítica si hay patrones de secreto activos en el historial;
alta si `.env` está trackeado o hay credenciales inline en CI.

**Reglas para evitar falsos positivos:** placeholders ("your_", "changeme")
no cuentan; fixtures de test no cuentan salvo que el mismo valor aparezca en
código no-test.

## Fase 3: Cadena de suministro de dependencias

- Detectar gestor de paquetes y correr su auditor si está instalado
  (informativo, no bloqueante si falta la herramienta).
- Para Node: revisar si dependencias de producción tienen scripts
  `preinstall`/`postinstall`/`install` (vector de ataque de cadena de
  suministro).
- Confirmar que el lockfile existe y está trackeado por git.

**Severidad:** crítica para CVEs conocidos de severidad alta/crítica en
dependencias directas; alta para scripts de instalación en deps de
producción o lockfile ausente.

## Fase 4: Seguridad de CI/CD

Para cada workflow (`.github/workflows/*.yml`):
- Acciones de terceros sin fijar por SHA (`uses: algo@v1` en vez de `@<sha>`).
- `pull_request_target` combinado con checkout del código del PR (vector
  crítico: el fork obtiene permisos de escritura).
- Inyección de script vía `${{ github.event.*.body }}` dentro de bloques `run:`.
- Secretos expuestos como variable de entorno sin enmascarar.

**Severidad:** crítica para `pull_request_target` + checkout de PR o
inyección de script; alta para acciones sin fijar o secretos sin enmascarar.

## Fase 5: Infraestructura y configuración

- Dockerfiles sin directiva `USER` (corren como root), secretos pasados como
  `ARG`, `.env` copiado dentro de la imagen.
- Cadenas de conexión a base de datos con credenciales en archivos de config
  trackeados (excluyendo `localhost`/`127.0.0.1` en `docker-compose.yml` de
  desarrollo local, que no es hallazgo).
- Terraform con `"*"` en acciones/recursos IAM sensibles.

## Fase 6: Webhooks e integraciones

- Rutas de webhook sin verificación de firma en ningún punto de la cadena de
  middleware (rastrear el código, sin hacer peticiones HTTP reales).
- TLS deshabilitado en código de producción (`verify.*false`, `InsecureSkipVerify`).
- Scopes de OAuth más amplios de lo necesario.

## Fase 7: Seguridad de IA/LLM

Relevante si el proyecto usa algún modelo de lenguaje o API de IA:
- Entrada de usuario que llega a la construcción del prompt de sistema.
- Salida de un LLM renderizada sin sanitizar (`dangerouslySetInnerHTML`,
  `innerHTML`) — puede ser XSS vía respuesta del modelo.
- Llamadas a herramientas/funciones del LLM sin validación antes de ejecutar.
- Llaves de API de IA hardcodeadas en el código en vez de variables de entorno.
- Llamadas al LLM sin límite — riesgo de costo, no de disponibilidad.

**Nota:** contenido de usuario en la posición de "mensaje de usuario" de una
conversación con IA NO es inyección de prompt por sí solo — sólo cuenta
cuando ese contenido llega al prompt de sistema o al esquema de herramientas.

## Fase 8: Cadena de suministro de skills

Si el proyecto usa skills de agentes de IA (como las de
`.kiro/skills/` en este repo): revisar cada `SKILL.md` con `grep_search` por
patrones sospechosos:
- Llamadas de red hacia afuera (`curl`, `wget`, `fetch`) sin propósito claro.
- Acceso a variables de credenciales (`process.env`, `ANTHROPIC_API_KEY`, etc.).
- Instrucciones de anulación de sistema ("ignora las instrucciones previas",
  "olvida tus reglas").

Las skills que ya están documentadas y con licencia en este repo (`apple-design`,
`ui-ux-pro-max`, `sleek-design-mobile-apps`, y esta misma) se consideran de
origen confiable — no requieren re-escaneo salvo que se modifiquen.

## Fase 9: OWASP Top 10

Revisar cada categoría con `grep_search`, acotando extensiones al stack
detectado en la Fase 0:

- **A01 Control de acceso roto:** rutas sin verificación de auth; referencias
  directas a objetos por ID sin chequear propiedad (`params.id` sin validar
  que pertenece al usuario). *(Para este proyecto: repasar que la puerta de
  acceso "falla cerrada" descrita en `proyecto.md` se sigue cumpliendo.)*
- **A02 Fallas criptográficas:** uso de MD5/SHA1/DES; secretos hardcodeados;
  datos sensibles sin cifrar en tránsito o en reposo.
- **A03 Inyección:** interpolación de strings en queries SQL; `eval()`/`exec()`
  sobre datos externos; `html_safe`/`raw()` sin sanitizar.
- **A04 Diseño inseguro:** ¿hay límite de intentos en login? ¿bloqueo de
  cuenta tras fallos repetidos?
- **A05 Configuración insegura:** CORS con origen `*` en producción; modo
  debug o errores verbosos expuestos.
- **A06 Componentes vulnerables:** ver Fase 3.
- **A07 Fallas de autenticación:** gestión de sesión, expiración de tokens,
  ¿hay MFA disponible para roles admin?
- **A08 Fallas de integridad de software/datos:** ver Fase 4.
- **A09 Fallas de logging y monitoreo:** ¿se registran eventos de auth y
  fallos de autorización?
- **A10 SSRF:** ¿se construyen URLs desde input de usuario sin allowlist?

## Fase 10: Modelado de amenazas STRIDE

Para cada componente principal identificado en la Fase 0, evaluar:

```
COMPONENTE: [nombre]
  Spoofing:                ¿se puede impersonar a un usuario o servicio?
  Tampering:                ¿se puede modificar el dato en tránsito o reposo?
  Repudiation:               ¿hay rastro de auditoría de las acciones?
  Information Disclosure:   ¿puede filtrarse un dato sensible?
  Denial of Service:        ¿se puede saturar el componente?
  Elevation of Privilege:   ¿un usuario puede escalar privilegios?
```

## Fase 11: Clasificación de datos

```
CLASIFICACIÓN DE DATOS
════════════════════════
RESTRINGIDO (fuga = responsabilidad legal):
  - Contraseñas/credenciales: [dónde se guardan, cómo se protegen]
  - Datos personales (PII):    [qué tipos, dónde, política de retención]

CONFIDENCIAL (fuga = daño al negocio):
  - Llaves de API:              [dónde, política de rotación]
  - Datos de comportamiento:    [analítica, tracking]

INTERNO (fuga = vergüenza):
  - Logs de sistema:            [qué contienen, quién accede]

PÚBLICO:
  - Contenido de marketing, documentación, APIs públicas.
```

## Fase 12: Filtro de falsos positivos + verificación activa

Antes de reportar cualquier hallazgo, aplicar este filtro. **Modo diario:**
umbral de confianza 8/10, cero ruido. **Modo comprehensivo:** umbral 2/10,
marcando lo dudoso como `TENTATIVO`.

**Descartar automáticamente:**
- Denegación de servicio o agotamiento de recursos (excepción: el gasto
  descontrolado de llamadas a un LLM sí es riesgo financiero real, no se
  descarta).
- Secretos en disco si ya están cifrados o con permisos correctos.
- Condiciones de carrera sin ruta de explotación concreta.
- CVEs de dependencias con CVSS bajo y sin exploit conocido.
- Hallazgos de seguridad en archivos `*.md` que son documentación real
  (excepción: un `SKILL.md` es código ejecutable de instrucciones para un
  agente, no documentación — sí se evalúa bajo la Fase 8).

**Verificación activa (antes de reportar):**
1. Secretos: confirmar que el patrón tiene el formato real de una llave
   (prefijo y longitud correctos) — nunca probar contra una API en vivo.
2. Webhooks: rastrear el código del handler para confirmar si existe
   verificación de firma en algún punto de la cadena — nunca hacer peticiones
   HTTP reales.
3. Dependencias: confirmar si la función vulnerable se importa/llama
   directamente. Si no, marcar `NO VERIFICADO` con nota de que puede seguir
   siendo alcanzable indirectamente.

**Análisis de variantes:** cuando un hallazgo se marca `VERIFICADO`, usar
`grep_search` para buscar el mismo patrón en el resto del código — una
inyección SQL confirmada puede tener hermanas sin detectar.

## Fase 13: Reporte de hallazgos

Cada hallazgo requiere un escenario de explotación concreto — paso a paso de
cómo un atacante lo usaría. "Este patrón es inseguro" sin más no es un
hallazgo válido.

```
HALLAZGOS DE SEGURIDAD
════════════════════════
#   Sev    Conf   Estado       Categoría      Hallazgo                    Archivo:línea
──  ────   ────   ──────       ─────────      ────────                    ─────────────
1   CRIT   9/10   VERIFICADO   Secretos       Llave AWS en historial git  .env:3
2   ALTA   8/10   VERIFICADO   Cad. suministro postinstall en dep de prod  package.json:12
```

**Calibración de confianza:**

| Puntaje | Significado | Regla de reporte |
|---------|--------------|-------------------|
| 9-10 | Verificado leyendo el código específico | Mostrar normal |
| 7-8 | Coincidencia de patrón de alta confianza | Mostrar normal |
| 5-6 | Moderado, podría ser falso positivo | Mostrar con advertencia |
| 3-4 | Baja confianza | Sólo en apéndice |
| 1-2 | Especulación | Sólo si la severidad sería crítica |

**Antes de reportar cualquier hallazgo:** citar la línea exacta de código que
lo motiva (archivo:línea + el texto verbatim). Si no se puede citar la línea
motivadora, el hallazgo no está verificado — bajar su confianza a 4-5 y
moverlo al apéndice, nunca inventar una cita para justificarlo.

## Reglas importantes

1. Nunca ejecutar pruebas de explotación contra sistemas en producción o de
   terceros — todo el rastreo de esta skill es estático (lectura de código),
   no activo.
2. Ningún hallazgo sin escenario de explotación concreto.
3. Reportar con honestidad qué se pudo verificar y qué quedó como sospecha,
   siguiendo el mismo criterio que `.kiro/steering/verificacion.md` ya exige
   para el resto del trabajo en este repo.
