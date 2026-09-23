# Prácticas de Claude Code — qué adoptamos y qué no

> Análisis de [shanraisshan/claude-code-best-practice][repo] (commit `ddc2173`, 2026-09-23) contra
> cómo trabaja hoy Wasabi Cross. Es una **propuesta**: nada de esto está aplicado todavía. Las
> tareas del final entran a [ACTION-PLAN.md](./ACTION-PLAN.md) —y a Trello— recién cuando el usuario
> apruebe cuáles.

## Cómo se eligió

El repo junta 83 tips, una guía por primitiva (settings, hooks, skills, subagentes, memoria, MCP),
workflows de terceros y transcripciones de charlas. Se descartó de entrada lo que es preferencia
personal —sonidos, spinner, status line, tema—, que va en `~/.claude` y no en el repo. El resto se
midió con tres preguntas:

1. **¿Ataca una falla que ya nos pasó?** La evidencia sale de la [bitácora](./state/bitacora), del
   historial de git y de las lecciones que el agente guardó en su memoria.
2. **¿Convierte una regla escrita en algo que el harness hace cumplir?** CLAUDE.md es una
   sugerencia para el modelo; un `deny`, un hook o una regla de lint no se pueden ignorar.
3. **¿Encaja con la spec?** §9 (buenas prácticas con IA), §16 (tareas y Definition of Done) y
   CLAUDE.md mandan. Lo que choca con ellas se descarta o se lleva a la spec primero.

## Lo que ya hacemos

Varias prácticas del repo ya están en el proyecto. No hay nada que adoptar ahí, pero conviene
saberlas correctas para no desarmarlas:

