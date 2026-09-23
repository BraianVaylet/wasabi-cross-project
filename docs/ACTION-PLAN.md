# Plan de acción — Wasabi Cross

> Requisito de la spec §16. **Backlog vivo:** cada tarea se marca `[x]` al cumplir el Definition of
> Done (spec §16). El orden es de prioridad y de dependencia: una tarea no arranca si sus
> `depends_on` no están cerradas.

- **Spec:** [`docs/spec/wasabi-cross.spec.md`](./spec/wasabi-cross.spec.md)
- **Tablero:** https://trello.com/b/pK3RPkCT/wasabi-cross
- **Formato de tarea:** title, module, description, acceptance-criteria, example, story-points,
  depends_on, risk, test_plan, error-codes, data-model-impact
- **Escala:** Fibonacci 1/2/3/5/8/13. Ninguna tarea supera 8: toda tarea de 13 se parte antes de
  empezar.

## Estado

| Fase                        | Tareas | Story points | Hechas |
| --------------------------- | -----: | -----------: | -----: |
| Fase 0 — Fundaciones        |      8 |           27 |      7 |
| Fase 1 — El loop del atleta |     19 |           71 |     19 |
| Fase 2 — Estadísticas       |     10 |           44 |     10 |
| Fase 3 — A producción       |     12 |           37 |      4 |

Las siete tareas de código de la Fase 0 están cerradas: PR #1 mergeada el 2026-09-17 con CI verde, y
sus tarjetas movidas a `Completadas`. Queda abierta F0-08, que no depende de código — ver abajo.

**Fase 1 cerrada el 2026-09-22** con F1-18: el loop del atleta funciona de punta a punta y el E2E lo
corre en CI contra un Mongo efímero.

**Fase 2 cerrada el 2026-09-22** con F2-10: la pantalla de Estadísticas del mockup 10, con la evolución
de cada ejercicio y el resumen por capacidad y grupo muscular, recorrida por el E2E.

## Etiquetas del tablero

Trello da seis colores por defecto y el MCP no puede nombrarlos (`trelloWriteBoard`/`trelloWriteList`
crean y renombran tableros y listas, no etiquetas) — **hay que nombrarlas a mano, una única vez**,
con este mapeo:

| Color    | Etiqueta  |
| -------- | --------- |
| verde    | `API`     |
| amarillo | `WEB`     |
| naranja  | `INFRA`   |
| rojo     | `BUG`     |
| violeta  | `TECNICO` |
| azul     | `SPEC`    |

Son seis y no siete: si en algún momento hace falta una categoría más, se reutiliza la más cercana
antes de forzar una etiqueta nueva a mano.

---

# Fase 0 — Fundaciones

Bloqueante de todo lo demás: sin monorepo, auth, schemas y manejo de errores, cualquier feature de
negocio arrastra decisiones de infraestructura a mitad de camino.

## [x] F0-01 · Monorepo: `apps/web`, `apps/api`, `packages/schemas`, `packages/ui`

- **module:** infra
- **description:** Workspace con `apps/web` (React PWA), `apps/api` (Node), `packages/schemas`
  (`@wasabi-cross/schemas`) y `packages/ui` (`@wasabi-cross/ui`). CI corre lint/typecheck/test/build
  en cada push.
- **acceptance-criteria:**
  - Dado el repo, cuando se instala desde la raíz, entonces resuelve los cuatro workspaces sin
    duplicar dependencias.
  - Dado un PR, cuando se abre, entonces CI corre lint/typecheck/test/build y falla si alguno rompe.
- **example:** —
- **story-points:** 5
- **depends_on:** —
- **risk:** low
- **test_plan:** pipeline de CI verde en un PR de prueba.
- **error-codes:** ninguno
- **data-model-impact:** ninguno
- **estado:** código hecho. pnpm workspaces con catálogo de versiones, TS strict sin `any`, ESLint
  con reglas que hacen cumplir la arquitectura, CI en GitHub Actions (formato, lint, typecheck,
  build, tests con umbral de coverage, Storybook y audit). Decisiones en
  [ADR-0002](./adr/0002-pnpm-workspaces-como-monorepo.md) y
  [ADR-0003](./adr/0003-fastify-como-framework-http.md). Cerrada.

## [x] F0-02 · `@wasabi-cross/schemas` base

- **module:** schemas
- **description:** Paquete Zod compartido front/back. Primeros schemas: `User`, `Exercise`,
  `Record` (RM / tiempo / reps). `z.infer` como única fuente de tipos.
- **acceptance-criteria:**
  - Dado un schema, cuando cambia, entonces el tipo inferido se actualiza en front y back sin
    duplicar la definición.
  - Dado cualquier schema, cuando se le pasa un valor inválido, entonces rechaza con un mensaje
    específico del campo.
- **example:** —
- **story-points:** 5
- **depends_on:** F0-01
- **risk:** medium
- **test_plan:** tests unitarios de validación (casos válidos/inválidos) por schema. Coverage ≥90%
  desde el día uno.
- **error-codes:** ninguno
- **data-model-impact:** define el modelo base de `User`, `Exercise`, `Record`.
- **estado:** código hecho. `User`, `Exercise` y `Record` en Zod, 63 tests, 100% de coverage. El
  tipo de `Record` se exporta como `ExerciseRecord` para no pisar el `Record<K, V>` de TypeScript.
  IDs con prefijo, ver [ADR-0004](./adr/0004-ids-de-dominio-con-prefijo.md). Cerrada.

## [x] F0-03 · Better Auth + Mongo

- **module:** auth
- **description:** Login y registro con email + contraseña, sesión persistida en Mongo.
- **acceptance-criteria:**
  - Dado un email sin registrar, cuando se registra, entonces se crea el `User` y queda logueado.
  - Dadas credenciales inválidas, cuando intenta entrar, entonces responde `WC-AUTH-401-001` sin
    revelar si el email existe.
  - Dado un endpoint protegido, cuando se llama sin sesión, entonces responde 401.
- **example:** Braian se registra con su email, queda logueado, y su sesión sobrevive a un reinicio
  de la API porque vive en Mongo, no en memoria.
- **story-points:** 5
- **depends_on:** F0-01, F0-02
- **risk:** high
- **test_plan:** integración con `mongodb-memory-server`: registro, login, sesión, cada código de
  error.
- **error-codes:** `WC-AUTH-401-001`, `WC-AUTH-403-002`, `WC-AUTH-429-003`
- **data-model-impact:** `User` con credenciales gestionadas por Better Auth.
- **estado:** código hecho. Registro, login y sesión en Mongo; login fallido indistinguible entre
  email inexistente y contraseña mala; `plan` no aceptado como input; rate limit 5/min en login,
  registro y recupero; contraseñas chequeadas contra listas filtradas. Cerrada.

## [x] F0-04 · Error envelope + logger Pino

- **module:** infra
- **description:** Middleware de error único que responde `{ errorCode, message, requestId }` y
  logger JSON según las reglas de [docs/architecture.md](./architecture.md).
- **acceptance-criteria:**
  - Dado cualquier error de negocio, cuando se lanza, entonces la respuesta trae un `errorCode`
    documentado en [docs/error-codes.md](./error-codes.md).
  - Dado un error, cuando se loguea, entonces nunca aparecen password, token ni datos de pago.
- **example:** —
- **story-points:** 3
- **depends_on:** F0-01
- **risk:** medium
- **test_plan:** test que falla si se lanza un `errorCode` no catalogado en el diccionario.
- **error-codes:** `WC-SYS-500-001`
- **data-model-impact:** ninguno
- **estado:** código hecho. Envelope `{ errorCode, message, requestId }` en toda respuesta de
  error, logger Pino con redacción por path, y un test que falla si el código y
  [el diccionario](./error-codes.md) divergen en cualquier dirección. Cerrada.

## [x] F0-05 · Health checks `/health` y `/ready`

- **module:** infra
- **description:** Liveness sin dependencias externas, readiness con ping a Mongo.
- **acceptance-criteria:**
  - Dado el proceso vivo, cuando se pega a `/health`, entonces responde 200 sin tocar Mongo.
  - Dado Mongo caído, cuando se pega a `/ready`, entonces responde no-200.
- **example:** —
- **story-points:** 1
- **depends_on:** F0-01
- **risk:** low
- **test_plan:** test de integración que tira la conexión a Mongo y verifica que `/ready` falla
  mientras `/health` sigue OK.
- **error-codes:** ninguno
- **data-model-impact:** ninguno
- **estado:** código hecho. `/health` no toca Mongo, `/ready` hace ping y responde 503 si falla. El
  test de integración tira el Mongo en memoria y verifica las dos cosas. Cerrada.

## [x] F0-06 · `@wasabi-cross/ui` base + Storybook

- **module:** ui
- **description:** Setup de Storybook, tema dark/light (dark first), tokens de color y tipografía
  según los mockups (`docs/mockup`).
- **acceptance-criteria:**
  - Dado el tema, cuando se togglea, entonces todos los componentes base respetan dark/light sin
    flash de contenido sin estilo.
  - Dado un componente, cuando se documenta, entonces tiene su story en Storybook.
- **example:** —
- **story-points:** 3
- **depends_on:** F0-01
- **risk:** low
- **test_plan:** build de Storybook en CI.
- **error-codes:** ninguno
- **data-model-impact:** ninguno
- **estado:** código hecho. Tokens tomados de los mockups, dark first con override por usuario,
  cinco Componentes Cross con story y test, Storybook con addon-a11y en modo error y build en CI.
  El script inline que evita el flash de tema se verifica ejecutándolo. Cerrada.

## [x] F0-07 · Catálogo pre-cargado de ejercicios (seed)

- **module:** exercises
- **description:** Seed de Mongo con el listado base de ejercicios (fuerza, hipertrofia,
  gimnástico, running) que todo usuario ve por default, sin tener que cargarlo a mano.
- **acceptance-criteria:**
  - Dado un usuario nuevo, cuando entra a Home, entonces ve el catálogo pre-cargado disponible para
    elegir en "Nuevo ejercicio".
  - Dado el seed, cuando se corre dos veces, entonces no duplica ejercicios.
