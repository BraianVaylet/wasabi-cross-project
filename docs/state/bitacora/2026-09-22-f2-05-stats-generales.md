# 2026-09-22 — F2-05: estadísticas generales

- Autor: Claude Opus 5 (agente), con Braian
- Duración aprox: corta

## Objetivo

`GET /api/v1/stats/summary`: cómo viene cada capacidad y cada grupo muscular en el período. Es la
pregunta de la spec §5: ¿el tren inferior progresa más rápido que el superior?

## Qué se hizo

- `aggregateBy` en el dominio de `stats`: promedia por clave, ordena de lo que más progresó a lo que
  menos, y separa lo que no tiene con qué medirse.
- El caso de uso arma las entradas: cada ejercicio aporta su variación, y los grupos salen de sus
  capacidades y grupos musculares.
- La fuente de series ganó una consulta en lote: una por ejercicio sería una tormenta en un plan sin
  límite de ejercicios.
- `exercises` expone los perfiles de la lista (medición, capacidades, grupos) sin que `stats` toque
  su modelo.

## Decisiones tomadas

- **Se promedian variaciones, no valores.** Un 10% de un RM y un 10% de una carrera se comparan;
  120 kg y 272 segundos, no. Es lo que cumple "nunca mezcla unidades" sin ningún caso especial.
- **Una variación necesita dos marcas en el período.** Con una sola, `summarize` devuelve 0%: es
  verdad para ese ejercicio —no cambió nada— pero mentira en un promedio, donde arrastraría al grupo
  hacia cero sin haber medido nada. Lo encontró un test que esperaba `insufficient` y recibió un
  grupo en cero.
- **El orden lo pone la API**, de mayor a menor variación: la pantalla no tiene que decidir cómo se
  lee "cuál progresó más".

## Bloqueos / lo que no funcionó

- Cinco pruebas inversas: bajar el mínimo a una marca, invertir el orden, sumar en vez de promediar,
  no informar lo insuficiente y ignorar el período hacen fallar tests.

## Próximo paso

F2-08 (la sección de generales en la pantalla, con el período en la URL) y después F2-10, que cierra
la fase.
