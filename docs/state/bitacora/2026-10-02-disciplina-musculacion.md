# 2026-10-02 — La disciplina Gimnasio pasa a llamarse Musculación

- Autor: Claude Sonnet 5.5
- Duración aprox: 20 min

## Objetivo

Cambiar el nombre de la disciplina "Gimnasio" por "Musculación" en todo lo que la nombra: el valor
que guarda la base, lo que ve el usuario y la documentación.

## Qué se hizo

- `disciplineSchema`: `gimnasio` → `musculacion` (sin tilde, como `gluteo` y `trapecio`). La
  etiqueta en es-AR pasa a "Musculación" (`DISCIPLINE_LABEL`).
- Catálogo (`catalog.ts`): las 35 entradas que decían `gimnasio` y su comentario de sección.
- Migración `20261002120000-disciplina-musculacion`: reemplaza el elemento en `disciplines` de todos
  los ejercicios —catálogo y propios— sin tocar las otras disciplinas ni el orden. Reversible
  (`down` vuelve a `gimnasio`) e idempotente. Test propio con la base en memoria.
- `migrations.test.ts`: la cadena de `down` suma la nueva al principio.
- Spec §5.1 y la tabla del catálogo (§5.3), y las tres menciones del ACTION-PLAN (F5-01 y F5-07).
- Tests de schemas, web y API actualizados al nuevo valor y a la nueva etiqueta.

## Decisiones tomadas

- No se tocan las migraciones ya escritas (`grupo-primario`, `catalogo-nuevo`) ni su test: son una
  foto de su momento y `gimnasio` es lo que había entonces. La nueva corre después y las pasa a
  `musculacion`; al revertir, el orden inverso las deja como estaban.
- No se tocan los "gimnasios" que hablan del negocio (CLAUDE.md, spec §2 "Qué NO es") ni la
  bitácora anterior: ahí no es la disciplina. Tampoco "SkiErg del gimnasio" en un test de stats, que
  es el nombre de un ejercicio propio.
- No se toca el "Contexto" de [ADR-0010](../../adr/0010-hybrid-y-pilates.md): cuenta lo que había
  el 2026-09-30, cuando la disciplina todavía se llamaba gimnasio.
- Sin ADR nuevo: es un renombre, no una decisión estructural.

## Bloqueos / lo que no funcionó

- Se hizo primero sobre un árbol de antes de F5-13 (Hybrid y Pilates, #86): al rebasar sobre `main`
  aparecieron `gimnasio` nuevos (15 más en el catálogo, un test de `exercises`, la spec y el
  ADR-0010), así que el renombre se rehízo sobre `main` en vez de resolver conflictos.

## Próximo paso

Debe coincidir con "Próximo paso" en [STATE.md](../STATE.md): no cambia.
