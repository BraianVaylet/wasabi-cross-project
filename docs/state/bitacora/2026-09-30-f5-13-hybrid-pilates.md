# 2026-09-30 — Hybrid y Pilates: disciplinas nuevas y 58 ejercicios más (F5-13)

- Autor: Claude Sonnet 5.5
- Duración aprox: 1 h

## Objetivo

El usuario agregó 58 ejercicios al catálogo y la migración "fallaba". Averiguar por qué y dejarlo
andando.

## Qué se hizo

- Diagnóstico: la migración `20260928130000-catalogo-nuevo` estaba bien (no importa el catálogo a
  propósito). Fallaba `migrar y sembrar deja los 62` con `ZodError: disciplines[2] Invalid option`,
  y con ella 10 tests del módulo `exercises` (incluido `GET /exercises/catalog`, que daba 500) y
  unas 60 líneas de `tsc`. Causa: el catálogo nuevo usa las disciplinas `hybrid` y `pilates` y
  ocho equipos que los schemas no tenían, y el repositorio valida cada documento al leerlo.
- El usuario confirmó que son disciplinas nuevas. Se amplían `disciplineSchema` (+2) y
  `equipmentSchema` (+8) en `@wasabi-cross/schemas`, y sus etiquetas en `apps/web/src/lib/labels.ts`.
- Tests: los que decían 62 pasan a 120; los de búsqueda que asumían un catálogo chico se arreglan;
  nuevos: las siete disciplinas en el catálogo, el equipo de pilates, `?discipline=pilates|hybrid`
  en la API y schema acepta Hybrid/Pilates y rechaza una disciplina inexistente.
- Spec §5.1 y §5.3 (siete disciplinas, 120 ejercicios, tabla nueva), [ADR-0010](../../adr/0010-hybrid-y-pilates.md)
  y F5-13 en el ACTION-PLAN.
- Verificado con `pnpm verify`, `format:check` y `test:coverage` (API 91,8 % de ramas), y en la
  app con Mongo efímero: el filtro del catálogo muestra Hybrid y Pilates, Pilates trae 15, sin
  desborde a 375 px.

## Decisiones tomadas

- Ampliar los schemas en vez de sacar los ejercicios o mapearlos a disciplinas existentes — lo
  eligió el usuario; las tres opciones están en el ADR-0010.
- La migración del catálogo no se toca: es una foto. Sin migración de datos nueva, porque los
  enums sólo se ensanchan y el seed ya actualiza por `catalogKey`.
- En la spec, Hybrid se describe como etiqueta transversal (33 ejercicios la suman a otra
  disciplina, uno la lleva sola): es lo que muestran los datos, el usuario no dio una definición.
  Si quiere otra, se corrige en §5.3.

## Bloqueos / lo que no funcionó

- Un test propio que exigía que todo ejercicio de pilates usara equipo de pilates falló: Puente
  de glúteo, Dead Bug y Bird Dog son de pilates y van sin equipo. Se reescribió para reflejar los
  datos, no una regla que la spec no tiene.

## Próximo paso

Mergear la PR de F5-13. Después, el usuario cumple el Definition of Done de la Fase 5 y sincroniza
Trello (`/trello-sync`). Debe coincidir con [STATE.md](../STATE.md).
