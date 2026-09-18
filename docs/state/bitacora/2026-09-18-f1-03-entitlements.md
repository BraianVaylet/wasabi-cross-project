# 2026-09-18 — F1-03: entitlements de plan

- Autor: Claude (Opus 5), a pedido de Braian
- Duración aprox: 1 sesión

## Objetivo

Que el módulo `subscriptions` decida, en el backend, si un usuario puede agregar un ejercicio: Free
llega a 10 en total y a 3 propios; Max no tiene límite (spec §4). Con la garantía más difícil del
plan: dos altas simultáneas con 9 ejercicios dejan al usuario con 10, no con 11.

## Qué se hizo

- **Dominio:** `decideExerciseAddition(plan, usage, isCustom)`, pura. Compara con `>=` para que un
  conteo por encima del límite (un usuario que bajó de Max) siga sin poder agregar.
- **Aplicación:** `withExerciseSlot(deps, request, work)` cuenta y corre el alta en la misma
  transacción, serializada por usuario. Puertos genéricos en la transacción: ni el dominio ni la
  aplicación saben que del otro lado hay una `ClientSession`.
- **Infraestructura:** serializador con transacción de Mongo más documento de lock por usuario
  (`subscriptions`), y contador de uso (`exercises`, que es el dueño de esos datos). No hay imports
  entre los dos módulos: la compatibilidad la chequea TypeScript donde se cablean.
- `AppError` completa las variables del mensaje del catálogo (`params`).
- Se retiró `WC-EXO-403-001`, que decía lo mismo que `WC-SUBS-403-001` desde el módulo que no decide.
- TDD en tres capas: dominio, aplicación con fakes, e integración contra un replica set real.

## Decisiones tomadas

- **Una transacción sola no alcanza; hace falta un documento de lock.** Mongo aísla por snapshot:
  dos transacciones que cuentan 9 e insertan documentos _distintos_ no chocan, y confirman las dos
  (write skew). Cada una escribe además el mismo documento de lock del usuario: la segunda choca, el
  driver la reintenta y, con la primera ya confirmada, cuenta 10.
- **El lock se crea fuera de la transacción.** Dos upserts simultáneos del mismo `_id` adentro de
  transacciones pueden terminar en duplicate key, que no se reintenta; afuera, el servidor reintenta
  el upsert por igualdad sobre `_id`.
- **Los conteos corren en secuencia**, no con `Promise.all`: una transacción no admite operaciones
  en paralelo sobre la misma sesión.
- **Cuando se pasan los dos límites, se informa el total**: es el que el usuario ve en pantalla.
- **Mongo tiene que ser un replica set**, también en desarrollo. Documentado en `.env.example` y en
  la arquitectura. Atlas ya lo es.

## Bloqueos / lo que no funcionó

- **Un bug latente que no era de esta tarea.** El mensaje de `WC-SUBS-403-001` tiene `{limite}` y
  `{plan}`, y `AppError` no interpolaba nada: el usuario habría visto las llaves literales. Se agregó
  la interpolación, con un test que fija que una variable faltante queda visible en vez de
  desaparecer en silencio.
- **Un test en rojo que era del fixture.** El del contador falló con duplicate key: los ejercicios
  de prueba no tenían nombre, y el índice único `(ownerId, name)` de F1-02 rechazó dos propios con
  `name: null`. El índice hizo su trabajo; se confirmó el error completo antes de tocar nada.
- **Prueba inversa del test de concurrencia.** Un test de concurrencia que pasa no demuestra nada si
  también pasaría sin la protección. Se sacó el lock del serializador y se volvió a correr: los dos
  tests de concurrencia fallaron (entraron las dos altas). Después se restauró.

## Pendiente para F1-05

- El harness de tests de la API usa un Mongo standalone, con `transaction: false` para Better Auth.
  F1-05 va a necesitar que corra sobre un replica set, como producción.
- **Revisión humana de los tests de esta tarea**, antes de mergear: es flujo de permisos (spec §9).

## Próximo paso

Debe coincidir con "Próximo paso" en [STATE.md](../STATE.md): revisar a mano los tests de F1-03 y
mergear. Quedan destrabadas F1-04 y F1-08; F1-05 espera a F1-03.
