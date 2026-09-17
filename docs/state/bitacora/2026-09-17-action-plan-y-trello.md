# 2026-09-17 — Backlog en tareas chicas + tablero de Trello

- Autor: Claude (Sonnet 5), a pedido de Braian
- Duración aprox: 1 sesión

## Objetivo
La spec no obligaba a dividir el trabajo en tareas chicas ni a llevar registro en Trello. Braian pidió agregar esa regla, siguiendo el mismo patrón ya probado en `laplace-project` y `bow-sight-project`.

## Qué se hizo
- Se revisaron `laplace-project` y `bow-sight-project` (`docs/ACTION-PLAN.md`, `docs/BITACORA.md`, `.claude/commands/trello-sync.md`) para copiar el patrón real, no inventar uno nuevo.
- Se agregó spec §16 "Gestión de tareas y Trello": backlog vivo, story points Fibonacci (máx. 8), `depends_on`, dirección de sincronización plan↔tablero, Definition of Done.
- Se creó [docs/ACTION-PLAN.md](../ACTION-PLAN.md) con el formato de tarea y la Fase 0 — Fundaciones (8 tareas: monorepo, schemas, auth, error envelope, health checks, ui/storybook, seed de ejercicios, el tablero mismo).
- Se encontró que ya existía un tablero Trello vacío `wasabi-cross` (https://trello.com/b/pK3RPkCT/wasabi-cross). Se crearon las 5 listas (`Sin iniciar/En proceso/Bloqueadas/Completadas/Canceladas`) y las 8 tarjetas de Fase 0 vía MCP.
- Se agregó `.claude/commands/trello-sync.md`, copiado y adaptado del de `bow-sight-project`.
- Se actualizaron `CLAUDE.md`/`AGENT.md`, `docs/README.md` y `STATE.md` para referenciar el plan y el tablero.

## Decisiones tomadas
- Etiquetas del tablero: `SPEC` `TECNICO` `API` `WEB` `INFRA` `BUG` (6, no 7 — mismo motivo que bow-sight: Trello da 6 colores por defecto y una séptima obliga a crear una a mano igual). Mapeo de color fijado en ACTION-PLAN.md.
- `ACTION-PLAN.md` es fuente de verdad de contenido, Trello de estado — mismo acuerdo que los otros dos proyectos.

## Bloqueos / lo que no funcionó
El MCP de Trello (`trelloWriteBoard`/`trelloWriteList`) no puede nombrar las etiquetas por defecto del tablero — confirmado, mismo límite que documentó bow-sight. Queda como paso manual, anotado en F0-08.

## Próximo paso
Nombrar las etiquetas a mano y arrancar F0-01 (monorepo) — ver [STATE.md](../STATE.md).