| Práctica del repo                                                          | Cómo la cumplimos                                                                                             |
| -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| CLAUDE.md compartido, en git, de menos de 200 líneas                       | 120 líneas, versionado, con su copia en AGENT.md                                                              |
| Un directorio de notas que el agente actualiza tras cada PR                | STATE.md + bitácora (spec §15)                                                                                |
| Plan por fases con gates de tests                                          | ACTION-PLAN, con `acceptance-criteria` y `test_plan` en cada tarea                                            |
| Specs detalladas antes de delegar                                          | La spec manda; cada tarea trae su descripción y sus criterios                                                 |
| Convertir el feedback de review que se repite en reglas de lint            | ESLint hace cumplir: sin `any`, dominio sin infraestructura, módulos que no se cruzan, `ui` sin data fetching |
| Darle a Claude una forma de verificar su trabajo ("el tip más importante") | `pnpm verify`, coverage ≥ 90%, E2E + axe en CI, `dev:ephemeral`                                               |
| Comandos del inner loop versionados en `.claude/commands/`                 | `/trello-sync`                                                                                                |
| PRs chicas                                                                 | Tareas de hasta 8 puntos y una PR por tarea o pedido (#48, #49, #50)                                          |
| Git worktrees para trabajar en paralelo                                    | Los usa la app de escritorio, en `.claude/worktrees/` (excluido por `.git/info/exclude`)                      |

## Resumen de lo que se propone adoptar

| #     | Práctica                                             | Impacto    | Costo | Falla que ataca                                                 |
| ----- | ---------------------------------------------------- | ---------- | ----: | --------------------------------------------------------------- |
| CC-01 | Settings de proyecto: permisos compartidos y `deny`  | Alto       |     2 | Prohibiciones de CLAUDE.md que hoy son sólo texto               |
| CC-02 | Skill `/entregar`: verificar, revisar, commitear, PR | Alto       |     3 | La PR #50 llegó a CI con el E2E roto                            |
| CC-03 | Revisor con contexto limpio (`spec-reviewer`)        | Alto       |     3 | La auto-revisión de #50 encontró cuatro fallas después del push |
| CC-04 | Verificación en navegador, versionada                | Alto       |     3 | Verificación a mano con archivos de descarte y la cookie rota   |
| CC-05 | Hooks que bloquean lo que no se hace con git         | Medio      |     2 | La PR apilada #16, que no llegó a `main`                        |
| CC-06 | Las lecciones de proceso van a CLAUDE.md             | Medio      |     1 | Reglas que un LLM que lee AGENT.md no ve                        |
| CC-07 | `/tarea <ID>`: arranque con dependencias y plan      | Medio      |     2 | `depends_on` se chequea de memoria                              |
| CC-08 | `/cerrar-sesion`: STATE y bitácora, con chequeo      | Medio      |     2 | STATE.md diciendo "4 de 10" con 9 tareas cerradas               |
| CC-09 | Formato automático por hook                          | Medio-bajo |     2 | Drift de formato que hoy aparece recién en CI                   |
| CC-10 | La próxima fase, en rebanadas verticales             | Medio      |     0 | El E2E de cada fase llegó al final (F1-18, F2-10)               |

El costo está en story points, estimado.

## Detalle

### CC-01 · Settings de proyecto: permisos compartidos y `deny`

**Qué dice el repo.** Pre-aprobar los comandos seguros en `.claude/settings.json`, versionado y
compartido, en vez de saltear permisos ([Boris, 13 tips #10][boris-13]; [12 tips #5][boris-12]). Y
usar settings para lo que tiene que cumplirse sí o sí, no una línea en CLAUDE.md que el modelo
puede pasar por alto ([tips de CLAUDE.md][tips-claudemd], davila7). Un `deny` gana siempre sobre
`allow` y `ask`, en cualquier modo de permisos ([guía de settings][settings]).

**Por qué acá.** El proyecto no tiene `.claude/settings.json`. Tres prohibiciones de CLAUDE.md
dependen hoy de que el modelo se acuerde: loguear secretos, probar en prod y tocar Mongo Atlas a
mano. Y cada sesión, en cada máquina, vuelve a pedir permiso para `pnpm verify`.

**Cómo.**

- `allow`: los scripts de verificación (`verify`, `lint`, `typecheck`, `test`, `test:coverage`,
  `build`, `format`, `e2e`, también con `--filter`), la lectura de git y la de `gh` (`gh pr view`,
  `gh pr checks`). No `Bash(pnpm *)` entero: eso incluye `pnpm add` y `pnpm publish`.
- `deny`: `Read` de los `.env` reales (`**/.env`, `**/.env.local`, `**/.env.production`). Nunca
  de `.env.example`.
- `ask`: `git push --force`, el CLI `railway` (`plan`/`apply` son 🔑 del usuario) y las
  herramientas del MCP de Railway que cambian algo: variables, redeploy, borrados,
  `accept-deploy`. Los nombres dependen de cómo esté instalado el servidor —en esta máquina
  aparece como `mcp__railway__*` y también bajo un id de conector—: la tarea los verifica.
- El `allow` se siembra con el skill incluido `/fewer-permission-prompts`, que lo arma a partir del
  historial real de sesiones.

**Límites.** Un `deny` sobre `Read(.env)` no impide un `cat .env` por Bash: frena el camino normal,
no es un sandbox. El sandbox de Claude Code, que sí aísla archivos y red, corre en macOS, Linux y
WSL2, no en Windows nativo. Y `defaultMode: "auto"` no se lee desde los settings del proyecto —un
repo no puede darse auto mode a sí mismo—: sigue siendo una elección personal.

### CC-02 · Skill `/entregar`

**Qué dice el repo.** Todo lo que se hace más de una vez al día va a un comando o a un skill
versionado ([Boris, 10 tips #4][boris-10]); su ejemplo es `/commit-push-pr`
([13 tips #7][boris-13]). La versión más reciente es `/go`: probar de punta a punta, correr
`/simplify` y abrir la PR, para que al volver se sepa que el código funciona
([6 tips #6][boris-6]).

**Por qué acá.** La entrega es siempre la misma y hoy está repartida entre CLAUDE.md, la memoria del
agente y el system prompt: rama desde `origin/main`, un commit convencional por tarea con su
`Refs:`, push, PR contra `main` y confirmar con `git merge-base` que llegó. Y le falta un paso: la
PR #50 llegó a CI con el E2E de cupo roto (`cupo-del-plan.spec.ts`) porque `pnpm e2e` no se corrió
antes del push.

**Cómo.** Un skill en `.claude/skills/entregar/` con `disable-model-invocation: true`: pushea y abre
PRs, así que lo dispara una persona, no el modelo. Pasos: `pnpm verify` y `pnpm e2e` → revisión con
contexto limpio (CC-03) → un commit por tarea → push → PR contra `main` → recordar lo que sigue
siendo del humano (marcar `[x]`, mover la tarjeta). Con su sección de _Gotchas_, que arranca con
las que ya costaron: sin `jq` suelto, sin PRs apiladas.

### CC-03 · Revisor con contexto limpio: `spec-reviewer`

**Qué dice el repo.** Dos ventanas de contexto separadas encuentran más bugs que una: el mismo
modelo que introdujo un bug lo ve mejor desde afuera ([Boris, test time compute][boris-tt]). Mejor
subagentes específicos del proyecto que un "QA" genérico ([tips de agentes][tips-agents]). Y un
segundo Claude que revise el plan como lo haría un staff engineer ([10 tips #2][boris-10]).

**Por qué acá.** La spec §9 ya pide subagentes `spec-reviewer`, `test-writer` y
`security-reviewer`, y no existe ninguno. La auto-revisión de la PR #50 encontró cuatro problemas
—el E2E roto, la "segunda red" del gateway sin validar peso ni desnivel, mensajes de Zod en inglés,
cobertura asimétrica— recién después del push (commit `0642f65`). La hizo el mismo contexto que
había escrito el código.

**Cómo.**

- `.claude/agents/spec-reviewer.md`, de sólo lectura (`Read`, `Grep`, `Glob` y `Bash` para
  `git diff`). Recibe el ID de la tarea y revisa el diff contra sus criterios de aceptación, la
  spec, el DoD de §16 y el "Prohibido" de CLAUDE.md. Devuelve hallazgos, no arreglos.
- `security-reviewer` no hace falta escribirlo: está el skill incluido `/security-review`.
  Obligatorio en las PRs que toquen auth, permisos o billing, donde la spec §9 además exige
  revisión humana.
- `/code-review` busca bugs de corrección; `spec-reviewer`, que el cambio cumpla la spec. Se
  complementan.
- `test-writer` queda para después: el skill `tdd` ya cubre el flujo, y los tests de billing y
  permisos los escribe o revisa un humano igual.

### CC-04 · Verificación en navegador, versionada

**Qué dice el repo.** Los skills de verificación de producto están entre los más valiosos: puede
valer la pena dedicarle una semana a dejarlos excelentes ([Thariq, tipos de skills #2][thariq-skills]).
La app de escritorio levanta el servidor y lo prueba en su navegador integrado
([Boris, 15 tips #7][boris-15]). Y lo de más señal en cualquier skill es su sección de _Gotchas_,
que crece con cada tropiezo ([Thariq, tip 2][thariq-skills]).

**Por qué acá.** El E2E cubre los flujos críticos, pero los cambios de UI se miran a mano antes de
la PR, y en la última sesión eso costó: un `.env` y un `.claude/launch.json` armados de descarte y
revertidos al final, y un par de vueltas porque la API efímera y Vite corrían uno en `localhost` y
el otro en `127.0.0.1`, y la cookie de sesión (`SameSite=Lax`) no viajaba
([bitácora del 2026-09-23](./state/bitacora/2026-09-23-hipertrofia-running-carga-y-porcentajes.md)).

**Cómo.** Un `.claude/launch.json` versionado con `dev:ephemeral` y el dev server de la web, los dos
en `localhost`, y un skill `verificar-ui` con la receta que hoy se arma a mano: cómo levantar todo
sin archivos de descarte, cómo crear un usuario y datos de prueba, qué mirar (los dos temas,
consola sin errores) y los _Gotchas_, empezando por el de la cookie. Vale probar primero el skill
incluido `run-skill-generator`, que graba una receta de arranque por proyecto en
`.claude/skills/run-<nombre>/`.

### CC-05 · Hooks que bloquean lo que no se hace con git

**Qué dice el repo.** Los hooks corren lógica determinística en el ciclo de vida del agente y pueden
frenar una herramienta antes de que se ejecute ([Boris, 15 tips #4][boris-15];
[por qué importa el harness][harness]). Thariq muestra `/careful`: un `PreToolUse` sobre Bash que
frena `rm -rf`, `DROP TABLE` y los force-push ([tip 9][thariq-skills]).

**Por qué acá.** El 2026-09-18 la PR #16 (F1-07) se abrió con base en la rama de F1-06; se mergearon
con 8 segundos de diferencia y F1-07 no llegó a `main` (hubo que rehacerla con un cherry-pick). La
regla que salió de eso, "la PR siempre contra `main`", vive hoy sólo en la memoria personal del
agente.

**Cómo.** Un script de Node en `.claude/hooks/` —Node porque es lo único que hay seguro en Windows y
en CI—, enganchado como `PreToolUse` sobre Bash. Corta con exit 2 y un mensaje que explica la regla
cuando se commitea o se pushea estando en `main`, cuando hay un `push --force` contra `main`, o
cuando `gh pr create` lleva un `--base` que no es `main`.

### CC-06 · Las lecciones de proceso van a CLAUDE.md

**Qué dice el repo.** Un solo CLAUDE.md compartido, y cada vez que Claude se equivoca, la regla se
agrega ahí ([Boris, 13 tips #4][boris-13]). O, después de cada corrección: "actualizá tu CLAUDE.md
para no volver a cometer ese error" ([10 tips #3][boris-10]).

**Por qué acá.** Las lecciones de estas semanas quedaron en la memoria automática del agente, que es
personal y de esta máquina: no la ve otro LLM que lea AGENT.md, ni otra persona. Algunas son del
entorno (no hay `jq`; Python en Windows escribe CRLF) y está bien que queden ahí. Otras son del
proyecto: la PR siempre contra `main` y nunca apilada, y en los scripts que editan STATE.md o
ACTION-PLAN.md, afirmar que el texto a reemplazar existe antes de reemplazarlo.

**Cómo.** Pasar las del proyecto a CLAUDE.md y a AGENT.md. Y como las dos copias se mantienen a
mano —hoy idénticas, 120 líneas cada una—, un paso de CI que falle si difieren
(`cmp CLAUDE.md AGENT.md`). La alternativa de que CLAUDE.md sólo importe a AGENT.md (`@AGENT.md`)
evitaría la copia, pero cambia lo que dice la spec §9: queda para decidir con el usuario.

### CC-07 · `/tarea <ID>`

**Qué dice el repo.** Empezar las tareas complejas en plan mode e iterar el plan hasta que Claude
pueda resolverlas de una; cuando algo se tuerce, volver a planificar en vez de seguir empujando
([Boris, 13 tips #6][boris-13]; [10 tips #2][boris-10]).

**Por qué acá.** Arrancar una tarea tiene reglas fijas que hoy se aplican de memoria: leerla en
ACTION-PLAN, confirmar que sus `depends_on` están cerradas (spec §16), crear la rama desde
`origin/main`, y el paso _Description_ del flujo 4D.

**Cómo.** Un comando que recibe el ID (`/tarea F3-09`), trae la tarea, corta si alguna dependencia
sigue abierta —o si es 🔑 y le toca al usuario—, crea la rama, y en las de 5 puntos o más, o con
`risk: high`, presenta el plan y espera antes de tocar código.

### CC-08 · `/cerrar-sesion`

**Qué dice el repo.** El mismo principio de CC-02: el ritual que se repite, versionado.

**Por qué acá.** CLAUDE.md pide actualizar STATE.md y escribir la bitácora al cerrar una sesión con
cambios. En la Fase 2, un script de reemplazos no encontró el texto que buscaba (otra PR lo había
cambiado) y STATE.md quedó diciendo "4 de 10" con 9 tareas cerradas; se notó varias PRs después.

**Cómo.** Un comando que arma la entrada de bitácora desde su `TEMPLATE.md`, actualiza STATE.md con
Edit (no con scripts) y, antes de terminar, compara la tabla "Estado" de ACTION-PLAN con los `[x]`
reales de cada fase.

### CC-09 · Formato automático por hook

**Qué dice el repo.** Un `PostToolUse` sobre `Edit|Write` que formatea: Claude ya escribe código bien
formateado y el hook cubre el último 10%, para que CI no falle por formato
([Boris, 13 tips #9][boris-13]).

**Por qué acá.** CI corre `pnpm format:check`, y un drift de formato hoy se descubre ahí, después del
push. La evidencia directa es poca: el caso conocido, el CRLF de F1-07, vino de un script de Python
corrido por Bash, y este hook no lo habría visto. Para eso sigue valiendo preferir Edit y Write.

**Cómo.** Un script de Node que lee el JSON del hook por stdin y corre
`prettier --write --ignore-unknown` sólo sobre el archivo tocado —formatear el repo entero en cada
edición es lento—, respetando `.prettierignore`.

### CC-10 · La próxima fase, en rebanadas verticales

**Qué dice el repo.** Partir el trabajo en rebanadas que cruzan todas las capas —datos, API y UI—
en vez de fases horizontales. La IA tiende a planificar "primero schemas, después API, después
front", y el feedback de punta a punta llega al final ([tips de planificación][tips-planning], Matt
Pocock).

**Por qué acá.** Las fases 1 y 2 se planificaron así: contratos y API primero, pantallas después, y
el E2E de cada fase como última tarea (F1-18, F2-10). Funcionó, pero el primer recorrido completo
llegó tarde. No cuesta nada: aplica cuando se planifique la próxima fase —billing, por ejemplo—,
con cada rebanada trayendo su tramo de E2E.

## Para más adelante

| Práctica                                                                           | Cuándo                                                                                                                                                                                                   |
| ---------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `.claude/rules/*.md` con `paths:`, o un CLAUDE.md por app (la spec §9 ya lo prevé) | Cuando CLAUDE.md se acerque a las 200 líneas o aparezcan reglas que sólo importan en una app (migraciones, códigos de error, accesibilidad). Hoy tiene 120.                                              |
| MCP Context7, con la documentación al día del stack                                | Si aparecen errores por APIs viejas de TanStack, Better Auth o Zod. Es un servicio externo: decide el usuario.                                                                                           |
| `.worktreeinclude`, para copiar `apps/api/.env` a cada worktree                    | Si los worktrees empiezan a necesitar el `.env` real. Hoy `dev:ephemeral` alcanza.                                                                                                                       |
| Hook `SessionStart` que inyecte el "Próximo paso" de STATE.md                      | Si las sesiones empiezan a saltearse la lectura de STATE.md. Cuesta contexto en cada sesión, también en las triviales.                                                                                   |
| Squash merge ([Boris][boris-squash])                                               | Hoy las PRs se mergean con merge commit. Con squash, una PR que junta varias tareas pierde el commit por tarea que se eligió el 2026-09-17. Tiene sentido sólo si "una PR = una tarea" pasa a ser regla. |

## Hábitos de sesión

No requieren código ni tareas: son formas de usar la herramienta que el repo documenta bien
([Thariq, manejo de sesiones][thariq-sesiones]; [tips de contexto][tips-context]).

- **Tarea nueva, sesión nueva.** Encaja con una tarea del plan por sesión. La excepción razonable
  es documentar lo que se acaba de hacer.
- **Rebobinar antes que corregir.** Si un intento falla, doble Esc (`/rewind`) hasta antes del
  intento y volver a pedir con lo aprendido, en vez de apilar "no, probá B" sobre el intento
  fallido.
- **Compactar a tiempo y con pista** (`/compact enfocate en F3-09, descartá el debugging del E2E`).
  El rendimiento baja bastante antes del límite: pasada la mitad del contexto, conviene cerrar o
  compactar antes de que salte el automático.
- **Subagentes para explorar.** La pregunta es "¿voy a necesitar esta salida, o sólo la
  conclusión?". Si es sólo la conclusión, que la lea otro contexto.
- **Plan mode en las tareas de 5 puntos o más**, y si el plan es grande, que lo revise otra sesión.
- **Desafiar antes de la PR:** "demostrame que esto funciona", o "no abras la PR hasta que pase tu
  revisión".
- **Después de un arreglo mediocre:** "sabiendo todo lo que sabés ahora, descartalo e implementá la
  solución elegante".
- **Cada corrección es una regla**, para CLAUDE.md o para los _Gotchas_ del skill que corresponda
  (CC-06).

## Descartadas

| Práctica                                                                       | Por qué no                                                                                                                                                                |
| ------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Correr 5 a 10 Claudes en paralelo; agent teams                                 | Las tareas están encadenadas por `depends_on` y revisa una sola persona. El paralelismo que sí hay (worktrees) ya se usa; más de eso fue lo que generó la PR apilada #16. |
| Loops autónomos (Ralph Wiggum, `/goal`, `/loop` que pastorea PRs)              | El DoD tiene pasos humanos (marcar `[x]`, mover la tarjeta) y billing y permisos exigen revisión humana (spec §9). La app de escritorio ya vigila el CI de las PRs.       |
| Workflow RPI (carpetas `rpi/<feature>/` con REQUEST, RESEARCH y PLAN)          | Duplica spec + ACTION-PLAN + bitácora, que ya cumplen ese rol.                                                                                                            |
| Un commit por archivo (regla del CLAUDE.md del propio repo)                    | Contradice el commit por tarea.                                                                                                                                           |
| Revisión cruzada con otro modelo (Codex)                                       | CC-03 da la mayor parte del beneficio con un contexto limpio del mismo modelo, sin otra herramienta ni otra cuenta. Se revisa si CC-03 se queda corto.                    |
| Sandbox                                                                        | No corre en Windows nativo.                                                                                                                                               |
| Auto mode, output styles, status line, voz, vim, keybindings, spinner, sonidos | Preferencias personales: van en `~/.claude`, no en el repo.                                                                                                               |
| Etiquetar `@claude` en las PRs para que actualice CLAUDE.md (GitHub App)       | Con una sola persona, CC-06 logra lo mismo sin instalar una app con secrets.                                                                                              |
| `--bare`, Agent SDK, `/batch`, workflows dinámicos                             | Son para uso no interactivo o migraciones masivas; hoy no es nuestro caso.                                                                                                |
| `<important if="...">` en CLAUDE.md                                            | Sirve en archivos largos; con 120 líneas no hace falta.                                                                                                                   |

## Tareas propuestas

En formato abreviado; al entrar al plan llevan el formato completo de spec §16, y el prefijo `IA-`
es provisorio. **No están en ACTION-PLAN.md ni en Trello**: entran cuando el usuario apruebe cuáles.
Antes, la spec §9 necesita una línea que diga que el harness —permisos, hooks, skills y agentes de
`.claude/`— se versiona y se mantiene como el resto del código: la spec manda.

| ID    | Tarea                                                   | Práctica | Pts | depends_on   | Criterio de aceptación                                                                                             |
| ----- | ------------------------------------------------------- | -------- | --: | ------------ | ------------------------------------------------------------------------------------------------------------------ |
| IA-01 | Settings de proyecto con permisos y `deny`              | CC-01    |   2 | —            | En una sesión nueva, `pnpm verify` corre sin pedir permiso y leer `apps/api/.env` con Read queda bloqueado         |
| IA-02 | Guardas de git por hook                                 | CC-05    |   2 | IA-01        | Un commit en `main` y un `gh pr create --base` distinto de `main` se bloquean con un mensaje; el script tiene test |
| IA-03 | Agente `spec-reviewer`                                  | CC-03    |   3 | —            | Corrido sobre la PR #50 tal como estaba antes de `0642f65`, encuentra al menos uno de los cuatro problemas         |
| IA-04 | Skill `/entregar`                                       | CC-02    |   3 | IA-02, IA-03 | Una entrega real termina en una PR contra `main`, con verify y e2e en verde local y la revisión adjunta            |
| IA-05 | Verificación en navegador, versionada                   | CC-04    |   3 | —            | Desde una sesión nueva y sin archivos de descarte, se levanta la app y se recorre un flujo en el navegador         |
| IA-06 | Lecciones de proceso a CLAUDE.md; guarda CLAUDE = AGENT | CC-06    |   1 | —            | CI falla si CLAUDE.md y AGENT.md difieren                                                                          |
| IA-07 | Comando `/tarea`                                        | CC-07    |   2 | —            | Con una dependencia abierta, no crea la rama y dice cuál falta                                                     |
| IA-08 | Comando `/cerrar-sesion`                                | CC-08    |   2 | —            | Detecta una tabla de Estado desfasada respecto de los `[x]`                                                        |
| IA-09 | Formato automático por hook                             | CC-09    |   2 | IA-01        | Un archivo editado con formato roto queda formateado sin correr `pnpm format`                                      |

Son 20 puntos. Orden sugerido: IA-01 → IA-06 → IA-03 → IA-02 → IA-04; el resto, cuando convenga.

[repo]: https://github.com/shanraisshan/claude-code-best-practice/tree/ddc21739057363f960df4d7de05e983e5d062183
[tips-planning]: https://github.com/shanraisshan/claude-code-best-practice/blob/ddc21739057363f960df4d7de05e983e5d062183/README.md#tips-planning
[tips-context]: https://github.com/shanraisshan/claude-code-best-practice/blob/ddc21739057363f960df4d7de05e983e5d062183/README.md#tips-context
[tips-claudemd]: https://github.com/shanraisshan/claude-code-best-practice/blob/ddc21739057363f960df4d7de05e983e5d062183/README.md#tips-claudemd
[tips-agents]: https://github.com/shanraisshan/claude-code-best-practice/blob/ddc21739057363f960df4d7de05e983e5d062183/README.md#tips-agents
[boris-13]: https://github.com/shanraisshan/claude-code-best-practice/blob/ddc21739057363f960df4d7de05e983e5d062183/tips/claude-boris-13-tips-03-jan-26.md
[boris-10]: https://github.com/shanraisshan/claude-code-best-practice/blob/ddc21739057363f960df4d7de05e983e5d062183/tips/claude-boris-10-tips-01-feb-26.md
[boris-12]: https://github.com/shanraisshan/claude-code-best-practice/blob/ddc21739057363f960df4d7de05e983e5d062183/tips/claude-boris-12-tips-12-feb-26.md
[boris-15]: https://github.com/shanraisshan/claude-code-best-practice/blob/ddc21739057363f960df4d7de05e983e5d062183/tips/claude-boris-15-tips-30-mar-26.md
[boris-6]: https://github.com/shanraisshan/claude-code-best-practice/blob/ddc21739057363f960df4d7de05e983e5d062183/tips/claude-boris-6-tips-16-apr-26.md
[boris-tt]: https://github.com/shanraisshan/claude-code-best-practice/blob/ddc21739057363f960df4d7de05e983e5d062183/tips/claude-boris-2-tips-10-mar-26.md
[boris-squash]: https://github.com/shanraisshan/claude-code-best-practice/blob/ddc21739057363f960df4d7de05e983e5d062183/tips/claude-boris-2-tips-25-mar-26.md
[thariq-skills]: https://github.com/shanraisshan/claude-code-best-practice/blob/ddc21739057363f960df4d7de05e983e5d062183/tips/claude-thariq-tips-17-mar-26.md
[thariq-sesiones]: https://github.com/shanraisshan/claude-code-best-practice/blob/ddc21739057363f960df4d7de05e983e5d062183/tips/claude-thariq-tips-16-apr-26.md
[harness]: https://github.com/shanraisshan/claude-code-best-practice/blob/ddc21739057363f960df4d7de05e983e5d062183/reports/why-harness-is-important.md
[settings]: https://github.com/shanraisshan/claude-code-best-practice/blob/ddc21739057363f960df4d7de05e983e5d062183/best-practice/claude-settings.md#permissions
