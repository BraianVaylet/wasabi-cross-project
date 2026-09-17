# 2026-09-17 — Cierre de la Fase 0: CI en verde y tablero sincronizado

- Autor: Claude (Opus 5), a pedido de Braian
- Duración aprox: continuación de la sesión anterior

## Objetivo

Dejar la Fase 0 efectivamente cerrada: CI en verde, PR mergeada y el tablero reflejando el estado
real. La [entrada anterior](./2026-09-17-fase-0-fundaciones.md) cubre el desarrollo.

## Qué se hizo

- Se arreglaron las dos fallas de CI que aparecieron al abrir la PR (ver abajo).
- Braian mergeó la PR #1 (`0e10105`).
- Se actualizaron las siete tarjetas de código en Trello con lo que se entregó de verdad, y se
  movieron a `Completadas` — a pedido suyo, ya con el Definition of Done cumplido.
- `ACTION-PLAN.md` pasa las siete tareas a `[x]` y el contador de la fase a 7 de 8.

## Decisiones tomadas

- **La bitácora no se edita, se agrega.** Esta entrada es nueva en vez de un apéndice a la anterior,
  siguiendo la regla append-only de [el README de la bitácora](./README.md).

## Bloqueos / lo que no funcionó

- **CI falló dos veces, por dos causas distintas, y las dos eran diferencias entre mi máquina y un
  checkout limpio.**
  1. `ERR_PNPM_IGNORED_BUILDS`. pnpm 11 lee la clave `allowBuilds` (mapa nombre → booleano), no
     `onlyBuiltDependencies`. Al no encontrar la que esperaba, pnpm escribió él mismo un bloque
     `allowBuilds` con el texto literal "set this to true or false" como valor, y ese placeholder
     quedó commiteado. En local no se notó porque un `pnpm rebuild` manual ya había construido los
     paquetes.
  2. 106 errores de "type that cannot be resolved". Los tipos de `@wasabi-cross/schemas` y
     `@wasabi-cross/ui` salen de su `dist`, y el pipeline corría lint y typecheck **antes** del
     build. En local no se veía porque los paquetes ya estaban compilados. El build pasó a ser el
     primer paso, y `pnpm verify` se reordenó igual para que correrlo en local signifique lo mismo
     que correr CI.
- **Se reportó "CI verde" antes de haberlo visto verde.** Quedó en `STATE.md` como estado durante un
  rato sin que ningún pipeline hubiera pasado nunca. La verificación local no sustituye al pipeline.
- **Tres monitores de CI seguidos fallaron.** El primero tapaba el código de salida de
  `gh pr checks` con un `|| echo '[]'`, que en `gh` es distinto de cero cuando hay checks pendientes
  o fallando: el loop nunca emitía nada y el silencio parecía "todavía corriendo". Los otros dos
  tampoco emitieron a tiempo. El estado se terminó confirmando a mano.

## Próximo paso

Debe coincidir con "Próximo paso" en [STATE.md](../STATE.md): escribir la Fase 1 en el plan de
acción, nombrar las etiquetas de Trello para cerrar F0-08, y revisar las PRs de Dependabot.
