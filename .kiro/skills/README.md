# Skills instaladas

Cada carpeta es una Agent Skill (estándar abierto: carpeta + `SKILL.md` con frontmatter). Kiro
carga sólo el `name` y la `description` al arrancar, y las instrucciones completas cuando la
petición coincide con la descripción.

Viven en el repositorio y no en `~/.kiro/skills/` porque **Kiro Web no soporta skills globales**:
así viajan con el proyecto y también las ve el equipo desde el IDE o el CLI.

| Skill | Para qué | Licencia | Origen |
|---|---|---|---|
| `apple-design` | Movimiento fluido e interrumpible, gestos, resortes, materiales translúcidos, tipografía óptica. Traducido a la web (CSS, Pointer Events, Motion) | MIT © Emil Kowalski | [emilkowalski/skills](https://github.com/emilkowalski/skills) |
| `ui-ux-pro-max` | Base consultable: 79 estilos, 192 paletas, 74 pareos tipográficos, 119 guías de UX, 25 tipos de gráfica, 22 stacks | MIT © Next Level Builder | [nextlevelbuilder/ui-ux-pro-max-skill](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill) |
| `sleek-design-mobile-apps` | Diseño de apps móviles vía la API de sleek.design | MIT © Sleek | [sleekdotdesign/agent-skills](https://github.com/sleekdotdesign/agent-skills) |
| `design-review` | Auditoría visual con ojo de diseñador: jerarquía, tipografía, espaciado, estados de interacción y detección de "AI slop" | MIT © Garry Tan | [garrytan/gstack](https://github.com/garrytan/gstack) (`/design-review`, adaptada — el original depende de binarios propios de Claude Code) |
| `cso` | Auditoría de seguridad: secretos, cadena de suministro, CI/CD, OWASP Top 10, STRIDE, riesgos de IA/LLM | MIT © Garry Tan | [garrytan/gstack](https://github.com/garrytan/gstack) (`/cso`, adaptada — ver `cso/ACKNOWLEDGEMENTS.md` para créditos que el original documenta) |

Los archivos `LICENSE` de cada carpeta no son decorativos: la MIT obliga a conservar el aviso de
copyright al redistribuir, y tenerlas aquí es redistribución.

`design-review` y `cso` no son copias del original: gstack está acoplado por completo al runtime
de Claude Code (binarios propios en `~/.claude/skills/gstack/bin/`, slash commands, telemetría,
un servidor de navegador con CDP, sincronización remota). Nada de eso corre en Kiro. Lo que se
trajo es el contenido de criterio —las fases de auditoría, los checklists, las reglas de
severidad y de falsos positivos— reescrito en español y adaptado a las herramientas nativas de
Kiro (el power `playwright`, `grep_search`, `read_file`). El resultado es funcionalmente
equivalente en el análisis, pero es una obra derivada, no una instalación.

## Lo que NO se pudo instalar, y por qué

- **`frontend-design`** de `anthropics/claude-code`: su licencia dice *"© Anthropic PBC. All
  rights reserved. Use is subject to Anthropic's Commercial Terms of Service"*. No es código
  abierto, así que copiar su `SKILL.md` a este repositorio sería redistribuir contenido
  propietario. Se puede usar dentro de Claude Code, no meter aquí.
- **`canvas-design`** de `anthropics/skills`: el repositorio **no declara licencia**. Sin
  licencia, el derecho de autor se reserva por omisión: no hay permiso de redistribución.
- **`dickwu/apple-design-skill`**: tampoco declara licencia.

## Notas de uso

`sleek-design-mobile-apps` necesita `SLEEK_API_KEY` y una cuenta de Sleek (plan de pago para uso
sostenido). Sin la llave no hace nada; no rompe nada.

`ui-ux-pro-max` pesa 3.6 MB, casi todo en CSV de datos. Incluye 22 stacks y este proyecto sólo
usa dos —`react` y `html-tailwind`—; se conservan todos para no romper su búsqueda interna, pero
se pueden recortar si el tamaño del repositorio llega a molestar.