- **example:** —
- **story-points:** 3
- **depends_on:** F0-02, F0-03
- **risk:** low
- **test_plan:** test de idempotencia del seed.
- **error-codes:** ninguno
- **data-model-impact:** primeros documentos de `Exercise` en la colección compartida.
- **estado:** código hecho. 34 ejercicios base, seed idempotente que además sólo escribe lo que
  cambió, índice único `(ownerId, name)` como red de seguridad, y `GET /api/v1/exercises/catalog`
  para que el usuario nuevo efectivamente los vea. Cerrada.

## [~] F0-08 · El tablero de Trello

- **module:** infra
- **description:** Armar el tablero con las cinco listas y las seis etiquetas, y cargar el backlog
  de la Fase 0.
- **acceptance-criteria:**
  - Dado el tablero, cuando se abre, entonces tiene las listas `Sin iniciar`, `En proceso`,
    `Bloqueadas`, `Completadas` y `Canceladas`.
  - Dadas las etiquetas, cuando se filtran, entonces existen `SPEC`, `TECNICO`, `API`, `WEB`,
    `INFRA` y `BUG`.
  - Dado `ACTION-PLAN.md`, cuando difiere del tablero en el **contenido**, entonces gana el plan;
    si difiere en el **estado**, gana el tablero.
- **example:** Se termina F0-05 y la tarjeta se mueve a `Completadas` con la entrada de bitácora
  enlazada.
- **story-points:** 2
- **depends_on:** —
- **risk:** low
- **test_plan:** verificación a mano contra el tablero.
- **error-codes:** ninguno
- **data-model-impact:** ninguno
- **estado:** las cinco listas están creadas y el backlog de F0 está cargado como tarjetas.
  - 🔴 **Falta lo único que solo puede hacer una persona:** el MCP de Trello no puede nombrar
    etiquetas. Las seis por defecto están sin nombre — nombrarlas a mano según la tabla de arriba.
  - Queda en `[~]` y en `En proceso` a propósito: el tablero manda en el estado, y con las
    etiquetas sin nombre el criterio de aceptación no se cumple del todo.

---

# Fase 1 — El loop del atleta

Lo mínimo para que Wasabi Cross sirva de verdad: entrar, armar la lista de ejercicios, cargar
marcas y ver los porcentajes de carga. Todo según la spec §5 y §5.1.

**Antes de arrancar:** la Fase 0 dejó un modelo que no coincide con los mockups (tags en el
ejercicio compartido, categoría y medición independientes, kg o lb). F1-01 lo corrige y va primera
por eso: todo lo demás se apoya en ese modelo.

**Orden sugerido.** El backend (F1-01 a F1-08) y el shell del front (F1-09, F1-10) pueden avanzar en
paralelo. Las pantallas (F1-11 a F1-17) esperan a su endpoint. F1-18 cierra la fase.

**Fuera de la Fase 1**, para que no se cuele:

- Estadísticas (spec §5, mockup 10). Próxima fase.
- Deploy a Railway y Mongo Atlas, backups, monitoreo (spec §12). Fase propia.
- Suscripción Max y cobro. Bloqueado por la decisión del proveedor de pago.
- Recupero de contraseña. Necesita un proveedor de email, que no está decidido.
- Login con username y con Google. Decidido el 2026-09-18.
- Editar o borrar marcas sueltas. No aparece en los mockups.
- Qué pasa si un usuario baja de Max a Free con más de 10 ejercicios. Va con la suscripción.
- Eventos de dominio (spec §7). Sus consumidores son `stats` y `notifications`, que no están en
  esta fase: emitirlos sin nadie escuchando sería código muerto. El bus llega con su primer
  consumidor.

## [x] F1-01 · Schemas alineados con la spec §5.1

- **module:** schemas
- **description:** Corregir el modelo de `@wasabi-cross/schemas` contra los mockups y la spec §5.1.
  `Exercise` pierde `tags` y `kind` (la medición sale de la categoría) y las categorías quedan en
  cuatro, sin `otro`. Nace `ManagedExercise` (el ejercicio en la lista de un usuario, con nivel,
  "con dolor" y comentarios). La marca pasa a referenciar al ejercicio gestionado y el peso queda
  sólo en kg. El catálogo del seed se ajusta: la hipertrofia se mide en repeticiones, y la plancha
  sale porque ninguna categoría la mide en tiempo.
- **acceptance-criteria:**
  - Dada una categoría, cuando se pide su medición, entonces Fuerza da RM, Hipertrofia y Gimnástico
    dan repeticiones, y Running da tiempo — con una sola función, sin tabla duplicada.
  - Dado un ejercicio del catálogo, cuando dos usuarios lo agregan, entonces cada uno tiene su propio
    nivel y su propio "con dolor", sin pisarse.
  - Dado un nivel, cuando se valida, entonces sólo acepta Principiante, Intermedio, Avanzado o Elite.
  - Dada una marca de fuerza, cuando llega con una unidad que no es kg, entonces se rechaza.
- **example:** Braian y un amigo agregan "Back squat" del catálogo. Braian lo marca "con dolor" y
  nivel Intermedio; el amigo no ve ninguna de las dos cosas.
- **story-points:** 5
- **depends_on:** —
- **risk:** medium
- **test_plan:** tests de schema por caso válido e inválido, como en F0-02. Test de que cada entrada
  del catálogo valida contra el schema nuevo. Coverage ≥90%.
- **error-codes:** ninguno
- **data-model-impact:** cambia `Exercise`, crea `ManagedExercise` (IDs `mex_`, sumar a
  [ADR-0004](./adr/0004-ids-de-dominio-con-prefijo.md)) y cambia a qué referencia la marca. No hay
  datos que migrar: todavía no existe ningún ambiente desplegado.
- **estado:** código hecho, a la espera de revisión. `measureKindFor` es la única fuente de la
  regla categoría → medición; `ManagedExercise` con nivel de cuatro valores y `withPain` booleano;
  la marca referencia al ejercicio gestionado y sólo acepta kg. El catálogo queda en 33 entradas.
  Se retiraron `createExerciseSchema` y `updateExerciseSchema`: cada payload lo define la tarea que
  lo usa (F1-05, F1-06). Cerrada: PR #10 mergeada el 2026-09-18.

## [x] F1-02 · Migraciones versionadas de Mongo

- **module:** infra
- **description:** Herramienta de migraciones versionadas y reversibles (spec §12), antes del primer
  deploy. Los índices dejan de crearse al arrancar la API y pasan a migraciones: el de
  `(ownerId, name)` de ejercicios y el nuevo `(userId, exerciseId)` de ejercicios gestionados.
- **acceptance-criteria:**
  - Dada una base vacía, cuando se corren las migraciones, entonces quedan todos los índices.
  - Dada una migración aplicada, cuando se revierte, entonces la base vuelve al estado anterior.
  - Dada una migración ya aplicada, cuando se corre de nuevo, entonces no hace nada.
- **example:** —
- **story-points:** 3
- **depends_on:** F1-01
- **risk:** medium
- **test_plan:** up, down y up de nuevo contra `mongodb-memory-server`, verificando los índices en
  cada paso.
- **error-codes:** ninguno
- **data-model-impact:** índice único `(userId, exerciseId)` en ejercicios gestionados. Registro de
  migraciones aplicadas en una colección propia.
- **estado:** código hecho, a la espera de revisión. migrate-mongo
  ([ADR-0005](./adr/0005-migraciones-con-migrate-mongo.md)), corriendo una vez por deploy y no al
  arrancar, porque su lock no es atómico. Suma dos cosas que no estaban en el plan y salieron de
  probarlo: `/ready` responde no-listo con migraciones pendientes, y una guarda impide migrar la misma
  base desde `src/` y desde `dist/`, que haría aplicar dos veces cada migración. Cerrada: PR #11
  mergeada el 2026-09-18.

## [x] F1-03 · Entitlements de plan

- **module:** subscriptions
- **description:** El módulo `subscriptions` decide si un usuario puede agregar un ejercicio, según
  la spec §4: Free llega a 10 en total y a 3 propios; Max no tiene límite. Lo consulta `exercises` a
  través de una interfaz; los conteos llegan inyectados, sin importar el modelo de otro módulo.
- **acceptance-criteria:**
  - Dado un usuario Free con 9 ejercicios, cuando agrega uno, entonces puede; con 10, responde
    `WC-SUBS-403-001`.
  - Dado un usuario Free con 3 propios y 5 en total, cuando crea un cuarto propio, entonces responde
    `WC-SUBS-403-001` aunque le queden lugares en el total.
  - Dado un usuario Max, cuando agrega ejercicios, entonces nunca hay límite.
  - Dadas dos altas simultáneas de un usuario con 9 ejercicios, cuando llegan juntas, entonces sólo
    una entra.
- **example:** Braian, en Free, tiene 10 ejercicios. Intenta agregar "Snatch" y la API se lo impide
  aunque el front no haya escondido el botón.
- **story-points:** 5
- **depends_on:** F1-01
- **risk:** high. 🔴 **El límite se valida en el backend. El front sólo lo refleja.**
- **test_plan:** unitarios del caso de uso con conteos inyectados; integración con alta concurrente
  sobre `MongoMemoryReplSet` (hace falta replica set para transacciones). Flujo de permisos: revisión
  humana obligatoria (spec §9).
- **error-codes:** `WC-SUBS-403-001`. Se retira `WC-EXO-403-001`, que decía lo mismo desde el módulo
  equivocado: el límite lo decide `subscriptions`.
- **data-model-impact:** ninguno
- **estado:** código hecho, **a la espera de revisión humana de los tests** (flujo de permisos,
  spec §9). La regla vive pura en el dominio; el conteo y el alta van en la misma transacción,
  serializada con un documento de lock por usuario, porque una transacción sola deja pasar dos altas
  simultáneas (write skew). Una prueba inversa confirmó que sin el lock el test de concurrencia
  falla. Suma interpolación de variables en `AppError`: el mensaje de `WC-SUBS-403-001` llegaba al
  usuario con `{limite}` y `{plan}` literales. Requiere Mongo en replica set. Cerrada: PR #12
  revisada y mergeada el 2026-09-18.

## [x] F1-04 · Cálculo de porcentajes y bandas de carga

