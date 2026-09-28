# 2026-09-28 — Migración: fuera el catálogo viejo (F5-06)

- Autor: Claude Sonnet 5.5
- Duración aprox: 45 min

## Objetivo

Sacar de la base el catálogo de la Fase 0 y lo que apunta a él, y garantizar una sola entrada por
`catalogKey`, para que el seed nuevo (F5-05) deje exactamente los 62 ejercicios.

## Qué se hizo

- Migración `20260928130000-catalogo-nuevo`. `up` borra los ejercicios del catálogo que no
  sobreviven al reemplazo, con sus ejercicios gestionados y sus marcas, y crea el índice único
  parcial `catalog_key_unique` sobre `catalogKey`. `down` quita el índice y vuelve a insertar los 33
  del catálogo viejo (sin repetir los que ya están por clave o nombre).
- Tests: `up` (viejo con gestionado y marcas, clave que ya no está, categoría cambiada, el que
  sobrevive, idempotencia, índice), `down`, y migrar más sembrar contra `mongodb-memory-server`.
  `migrations.test.ts` suma la migración a la cadena de `down`.

## Decisiones tomadas

- **Qué no sobrevive**: la tarea decía "los sin dueño y sin `catalogKey`". Una base sembrada con el
  código de F5-01 ya tiene claves en los 33, y ahí esa regla no borraría nada. La regla es más
  amplia: se va el del catálogo sin clave, con una clave que ya no existe, o con la misma clave
  pero otra categoría (Thruster pasa de kg a repeticiones y peso: sus marcas quedarían en otra
  unidad, el motivo del ADR-0009). El que conserva clave y categoría queda con su ID y sus marcas, y
  el seed le actualiza el nombre.
- La migración lleva copiadas la categoría de cada clave nueva y las 33 entradas viejas: una
  migración describe un momento y no importa el código de la app.

## Bloqueos / lo que no funcionó

- El `down` no devuelve los gestionados ni las marcas borrados. Está dicho en el código y en
  ADR-0009: es aceptable sólo porque no hay producción.
- **No correr en producción.** Cuando exista, un cambio así va migrando cada marca.
- Orden en un ambiente: migrar primero y sembrar después. Sembrar antes puede chocar con el índice
  único del nombre si un ejercicio nuevo se llama como uno viejo sin clave.

## Próximo paso

F5-07 (API del catálogo con disciplina y "ya agregado"), F5-11 y F5-10 completo.
