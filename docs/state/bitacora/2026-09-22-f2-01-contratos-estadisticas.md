# 2026-09-22 — F2-01: contratos de estadísticas

- Autor: Claude Opus 5 (agente), con Braian
- Duración aprox: corta

## Objetivo

Abrir la Fase 2 con los contratos compartidos de estadísticas: lo que la API va a responder por
ejercicio y en el resumen general, y la regla que convierte una serie de marcas en números.

## Qué se hizo

- `packages/schemas/src/stats/stats.api.ts`: el período (`3m`, `6m`, `12m`, `todo`, por defecto
  `12m`), la serie, el resumen por ejercicio y los agregados por capacidad y grupo muscular.
- `packages/schemas/src/stats/evolution.ts`: `summarize()` y `periodStartFor()`, la regla de
  dominio compartida entre front y back (ADR-0006), igual que el cálculo de porcentajes.

## Decisiones tomadas

- **La unidad viaja una sola vez, arriba de la serie** — es la misma para todas las marcas de un
  ejercicio; repetirla en cada punto es peso al pedo en una serie de cien marcas.
- **Sin marcas, el resumen es `null`** — un resumen en cero diría que el atleta levantó cero kilos,
  que no es lo mismo que no haber cargado nada.
- **Lo que no tiene marcas suficientes va a `insufficient`** y no a un agregado en cero, por lo
  mismo. Un agregado siempre tiene al menos un ejercicio detrás, y el schema lo exige.
- **En tiempo, menos es mejor**: la mejor marca es la mínima y bajar de 300 a 270 segundos es +10%,
  no −10%. Es la regla más fácil de romper de toda la fase.
- **`periodStartFor` recibe el `now`** para que los tests no dependan del reloj de quien los corre.

## Bloqueos / lo que no funcionó

- Nada. Cinco pruebas inversas: invertir la regla de tiempo (en la mejor marca y en la variación),
  sacar el orden por fecha, permitir agregados sin ejercicios y cambiar el período por defecto
  hacen fallar un test cada una.
- La entrada de F2-01 en `ACTION-PLAN.md` se marca cuando entre la PR del desglose de la Fase 2:
  la sección todavía no está en `main`.

## Próximo paso

F2-02 (el ejercicio propio con sus capacidades y grupos musculares) o F2-04 (las estadísticas de un
ejercicio, que ya tiene sus contratos).