- **module:** records
- **description:** Funciones puras de la spec §5.1, compartidas por front y back para que calculen
  igual: carga = RM × % redondeada al 0,5 kg; repeticiones = máximo × % hacia abajo con mínimo 1;
  banda de carga liviana/media/pesada (<70 / 70–84 / ≥85). En tiempo no hay porcentajes. El front
  las necesita para calcular el porcentaje custom mientras se tipea, sin ir a la API.
- **acceptance-criteria:**
  - Dado un RM de 100 kg, cuando se pide el 65%, entonces da 65 kg y banda liviana.
  - Dado un RM de 87,5 kg, cuando se pide el 65%, entonces da 57 kg (56,875 redondeado al 0,5).
  - Dado un máximo de 13 repeticiones, cuando se pide el 80%, entonces da 10 (10,4 hacia abajo).
  - Dado un máximo de 1 repetición, cuando se pide cualquier porcentaje, entonces da 1.
  - Dado 70%, cuando se pide la banda, entonces es media; 84% es media; 85% es pesada.
- **example:** —
- **story-points:** 3
- **depends_on:** F1-01
- **risk:** medium
- **test_plan:** tabla de casos por función, con los bordes de cada banda y de cada redondeo.
  Coverage 100%: es el cálculo que el usuario usa para cargar la barra.
- **error-codes:** ninguno
- **data-model-impact:** ninguno. **Decisión estructural:** dónde vive lógica de dominio compartida
  (propuesta: `@wasabi-cross/schemas`; alternativa: un paquete `@wasabi-cross/domain`). ADR en esta
  tarea.
- **estado:** código hecho, a la espera de revisión. `loadFor`, `repsFor`, `loadBandFor`,
  `supportsPercentages` y `percentageTable` en `packages/schemas/src/calc/`, con 100% de coverage.
  La decisión estructural quedó en [ADR-0006](./adr/0006-reglas-de-dominio-compartidas-en-schemas.md):
  schemas, porque ya alojaba reglas de dominio compartidas. Cerrada: PR #13 mergeada el
  2026-09-18.

## [x] F1-05 · Agregar y listar ejercicios gestionados

- **module:** exercises
- **description:** `POST /api/v1/exercises` agrega a la lista del usuario un ejercicio del catálogo
  o uno propio, junto con su primera marca, en una sola operación. `GET /api/v1/exercises` devuelve
  la lista con el valor actual, su fecha y el uso del plan. El catálogo suma búsqueda por nombre para
  el formulario de "Nuevo ejercicio".
- **acceptance-criteria:**
  - Dado un ejercicio del catálogo, cuando el usuario lo agrega con su primera marca, entonces
    aparece en su lista con ese valor actual.
  - Dado un nombre que no está en el catálogo, cuando el usuario crea un ejercicio propio, entonces
    queda en su lista y nadie más lo ve.
  - Dado un nombre que ya está en el catálogo, sin distinguir mayúsculas ni acentos, cuando se
    intenta crear como propio, entonces responde `WC-EXO-409-004`.
  - Dado un ejercicio que ya está en la lista, cuando se agrega de nuevo, entonces responde
    `WC-EXO-409-003`.
  - Dado que falla la primera marca, cuando se procesa el alta, entonces no queda ni el ejercicio
    gestionado ni el propio: todo o nada.
  - Dado un `exerciseId` de un ejercicio propio de otro usuario, cuando se intenta agregar, entonces
    responde 404.
- **example:** Braian busca "squ" y le aparecen "Back squat", "Front squat" y "Overhead squat".
  Elige "Front squat", carga 90 kg con fecha de hoy, nivel Intermedio, y vuelve a Home.
- **story-points:** 8
- **depends_on:** F1-01, F1-02, F1-03
- **risk:** high. 🔴 **IDOR: un recurso de otro usuario responde 404, no 403** (spec §13).
- **test_plan:** integración de cada criterio. Test de IDOR con dos usuarios. Test de atomicidad
  forzando la falla de la marca.
- **error-codes:** `WC-EXO-404-002`, `WC-SUBS-403-001`, nuevos `WC-EXO-409-003` (ya está en tu lista)
  y `WC-EXO-409-004` (ya existe en el catálogo).
- **data-model-impact:** primeros documentos de ejercicios gestionados y de ejercicios propios.
- **estado:** código hecho, a la espera de revisión. `exercises` pide el cupo y la primera marca por
  puertos; `subscriptions` y `records` los cumplen, conectados en `src/composition.ts`. `records`
  nace con lo mínimo (guardar la primera marca y leer el valor actual). Probado: cada criterio por
  HTTP, IDOR con dos usuarios, atomicidad forzando la falla de la marca y las carreras de alta
  duplicada, con pruebas inversas que confirman que los tests detectan la falla. De camino se
  encontró y corrigió que el guard de sesión corría después de validar el cuerpo. Cerrada: PR #14
  mergeada el 2026-09-18.

## [x] F1-06 · Editar y borrar un ejercicio gestionado

- **module:** exercises
- **description:** `PATCH /api/v1/exercises/:id` cambia nivel, "con dolor" y comentarios; en uno
  propio, también el nombre. La categoría no se cambia: las marcas ya están en su unidad.
  `DELETE /api/v1/exercises/:id` borra el ejercicio gestionado y todas sus marcas; si era propio,
  también la definición.
- **acceptance-criteria:**
  - Dado un ejercicio gestionado, cuando se edita el nivel, entonces el cambio es sólo del usuario.
  - Dado un ejercicio del catálogo, cuando se intenta cambiar su nombre, entonces se rechaza.
  - Dado un intento de cambiar la categoría, cuando llega, entonces se rechaza.
  - Dado un ejercicio borrado, cuando se busca, entonces no quedan ni él ni sus marcas.
  - Dado el ID de un ejercicio de otro usuario, cuando se edita o se borra, entonces responde 404.
- **example:** —
- **story-points:** 3
- **depends_on:** F1-05
- **risk:** high. 🔴 **IDOR: 404, no 403.** El borrado es irreversible y la confirmación con el nombre escrito vive
  en el front (F1-15).
- **test_plan:** integración de cada criterio, IDOR con dos usuarios, y conteo de marcas después
  del borrado.
- **error-codes:** `WC-EXO-404-002`, `WC-SYS-400-002`.
- **data-model-impact:** borrado en cascada de las marcas del ejercicio gestionado.
- **estado:** código hecho, a la espera de revisión. `PATCH` y `DELETE /api/v1/exercises/:id`. El
  store sólo busca un ejercicio gestionado por ID **y** dueño, así que un ID ajeno se comporta igual
  que uno inexistente por construcción. Editar y borrar son todo o nada (un ejecutor de
  transacciones genérico, porque no consumen cupo); el borrado también se probó con una falla
  forzada y una prueba inversa. Cerrada: PR #15 mergeada el 2026-09-18.

## [x] F1-07 · Marcas: cargar e historial

- **module:** records
- **description:** `POST /api/v1/exercises/:id/records` carga una marca en la unidad que dicta la
  categoría. `GET /api/v1/exercises/:id/records` devuelve el historial paginado, más reciente primero,
  indicando el valor actual y la mejor marca (spec §5.1).
- **acceptance-criteria:**
  - Dada una marca con fecha anterior a otra existente, cuando se carga, entonces el valor actual no
    cambia: sigue siendo la de fecha más reciente.
  - Dada una marca de fuerza que supera la mejor, cuando se carga, entonces pasa a ser la mejor
    marca.
  - Dada una marca de tiempo **menor** a la mejor, cuando se carga, entonces pasa a ser la mejor
    marca: en tiempo, menos es mejor.
  - Dado un valor inválido para la categoría (repeticiones con decimales, tiempo cero), cuando se
    carga, entonces responde `WC-RM-422-001` con el motivo.
  - Dado un ejercicio de otro usuario, cuando se cargan o se leen marcas, entonces responde 404.
  - Dada una marca con fecha futura, cuando se carga, entonces se rechaza con el motivo en la fecha.
    Vale también para la primera marca al agregar un ejercicio (spec §5.1, decidido el 2026-09-18).
- **example:** Braian tenía 100 kg en "Back squat" y carga 105. El historial marca 105 como valor
  actual y como mejor marca.
- **story-points:** 5
- **depends_on:** F1-04, F1-05
- **risk:** medium. 🔴 **IDOR: 404, no 403.**
- **test_plan:** integración por criterio, con fechas desordenadas; unitarios de la regla de mejor
  marca por categoría; IDOR con dos usuarios.
- **error-codes:** `WC-RM-422-001`, `WC-RM-404-002`, `WC-EXO-404-002`.
- **data-model-impact:** índice por `(managedExerciseId, performedAt)` para el historial, en una
  migración.
- **estado:** código hecho, a la espera de revisión. `POST` y `GET /api/v1/exercises/:id/records`,
  paginado por cursor. El índice `managed_history` suma `createdAt` y el ID para desempatar marcas
  de la misma fecha: sin eso el cursor repetiría o saltearía alguna. La regla de mejor marca vive
  en la consulta (orden por valor, ascendente en tiempo), así que se prueba por integración en las
  tres mediciones y no con unitarios. Siete pruebas inversas confirman que los tests detectan cada
  regla rota. `WC-RM-404-002` no se usa todavía: ningún endpoint apunta a una marca por ID. La PR
  #16 iba apilada sobre F1-06 y se mergeó contra esa rama después de que F1-06 entrara a `main`, así
  que no llegó: entró por la PR #17, mergeada el 2026-09-21.

## [x] F1-08 · Preferencias del usuario

- **module:** users
- **description:** `GET` y `PATCH /api/v1/me/preferences`: tema y porcentajes de carga por defecto
  (65/75/80/85/90/95 si nunca los cambió). Viven en el módulo `users`, no en el documento que maneja
  Better Auth.
- **acceptance-criteria:**
  - Dado un usuario nuevo, cuando pide sus preferencias, entonces recibe los porcentajes por defecto
    y tema oscuro.
  - Dados porcentajes repetidos, fuera de 1–100 o más de 12, cuando se guardan, entonces se
    rechazan con el motivo por campo.
  - Dado un cambio de tema, cuando se guarda, entonces el próximo login en otro dispositivo lo
    recupera.
