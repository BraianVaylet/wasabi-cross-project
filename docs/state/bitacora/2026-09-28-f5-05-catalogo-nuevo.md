# 2026-09-28 — El catálogo nuevo: 62 ejercicios y seed por clave (F5-05)

- Autor: Claude Sonnet 5.5
- Duración aprox: 1 h

## Objetivo

Reemplazar el catálogo de la Fase 0 (33 ejercicios) por los 62 de spec §5.3 y pasar el seed a
comparar por `catalogKey`, para que un renombre actualice en vez de duplicar.

## Qué se hizo

- `EXERCISE_CATALOG` sale del JSON del usuario con sus ajustes (ADR-0009): Sled Pull sin espalda
  repetida; Wall Ball, Crunch, Medicine Ball Slam y Kettlebell Swing en gimnástico; Sled Push, Sled
  Pull y Farmers Carry en funcional (hipertrofia) y sus versiones Hyrox en distancia con carga
  (`*-hyrox`); sin los running de distancia variable y con las carreras de 100 m, 400 m, 1 km, 5 km
  y 10 km.
- `ExerciseRepository.findCatalogByKey`, y `seedCatalog` busca por clave. El nombre pasa a ser un
  campo más de la definición: cambiarlo cuenta como actualización.
- Tests: el catálogo (62, sin claves ni nombres repetidos, seis categorías, seis formas de medir),
  el seed (renombre actualiza, otra clave es otro ejercicio) y las fixtures de la API y del E2E,
  que usaban nombres del catálogo viejo.

## Decisiones tomadas

- Las carreras nuevas: 100 m y 400 m en velocidad; 1 km, 5 km y 10 km en resistencia. Grupo
  primario cuádriceps, sin secundarios — el JSON no traía datos para ellas.
- La captura de referencia del detalle (F4-11) muestra un "Back squat". Como el catálogo ahora lo
  llama "Sentadilla trasera", el E2E de diseño lo crea como ejercicio propio con el nombre del
  diseño: el detalle se ve igual y no hace falta regenerar el PNG.

## Bloqueos / lo que no funcionó

- Los ejercicios del catálogo viejo con claves que ya no existen siguen en la base hasta F5-06.
  Los que comparten clave (`back-squat`, `snatch`…) se actualizan en su lugar y conservan su ID.

## Próximo paso

F5-06 (migración que borra el catálogo viejo e índice único por `catalogKey`) y F5-07 (API del
catálogo con disciplina y "ya agregado"). Sigue pendiente F5-10 completo y F5-11.
