# 2026-09-18 — F1-05: agregar y listar ejercicios gestionados

- Autor: Claude (Opus 5), a pedido de Braian
- Duración aprox: 1 sesión larga

## Objetivo

El corazón de la fase: que un usuario agregue a su lista un ejercicio del catálogo o uno propio,
con su primera marca, todo o nada, respetando el cupo del plan; y que vea su lista con el valor
actual de cada ejercicio.

## Qué se hizo

- **Primero, el harness de tests pasó a replica set**, como producción, con Better Auth usando
  transacciones. Los 129 tests previos siguieron en verde antes de escribir una línea de F1-05.
- **Contratos** en `@wasabi-cross/schemas`: `addExerciseSchema` (catálogo por ID o propio con
  nombre y categoría, siempre con primera marca), `managedExerciseSummarySchema` y
  `exerciseListSchema` con el uso del plan.
- **Tres módulos, ninguno importa a otro.** `exercises` define los puertos que necesita: un cupo y
  una forma de guardar marcas. `subscriptions` (F1-03) y `records` los cumplen. Los conecta
  `src/composition.ts`, la raíz de composición.
- **`records` nace con lo mínimo:** guardar la primera marca (normalizando la fecha a UTC) y leer el
  valor actual. El resto llega con F1-07.
- `POST /api/v1/exercises`, `GET /api/v1/exercises` y `?q=` en el catálogo.
- Códigos nuevos, documentados en el mismo PR: `WC-EXO-409-003` y `WC-EXO-409-004`. `AppError`
  suma `details` por campo.

## Decisiones tomadas

- **Los chequeos de duplicado van antes del cupo.** Quien está en el límite y repite un ejercicio
  lee "ya lo tenés", no "llegaste al máximo". Los índices únicos siguen siendo la garantía ante una
  carrera; los chequeos previos son para el mensaje.
- **El propio de otro usuario responde 404**, igual que uno que no existe (spec §13).
- **Búsqueda en memoria**, sin distinguir mayúsculas ni acentos: el catálogo son 33 entradas. Si
  crece a miles, corresponde un nombre normalizado con índice; queda escrito en el código.
- **La primera marca es obligatoria:** el formulario del mockup 9 no la marca como opcional, y así
  todo ejercicio de la lista tiene valor actual.
- **Las fechas de las marcas se guardan en UTC.** Se ordenan como texto, y "…T10:00-03:00" contra
  "…T12:00Z" ordenaría mal aunque sean el mismo instante.

## Bloqueos / lo que no funcionó

- **Un bug de seguridad que encontraron los tests:** sin sesión, un `POST` con un cuerpo inválido
  respondía **400 y no 401**. En Fastify la validación del cuerpo corre antes del `preHandler`, que
  es donde estaba el guard de sesión: alguien sin sesión podía sondear el contrato de la API. El
  guard pasó a `onRequest`, en todas las rutas protegidas, incluida `/me` de F0-03. Quedó como regla
  en la arquitectura.
- **La regla de arquitectura del lint marcó un test mío.** Lo había puesto en `application/`, e
  importaba infraestructura propia y de otros módulos. La regla tenía razón: es un test de
  composición y se movió a `infrastructure/`.
- **Un primer borrador del caso de uso con ramas "inalcanzables"** tapadas con `v8 ignore`. Era un
  síntoma: el tipo no expresaba los dos caminos. Se reescribió con un destino explícito (ejercicio
  existente o nombre nuevo) y las ramas imposibles dejaron de existir.
- **Tres pruebas inversas**, para no confiar en tests que pasan:
  - Escribiendo el ejercicio gestionado fuera de la transacción, los tests de atomicidad fallan.
  - Sin traducir el duplicate key, los tests de carrera fallan en tres corridas de tres: la carrera
    ocurre de verdad y el índice es lo que la resuelve.
  - Antes de agregar esos tests de carrera, la garantía del índice estaba afirmada en un comentario
    pero sin ningún test. Se encontró al revisar qué ramas no cubría el coverage.
- **Los contratos se escribieron junto con sus tests**, sin correr el rojo primero. Son schemas
  declarativos y el riesgo es bajo, pero el orden no fue el de TDD.

## Próximo paso

Debe coincidir con "Próximo paso" en [STATE.md](../STATE.md): revisar y mergear la PR de F1-05.
Destraba F1-06 y F1-07, y del front F1-11 y F1-12 cuando esté F1-09.