- **example:** —
- **story-points:** 3
- **depends_on:** F1-01
- **risk:** low
- **test_plan:** integración de lectura por defecto, guardado y cada validación.
- **error-codes:** `WC-SYS-400-002`.
- **data-model-impact:** colección de preferencias del módulo `users`.
- **estado:** código hecho, a la espera de revisión. `GET` y `PATCH /api/v1/me/preferences`, en la
  colección `user_preferences` con el ID del usuario como `_id` (uno por usuario sin índice, así que
  sin migración). Se guarda sólo lo que el usuario cambió; lo demás toma el default al leer, que es
  lo que dice la spec ("si nunca los cambió"). El cambio es un único `$set` con upsert: tema y
  porcentajes a la vez no se pisan. Cuatro pruebas inversas detectadas. Cerrada: PR #18 mergeada el
  2026-09-18.

## [x] F1-09 · Shell de la app: rutas, sesión, header y menú

- **module:** web
- **description:** TanStack Router con rutas protegidas, TanStack Query, cliente de sesión de Better
  Auth, y un cliente HTTP tipado con los schemas compartidos que manda `x-request-id` y entiende el
  envelope de error. Splash (mockup 1), header y menú lateral (mockup 4a).
- **acceptance-criteria:**
  - Dada una ruta protegida, cuando se entra sin sesión, entonces redirige a login y, después de
    entrar, vuelve a donde iba.
  - Dado un error de la API, cuando llega, entonces la UI tiene el `errorCode` y el `requestId` para
    mostrarlo o reportarlo.
  - Dado el menú, cuando se abre con teclado, entonces el foco queda atrapado adentro y Escape lo
    cierra.
- **example:** —
- **story-points:** 5
- **depends_on:** —
- **risk:** medium
- **test_plan:** tests de componentes del header y el menú; test de la redirección con y sin sesión.
- **error-codes:** consume `WC-AUTH-401-004`. Introduce `WC-SYS-503-004` (lo genera el front: la
  API no respondió, o no con el envelope).
- **data-model-impact:** ninguno
- **estado:** código hecho, a la espera de revisión. Router con rutas protegidas y `redirect` validado
  (sólo rutas internas: no es un open redirect), splash mientras se averigua la sesión, header y
  menú lateral con foco atrapado. La sesión va por el mismo cliente HTTP que el resto, también contra
  Better Auth, porque la API ya traduce sus errores al envelope: un solo formato de error en el
  front. El envelope, el usuario de `/me` y el catálogo de códigos pasaron a
  `@wasabi-cross/schemas`. Del menú del mockup quedan afuera "Estadísticas" (próxima fase) y
  "Color" (F1-16). Probado también a mano contra la API real. Cerrada: PR #19 mergeada el
  2026-09-18.

## [x] F1-10 · Login y registro

- **module:** web
- **description:** Pantallas de los mockups 2 y 3, sin username ni Google (spec §5). Registro con
  email, nombre, contraseña y confirmación. TanStack Form con los schemas compartidos.
- **acceptance-criteria:**
  - Dadas credenciales inválidas, cuando se intenta entrar, entonces se muestra el mensaje de
    `WC-AUTH-401-001` sin indicar qué campo estaba mal.
  - Dados demasiados intentos, cuando responde `WC-AUTH-429-003`, entonces se explica cuánto esperar.
  - Dadas dos contraseñas distintas, cuando se registra, entonces el error aparece en el campo de
    confirmación antes de llamar a la API.
- **example:** —
- **story-points:** 3
- **depends_on:** F1-09
- **risk:** medium
- **test_plan:** tests de componentes con la API simulada, uno por criterio. axe sin violaciones.
- **error-codes:** consume `WC-AUTH-401-001`, `WC-AUTH-429-003`, `WC-SYS-400-002`.
- **data-model-impact:** ninguno
- **estado:** código hecho, a la espera de revisión. `/login` y `/registro` con TanStack Form y los
  schemas nuevos de `@wasabi-cross/schemas`, que también configuran el largo de contraseña de Better
  Auth: el formulario y la API exigen lo mismo. El error de la API se muestra sin repartirlo por
  campo (decir cuál falló diría si el email existe). De paso se corrigió el mensaje de
  `WC-AUTH-429-003`, que decía "5 minutos" con una ventana de un minuto, y el handler de errores
  pasó a leer los mensajes del catálogo en vez de repetirlos. Cinco pruebas inversas; axe sin
  violaciones en las dos pantallas; probado a mano contra la API real. Cerrada: PR #20 mergeada el
  2026-09-21.

## [x] F1-11 · Home: lista de ejercicios

- **module:** web
- **description:** Mockup 4. Cada ejercicio con nombre, fecha del valor actual y valor con su
  unidad. Estado vacío con acción (spec §11), skeletons mientras carga, y "New Exercise" que se
  deshabilita con explicación cuando el plan no deja agregar más.
- **acceptance-criteria:**
  - Dado un usuario sin ejercicios, cuando entra, entonces ve "Todavía no tenés ejercicios" con un
    botón para agregar el primero.
  - Dado un usuario Free con 10 ejercicios, cuando entra, entonces "New Exercise" está deshabilitado
    y dice por qué.
  - Dada una lista cargando, cuando todavía no llegó, entonces se ven skeletons, no un spinner.
- **example:** —
- **story-points:** 3
- **depends_on:** F1-05, F1-09
- **risk:** low
- **test_plan:** tests de componentes por estado: vacío, cargando, con datos, en el límite.
- **error-codes:** ninguno
- **data-model-impact:** ninguno
- **estado:** código hecho, a la espera de revisión. La lista con nombre, fecha y valor; el tiempo se
  muestra como tiempo (4:32) y no como 272 segundos, y las fechas en es-AR. `Skeleton` nuevo en los
  Componentes Cross. El cliente de API del front se inyecta como la sesión, así que las pantallas se
  prueban sin `fetch`. En el límite del plan el botón queda deshabilitado con el mensaje de
  `WC-SUBS-403-001`, que ya estaba en el catálogo. Las filas y el botón llevan a F1-13 y F1-12, que
  por ahora son marcadores. Seis pruebas inversas; axe sin violaciones; probado a mano contra la API
  real. Cerrada: PR #21 mergeada el 2026-09-21.

## [x] F1-12 · Nuevo ejercicio

- **module:** web
- **description:** Mockup 9. El nombre busca en el catálogo mientras se tipea; si no hay coincidencia,
  permite crear uno propio y ahí sí pide la categoría. El campo de la primera marca cambia según la
  categoría: RM en kg, repeticiones o tiempo. Fecha en formato es-AR con la semana empezando en
  lunes. Nivel, comentarios y "con dolor".
- **acceptance-criteria:**
  - Dado un nombre del catálogo, cuando se elige, entonces la categoría queda fija y no se puede
    cambiar.
  - Dado un ejercicio de tiempo, cuando se carga la marca, entonces se escribe como `mm:ss` y se
    guarda en segundos.
  - Dado `WC-SUBS-403-001`, cuando la API lo devuelve, entonces se explica el límite del plan en vez
    de un error genérico.
  - Dado el formulario, cuando se recorre con teclado, entonces el buscador del catálogo se opera
    entero sin mouse.
- **example:** Braian escribe "Wall ball", no aparece en el catálogo, elige Gimnástico y carga 30
  repeticiones.
- **story-points:** 5
- **depends_on:** F1-05, F1-09
- **risk:** medium
- **test_plan:** tests de componentes por criterio; test del parseo `mm:ss` con sus bordes.
- **error-codes:** consume `WC-SUBS-403-001`, `WC-EXO-409-003`, `WC-EXO-409-004`.
- **data-model-impact:** ninguno
- **estado:** código hecho, a la espera de revisión. El nombre busca en el catálogo con un
  `datalist` (se opera entero con el teclado, sin inventar un combobox); si coincide, la categoría
  queda fija y el campo de la marca cambia solo. El tiempo se escribe `mm:ss` y viaja en segundos,
  y la fecha se manda al mediodía para que no se corra de día por la zona horaria. La lógica del
  formulario vive aparte de la pantalla (`new-exercise/form.ts`) y se prueba sola. Cuatro
  Componentes Cross nuevos: `Select`, `TextArea`, `Checkbox` y `RadioGroup`. La normalización de
  nombres pasó a `@wasabi-cross/schemas`: es la misma regla que usa la API. Siete pruebas inversas;
  axe sin violaciones; probado a mano contra la API real. Cerrada: PR #22 mergeada el 2026-09-21.

## [x] F1-13a · Detalle de ejercicio: porcentajes

> Partida de F1-13 el 2026-09-21, con Braian: el historial necesita F1-07, que estaba en revisión,
> y el resto de la pantalla no. F1-13b queda con lo que sí depende de las marcas.

- **module:** web
- **description:** Mockups 5 y 6, sin el historial. Valor actual con su fecha, tags (categoría,
  nivel, con dolor), tabla de porcentajes con los del perfil, porcentaje custom, número grande con
  la carga del porcentaje elegido, barra y banda de carga. En tiempo, sin tabla (spec §5.1). El
  porcentaje elegido vive en la URL.
- **acceptance-criteria:**
  - Dado un RM de 100 kg, cuando se elige 65%, entonces se ve 65 kg y "Carga liviana".
  - Dado un porcentaje custom, cuando se tipea, entonces el resultado se actualiza sin llamar a la
    API.
  - Dado un ejercicio de tiempo, cuando se abre, entonces no hay tabla de porcentajes.
  - Dado un link con `?pct=80`, cuando se abre, entonces arranca con 80% elegido.
- **example:** —
- **story-points:** 3
- **depends_on:** F1-04, F1-08, F1-09, F1-11
- **risk:** medium
- **test_plan:** tests de componentes por criterio y por categoría. axe sin violaciones.
- **error-codes:** ninguno: un ID que no está en la lista se resuelve en el front.
- **data-model-impact:** ninguno
- **estado:** código hecho, a la espera de revisión. El porcentaje elegido va en la URL con los
  search params tipados de TanStack Router, no con Nuqs (ver la PR: es una desviación del stack de
  la spec §6 que hay que confirmar). Seis pruebas inversas; axe sin violaciones; probado a mano
  contra la API real. Cerrada: PR #25 mergeada el 2026-09-21.

## [x] F1-13b · Detalle de ejercicio: historial

