# 2026-09-29 — API del catálogo: disciplina y "ya agregado" (F5-07)

- Autor: Claude Sonnet 5.5
- Duración aprox: 30 min

## Objetivo

Que `GET /exercises/catalog` filtre por disciplina y diga, por usuario, cuáles ya están en su
lista, para que la pestaña Catálogo (F5-10) los muestre sin poder elegirlos.

## Qué se hizo

- Contratos nuevos en `@wasabi-cross/schemas`: `catalogQuerySchema` (`q` y `discipline`),
  `catalogEntrySchema` (un ejercicio más `alreadyAdded`) y `catalogResponseSchema`. El endpoint y
  el OpenAPI salen de ellos.
- `searchCatalog` recibe el usuario: filtra por nombre y por disciplina (los dos se cumplen) y marca
  `alreadyAdded` con los `exerciseId` de su lista. Una disciplina inexistente la rechaza el schema
  con `WC-SYS-400-002`, sin código nuevo.
- Tests contra `mongodb-memory-server`: Hyrox trae los 9 esperados, la combinación con `q`, la
  disciplina inválida, la marca por usuario (con filtros y al borrar) y el OpenAPI.

## Decisiones tomadas

- `alreadyAdded` mira sólo los ejercicios del catálogo en la lista del usuario: un propio editado a
  partir de uno del catálogo es otro ejercicio (ADR-0009) y no lo marca.
- El front todavía no lo usa: sigue calculando "ya lo tenés" con la lista de Home. Cambiarlo es de
  F5-10 completo, junto con pasar el buscador y el filtro a la API.

## Bloqueos / lo que no funcionó

- Ninguno. Las rutas del OpenAPI no llevan el prefijo `/api/v1` (el test lo tuvo en cuenta).

## Próximo paso

F5-11 (pestaña "Crear" con grupo primario y secundarios) y F5-10 completo, que consume esto.
