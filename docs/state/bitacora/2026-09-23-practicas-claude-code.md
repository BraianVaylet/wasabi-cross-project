# 2026-09-23 — Prácticas de Claude Code: qué adoptar del repo claude-code-best-practice

- Autor: Claude Opus 5.5 (agente)
- Duración aprox: una sesión corta

## Objetivo

Pedido directo del usuario, fuera del plan: analizar las buenas prácticas de
[shanraisshan/claude-code-best-practice](https://github.com/shanraisshan/claude-code-best-practice),
elegir las que tengan impacto positivo en este proyecto y dejarlo documentado.

## Qué se hizo

- Se leyó el repo en el commit `ddc2173`: el README con sus 83 tips, las guías de settings, memoria,
  skills, subagentes y MCP, los hilos de Boris Cherny y Thariq, los reportes de "agents vs commands
  vs skills" y "por qué importa el harness", y los workflows RPI y cross-model.
- Se cruzó contra lo que tiene el proyecto: no hay `.claude/settings.json` ni hooks ni agentes;
  sólo `/trello-sync`. La spec §9 pide subagentes `spec-reviewer`, `test-writer` y
  `security-reviewer`, y no existe ninguno.
- La evidencia se sacó de la bitácora, del historial de git y de las lecciones que el agente guardó
  en su memoria: la PR #50 llegó a CI con el E2E roto y su auto-revisión (`0642f65`) encontró cuatro
  fallas después del push; la PR apilada #16 no llegó a `main`; STATE.md quedó diciendo "4 de 10"
  con 9 cerradas; la verificación en navegador de la última sesión necesitó archivos de descarte y
  se trabó con la cookie entre `localhost` y `127.0.0.1`.
- Resultado en [docs/claude-code-practices.md](../../claude-code-practices.md): lo que ya se hace
  bien, diez prácticas a adoptar con su evidencia, cinco para más adelante, hábitos de sesión, lo
  descartado con su motivo y nueve tareas propuestas (IA-01 a IA-09, 20 puntos).
- Enlazado desde el [índice de docs](../../README.md) y reflejado en [STATE.md](../STATE.md).

## Decisiones tomadas

- **Propuesta, no aplicación.** El pedido era analizar y documentar. Además, CLAUDE.md exige que el
  trabajo entre por tareas de ACTION-PLAN y que la spec se actualice antes que el código: las
  tareas quedan en el documento, no en el plan ni en Trello, hasta que el usuario elija.
- **El criterio fue la evidencia propia**, no la popularidad del tip: primero lo que ataca una falla
  que ya ocurrió, después lo que pasa una regla escrita de CLAUDE.md a algo que el harness hace
  cumplir.
- **Squash merge, a "más adelante"**: choca con el commit por tarea que el usuario eligió el
  2026-09-17 mientras una PR pueda juntar varias tareas.
- **Sin revisión cruzada con otro modelo**: un `spec-reviewer` con contexto limpio da la mayor parte
  del beneficio sin sumar herramientas.

## Bloqueos / lo que no funcionó

- Nada bloqueante. Las transcripciones de charlas del repo son muy largas; se usaron los resúmenes
  que el mismo README hace de ellas.

## Próximo paso

Debe coincidir con "Próximo paso" en [STATE.md](../STATE.md): el usuario crea los ambientes de
Railway y el cluster de Atlas (F3-07/F3-08), nombra las etiquetas del tablero (F0-08) y decide qué
tareas IA-xx entran al plan.