- **module:** web
- **description:** La parte de los mockups 5 y 6 que necesita las marcas: historial con el valor
  actual marcado como `current`, "Ver todo el historial", y en los ejercicios de tiempo la mejor
  marca en lugar de la tabla.
- **acceptance-criteria:**
  - Dado un ejercicio con varias marcas, cuando se abre, entonces se ven las últimas con su fecha y
    la más reciente marcada como actual.
  - Dado un ejercicio de tiempo, cuando se abre, entonces se ve la mejor marca y el historial.
  - Dado el historial paginado, cuando se pide más, entonces se traen las siguientes sin repetir.
- **example:** —
- **story-points:** 2
- **depends_on:** F1-07, F1-13a
- **risk:** low
- **test_plan:** tests de componentes por criterio, con la API simulada.
- **error-codes:** consume `WC-EXO-404-002`.
- **data-model-impact:** ninguno
- **estado:** código hecho, a la espera de revisión. El historial se pide aparte de la lista, con
  `useInfiniteQuery` y el cursor de F1-07: "Ver más" trae la página siguiente y desaparece cuando no
  hay más. La marca de fecha más reciente va etiquetada como actual. En tiempo se muestra la mejor
  marca (la menor) en lugar de la tabla. Si el historial falla, el resto de la pantalla sigue
  funcionando. Seis pruebas inversas; axe sin violaciones; probado a mano contra la API real,
  incluida la paginación. Falta mover la tarjeta.

## [x] F1-14 · Cargar una marca nueva

- **module:** web
- **description:** Modal del mockup 11. Se llama "New RM" en fuerza y "New Record" en el resto
  (leyenda del mockup 12). Optimistic UI (spec §11): la marca aparece en el historial antes de que
  responda la API, y se revierte si falla.
- **acceptance-criteria:**
  - Dada una marca válida, cuando se guarda, entonces aparece en el historial sin esperar a la API.
  - Dado un error de la API, cuando llega, entonces la marca optimista desaparece y se muestra el
    motivo.
  - Dado el modal abierto, cuando se aprieta Escape, entonces se cierra y el foco vuelve al botón
    que lo abrió.
- **example:** —
- **story-points:** 3
- **depends_on:** F1-07, F1-13a
- **risk:** low
- **test_plan:** tests de componentes del camino feliz, del rollback y del manejo de foco.
- **error-codes:** consume `WC-RM-422-001`.
- **data-model-impact:** ninguno
- **cierre:** el modal cierra al guardar y el error se muestra en la pantalla de atrás; `onSettled`
  invalida sin `await`, porque React Query recién marca el error cuando termina. Dos tests pasaban
  con el código roto y se reescribieron. Cerrada: PR #28 mergeada el 2026-09-21.

## [x] F1-15 · Editar y borrar ejercicio

- **module:** web
- **description:** Desde el lápiz del detalle: nivel, "con dolor", comentarios, y el nombre si es
  propio. Borrar pide escribir el nombre del ejercicio para confirmar (spec §11), porque se lleva
  todo el historial.
- **acceptance-criteria:**
  - Dado el diálogo de borrado, cuando el nombre escrito no coincide, entonces el botón de borrar
    sigue deshabilitado.
  - Dado un ejercicio del catálogo, cuando se edita, entonces el nombre no es editable.
- **example:** —
- **story-points:** 3
- **depends_on:** F1-06, F1-13a
- **risk:** medium
- **test_plan:** tests de componentes por criterio.
- **error-codes:** consume `WC-EXO-404-002`.
- **data-model-impact:** ninguno
- **estado:** código hecho, a la espera de revisión. Se llega desde el lápiz del detalle. En uno del
  catálogo el nombre se muestra pero no se edita; en uno propio sí. Se manda **sólo lo que cambió**.
  El borrado vive en una sección aparte, en rojo, y su botón queda deshabilitado hasta escribir el
  nombre (con la misma comparación que el resto: no distingue mayúsculas ni acentos). Seis pruebas
  inversas; axe sin violaciones; edición probada a mano contra la API real. El borrado no se pudo
  clickear en el navegador automatizado (el panel estaba oculto y las coordenadas quedan viejas):
  se cubrió con el test del recorrido completo y con tests nuevos del cliente de API. Cerrada: PR #26
  mergeada el 2026-09-21.

## [x] F1-16 · Perfil: porcentajes y tema

- **module:** web
- **description:** Pantalla de perfil para editar los porcentajes por defecto, y el tema desde
  "Color" en el menú. Con sesión, el tema de la API manda; `localStorage` queda sólo para evitar el
  flash antes de que cargue.
- **acceptance-criteria:**
  - Dado un porcentaje repetido, cuando se guarda, entonces el error aparece en ese campo.
  - Dado un cambio de tema, cuando se hace, entonces se ve al instante y se guarda en la API.
- **example:** —
- **story-points:** 2
- **depends_on:** F1-08, F1-09
- **risk:** low
- **test_plan:** tests de componentes por criterio.
- **error-codes:** consume `WC-SYS-400-002`.
- **data-model-impact:** ninguno
- **estado:** código hecho, a la espera de revisión. Los porcentajes se editan campo por campo, con
  el error **en el campo** que lo causa (un repetido no es culpa de la lista entera); las reglas
  salen de `@wasabi-cross/schemas`, las mismas que aplica la API. El tema se guarda en la API y,
  con sesión, le gana a lo guardado en el dispositivo: `localStorage` queda sólo para que no haya
  parpadeo antes de que cargue. El toggle del header también guarda, si no al recargar volvería
  atrás. Cinco pruebas inversas; axe sin violaciones; probado a mano contra la API real. Cerrada: PR #24
  mergeada el 2026-09-21.

## [x] F1-17 · Aviso de nueva versión de la PWA

- **module:** web
- **description:** El popup de la spec §5. `registerType: 'prompt'` ya está desde F0-01; falta el
  componente que avisa y deja actualizar.
- **acceptance-criteria:**
  - Dada una versión nueva publicada, cuando el service worker la detecta, entonces aparece el
    aviso con un botón para actualizar.
  - Dado el aviso, cuando se descarta, entonces no vuelve a aparecer hasta la siguiente versión.
- **example:** —
- **story-points:** 2
- **depends_on:** F1-09
- **risk:** low
- **test_plan:** test del componente con el registro del service worker simulado.
- **error-codes:** ninguno
- **data-model-impact:** ninguno
- **estado:** código hecho, a la espera de revisión. El aviso vive fuera del router, así aparece
  esté donde esté el usuario, y nunca actualiza solo: el service worker queda esperando hasta que
  el usuario acepta. Descartarlo no lo vuelve a mostrar hasta la próxima versión. En los tests, el
  módulo virtual del plugin se resuelve a un stub. De paso se destapó que faltaba `workbox-window`:
  el build de la PWA fallaba al generar el service worker. Tres pruebas inversas. Cerrada: PR #23 mergeada el
  2026-09-21.

## [x] F1-18 · E2E del flujo principal y axe en CI

- **module:** infra
- **description:** Playwright contra la app completa para el flujo crítico (spec §10), y auditoría
  de accesibilidad con axe en CI (spec §11). Cierra la fase.
- **acceptance-criteria:**
  - Dado un usuario nuevo, cuando se registra, agrega un ejercicio del catálogo, carga una marca y
    abre el detalle, entonces ve los porcentajes correctos.
  - Dado un usuario Free, cuando llega a 10 ejercicios, entonces el E2E comprueba que no puede
    agregar el undécimo, ni por la UI ni llamando a la API directo.
  - Dada cualquier pantalla de la fase, cuando corre axe, entonces no hay violaciones WCAG 2.2 AA.
- **example:** —
- **story-points:** 5
- **depends_on:** F1-10, F1-11, F1-12, F1-13a, F1-14
- **risk:** medium
- **test_plan:** el propio E2E, corriendo en CI contra un Mongo efímero.
- **error-codes:** ninguno
- **data-model-impact:** ninguno
- **cierre:** seis tests de Playwright y `dev:ephemeral` para levantar la API con un Mongo
  descartable. El axe del navegador encontró tres contrastes por debajo de AA que jsdom no podía
  ver, arreglados en los tokens. Cerrada: PR #29 mergeada el 2026-09-22.

---

# Fase 2 — Estadísticas

La pantalla del mockup 10 y lo que la alimenta: cómo evolucionó cada ejercicio, y qué dicen esos
números juntos por capacidad y por grupo muscular (spec §5). Es la primera fase que lee los datos en
lugar de escribirlos.

**Antes de arrancar:** el módulo `stats` (spec §7) todavía no existe. Nace acá, y como cualquier
otro módulo no puede importar el modelo de `exercises` ni el de `records`: las lecturas que necesita
entran por puertos inyectados desde `composition.ts`.

**Decidido el 2026-09-22 (spec §5.1 actualizada):** un ejercicio **propio** también lleva
capacidades y grupos musculares, y el formulario de alta los pregunta. Sin eso, los propios
quedarían afuera de las estadísticas generales. El segmento del cuerpo no se pregunta: se deriva de
los grupos musculares. Eso agrega F2-02 y F2-03, que van antes que las agregaciones.

**Orden sugerido.** F2-01 fija los contratos y F2-02 el modelo del ejercicio propio; pueden ir en
paralelo. F2-03 sigue a F2-02, y F2-04 a F2-01. F2-06 (el gráfico) no depende de la API y puede
hacerse en cualquier momento. Las pantallas (F2-07, F2-08) esperan a su endpoint; F2-09 las enlaza y
F2-10 cierra la fase.

**Fuera de la Fase 2**, para que no se cuele:

- Deploy a Railway y Mongo Atlas, backups y monitoreo (spec §12). Fase propia, la que sigue.
- Comparar con otros usuarios, rankings o promedios de la comunidad — no está en la spec, y §2 dice
  qué no es Wasabi Cross.
- Exportar a CSV o PDF. No aparece en los mockups.
- Predicciones o recomendaciones de entrenamiento. No es un coach (spec §2).
- Eventos de dominio (`pr.achieved`, spec §7): las agregaciones se calculan al pedirlas. Entran
  cuando haya algo que invalidar o algo que notificar, no antes.
