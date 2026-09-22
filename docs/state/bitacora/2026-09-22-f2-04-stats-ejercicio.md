# 2026-09-22 — F2-04: estadísticas de un ejercicio

- Autor: Claude Opus 5 (agente), con Braian
- Duración aprox: corta

## Objetivo

`GET /api/v1/stats/exercises/:id`: la serie de marcas del período y sus números, que es lo que va a
dibujar la pantalla del mockup 10.

## Qué se hizo

- Nace el módulo `stats`, con su `domain / application / infrastructure`.
- Dos puertos: uno pregunta de quién es el ejercicio, cómo se llama y qué mide; el otro lee las
  marcas como serie. Los cumple `exercises` y la colección de marcas, conectados en
  `composition.ts`.
- `WC-STATS-404-001`, en el diccionario y en el catálogo de schemas, en esta misma PR.

## Decisiones tomadas

- **El resumen lo calcula `summarize()` del paquete compartido** (F2-01, ADR-0006): la API responde
  con lo mismo que el front va a recalcular cuando el usuario cambie de período.
- **`findOwnedMeasure` devuelve también el nombre.** Era eso o un segundo lookup casi igual; el
  puerto de `records` no se entera, porque un campo de más no le molesta.
- **La fuente de la serie lee la colección de marcas, no su modelo.** Comparte el nombre de la
  colección —infraestructura— y proyecta sólo fecha y valor, que es lo que dibuja un gráfico.
- **Sin índice nuevo:** `managed_history` (F1-07) ya cubre la consulta por ejercicio y fecha.

## Bloqueos / lo que no funcionó

- Nada. Cuatro pruebas inversas: sin filtrar por período, sin el 404 del ejercicio ajeno, con la
  serie al revés y sin pasarle la medición a `summarize` (la regla de tiempo), cada una hace fallar
  tests.

## Próximo paso

F2-05 (las estadísticas generales) o F2-06 (el Componente Cross de gráfico), que no depende de la
API.