- Editar o borrar marcas sueltas. Sigue sin estar en los mockups.
- Cambiar capacidades o grupos musculares de un ejercicio propio ya creado. Va con la edición del
  ejercicio, si aparece la necesidad.

## [x] F2-01 · Contratos de estadísticas

- **module:** schemas
- **description:** Los Zod compartidos de la fase: la serie de un ejercicio (punto = fecha + valor),
  su resumen (mejor, peor, actual y variación en el período) y los agregados generales por capacidad
  y por grupo muscular. Incluye el período pedido, que es el mismo para todos los endpoints.
- **acceptance-criteria:**
  - Dado un período, cuando llega a la API, entonces se valida contra un enum (`3m`, `6m`, `12m`,
    `todo`) y por defecto es `12m`.
  - Dada una serie, cuando se serializa, entonces cada punto lleva fecha ISO y valor, y la unidad
    viaja una sola vez, no repetida en cada punto.
  - Dado un ejercicio de tiempo, cuando se resume, entonces "mejor" es el mínimo y la variación se
    lee al revés que en RM: bajar es mejorar.
- **example:** —
- **story-points:** 3
- **depends_on:** —
- **risk:** low
- **test_plan:** tests de schema por cada regla, incluida la de tiempo; un período inválido se
  rechaza.
- **error-codes:** ninguno
- **data-model-impact:** ninguno
- **cierre:** `summarize()` y `periodStartFor()` viven en el paquete compartido, como el cálculo de
  porcentajes (ADR-0006). Cinco pruebas inversas. Cerrada: PR #32 mergeada el 2026-09-22.

## [x] F2-02 · El ejercicio propio lleva capacidades y grupos musculares

- **module:** api
- **description:** Hoy sólo el catálogo los tiene, así que un ejercicio propio no entra en las
  estadísticas generales (spec §5.1, actualizada el 2026-09-22). El alta de un propio pasa a
  recibirlos, y el segmento del cuerpo se deriva de los grupos musculares en vez de preguntarse.
- **acceptance-criteria:**
  - Dado un alta propia sin capacidades o sin grupos musculares, cuando llega, entonces se rechaza
    con `WC-SYS-400-002` y no se crea nada.
  - Dados grupos musculares de más de un segmento, cuando se guarda, entonces el segmento derivado
    es `cuerpo_completo`; con un solo segmento, el suyo.
  - Dada un alta del catálogo, cuando manda capacidades o grupos musculares, entonces no pisan las
    del catálogo.
  - Dados los ejercicios propios ya cargados, cuando corre la migración, entonces quedan con
    capacidades y grupos musculares, y `down` los deja como estaban.
- **example:** Un "Peso muerto rumano" propio con cuádriceps e isquiotibiales queda en tren
  inferior; si además lleva core, queda en cuerpo completo.
- **story-points:** 5
- **depends_on:** —
- **risk:** medium
- **test_plan:** unit de la derivación del segmento, con un grupo, con varios del mismo segmento y
  con mezcla; integración del alta en sus dos formas; migración up, down y up de nuevo.
- **error-codes:** ninguno nuevo (usa `WC-SYS-400-002`)
- **data-model-impact:** el ejercicio propio gana `capacities`, `muscleGroups` y `bodySegment`, con
  su migración versionada y reversible (ADR-0005).
- **cierre:** los tres campos pasaron a obligatorios en `exerciseSchema`. Trampa encontrada: un
  archivo `*.test.ts` dentro de `src/migrations/` es una migración más para migrate-mongo y rompe el
  runner; los tests de migraciones viven al lado del runner. Cerrada junto con F2-03.

## [x] F2-03 · El formulario pregunta capacidades y grupos musculares

- **module:** web
- **description:** En "Nuevo ejercicio" (mockup 9), cuando el nombre no es del catálogo, aparecen
  los dos selectores múltiples. El segmento del cuerpo no se pregunta: sale de los grupos elegidos.
  Si hace falta, sale de acá un `CheckboxGroup` en `@wasabi-cross/ui`.
- **acceptance-criteria:**
  - Dado un nombre que no está en el catálogo, cuando se completa el formulario, entonces pide
    capacidades y grupos musculares, y sin ellos no deja guardar.
  - Dado un nombre del catálogo, cuando se elige, entonces esos campos no aparecen: ya están
    definidos.
  - Dados los selectores, cuando se manejan con teclado, entonces se elige y se quita sin mouse, y
    lo elegido queda anunciado.
- **example:** —
- **story-points:** 5
- **depends_on:** F2-02
- **risk:** low
- **test_plan:** tests de pantalla con la API simulada en los dos caminos (catálogo y propio),
  teclado, y axe sin violaciones; story del componente nuevo si aparece.
- **error-codes:** ninguno
- **data-model-impact:** ninguno
- **cierre:** salió el `CheckboxGroup` de `@wasabi-cross/ui`, con su story. Va junto con F2-02 en la
  misma PR: separadas, `main` quedaba sin poder crear un ejercicio propio desde la pantalla.

## [x] F2-04 · Estadísticas de un ejercicio

- **module:** api
- **description:** `GET /api/v1/stats/exercises/:id`: la serie de marcas del período y su resumen.
  Nace el módulo `stats`, que lee el historial por un puerto inyectado y no conoce el modelo de
  `records`.
- **acceptance-criteria:**
  - Dado un ejercicio con marcas, cuando se piden sus estadísticas, entonces la serie viene ordenada
    de la más vieja a la más reciente y el resumen coincide con esas marcas.
  - Dado un ejercicio sin marcas en el período, cuando se piden, entonces la serie es vacía y el
    resumen viene en `null`, no en cero.
  - Dado un ejercicio de otro usuario, cuando se piden sus estadísticas, entonces responde 404.
- **example:** Back squat, período `6m`: cuatro marcas de 100 a 120 kg, mejor 120, variación +20%.
- **story-points:** 5
- **depends_on:** F2-01
- **risk:** medium
- **test_plan:** integración con marcas desordenadas; un período que deja marcas afuera; IDOR con
  dos usuarios; ejercicio de tiempo, donde la mejor es la mínima.
- **error-codes:** `WC-STATS-404-001` (el ejercicio no existe o no es del usuario).
- **data-model-impact:** ninguno nuevo; si la consulta lo justifica, un índice por
  `(managedExerciseId, performedAt)` — por migración, como todo (ADR-0005).
- **cierre:** nace el módulo `stats`, que lee la serie por un puerto y pide el nombre y la medición
  a `exercises`. El índice existente (`managed_history`) ya cubre la consulta, así que no hizo falta
  uno nuevo. Cuatro pruebas inversas.

## [x] F2-05 · Estadísticas generales

- **module:** api
- **description:** `GET /api/v1/stats/summary`: la evolución agregada por capacidad y por grupo
  muscular en el período, que es lo que responde "¿el tren inferior progresa más rápido que el
  superior?" (spec §5). Con F2-02, los ejercicios propios cuentan igual que los del catálogo.
- **acceptance-criteria:**
  - Dado un usuario con ejercicios de varias capacidades, cuando pide el resumen, entonces cada
    capacidad trae su variación en el período y cuántos ejercicios la sostienen.
  - Dada una capacidad sin marcas suficientes, cuando se arma el resumen, entonces no aparece
    inventada en cero: se informa que no alcanza.
  - Dado el resumen, cuando se calcula, entonces nunca mezcla unidades: kg con kg, reps con reps y
    tiempo con tiempo.
  - Dado un ejercicio propio, cuando entra en el resumen, entonces pesa igual que uno del catálogo.
- **example:** —
- **story-points:** 8
- **depends_on:** F2-01, F2-02, F2-04
- **risk:** high
- **test_plan:** unit del cálculo con capacidades mezcladas y unidades distintas; integración con un
  usuario armado a mano, con propios y de catálogo; aislamiento entre usuarios.
- **error-codes:** ninguno nuevo
- **data-model-impact:** ninguno
- **cierre:** se promedian variaciones y no valores, que es lo que permite comparar un RM en kilos
  con una carrera en segundos. Regla nueva: una variación necesita dos marcas en el período, porque
  con una `summarize` devuelve 0% y eso arrastraría el promedio del grupo hacia cero sin haber
  medido nada. Cinco pruebas inversas.

## [x] F2-06 · Componente Cross de gráfico

- **module:** ui
- **description:** El gráfico de línea del mockup 10 con TanStack Charts, como Componente Cross: sin
  lógica de negocio, sólo puntos y ejes. Accesible de verdad — un gráfico que un lector de pantalla
  no puede leer no cumple WCAG 2.2 AA.
- **acceptance-criteria:**
  - Dado un gráfico, cuando lo recorre un lector de pantalla, entonces encuentra los mismos datos en
    una tabla equivalente, y no un dibujo mudo.
  - Dado el tema claro y el oscuro, cuando se dibuja, entonces usa los tokens y pasa contraste AA en
    los dos.
  - Dada una serie vacía o de un solo punto, cuando se dibuja, entonces no rompe ni miente con una
    línea inventada.
- **example:** —
- **story-points:** 5
- **depends_on:** —
- **risk:** medium
- **test_plan:** tests de componente con serie normal, vacía y de un punto; axe sin violaciones;
  story en Storybook.
- **error-codes:** ninguno
- **data-model-impact:** ninguno
- **cierre:** TanStack Charts 0.18 (con `d3-scale`, que ya trae como dependencia). El dibujo queda
  `aria-hidden` y los datos van en una tabla visualmente oculta: describir una curva con texto
  alternativo sería peor que dar los números. Tres pruebas inversas; mirado en Storybook.

## [x] F2-07 · Pantalla de Estadísticas

- **module:** web
- **description:** `/estadisticas` (mockup 10): el acordeón de ejercicios, con el gráfico y los
  números del que está abierto. Cuál está abierto vive en la URL, como el porcentaje del detalle.
- **acceptance-criteria:**
  - Dada la pantalla, cuando se abre un ejercicio, entonces recién ahí se piden sus estadísticas, y
    la URL guarda cuál quedó abierto.
  - Dado un ejercicio sin marcas todavía, cuando se abre, entonces lo dice en lugar de mostrar un
    gráfico vacío.
  - Dado el acordeón, cuando se maneja con teclado, entonces se abre y se cierra con Enter y con
    Espacio, y su estado se anuncia con `aria-expanded`.
- **example:** —
- **story-points:** 5
- **depends_on:** F2-04, F2-06
- **risk:** medium
- **test_plan:** tests de pantalla con la API simulada: carga diferida, estado vacío, error y
  teclado; axe sin violaciones.
- **error-codes:** consume `WC-STATS-404-001`
- **data-model-impact:** ninguno
- **cierre:** va junto con F2-09: sin los accesos, la pantalla no se alcanza desde ningún lado.
  Encontrado al mirarla de verdad: el gráfico se dibujaba más alto que su caja y se comía los
  números; ahora la altura va explícita. Cuatro pruebas inversas.

## [x] F2-08 · Sección de estadísticas generales

- **module:** web
- **description:** La segunda mitad de la pantalla: la comparación por capacidad y por grupo
  muscular, con el período elegido.
- **acceptance-criteria:**
  - Dada la sección, cuando hay datos, entonces se lee qué capacidad progresó más y cuál menos sin
    tener que interpretar un gráfico.
  - Dado un cambio de período, cuando se elige, entonces queda en la URL y se vuelven a pedir los
    dos bloques de la pantalla.
- **example:** —
- **story-points:** 3
- **depends_on:** F2-05, F2-07
- **risk:** low
- **test_plan:** tests de pantalla con la API simulada, incluido el caso sin datos suficientes; axe.
- **error-codes:** ninguno
- **data-model-impact:** ninguno
- **cierre:** el período vive en la URL sólo cuando el usuario lo elige (sin ruido por defecto), y
  uno inventado se ignora. Las etiquetas de capacidades y grupos pasaron a `lib/labels.ts`, que
  comparten el alta y esta pantalla. Mirándola apareció que `--wc-danger-text` daba 4.0:1 sobre una
  fila: aclarado a 5:1. Cuatro pruebas inversas.

## [x] F2-09 · Los accesos a Estadísticas

- **module:** web
- **description:** "Estadísticas" en el menú del header (quedó afuera en F1-09) y el acceso desde el
  detalle de un ejercicio, que la spec §5 pide como acción de esa pantalla.
- **acceptance-criteria:**
  - Dado el menú, cuando se abre, entonces "Estadísticas" lleva a `/estadisticas`.
  - Dado el detalle de un ejercicio, cuando se toca "Estadísticas", entonces abre la pantalla con
    ese ejercicio ya desplegado.
- **example:** —
- **story-points:** 2
- **depends_on:** F2-07
- **risk:** low
- **test_plan:** tests de navegación sobre el shell y sobre el detalle; axe.
- **error-codes:** ninguno
- **data-model-impact:** ninguno
- **cierre:** cerrada junto con F2-07.

## [x] F2-10 · E2E de Estadísticas

- **module:** infra
- **description:** El recorrido nuevo sumado al E2E de F1-18: crear un ejercicio propio con sus
  capacidades, cargarle marcas y verlas en la pantalla de Estadísticas, con su auditoría axe. Cierra
  la fase.
- **acceptance-criteria:**
  - Dado un atleta con tres marcas de un ejercicio, cuando abre Estadísticas, entonces ve su
    evolución y los números que corresponden a esas marcas.
  - Dado un ejercicio propio con sus capacidades, cuando se mira el resumen general, entonces
    aparece ahí.
  - Dada la pantalla nueva, cuando corre axe en los dos temas, entonces no hay violaciones WCAG 2.2
    AA.
- **example:** —
- **story-points:** 3
- **depends_on:** F2-07, F2-08, F2-09
- **risk:** low
- **test_plan:** el propio E2E, en el job que ya existe.
- **error-codes:** ninguno
- **data-model-impact:** ninguno
- **cierre:** tres tests nuevos: la evolución y el resumen con un propio creado desde el
  formulario, el período que recorta, y los dos accesos. El axe encontró que el gráfico de TanStack
  era enfocable adentro de un `aria-hidden` (WCAG 4.1.2): ahora sale del orden de tabulación.
  Con nueve registros por corrida, el límite de 5 por minuto (spec §13) cortaba el E2E:
  `AUTH_RATE_LIMIT=off` lo apaga sólo ahí, y en producción el proceso no levanta con eso.

---

# Fase 3 — A producción

Todo lo que hace falta para que Wasabi Cross exista fuera de una máquina de desarrollo (spec §12):
Railway, Mongo Atlas con backups que se sabe restaurar, secrets fuera del repo, deploy desde CI y
alguien que avise cuando se cae. Al final de la fase, un atleta de verdad puede usarlo.

**Antes de arrancar — qué hace la IA y qué no (4D, _Delegation_).** Las tareas marcadas **🔑 necesita
al usuario** tocan cuentas, dominios, secrets o plata: crear el proyecto en Railway, el cluster de
Atlas, el monitor de uptime. Esas las ejecuta el usuario, o la IA con su confirmación explícita en
el momento; nunca solas. Lo que sí hace la IA sin esperar: el código, la configuración versionada,
los runbooks y los workflows de CI que no deployan hasta que existan los secrets.

**Decisión pendiente, F3-03 la necesita:** cómo comparten sitio el front y la API. La cookie de
sesión es `SameSite=Lax`, así que tienen que ser el mismo sitio. Dos caminos, con la recomendación
en la tarea.

**Orden sugerido.** F3-01 y F3-02 son arreglos chicos que no esperan a nada. F3-03 decide la
topología; con eso salen F3-04 y F3-05 (las imágenes) y F3-06 (los headers). Después las de
cuentas —F3-07 y F3-08—, el deploy desde CI (F3-09), el monitoreo (F3-10), los runbooks (F3-11) y
el smoke contra staging (F3-12), que cierra la fase.

**Fuera de la Fase 3**, para que no se cuele:

- Backblaze B2 y media de ejercicios (spec §12): todavía no hay nada que subir. Entra con la primera
  funcionalidad que lo necesite.
- La suscripción Max y el cobro: bloqueado por el proveedor de pago.
- Recupero de contraseña: bloqueado por el proveedor de email.
- Migrar a VPS o Coolify: el disparador es costo o límite de recursos (spec §12), y todavía no hay
  ninguno de los dos.
- Probar en `prod`. Nunca (CLAUDE.md): el smoke corre contra staging.

## [x] F3-01 · La API lee su `.env` en desarrollo

- **module:** infra
- **description:** Hoy nadie carga `apps/api/.env`: el paso documentado (`cp .env.example .env` y
  `pnpm dev`) falla hasta exportar las variables a mano. Node 24 trae `--env-file-if-exists`: los
  scripts de desarrollo lo usan, y en Railway las variables siguen viniendo de la plataforma.
- **acceptance-criteria:**
  - Dado un `.env` en `apps/api`, cuando se corre `pnpm dev`, `migrate` o `seed`, entonces las
    variables se leen de ahí sin exportarlas.
  - Dado que no hay `.env`, cuando se corren, entonces fallan con el mensaje de `parseEnv` que dice
    qué falta, igual que hoy.
  - Dado el build de producción, cuando arranca, entonces no lee ningún `.env`: en producción las
    variables las pone la plataforma.
- **example:** —
- **story-points:** 1
- **depends_on:** —
- **risk:** low
- **test_plan:** probado a mano con y sin `.env`; CLAUDE.md y STATE.md vuelven a decir la verdad.
- **error-codes:** ninguno
- **data-model-impact:** ninguno
- **cierre:** `dev`, `migrate` y `seed` usan `--env-file-if-exists=.env` (Node 24, `tsx` lo pasa
  de largo). `start` y `migrate:dist`, no: en producción las variables las pone la plataforma.
  `dev:ephemeral` tampoco, porque arma su propio entorno y un `.env` de desarrollo lo pisaría.
  Probado de punta a punta: `.env` real, `migrate up`, `seed`, `pnpm dev` y `/ready` en verde.

## [x] F3-02 · Un error del cliente responde 4xx, no 500

- **module:** api
- **description:** El manejador de errores convierte en 500 los errores de Fastify que ya traen un
  código 4xx: un cuerpo que no coincide con su `Content-Length`, uno demasiado grande. Es culpa del
  cliente, no del servidor, y un 500 dispara alertas que no corresponden.
- **acceptance-criteria:**
  - Dado un error de Fastify con `statusCode` 4xx, cuando llega al manejador, entonces responde ese
    código con `WC-SYS-400-002` y se loguea como aviso, no como error.
  - Dado un error sin `statusCode` o con uno 5xx, cuando llega, entonces sigue siendo
    `WC-SYS-500-001`.
- **example:** Un `POST` con `Content-Length` mentiroso hoy responde 500; después, 400.
- **story-points:** 2
- **depends_on:** —
- **risk:** low
- **test_plan:** test del manejador con un error 400 y uno 413 de Fastify, y con uno sin código.
- **error-codes:** ninguno nuevo (usa `WC-SYS-400-002`)
- **data-model-impact:** ninguno
- **cierre:** el manejador respeta el 4xx que ya trae el error (JSON roto → 400, cuerpo grande →
  413, tipo de contenido desconocido → 415), con `WC-SYS-400-002` y log de aviso. Un 5xx propio
  sigue siendo `WC-SYS-500-001` y no filtra su mensaje: lo probó una prueba inversa que sin ese
  test sobrevivía.

## [~] F3-03 · El front y la API en el mismo sitio

- **module:** infra
- **description:** Decidir y dejar en un ADR cómo se sirven el front y la API. La cookie de sesión
  es `SameSite=Lax`: si viven en sitios distintos, el navegador no la manda. Dos caminos:
  - **Recomendado — la API sirve el front.** Un solo servicio en Railway, un solo dominio, el mismo
    origen: sin CORS en producción, sin dudas con la cookie, un deploy en vez de dos.
  - Dos servicios en subdominios del mismo dominio (`app.` y `api.`). Mismo sitio, pero dos deploys
    y CORS entre ellos.
- **acceptance-criteria:**
  - Dado el ADR, cuando se lee, entonces dice qué se eligió, por qué y qué costó la alternativa.
  - Dada la decisión, cuando se aplica, entonces una sesión iniciada en el front viaja a la API en
    el ambiente de staging.
- **example:** —
- **story-points:** 3
- **depends_on:** —
- **risk:** medium
- **test_plan:** la decisión se prueba en F3-12, con el smoke contra staging.
- **error-codes:** ninguno
- **data-model-impact:** ninguno
- **estado:** código y ADR-0007 (propuesta) listos: la API sirve el front con `WEB_DIST_DIR`, las
  navegaciones de la SPA caen en el `index.html` y lo de la API sigue en JSON. Probado a mano con el
  front compilado servido por la API: registro, sesión y navegación directa a una ruta, sin
  violaciones de CSP. El bootstrap del tema dejó de ser un script inline, que la CSP bloqueaba.
  Falta el segundo criterio —la sesión en staging—, que se cierra con F3-07 y F3-12.

## [x] F3-04 · El build de producción de la API

- **module:** infra
- **description:** Lo que Railway corre: la API compilada (`node dist/server.js`), con las
  migraciones como paso previo al arranque (`migrate:dist up`, ADR-0005) y `/ready` como chequeo de
  salud. Configuración versionada en el repo, no clickeada en un panel.
- **acceptance-criteria:**
  - Dado el build, cuando se construye en limpio, entonces arranca sin dependencias de desarrollo
    (ni `tsx`, ni `mongodb-memory-server`).
  - Dado un deploy con migraciones pendientes, cuando arranca, entonces las aplica antes de recibir
    tráfico, y si fallan, la versión nueva no recibe tráfico.
  - Dada la instancia, cuando le pega el chequeo de salud, entonces usa `/ready`, no `/health`.
- **example:** —
- **story-points:** 3
- **depends_on:** F3-03
- **risk:** medium
- **test_plan:** build y arranque de la imagen en local contra el Mongo efímero; `/ready` responde
  listo sólo después de migrar.
- **error-codes:** ninguno
- **data-model-impact:** ninguno
- **cierre:** `.railway/railway.ts` (Infrastructure as Code, no el `railway.json` deprecado): un
  servicio, build de los cuatro workspaces, `start` compilado, `preDeploy` con las migraciones y
  `healthcheck: /ready`. Quince tests que cuidan las invariantes (rama, comando, healthcheck,
  secretos con `preserve()`, base por ambiente) y siete pruebas inversas. Simulado a mano de punta a
  punta: build → migrar → arrancar contra un Mongo efímero, con `NODE_ENV=production`; `/ready` en
  503 sin migrar y en verde después. `railway config plan`/`apply` los corre el usuario (🔑, F3-07).

## [x] F3-05 · El build de producción del front

- **module:** infra
- **description:** El front como lo sirva F3-03: build estático con la URL de la API resuelta en el
  build, el service worker de la PWA en su lugar y caché larga para los assets con hash.
- **acceptance-criteria:**
  - Dado el build, cuando se sirve, entonces las rutas del front (`/ejercicios/...`) caen en el
    `index.html` y no en un 404.
  - Dados los assets con hash, cuando se piden, entonces van con caché larga; el `index.html` y el
    service worker, sin caché.
- **example:** —
- **story-points:** 2
- **depends_on:** F3-03
- **risk:** low
- **test_plan:** el E2E corriendo contra el build de producción en vez del servidor de desarrollo.
- **error-codes:** ninguno
- **data-model-impact:** ninguno
- **cierre:** `pnpm e2e:prod` corre toda la suite contra el front compilado y servido por la API, y
  es lo que corre CI. Suma cuatro tests que sólo existen ahí: la ruta de la SPA pedida de cero, la
  caché (assets con hash un año; `index.html` y service worker, revalidar), el service worker
  registrándose y la consola sin quejas de la CSP. El service worker, que el navegador embebido no
  registraba, en Chromium anda.

## [x] F3-06 · Headers de seguridad en producción

- **module:** infra
- **description:** Los de spec §13 —CSP, HSTS, X-Content-Type-Options, Referrer-Policy— también en
  lo que sirve el front, no sólo en la API. La CSP tiene que dejar andar a la PWA y a nada más.
- **acceptance-criteria:**
  - Dada cualquier respuesta de producción, cuando se inspecciona, entonces trae los cuatro headers.
  - Dada la CSP, cuando corre la app entera, entonces no bloquea nada propio y no permite
    `unsafe-inline` en scripts.
- **example:** —
- **story-points:** 3
- **depends_on:** F3-03, F3-05
- **risk:** medium
- **test_plan:** test de los headers en la API; el E2E con la CSP de producción puesta.
- **error-codes:** ninguno
- **data-model-impact:** ninguno
- **cierre:** los cuatro headers ya los pone helmet (registrado antes de las rutas, aplica a todo
  vía `onSend`); lo que faltaba era probarlo, en una respuesta de la API y en una del front que
  sirve la API (F3-03). El E2E de producción (F3-05) ya confirmaba que el navegador no se quejaba;
  esta tarea suma el test explícito de los cuatro headers y de que `script-src` no admite
  `unsafe-inline`. `style-src` sí lo permite —default de helmet, cubre un `style={{}}` inline de
  React—: el criterio pedía sin `unsafe-inline` en scripts, no en estilos. Cuatro pruebas inversas.

## [ ] F3-07 · Ambientes staging y prod en Railway — 🔑 necesita al usuario

- **module:** infra
- **description:** Los dos ambientes de spec §12, con sus variables y secrets en el gestor de
  Railway, nunca en el repo. La IA prepara la configuración y el runbook; crear el proyecto, elegir
  el plan y cargar los secrets lo hace el usuario.
- **acceptance-criteria:**
  - Dados los dos ambientes, cuando se listan sus variables, entonces ninguna está en el repo y
    cada una está documentada en el runbook con su propósito.
  - Dado staging, cuando se carga, entonces tiene datos sintéticos: nunca una copia de prod.
- **example:** —
- **story-points:** 5
- **depends_on:** F3-04, F3-05
- **risk:** high
- **test_plan:** `/ready` en verde en los dos ambientes; revisión humana del runbook.
- **error-codes:** ninguno
- **data-model-impact:** ninguno

## [ ] F3-08 · Mongo Atlas con backups que se sabe restaurar — 🔑 necesita al usuario

- **module:** infra
- **description:** Replica set, backups con PITR y alertas de conexión y de almacenamiento (spec
  §12). RPO ≤ 24 h y RTO ≤ 4 h, con una restauración probada de verdad y cronometrada.
- **acceptance-criteria:**
  - Dado el cluster de prod, cuando se revisa, entonces tiene PITR y las dos alertas prendidas.
  - Dada una restauración de prueba en otro cluster, cuando se hace, entonces termina en menos de
    4 h y los datos pasan `/ready` con las migraciones al día.
- **example:** —
- **story-points:** 5
- **depends_on:** F3-07
- **risk:** high
- **test_plan:** el simulacro de restauración, con su tiempo anotado en la bitácora.
- **error-codes:** ninguno
- **data-model-impact:** ninguno

## [ ] F3-09 · Deploy desde CI

- **module:** infra
- **description:** Cada merge a `main` deploya a staging; prod sale a mano, desde un tag o un
  `workflow_dispatch`, y sólo si staging está sano. Las migraciones corren antes de mover el
  tráfico. Sin los secrets cargados, el workflow no hace nada y lo dice.
- **acceptance-criteria:**
  - Dado un merge a `main`, cuando termina CI, entonces staging queda con esa versión.
  - Dado un deploy a prod, cuando se pide, entonces exige una aprobación y que staging esté en
    verde.
  - Dada una migración que falla, cuando corre en el deploy, entonces la versión anterior sigue
    atendiendo.
- **example:** —
- **story-points:** 5
- **depends_on:** F3-04, F3-07
- **risk:** high
- **test_plan:** un deploy de punta a punta a staging; un deploy con una migración rota a
  propósito, que no llega a recibir tráfico.
- **error-codes:** ninguno
- **data-model-impact:** ninguno

## [ ] F3-10 · Monitoreo de uptime con alerta — 🔑 necesita al usuario

- **module:** infra
- **description:** Un monitor externo contra `/health` y `/ready` de prod, con alerta a Telegram o
  WhatsApp (spec §12). La cuenta del monitor y el canal de aviso son del usuario.
- **acceptance-criteria:**
  - Dada una caída de prod, cuando pasan dos chequeos seguidos fallando, entonces llega la alerta.
  - Dado `/ready` en rojo con `/health` en verde, cuando pasa, entonces la alerta dice cuál de los
    dos: no es lo mismo un Mongo caído que un proceso caído.
- **example:** —
- **story-points:** 3
- **depends_on:** F3-07
- **risk:** medium
- **test_plan:** un simulacro: apagar staging y ver llegar la alerta.
- **error-codes:** ninguno
- **data-model-impact:** ninguno

## [ ] F3-11 · Runbooks: secrets, restauración y deploy

- **module:** infra
- **description:** Lo que spec §12 pide documentado: cómo rotar cada secret, cómo restaurar un
  backup, y cómo se deploya y se vuelve atrás. Escrito para alguien que no estuvo en esta sesión.
- **acceptance-criteria:**
  - Dado cada secret de producción, cuando se busca en el runbook, entonces dice dónde vive, quién
    lo puede rotar y qué se rompe mientras tanto.
  - Dado un deploy malo, cuando se sigue el runbook, entonces se vuelve a la versión anterior sin
    improvisar.
- **example:** —
- **story-points:** 2
- **depends_on:** F3-08, F3-09
- **risk:** low
- **test_plan:** revisión humana; la rotación de `BETTER_AUTH_SECRET` probada en staging.
- **error-codes:** ninguno
- **data-model-impact:** ninguno

## [ ] F3-12 · Smoke contra staging

- **module:** infra
- **description:** El E2E corriendo contra staging después de cada deploy: la primera vez que la app
  se prueba en un ambiente que no es el de desarrollo. Cierra la fase. Contra prod, nunca.
- **acceptance-criteria:**
  - Dado un deploy a staging, cuando termina, entonces corre el flujo principal y el de
    Estadísticas contra esa URL, con sus datos sintéticos.
  - Dado un smoke en rojo, cuando pasa, entonces bloquea el deploy a prod.
- **example:** —
- **story-points:** 3
- **depends_on:** F3-03, F3-09
- **risk:** medium
- **test_plan:** el propio smoke, en el workflow de deploy.
- **error-codes:** ninguno
- **data-model-impact:** ninguno
