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

| Fase                              | Tareas | Story points | Hechas |
| --------------------------------- | -----: | -----------: | -----: |
| Fase 0 — Fundaciones              |      8 |           27 |      7 |
| Fase 1 — El loop del atleta       |     19 |           71 |     19 |
| Fase 2 — Estadísticas             |     10 |           44 |     10 |
| Fase 3 — A producción             |     12 |           37 |      5 |
| Fase 4 — Rediseño Toxic Cyberpunk |     18 |           75 |      0 |
| Fase 5 — Catálogo ampliado        |     16 |           62 |      0 |
| Fase 7 — Estadísticas ampliadas   |      8 |           23 |      0 |
| Fase 8 — Plan Pro                 |      7 |           22 |      0 |
| Fase 9 — Ingreso con OAuth 2.0    |     11 |           42 |      0 |

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

---

# Fase 4 — Rediseño Toxic Cyberpunk

Llegó un mockup nuevo con un lenguaje visual completo ([ADR-0008](./adr/0008-tema-unico-toxic-cyberpunk.md),
spec §11): tema único, sin selector dark/light. Sólo la pantalla de detalle de ejercicio tiene mockup
real (`docs/design`); el resto se extrapola de los mismos tokens y componentes Cross, pantalla por
pantalla, para poder revisar cada una por separado. No depende de Railway/Atlas — puede avanzar en
paralelo a lo que quede bloqueado de la Fase 3.

**Replanificada el 2026-09-27**, con F4-01 y F4-02 ya mergeadas: comparada la app corriendo contra el
diseño, tenía la paleta nueva con la estructura vieja — ningún componente usaba la tipografía de
titulares ni el recorte de esquina, y el detalle seguía los mockups 5 y 6. Las diferencias y lo que
decidió el usuario están en spec §5.2. F4-03, F4-04 y F4-05 se partieron, y entró F4-12 (la spec,
primero): 18 tareas y 75 puntos en lugar de 11 y 52.

Camino más corto a un detalle igual al diseño: F4-12 → F4-03a → F4-03b, F4-03c y F4-04b → F4-05a →
F4-05b y F4-05c → F4-05d.

## [ ] F4-01 · Fundaciones del tema: tokens y tipografía

- **module:** ui
- **description:** `tokens.css` reescrito con la paleta única del mockup (fondo `#0F041C`,
  superficies `#230D38`/`#160824`, bordes `#411467`/`#32989A`, texto `#D7EFEF`/`#6CB5B4`, acentos
  lima `#A7DD4F`, magenta `#EE1B6C` y naranja `#FF871F`). Tipografía: `@fontsource/share-tech-mono`
  (cuerpo) y `@fontsource/staatliches` (titulares), reemplazando Space Grotesk. Los radios se
  retiran a favor del recorte de esquina en diagonal ("plate-cut", clip-path) como utilidad
  compartida.
- **acceptance-criteria:**
  - Dado cualquier texto sobre su fondo o superficie, cuando se mide el contraste, entonces da
    ≥4.5:1 (≥3:1 si es texto grande) y queda documentado igual que hoy en `tokens.css`.
  - Dado un botón o tarjeta, cuando se le aplica la utilidad `plate-cut`, entonces el recorte de
    esquina se ve como en el mockup.
  - Dado el bundle de fuentes, cuando se audita, entonces no carga nada desde un CDN de fuentes:
    sólo los paquetes de Fontsource (spec §6).
- **example:** —
- **story-points:** 8
- **depends_on:** —
- **risk:** medium
- **test_plan:** Storybook visual de los tokens; contraste de cada combinación documentado en
  comentarios como en la versión actual del archivo.
- **error-codes:** ninguno
- **data-model-impact:** ninguno

## [ ] F4-02 · Se retira la preferencia de tema

- **module:** users
- **description:** `User.preferences` deja de tener `theme` (schemas); el endpoint de preferencias
  deja de aceptarlo; migración versionada y reversible que saca el campo de los documentos
  existentes. `packages/ui/src/theme`, `use-theme` y `ThemeToggle` se retiran; el bootstrap de tema
  que ADR-0007 movió a un archivo aparte para la CSP se retira.
- **acceptance-criteria:**
  - Dado el schema de preferencias, cuando se valida un payload con `theme`, entonces lo rechaza
    por campo desconocido.
  - Dada la migración, cuando corre sobre usuarios con `preferences.theme`, entonces el campo
    desaparece y el resto de `preferences` queda intacto; el `down` lo repone en `dark`.
  - Dado el Perfil, cuando se abre, entonces no hay sección "Color".
- **example:** —
- **story-points:** 5
- **depends_on:** F4-01
- **risk:** medium
- **test_plan:** test de schema (rechaza `theme`), test de la migración up/down contra
  `mongodb-memory-server`, test de componente del Perfil sin la sección.
- **error-codes:** ninguno
- **data-model-impact:** quita `theme` de `User.preferences`.

## [ ] F4-12 · Spec: el detalle según el diseño

> Nueva, del 2026-09-27: sale del análisis de diferencias entre el diseño y la app después de
> F4-01 y F4-02. Va antes que las pantallas porque la spec manda: el diseño contradice §5.1 (la
> barra de carga) y no muestra cosas que la spec exige (menú, editar, estadísticas).

- **module:** spec
- **description:** Lo que el diseño de `docs/design` cambia o no cubre, decidido con el usuario y
  volcado en spec §5, §5.1, §5.2 (nueva) y §11: la banda de carga va como tag en la barra fija y
  sale la barra de progreso; editar con un lápiz al lado del nombre y "Ver estadísticas ›" debajo
  del progreso; "‹ EJERCICIOS / {CATEGORÍA}" como vuelta atrás (una PWA instalada en iOS no tiene
  botón atrás); el botón de menú se mantiene aunque el diseño no lo muestre; el nombre del catálogo
  en mayúsculas, sin abreviatura; dos colores que se apartan del diseño para pasar AA y un piso de
  tamaño de texto; una columna de 430px como máximo.
- **acceptance-criteria:**
  - Dada la spec, cuando se lee §5.2, entonces cada zona del diseño tiene su regla, y cada cosa
    que el diseño no muestra (menú, editar, estadísticas, volver, banda de carga, tiempo) tiene
    dónde va.
  - Dada §5.1, cuando se lee la banda de carga, entonces ya no pide barra de progreso.
- **example:** —
- **story-points:** 2
- **depends_on:** —
- **risk:** low
- **test_plan:** revisión humana de la PR.
- **error-codes:** ninguno
- **data-model-impact:** ninguno

## [ ] F4-03a · Componentes Cross: tipografía, botones y tarjetas

> F4-03 se partió en tres el 2026-09-27 (F4-03a/b/c): con la lista real de lo que falta, eran más
> de 8 puntos.

- **module:** ui
- **description:** Lo que F4-01 dejó definido y nadie usa: ningún componente consume
  `--wc-font-family-display` (Staatliches no se ve en ninguna pantalla), `.wc-plate-cut` no tiene
  ni un uso, y no hay mayúsculas ni tracking en ningún lado. Por eso la app tiene la paleta nueva
  con la estructura vieja. Esta tarea agrega las utilidades de texto (`.wc-display` para
  titulares, `.wc-kicker` para las etiquetas chicas en mayúsculas con tracking amplio), la escala
  de tamaños del diseño como tokens con el piso de spec §11, y los colores que faltan: `#9ACBC8`
  (fechas y labels secundarios), `#8CB2B2` (placeholder), el verde azulado de los bordes al 40%,
  `#DD1964` (fondo de la CTA) y `#F576A7` (magenta sobre el oliva del historial). `Button` en
  Staatliches, mayúsculas y `plate-cut`, con una variante `cta` (magenta, texto blanco);
  `IconButton` cuadrado y con borde; `Tag` en mayúsculas chicas; `Card` con las dos variantes del
  historial: la actual (oliva, borde lima de 2px) y la anterior (superficie, borde violeta a la
  izquierda).

  > Ajustada al implementarla (2026-09-27): el HTML del diseño le declara a la CTA una sombra dura
  > (`#7B123D`), pero su propio `clip-path` la tapa y en el PNG no se ve; no se agrega. El recorte
  > va en el propio elemento, con su fondo real: con el fondo en un `::before` axe deja el
  > contraste sin verificar. Como el recorte se come el outline, el foco de botones y tarjetas es
  > un anillo interior.

- **acceptance-criteria:**
  - Dado cualquier titular de la app, cuando se mide su `font-family` computada, entonces es
    Staatliches.
  - Dado cada color nuevo, cuando se mide contra el fondo donde se usa, entonces pasa AA y el valor
    queda documentado en `tokens.css`, como el resto.
  - Dado el botón `cta`, cuando se lo pone en Storybook al lado del HTML del diseño, entonces
    coincide en forma y color, con el magenta de spec §11.
  - Dado un botón o una tarjeta con foco de teclado, cuando se lo mira, entonces el indicador se ve
    entero pese al recorte, y axe mide el contraste de su texto (no lo deja incompleto).
- **example:** —
- **story-points:** 5
- **depends_on:** F4-01
- **risk:** low
- **test_plan:** tests de componente actualizados; Storybook contra el HTML de `docs/design`; axe
  de Storybook.
- **error-codes:** ninguno
- **data-model-impact:** ninguno

## [ ] F4-03b · Componentes Cross: formularios y estados

- **module:** ui
- **description:** `TextField` con el label como etiqueta chica en mayúsculas y una variante
  subrayada (borde inferior y sufijo en naranja, placeholder "—") para el porcentaje personalizado;
  `TextArea` y `Select` al mismo lenguaje; `Checkbox` y `RadioGroup` dibujados, porque hoy se ven
  los controles nativos grises del navegador; `CheckboxGroup` y `RadioGroup` también en forma de
  casilleros en grilla; `Skeleton` en violeta. Los labels de un mismo formulario, iguales entre
  sí: hoy "Nombre" sale en negrita y "Categoría" no.
- **acceptance-criteria:**
  - Dado cada componente, cuando se lo mira en Storybook, entonces usa sólo tokens de
    `tokens.css`, nada de color o tamaño hardcodeado.
  - Dado el foco por teclado, cuando se navega con Tab, entonces el outline es visible en todos
    (spec §11).
  - Dado un checkbox o un radio, cuando se lo mira, entonces no queda nada del control nativo gris,
    y sigue siendo un `input` real para el lector de pantalla.
- **example:** —
- **story-points:** 5
- **depends_on:** F4-03a
- **risk:** low
- **test_plan:** tests de componente existentes actualizados; Storybook visual; axe de Storybook.
- **error-codes:** ninguno
- **data-model-impact:** ninguno

## [ ] F4-03c · Componentes Cross nuevos del diseño

- **module:** ui
- **description:** Las piezas del diseño que no existen como componente: `SectionHeader` (título
  en Staatliches, meta chica a la derecha y una línea abajo: "ELEGÍ TU CARGA / PORCENTAJE DEL RM",
  "HISTORIAL DE RM / 03 REGISTROS"), `Measure` (el número grande con su unidad chica: "100 KG"),
  `PercentTiles` (casilleros de un solo elegido, con radios reales; el elegido en lima con texto
  oscuro) y `BottomBar` (barra fija abajo, del ancho de la columna, que respeta
  `safe-area-inset-bottom`). Son presentacionales: no saben qué es un RM ni qué banda es cuál.
- **acceptance-criteria:**
  - Dado `PercentTiles`, cuando se navega con las flechas, entonces cambia el elegido como en
    cualquier grupo de radios, y el lector de pantalla anuncia el porcentaje y la carga juntos.
  - Dada una página más larga que la pantalla con `BottomBar`, cuando se scrollea hasta el final,
    entonces el último contenido queda visible por encima de la barra.
- **example:** —
- **story-points:** 5
- **depends_on:** F4-03a
- **risk:** low
- **test_plan:** tests de componente nuevos; Storybook; axe de Storybook.
- **error-codes:** ninguno
- **data-model-impact:** ninguno

## [ ] F4-04a · Componentes Cross: header, logo y menú

> F4-04 se partió en dos el 2026-09-27: el gráfico solo ya es una tarea de 5.

- **module:** ui
- **description:** `Logo` con el SVG del diseño (la "W" con una barra) en lugar del marcador de
  imagen, en sus dos tamaños. `AppHeader` sin fondo, con "WASABI // CROSS" en Staatliches (las
  barras en lima), el subtítulo "FUERZA · REGISTRO DE RM" y una línea verde azulada abajo; el
  botón de menú, cuadrado y con borde (spec §5.2). `Drawer`: el lateral en `#10051D` con borde
  violeta y las opciones en Staatliches, la activa en lima; la hoja de abajo sin esquinas
  redondeadas y con borde superior lima.
- **acceptance-criteria:**
  - Dado el header, cuando se lo compara con el diseño, entonces coincide, salvo el botón de menú
    que el diseño no tiene.
  - Dado el menú abierto, cuando se lo recorre con el teclado, entonces el foco queda adentro y
    Escape lo cierra, como hoy.
- **example:** —
- **story-points:** 3
- **depends_on:** F4-02, F4-03a
- **risk:** low
- **test_plan:** tests de componente existentes; axe de Storybook.
- **error-codes:** ninguno
- **data-model-impact:** ninguno

## [ ] F4-04b · Componente Cross: el gráfico de progreso

- **module:** ui
- **description:** `Chart` como el "PROGRESO DEL RM" del diseño: caja con `plate-cut` y su
  encabezado ("RM REGISTRADO" / "UNIDAD: KG"), grilla horizontal punteada, eje vertical, el valor
  arriba de cada punto y la fecha abajo, los puntos huecos salvo el último, que va relleno, y
  alrededor de 90px de alto. Hoy es la curva sola, sin ejes ni etiquetas, de 192px. La tabla
  equivalente para lectores de pantalla se queda. Si TanStack Charts no llega a las etiquetas por
  punto, se consulta con el usuario antes de salirse del stack (spec §6).

  > Ajustada al implementarla (2026-09-27): TanStack Charts llega (marcas `text`, grilla y ticks
  > configurables), no hizo falta salirse. Con más de cinco marcas sólo la última lleva su valor
  > (la del primero quedaba encima de la curva); la tabla tiene todos. Las fechas del eje van a
  > opacidad 1: la librería las apaga al 68% por default. axe no mide contraste de texto adentro
  > de un SVG: lo garantizan los tokens, documentado en el componente.

- **acceptance-criteria:**
  - Dado un gráfico con uno, dos o muchos puntos, cuando se dibuja, entonces las etiquetas no se
    pisan ni se salen de la caja.
  - Dada la tabla accesible, cuando la lee un lector de pantalla, entonces tiene los mismos
    valores y fechas que el dibujo.
- **example:** —
- **story-points:** 5
- **depends_on:** F4-03a
- **risk:** medium
- **test_plan:** tests de componente existentes actualizados; Storybook con 1, 2 y 12 puntos; axe
  de Storybook.
- **error-codes:** ninguno
- **data-model-impact:** ninguno

## [ ] F4-05a · Pantalla: Detalle, cabecera y carga

> F4-05 se partió en cuatro el 2026-09-27 (F4-05a/b/c/d): el diseño no es un reskin del detalle
> actual, cambia su estructura — agrega el progreso y la barra fija, y saca el número grande y la
> barra de carga.

- **module:** web
- **description:** Spec §5.2, zonas 2 y 3. La cabecera: "‹ EJERCICIOS / {CATEGORÍA}", el nombre,
  "{NIVEL} // RM VIGENTE" con "CON DOLOR" si corresponde, el lápiz de editar y la fila del valor
  actual con su borde magenta. "ELEGÍ TU CARGA" con `PercentTiles` y el porcentaje personalizado
  subrayado. Salen el "65 kg" grande, la barra de progreso, las pastillas de categoría y nivel, y
  los links de texto "Estadísticas" y "Editar".
- **acceptance-criteria:**
  - Dado el detalle de un RM de 100 kg a 390px, cuando se lo compara con el diseño, entonces la
    cabecera y la grilla coinciden en estructura, tipografía y paleta, salvo lo que spec §5.2
    cambia a propósito.
  - Dado un porcentaje personalizado que no está en la grilla, cuando se tipea, entonces ningún
    casillero queda elegido, como en el diseño.
  - Dado un ejercicio de tiempo, cuando se abre, entonces no hay grilla (spec §5.1).
- **example:** —
- **story-points:** 5
- **depends_on:** F4-12, F4-03b, F4-03c
- **risk:** low
- **test_plan:** tests de componente actualizados (`exercise-detail.test.tsx`); axe de la
  pantalla.
- **error-codes:** ninguno
- **data-model-impact:** ninguno

## [ ] F4-05b · Pantalla: Detalle, la barra fija

- **module:** web
- **description:** Spec §5.2, zona 6. `BottomBar` con "{porcentaje}% DE {valor actual}", la carga
  calculada con `Measure`, el tag de su banda (spec §5.1) y el botón `cta` "Registrar nuevo RM"
  ("Registrar nueva marca" si no es RM), que abre el `NewMark` de siempre. En tiempo, la mejor
  marca en lugar de la carga. El `data-testid="carga"` y el botón de nueva marca que usa el E2E
  pasan a la barra: se actualizan los selectores de `flujo-principal.spec.ts`.
- **acceptance-criteria:**
  - Dado 65% de un RM de 100 kg, cuando se mira la barra, entonces dice "65% DE 100 KG", "65 KG" y
    "CARGA LIVIANA".
  - Dado el final del historial, cuando se scrollea hasta abajo, entonces la barra no lo tapa.
  - Dado un ejercicio de tiempo, cuando se abre, entonces la barra muestra la mejor marca y el
    botón.
- **example:** —
- **story-points:** 3
- **depends_on:** F4-05a
- **risk:** low
- **test_plan:** tests de componente; E2E del flujo principal con los selectores nuevos.
- **error-codes:** ninguno
- **data-model-impact:** ninguno

## [ ] F4-05c · Pantalla: Detalle, el progreso

- **module:** web
- **description:** Spec §5.2, zona 4. El detalle pide `GET /api/v1/stats/exercises/:id?period=todo`
  (ya existe, F2-04) y lo dibuja con el `Chart` de F4-04b. El aumento se calcula en una función de
  `@wasabi-cross/schemas`, junto a `summarize()`, no en el componente: nada de lógica de negocio
  en React. "Ver estadísticas ›" debajo del gráfico. Con una sola marca no hay aumento que mostrar.
- **acceptance-criteria:**
  - Dadas marcas de 60, 80 y 100 kg, cuando se abre el detalle, entonces el gráfico muestra las
    tres con su fecha y el aumento dice "+40 KG".
  - Dado un ejercicio de tiempo que bajó de 4:40 a 4:32, cuando se abre, entonces el aumento
    muestra una mejora de 8 segundos, hacia abajo.
  - Dado "Ver estadísticas ›", cuando se lo sigue, entonces Estadísticas abre con este ejercicio
    desplegado.
- **example:** —
- **story-points:** 3
- **depends_on:** F4-04b, F4-05a
- **risk:** low
- **test_plan:** test unitario de la función del aumento en schemas; test de componente; E2E.
- **error-codes:** ninguno
- **data-model-impact:** ninguno

## [ ] F4-05d · Pantalla: Detalle, historial y cargar marca

- **module:** web
- **description:** Spec §5.2, zona 5. `SectionHeader` "HISTORIAL DE RM" con la cantidad de
  registros, que sale de `summary.records` de la misma respuesta de F4-05c: la API no cambia. La
  marca actual con la variante resaltada de `Card` y "RM ACTUAL" en `#F576A7`; las anteriores con
  la variante sobria; los valores con `Measure`. "Ver más" con el botón nuevo. La hoja de nueva
  marca (`NewMark`) con los componentes de F4-03b.
- **acceptance-criteria:**
  - Dadas tres marcas, cuando se abre el detalle, entonces el título dice "03 REGISTROS" y la más
    reciente va resaltada con "RM ACTUAL".
  - Dada la hoja de nueva marca, cuando se abre, entonces usa los mismos campos y botones que el
    resto de la app.
- **example:** —
- **story-points:** 3
- **depends_on:** F4-05c
- **risk:** low
- **test_plan:** tests de componente actualizados (`exercise-history.test.tsx`,
  `new-mark.test.tsx`); axe.
- **error-codes:** ninguno
- **data-model-impact:** ninguno

## [ ] F4-06 · Pantalla: Login y Registro

- **module:** web
- **description:** `AuthScreen`, `LoginPage` y `RegisterPage` (mockups 2 y 3, sin lo que está
  fuera de la Fase 1: username y Google) con el lenguaje del diseño: el logo y "WASABI // CROSS"
  del header, el saludo como etiqueta chica, el título en Staatliches, los campos de F4-03b y el
  botón primario.
- **acceptance-criteria:**
  - Dadas las dos pantallas, cuando se comparan entre sí, entonces comparten los mismos
    componentes Cross y la misma paleta.
  - Dado un error de validación, cuando aparece, entonces mantiene el contraste AA sobre el fondo
    nuevo.
- **example:** —
- **story-points:** 3
- **depends_on:** F4-03b, F4-04a
- **risk:** low
- **test_plan:** tests de componente existentes actualizados; axe de las dos pantallas.
- **error-codes:** ninguno
- **data-model-impact:** ninguno

## [ ] F4-07 · Pantalla: Home y shell (splash, header, menú)

- **module:** web
- **description:** `AppShell` a la columna de 430px con márgenes de 20px (spec §11). `HomePage`: el
  saludo como etiqueta chica, "TUS EJERCICIOS" con `SectionHeader` y el cupo del plan como meta
  ("03 / 10", si el plan tiene tope), y cada fila como las del historial: nombre en Staatliches,
  fecha chica, valor con `Measure` y el chevron. Estado vacío y plan lleno con el estilo nuevo.
  `Splash`, `NotFoundPage` y el aviso de versión de la PWA con el logo nuevo. El manifest de la PWA
  (`vite.config.ts`) sigue con `theme_color` y `background_color` en `#24333d`, del tema viejo:
  pasan a `#0F041C`, como ya lo hizo `index.html` en F4-02.
- **acceptance-criteria:**
  - Dado el estado vacío de Home, cuando se muestra, entonces conserva su acción ("Todavía no
    tenés ejercicios → Agregar el primero", spec §11) con el estilo nuevo.
  - Dada la lista con datos, cuando carga, entonces el skeleton previo usa la paleta nueva, no la
    vieja.
  - Dada la PWA instalada, cuando arranca, entonces la barra del sistema y el fondo de arranque son
    `#0F041C`.
- **example:** —
- **story-points:** 5
- **depends_on:** F4-03c, F4-04a
- **risk:** low
- **test_plan:** tests de componente existentes actualizados; E2E del flujo principal contra el
  tema nuevo.
- **error-codes:** ninguno
- **data-model-impact:** ninguno

## [ ] F4-08 · Pantalla: Nuevo y editar ejercicio

- **module:** web
- **description:** `NewExercisePage` y `EditExercisePage` (mockup 9) con los componentes de F4-03b:
  la categoría en cuatro casilleros de 2×2 en lugar de radios nativos, capacidades y grupos
  musculares como casilleros, la fecha con el selector del tema oscuro, "Con dolor", y la zona de
  borrado confirmado de la edición. Sube de 3 a 5 puntos (2026-09-27): los casilleros no estaban
  en la cuenta.
- **acceptance-criteria:**
  - Dado el formulario, cuando se lo compara con Home y Detalle, entonces usa los mismos
    componentes y la misma paleta.
  - Dado el formulario recorrido con el teclado, cuando se eligen categoría, capacidades y grupos,
    entonces todo se puede elegir sin mouse, como hoy.
- **example:** —
- **story-points:** 5
- **depends_on:** F4-03b
- **risk:** low
- **test_plan:** tests de componente existentes actualizados; axe de las dos pantallas.
- **error-codes:** ninguno
- **data-model-impact:** ninguno

## [ ] F4-09 · Pantalla: Perfil

- **module:** web
- **description:** `ProfilePage`: F4-02 ya sacó la sección de tema. Queda "PORCENTAJES POR
  DEFECTO" con `SectionHeader`, cada porcentaje como una fila con su botón de quitar, y los
  botones nuevos.
- **acceptance-criteria:**
  - Dado el Perfil, cuando se abre, entonces no queda ningún rastro del selector de tema, y usa los
    mismos campos y botones que Nuevo ejercicio.
- **example:** —
- **story-points:** 2
- **depends_on:** F4-02, F4-03b
- **risk:** low
- **test_plan:** tests de componente existentes actualizados; axe de la pantalla.
- **error-codes:** ninguno
- **data-model-impact:** ninguno

## [ ] F4-10 · Pantalla: Estadísticas (general y por ejercicio)

- **module:** web
- **description:** `StatsPage` y `GeneralStats` (mockup 10): el período como casilleros (3M, 6M,
  12M, TODO) en lugar del desplegable, los encabezados del acordeón en Staatliches, el mismo
  `Chart` que el detalle (F4-04b), los números (actual, mejor, peor, variación) con `Measure`, y
  las filas por capacidad y grupo muscular con el estilo del historial.
- **acceptance-criteria:**
  - Dados los gráficos de esta pantalla, cuando se comparan con el del Detalle, entonces son el
    mismo componente y se ven igual.
  - Dado un período elegido, cuando se recarga la página, entonces sigue elegido: vive en la URL,
    como hoy.
- **example:** —
- **story-points:** 5
- **depends_on:** F4-03c, F4-04b
- **risk:** low
- **test_plan:** tests de componente existentes actualizados; E2E de Estadísticas contra el tema
  nuevo.
- **error-codes:** ninguno
- **data-model-impact:** ninguno

## [ ] F4-11 · E2E y axe de punta a punta con el tema único

- **module:** infra
- **description:** Cierra la fase. F4-02 ya sacó los pasos del E2E que cambiaban de tema. Queda el
  E2E del flujo principal y de Estadísticas contra la estructura nueva (la carga y el botón de
  nueva marca viven en la barra fija), axe en cada pantalla, y una captura de referencia del
  detalle a 390px con `toHaveScreenshot`, generada en CI (Linux) para no depender de cómo pinta
  las fuentes cada sistema: es lo que avisa si una tarea futura aleja el detalle del diseño.
- **acceptance-criteria:**
  - Dado el E2E completo, cuando corre, entonces no queda ninguna referencia a `data-theme` ni al
    `ThemeToggle`.
  - Dado cada pantalla, cuando pasa el axe, entonces no hay violaciones.
  - Dado un cambio que mueve algo del detalle, cuando corre CI, entonces la comparación de la
    captura falla y muestra la diferencia.
- **example:** —
- **story-points:** 3
- **depends_on:** F4-05a, F4-05b, F4-05c, F4-05d, F4-06, F4-07, F4-08, F4-09, F4-10
- **risk:** medium
- **test_plan:** `pnpm e2e` completo en CI.
- **error-codes:** ninguno
- **data-model-impact:** ninguno

---

# Fase 5 — Catálogo ampliado

El usuario trajo un catálogo nuevo de ejercicios (2026-09-28), con disciplinas, equipo, grupo
muscular primario y secundarios, y dos formas de medir que el modelo no tenía. Pidió además que el
alta separe en dos pestañas elegir un precargado de crear uno propio, y que un precargado se pueda
editar. Las decisiones están en [ADR-0009](./adr/0009-catalogo-ampliado.md) y en spec §5.1 y §5.3
(nueva): 62 ejercicios que reemplazan a los 33 de la Fase 0, dos categorías nuevas (cardio y
distancia con carga), hipertrofia con RM estimado (Epley), la capacidad potencia, espalda baja y
trapecio, el segmento derivado del grupo primario, y un precargado editado que pasa a ser propio.

No depende de Railway/Atlas. Camino más corto al alta con pestañas: F5-00 → F5-01 → F5-02a →
F5-02b → F5-03a → F5-03b → F5-11 → F5-10 → F5-12, con F5-05/F5-07, F5-08 y F5-09 en paralelo.
F5-04 (Epley) es independiente del resto.

## [ ] F5-00 · Spec: catálogo ampliado y alta con pestañas

- **module:** spec
- **description:** Las decisiones del usuario sobre el catálogo nuevo, volcadas en spec §3, §5,
  §5.1, §5.2 y §5.3 (nueva), en ADR-0009 y en este backlog: las seis categorías con su medición,
  Epley en hipertrofia, capacidades y grupos nuevos, grupo primario y secundarios, disciplinas y
  equipo, las reglas del catálogo y la lista de los 62, las dos pestañas del alta y el precargado
  editado que pasa a ser propio.
- **acceptance-criteria:**
  - Dada la spec, cuando se lee §5.1, entonces cada categoría dice qué se mide, cuál es su dato
    extra y si tiene porcentajes.
  - Dada §5.3, cuando se lee, entonces están los 62 ejercicios por disciplina y categoría, y la
    regla de qué pasa al editar un precargado.
- **example:** —
- **story-points:** 2
- **depends_on:** —
- **risk:** low
- **test_plan:** revisión humana de la PR.
- **error-codes:** ninguno
- **data-model-impact:** ninguno

## [ ] F5-01 · Schemas: la taxonomía ampliada

- **module:** schemas
- **description:** En `@wasabi-cross/schemas`: la capacidad `potencia`; los grupos `espalda_baja`
  (segmento core) y `trapecio` (tren superior); los enums de disciplina (musculación, crossfit,
  hyrox, funcional, running) y de equipo (los 20 de los datos); `primaryMuscleGroup` en el
  ejercicio, con la invariante de que está en `muscleGroups` y va primero; `catalogKey` en la
  definición del catálogo; `disciplines` y `equipment` (obligatorios en el catálogo, opcionales en
  el propio); `bodySegmentFor` pasa a recibir el grupo primario. Etiquetas en es-AR de todo lo
  nuevo en `apps/web/src/lib/labels.ts`. Estadísticas suma potencia a la evolución por capacidad.
  Como el ejercicio se valida al salir de Mongo, una migración completa el grupo primario (el
  primero de la lista) y las disciplinas (vacías) en los documentos existentes, y recalcula el
  segmento; el seed completa lo del catálogo. Hasta F5-08, el primario de un propio nuevo es el
  primero de sus grupos.
- **acceptance-criteria:**
  - Dado un ejercicio cuyo primario no está en `muscleGroups`, o está repetido, cuando se valida,
    entonces se rechaza.
  - Dado un ejercicio con primario cuádriceps y core de secundario, cuando se deriva el segmento,
    entonces es tren inferior.
  - Dada una entrada del catálogo sin disciplinas, sin equipo o sin `catalogKey`, cuando se valida,
    entonces se rechaza; un propio sin ellas pasa.
- **example:** `{ primaryMuscleGroup: 'cuadriceps', muscleGroups: ['cuadriceps', 'gluteo', 'core'] }` → `tren_inferior`
- **story-points:** 3
- **depends_on:** F5-00
- **risk:** low
- **test_plan:** tests de schema y de `bodySegmentFor` (cada grupo nuevo con su segmento); test de
  Estadísticas con un ejercicio de potencia.
- **error-codes:** ninguno
- **data-model-impact:** `Exercise` suma `primaryMuscleGroup`, `disciplines`, `equipment` y, en el
  catálogo, `catalogKey`. Migración `20260928120000-grupo-primario`: completa los existentes;
  el `down` vuelve a la regla vieja del segmento y saca los campos nuevos.

## [ ] F5-02a · Cardio en schemas y API

- **module:** records
- **description:** La categoría `cardio` con su medición (metros de valor principal, calorías de
  dato extra obligatorio): `measureKindFor`, el contrato de la marca, la validación del valor
  (entero positivo) y de las calorías (entero, 0 o más), mejor marca = máximo,
  `supportsPercentages` en falso, y las estadísticas por ejercicio. Los `switch` sobre la medición
  quedan exhaustivos para que el compilador marque lo que falte.
- **acceptance-criteria:**
  - Dado un ejercicio de cardio, cuando se registra una marca sin calorías, entonces la API la
    rechaza con `WC-RM-422-001`.
  - Dadas dos marcas de 2.000 m y 2.100 m, cuando se pide la mejor, entonces es la de 2.100 m y
    dispara `pr.achieved`.
  - Dado el detalle de un ejercicio de cardio, cuando se piden porcentajes, entonces no hay tabla.
- **example:** marca `{ value: 2000, caloriesKcal: 120 }` → "2.000 m"
- **story-points:** 5
- **depends_on:** F5-01
- **risk:** medium
- **test_plan:** tests de schema, de mejor marca y del endpoint de marcas contra
  `mongodb-memory-server`.
- **error-codes:** ninguno nuevo (`WC-RM-422-001`)
- **data-model-impact:** `Record` suma el dato extra de calorías.

## [ ] F5-02b · Distancia con carga en schemas y API

- **module:** records
- **description:** La categoría `distancia_carga`: la misma forma que cardio (metros de valor
  principal, mejor marca = máximo, sin porcentajes), con el peso en kg de dato extra en lugar de
  las calorías. Reusa lo de F5-02a; lo nuevo es el dato extra.
- **acceptance-criteria:**
  - Dado un ejercicio de distancia con carga, cuando se registra una marca sin peso, entonces la
    API la rechaza con `WC-RM-422-001`.
  - Dadas dos marcas, cuando se pide la mejor, entonces es la de más metros, sin importar el peso.
- **example:** marca `{ value: 50, weightKg: 152 }` → "50 m"
- **story-points:** 3
- **depends_on:** F5-02a
- **risk:** low
- **test_plan:** tests de schema y de mejor marca; endpoint de marcas.
- **error-codes:** ninguno nuevo
- **data-model-impact:** ninguno más allá de F5-02a (el peso ya existe como dato extra).

## [ ] F5-03a · Cardio en la web

- **module:** web
- **description:** Cardio de punta a punta en la app: los campos de la primera marca en el alta
  (metros y calorías), el modal de marca nueva, el detalle sin "Elegí tu carga" y con la mejor
  marca en la barra fija, la fila de Home y el historial ("2.000 m · 120 kcal"), y Estadísticas.
- **acceptance-criteria:**
  - Dado un ejercicio de cardio, cuando se abre el detalle, entonces no hay grilla de porcentajes
    y la barra fija muestra la mejor marca.
  - Dado el modal de marca nueva de cardio, cuando se deja vacío el campo de calorías, entonces
    avisa el error sin llamar a la API.
- **example:** —
- **story-points:** 5
- **depends_on:** F5-02a
- **risk:** medium
- **test_plan:** tests de componente del alta, del modal, del detalle y de Home; axe del detalle.
- **error-codes:** ninguno
- **data-model-impact:** ninguno

## [ ] F5-03b · Distancia con carga en la web

- **module:** web
- **description:** Lo mismo que F5-03a para distancia con carga, con el peso como dato extra
  ("50 m · 152 kg").
- **acceptance-criteria:**
  - Dado un ejercicio de distancia con carga, cuando se abre el detalle, entonces se comporta como
    cardio y el historial muestra el peso de cada marca.
- **example:** —
- **story-points:** 3
- **depends_on:** F5-02b, F5-03a
- **risk:** low
- **test_plan:** tests de componente del modal, del detalle y de Home.
- **error-codes:** ninguno
- **data-model-impact:** ninguno

## [ ] F5-04 · Hipertrofia con RM estimado (Epley)

- **module:** records
- **description:** `estimatedOneRm(weightKg, reps)` en `packages/schemas/src/calc` (con una
  repetición, el RM es el peso). La tabla de porcentajes de hipertrofia pasa a carga en kg sobre el
  RM estimado de la marca actual; la mejor marca y `pr.achieved` pasan a ser la de mayor RM
  estimado; el progreso del detalle y la evolución de Estadísticas grafican el RM estimado. En el
  detalle, "Elegí tu carga" y la barra fija hablan de "RM estimado" y muestran kg.
- **acceptance-criteria:**
  - Dada una marca de 10 × 80 kg, cuando se calcula el RM estimado, entonces se muestra 106,5 kg
    (80 × 1,333…, redondeado al 0,5 kg) y el 80% da 85,5 kg.
  - Dadas 10 × 80 kg y 6 × 90 kg, cuando se pide la mejor marca, entonces es 6 × 90 kg (RM
    estimado 108 kg).
  - Dada una marca de 1 × 100 kg, cuando se calcula el RM estimado, entonces es 100 kg.
- **example:** `estimatedOneRm(80, 10)` → `106.67` (se muestra 106,5 kg)
- **story-points:** 8
- **depends_on:** F5-00
- **risk:** medium
- **test_plan:** tests de `estimatedOneRm` y de la tabla; tests de mejor marca y de estadísticas;
  tests de componente del detalle de hipertrofia. La captura de referencia del detalle es la de
  fuerza, así que no se mueve.
- **error-codes:** ninguno
- **data-model-impact:** ninguno (el RM estimado se calcula, no se guarda).

## [ ] F5-05 · El catálogo nuevo: 62 ejercicios y seed por clave

- **module:** exercises
- **description:** `EXERCISE_CATALOG` se reemplaza por los 62 de spec §5.3, en la forma del
  dominio (categoría, capacidades, grupo primario y secundarios, disciplinas, equipo,
  `catalogKey`), con los ajustes que decidió el usuario sobre los datos originales: Sled Pull sin
  espalda repetida; Wall Ball, Crunch, Medicine Ball Slam y Kettlebell Swing en gimnástico; Sled
  Push, Sled Pull y Farmers Carry en funcional, y sus versiones de Hyrox en distancia con carga;
  sin los running de distancia variable, y con las carreras de 100 m, 400 m, 1 km, 5 km y 10 km. El
  seed compara por `catalogKey` en vez de por nombre, y un renombre actualiza en lugar de duplicar.
- **acceptance-criteria:**
  - Dado el catálogo, cuando corre el test, entonces cada entrada valida contra el schema del
    catálogo, no hay claves ni nombres repetidos, y son 62.
  - Dado un catálogo ya sembrado y una entrada renombrada, cuando corre el seed de nuevo, entonces
    actualiza esa entrada y no crea otra.
  - Dado el seed corrido dos veces seguidas, cuando se mira el reporte, entonces la segunda vez
    todo está sin cambios.
- **example:** —
- **story-points:** 5
- **depends_on:** F5-01, F5-02b
- **risk:** medium
- **test_plan:** test del catálogo contra el schema; tests del seed (crear, actualizar por clave,
  idempotencia) contra `mongodb-memory-server`.
- **error-codes:** ninguno
- **data-model-impact:** el catálogo en Mongo pasa a los 62; la clave de siembra es `catalogKey`.

## [ ] F5-06 · Migración: fuera el catálogo viejo

- **module:** exercises
- **description:** Migración versionada que borra los ejercicios del catálogo de la Fase 0 (los
  sin dueño y sin `catalogKey`) junto con los ejercicios gestionados y marcas que apuntan a ellos,
  y crea el índice único parcial sobre `catalogKey` para los ejercicios sin dueño. (El grupo
  primario de los propios existentes ya lo completó la migración de F5-01.) El `down` borra el índice
  y vuelve a insertar el catálogo viejo, pero no devuelve los gestionados ni las marcas: queda
  dicho en la migración y en ADR-0009. **No se corre en producción**: todavía no existe; después
  de producción, un cambio así se hace migrando.
- **acceptance-criteria:**
  - Dado un Mongo con el catálogo viejo, un gestionado sobre "Back squat" con marcas y un propio,
    cuando corre la migración, entonces el ejercicio viejo, su gestionado y sus marcas ya no
    están, y el propio sigue intacto.
  - Dado el `down`, cuando corre, entonces el catálogo viejo vuelve y el índice ya no existe.
- **example:** —
- **story-points:** 3
- **depends_on:** F5-05
- **risk:** high
- **test_plan:** test de la migración up/down contra `mongodb-memory-server`; `dev:ephemeral` y el
  E2E siembran con el catálogo nuevo.
- **error-codes:** ninguno
- **data-model-impact:** borra el catálogo viejo y lo que depende de él; índice único parcial sobre
  `catalogKey`.

## [ ] F5-07 · API del catálogo: campos nuevos y filtro por disciplina

- **module:** exercises
- **description:** `GET /exercises/catalog` devuelve disciplinas, equipo y grupo primario de cada
  ejercicio, y acepta `discipline` junto a `q`. Cada resultado dice si el usuario ya lo tiene en su
  lista, para que el front lo muestre sin poder elegirlo. OpenAPI generado desde Zod, como siempre.
- **acceptance-criteria:**
  - Dado `?discipline=hyrox`, cuando se pide el catálogo, entonces vienen los seis de Hyrox más
    Wall Ball, Remo y SkiErg, que son de crossfit y de hyrox.
  - Dado un usuario que ya tiene "Snatch", cuando pide el catálogo, entonces Snatch viene marcado
    como ya agregado.
  - Dada una disciplina inexistente, cuando se pide, entonces responde `WC-SYS-400-002`.
- **example:** `GET /exercises/catalog?q=press&discipline=musculacion`
- **story-points:** 3
- **depends_on:** F5-05
- **risk:** low
- **test_plan:** tests del endpoint contra `mongodb-memory-server`; el OpenAPI generado incluye el
  parámetro.
- **error-codes:** ninguno nuevo
- **data-model-impact:** ninguno

## [ ] F5-08 · Alta: un precargado editado pasa a ser propio

- **module:** exercises
- **description:** El contrato del alta (`addExerciseSchema`): desde el catálogo se manda el
  `exerciseId` y la definición tal como quedó en el formulario. El backend la compara con la del
  catálogo: si es igual, agrega el del catálogo; si cambió algo, crea un propio con esa definición,
  con el límite de propios del plan. Se retira `WC-EXO-409-004`: un propio puede llamarse como uno
  del catálogo. Un propio suma disciplinas y equipo opcionales, y grupo primario obligatorio.
- **acceptance-criteria:**
  - Dado un precargado mandado sin cambios, cuando se agrega, entonces queda en la lista como del
    catálogo y no cuenta como propio.
  - Dado un precargado con otro grupo primario, cuando se agrega, entonces se crea un propio con
    esa definición y cuenta como propio.
  - Dado un usuario Free con 3 propios que manda un precargado editado, cuando se agrega, entonces
    responde `WC-SUBS-403-001` y no crea nada.
- **example:** —
- **story-points:** 5
- **depends_on:** F5-01
- **risk:** high
- **test_plan:** tests del caso de uso y del endpoint contra `mongodb-memory-server`, incluido el
  de atomicidad. **Toca permisos y límites del plan: los tests requieren revisión humana.**
- **error-codes:** se retira `WC-EXO-409-004` del diccionario.
- **data-model-impact:** ninguno más allá de F5-01.

## [ ] F5-09 · Componente Cross: pestañas

- **module:** ui
- **description:** `Tabs` en `@wasabi-cross/ui` según el patrón de pestañas de WAI-ARIA:
  `tablist`, `tab` y `tabpanel` enlazados, flechas izquierda y derecha, Home y End, un solo tab en
  el orden de foco, activación con Enter/Espacio. Controlado desde afuera (valor y `onChange`), así
  la pantalla guarda la pestaña en la URL. Con los tokens del tema y el recorte de esquina.
- **acceptance-criteria:**
  - Dadas dos pestañas, cuando se navega con las flechas y se activa una, entonces cambia el panel
    y el lector de pantalla anuncia la pestaña seleccionada.
  - Dado el componente en Storybook, cuando pasa el axe, entonces no hay violaciones.
- **example:** —
- **story-points:** 3
- **depends_on:** —
- **risk:** low
- **test_plan:** tests de componente (teclado, ARIA); story; axe.
- **error-codes:** ninguno
- **data-model-impact:** ninguno

## [ ] F5-11 · Nuevo ejercicio: la pestaña "Crear"

- **module:** web
- **description:** `NewExercisePage` se arma sobre `Tabs`, con la pestaña en la URL
  (`?modo=catalogo|crear`, `validateSearch` de TanStack Router, como el resto de la app). "Crear"
  es el formulario actual con lo nuevo: seis casilleros de categoría, potencia, grupo primario (uno)
  y secundarios, disciplinas y equipo opcionales, y los campos de la primera marca de cardio y
  distancia con carga. El nombre ya no decide nada: si coincide con uno del catálogo, se avisa sin
  bloquear. Sale el `<datalist>` del catálogo.
- **acceptance-criteria:**
  - Dado `/ejercicios/nuevo?modo=crear`, cuando se abre, entonces está activa la pestaña "Crear" y
    el botón atrás del navegador vuelve a la otra pestaña si se venía de ahí.
  - Dado el formulario sin grupo primario, cuando se guarda, entonces lo pide sin llamar a la API.
  - Dado un nombre igual a uno del catálogo, cuando se escribe, entonces aparece el aviso y se
    puede guardar igual.
- **example:** —
- **story-points:** 3
- **depends_on:** F5-03b, F5-08, F5-09
- **risk:** medium
- **test_plan:** tests de `form.ts` y de componente; axe de la pantalla.
- **error-codes:** ninguno
- **data-model-impact:** ninguno

## [ ] F5-10 · Nuevo ejercicio: la pestaña "Catálogo"

- **module:** web
- **description:** La pestaña de entrada. Buscador por nombre y casilleros de disciplina que
  consultan `GET /exercises/catalog` (TanStack Query); cada resultado en una tarjeta con nombre,
  categoría, grupo primario y equipo, y los que el usuario ya tiene, deshabilitados con el motivo.
  Elegir uno llena el mismo formulario de "Crear" con su definición, editable; apenas se edita un
  campo de la definición, aparece el aviso de que se va a guardar como propio (y, si el plan no
  admite más propios, la opción de volver a los valores del catálogo).
- **acceptance-criteria:**
  - Dado el filtro "Hyrox", cuando se aplica, entonces sólo se ven los ejercicios de Hyrox.
  - Dado "Sentadilla trasera" elegido, cuando se abre el formulario, entonces trae fuerza de
    categoría y de capacidad, cuádriceps de primario, glúteo y core de secundarios, musculación y
    barra.
  - Dado un campo de la definición editado, cuando se mira el formulario, entonces avisa que se
    guarda como propio; volviendo al valor original, el aviso se va.
- **example:** —
- **story-points:** 5
- **depends_on:** F5-07, F5-11
- **risk:** medium
- **test_plan:** tests de componente (búsqueda, filtro, elegir, aviso de edición); axe de la
  pantalla con resultados.
- **error-codes:** ninguno
- **data-model-impact:** ninguno

## [ ] F5-12 · E2E y axe del alta con pestañas

- **module:** infra
- **description:** Cierra la fase. El E2E del flujo principal agrega un ejercicio desde la pestaña
  "Catálogo" y otro editado (que queda como propio); suma un ejercicio de cardio con su marca y uno
  de hipertrofia con la carga en kg. axe a 390px en las dos pestañas. Si algo mueve el detalle, la
  captura de referencia se regenera en CI, como en F4-11.
- **acceptance-criteria:**
  - Dado el E2E completo, cuando corre en CI, entonces pasa contra el catálogo nuevo sembrado.
  - Dadas las dos pestañas del alta, cuando pasa el axe, entonces no hay violaciones.
- **example:** —
- **story-points:** 3
- **depends_on:** F5-03b, F5-04, F5-06, F5-10
- **risk:** medium
- **test_plan:** `pnpm e2e` completo en CI.
- **error-codes:** ninguno
- **data-model-impact:** ninguno

## [ ] F5-13 · Hybrid y Pilates: disciplinas nuevas y 58 ejercicios más

- **module:** exercises
- **description:** El usuario sumó 58 ejercicios al catálogo (de 62 a 120) y dos disciplinas nuevas,
  Hybrid y Pilates, con el equipo que traen (colchoneta, reformer, aro y pelota de pilates, más
  anillas, paralelas, GHD y BikeErg). `disciplineSchema` y `equipmentSchema` se amplían, las
  etiquetas de la web suman los valores nuevos, y la spec (§5.1, §5.3) y
  [ADR-0010](./adr/0010-hybrid-y-pilates.md) los recogen. Sin los schemas el catálogo no
  valida: el seed falla al leer de Mongo y el catálogo responde 500.
- **acceptance-criteria:**
  - Dado el catálogo, cuando corre el test, entonces cada entrada valida contra el schema, no hay
    claves ni nombres repetidos, son 120 y cubren las siete disciplinas.
  - Dado el seed contra Mongo después de la migración del catálogo, cuando corre, entonces crea
    las entradas nuevas y actualiza las disciplinas de las que ya existían.
  - Dado el filtro por disciplina del catálogo, cuando se elige Pilates o Hybrid, entonces trae sus
    ejercicios.
- **example:** Una usuaria de pilates filtra el catálogo por Pilates y agrega "The Hundred" como
  gimnástico, con sus repeticiones.
- **story-points:** 3
- **depends_on:** F5-05, F5-07
- **risk:** low
- **test_plan:** test del catálogo contra el schema y del seed contra `mongodb-memory-server`;
  tests de schemas para las disciplinas y el equipo nuevos; `pnpm verify` y coverage.
- **error-codes:** ninguno
- **data-model-impact:** los enums de disciplina y de equipo se ensanchan; ningún documento
  existente deja de ser válido, así que no hay migración de datos.

---

# Fase 7 — Estadísticas ampliadas

El usuario pidió (2026-10-02) gráficos de torta o dona con la proporción de disciplinas que
practica según los ejercicios que tiene cargados, los grupos musculares más trabajados contando
primario y secundarios, y que se evalúe qué otras métricas valen la pena. De la evaluación eligió
las cuatro propuestas: categoría y segmento, constancia, récords del período y ejercicios para
retestear. Las reglas —qué cuenta y cómo— están en spec §5.4: una disciplina cuenta entera en cada
ejercicio que la tiene, el primario suma 1 y el secundario ½, a lo sumo seis porciones por dona.

No depende de Railway/Atlas. Dos endpoints nuevos en el módulo `stats`, sin tocar el contrato del
resumen existente: `GET /stats/breakdown` (sin período) y `GET /stats/activity` (con período).
Camino: F7-00 → F7-01 y F7-02 (API, en paralelo con F7-03 y F7-04, componentes) → F7-05 y F7-06
(pantalla) → F7-07.

## [ ] F7-00 · Spec: constancia, récords, para retestear y tu entrenamiento

- **module:** spec
- **description:** Las decisiones del usuario volcadas en spec §5 y §5.4 (nueva): qué mira cada
  sección, si depende del período, cómo se cuentan disciplinas (enteras en cada una, "Sin
  disciplina" aparte) y grupos (primario 1, secundario ½), qué es una mejor marca nueva, el umbral
  de 8 semanas para retestear, el tope de seis porciones y la paleta validada.
- **acceptance-criteria:**
  - Dada la spec, cuando se lee §5.4, entonces cada número nuevo de Estadísticas dice de dónde
    sale y si lo mueve el período.
- **example:** —
- **story-points:** 1
- **depends_on:** —
- **risk:** low
- **test_plan:** revisión humana de la PR.
- **error-codes:** ninguno
- **data-model-impact:** ninguno

## [ ] F7-01 · Schemas y API: tu entrenamiento

- **module:** stats
- **description:** `GET /api/v1/stats/breakdown`: cuántos ejercicios tiene el usuario y cómo se
  reparten por disciplina (con `null` para "sin disciplina"), categoría, segmento y grupo
  muscular (primario, secundario, puntaje y porcentaje). El contrato en `@wasabi-cross/schemas`;
  el cálculo, puro, en el dominio de `stats`; `exercises` le pasa categoría, disciplinas y grupo
  primario por el puerto que ya existe. Porcentajes enteros que suman 100 (resto mayor).
- **acceptance-criteria:**
  - Dados un Wall Ball (crossfit, hyrox) y una sentadilla (musculación, crossfit), cuando se pide
    la composición, entonces CrossFit cuenta 2 y es el 50%, y Hyrox y Musculación el 25% cada uno.
  - Dado un ejercicio propio sin disciplinas, entonces aparece en la porción `null`.
  - Dada una sentadilla (cuádriceps; glúteo y core), entonces cuádriceps suma 1 y glúteo y core ½.
  - Dado un usuario sin ejercicios, entonces responde todo vacío y `exercises: 0`.
  - Dado un pedido sin sesión, entonces 401.
- **example:** —
- **story-points:** 3
- **depends_on:** F7-00
- **risk:** low
- **test_plan:** unitarios del cálculo y del reparto del redondeo; integración contra
  `mongodb-memory-server` con ejercicios del catálogo y uno propio; schema del contrato.
- **error-codes:** ninguno nuevo (`WC-AUTH-401-004` sin sesión)
- **data-model-impact:** ninguno: lee lo que ya guarda `exercises`.

## [ ] F7-02 · Schemas y API: constancia, récords y para retestear

- **module:** stats
- **description:** `GET /api/v1/stats/activity?period=`: marcas del período, marcas por mes (con
  los meses vacíos), última marca y días desde ella, cantidad de mejores marcas nuevas del período,
  los tres que más mejoraron y los ejercicios sin marca hace más de 56 días. Lee toda la serie de
  los ejercicios del usuario de una vez (`seriesFor`), porque una mejor marca nueva se compara
  contra las anteriores al período.
- **acceptance-criteria:**
  - Dadas marcas en julio y septiembre, cuando se pide el período de 3 meses, entonces los meses
    del período aparecen todos, agosto en cero.
  - Dada una serie 100, 110, 105, 120 de un RM, entonces hay dos mejores marcas nuevas (110 y 120);
    la primera no cuenta.
  - Dada una carrera 300 s → 280 s, entonces 280 es mejor marca nueva (en tiempo, menos).
  - Dada una hipertrofia, entonces la comparación es por RM estimado.
  - Dado un ejercicio con su última marca hace 60 días, entonces está en "para retestear"; con 50,
    no.
  - Dados cuatro ejercicios que mejoraron y uno que empeoró, entonces vuelven los tres que más
    mejoraron, ordenados.
- **example:** —
- **story-points:** 5
- **depends_on:** F7-00
- **risk:** medium — fechas y meses: el reloj se inyecta para que los tests no dependan de hoy.
- **test_plan:** unitarios de cada cálculo con el reloj fijo; integración contra
  `mongodb-memory-server`; schema del contrato.
- **error-codes:** ninguno nuevo
- **data-model-impact:** ninguno

## [ ] F7-03 · Componente Cross: dona

- **module:** ui
- **description:** `Donut` en `@wasabi-cross/ui`, con `pie` y `radialArc` de TanStack Charts (sin
  salir del stack): porciones con un hueco entre ellas, el total en el centro y la leyenda al lado
  con nombre, cantidad y porcentaje. A lo sumo seis porciones: con más, las cinco más grandes y
  "Otras". Las porciones grises (`muted`) van al final. Tokens `--wc-chart-1` a `--wc-chart-6` y
  `--wc-chart-other`, validados. Sin lógica de negocio: recibe las porciones hechas.
- **acceptance-criteria:**
  - Dadas tres porciones, cuando se dibuja, entonces la leyenda lista las tres con su cantidad y su
    porcentaje, y el dibujo está fuera del árbol de accesibilidad.
  - Dadas ocho, entonces se ven cinco y "Otras", que dice cuáles junta.
  - Dado axe, entonces 0 violaciones.
- **example:** —
- **story-points:** 3
- **depends_on:** F7-00
- **risk:** low — `polar` es nuevo en la librería (0.18).
- **test_plan:** tests de componente; Storybook con 1, 3 y 8 porciones; axe.
- **error-codes:** ninguno
- **data-model-impact:** ninguno

## [ ] F7-04 · Componentes Cross: barras de grupos y columnas por mes

- **module:** ui
- **description:** `RankBars`: barras horizontales ordenadas, en HTML, cada una con dos tramos
  (lleno y claro) y su número escrito; y `ColumnChart`: columnas con TanStack Charts (`barY`), una
  por mes, con la tabla equivalente. Los dos sin lógica de negocio.
- **acceptance-criteria:**
  - Dadas filas con dos tramos, cuando se dibujan, entonces el largo es proporcional a la más
    grande y el texto dice el total.
  - Dadas columnas con ceros, entonces el cero se ve como cero (sin columna) y la tabla lo dice.
  - Dado axe, entonces 0 violaciones.
- **example:** —
- **story-points:** 3
- **depends_on:** F7-00
- **risk:** low
- **test_plan:** tests de componente; Storybook; axe.
- **error-codes:** ninguno
- **data-model-impact:** ninguno

## [ ] F7-05 · Pantalla: constancia, récords y para retestear

- **module:** web
- **description:** Las tres secciones de §5.4 que miran la actividad, debajo de "En general": los
  números del período, las columnas por mes, los tres que más mejoraron y la lista para retestear
  con link al detalle. Una consulta (`['stats', 'activity', período]`), que se invalida al cargar
  una marca como las demás de `stats`.
- **acceptance-criteria:**
  - Dado un usuario con marcas, cuando abre Estadísticas, entonces ve cuántas marcas cargó en el
    período, los días desde la última y las columnas por mes.
  - Dado un cambio de período, entonces cambian los números del período y no los días desde la
    última.
  - Dado un ejercicio sin marca hace 9 semanas, entonces aparece en "Para retestear" y el link
    lleva a su detalle.
- **example:** —
- **story-points:** 3
- **depends_on:** F7-02, F7-04
- **risk:** low
- **test_plan:** tests de la pantalla con la API en memoria.
- **error-codes:** ninguno
- **data-model-impact:** ninguno

## [ ] F7-06 · Pantalla: tu entrenamiento

- **module:** web
- **description:** La sección "Tu entrenamiento" de §5.4: tres donas (disciplinas, categorías y
  segmento) y las barras de grupos musculares, con las etiquetas de `lib/labels.ts`. Dice que no
  depende del período. Una consulta (`['stats', 'breakdown']`) que se invalida al agregar,
  editar o borrar un ejercicio.
- **acceptance-criteria:**
  - Dado un usuario con ejercicios, cuando abre Estadísticas, entonces ve las tres donas y las
    barras, con nombres en castellano.
  - Dado un ejercicio propio sin disciplinas, entonces la dona dice "Sin disciplina".
  - Dado un ejercicio agregado, cuando vuelve a Estadísticas, entonces la composición lo cuenta.
- **example:** —
- **story-points:** 3
- **depends_on:** F7-01, F7-03, F7-04
- **risk:** low
- **test_plan:** tests de la pantalla con la API en memoria.
- **error-codes:** ninguno
- **data-model-impact:** ninguno

## [ ] F7-07 · E2E y axe de las secciones nuevas

- **module:** web
- **description:** El E2E de Estadísticas recorre las secciones nuevas con datos reales y axe las
  audita a 390px.
- **acceptance-criteria:**
  - Dado el flujo principal, cuando llega a Estadísticas, entonces ve la dona de disciplinas y las
    barras de grupos con el ejercicio que cargó.
  - Dado axe a 390px, entonces 0 violaciones.
- **example:** —
- **story-points:** 2
- **depends_on:** F7-05, F7-06
- **risk:** low
- **test_plan:** `pnpm e2e` completo en CI.
- **error-codes:** ninguno
- **data-model-impact:** ninguno

---

# Fase 8 — Plan Pro

El usuario cambió la monetización (2026-10-03): dos planes, **Free y Pro**, y lo único que los
diferencia es **ver las estadísticas**. Los dos cargan todos los ejercicios y todas las marcas que
quieran, así que el límite de cantidad de la Fase 1 (F1-03) se va. Alcance decidido con él
([ADR-0011](./adr/0011-plan-pro-y-estadisticas.md)): "estadísticas" es todo lo que sale de `stats`
—la pantalla completa y el progreso del detalle—, el precio de Pro queda "a definir" y la pantalla
de suscripción es **sólo UI**: el pago y el cambio real de plan son una segunda etapa.

No depende de Railway/Atlas. Camino: F8-00 → F8-01 (el límite se va, en las tres capas a la vez:
quitar un campo del contrato rompe a todos los que lo leen) → F8-02 (`max` pasa a `pro`) → F8-03
(la API gatea) → F8-04 (la suscripción) → F8-05 (el bloqueo, que enlaza a ella) → F8-06.

## [ ] F8-00 · Spec: Free y Pro

- **module:** spec
- **description:** Las decisiones del usuario volcadas en spec §1, §4, §5 y §5.5 (nueva), y en
  [ADR-0011](./adr/0011-plan-pro-y-estadisticas.md): qué diferencia a los planes, qué es "ver las
  estadísticas", que el límite de cantidad desaparece, que bajar de plan no borra nada, qué muestra
  la suscripción mientras no hay pago y dónde se ve el plan (perfil, header, avisos).
- **acceptance-criteria:**
  - Dada la spec, cuando se lee §4, entonces dice qué ve cada plan, que el backend lo valida y que
    el precio está a definir.
  - Dada la spec, cuando se lee §5.5, entonces cada pantalla que cambia con el plan dice cómo.
- **example:** —
- **story-points:** 1
- **depends_on:** —
- **risk:** low
- **test_plan:** revisión humana de la PR.
- **error-codes:** ninguno
- **data-model-impact:** ninguno

## [ ] F8-01 · Fuera el límite de cantidad de ejercicios

- **module:** subscriptions
- **description:** Free y Pro cargan sin tope. Se borran `PLAN_LIMITS`, `limitsFor` y `PlanUsage`
  (y `usage` del listado), `decideExerciseAddition`, `withExerciseSlot`, el serializador por usuario,
  el contador de uso y el error `WC-SUBS-403-001`. El alta usa el `TransactionRunner` de siempre.
  En la web, Home deja de mostrar "03 / 10" y de deshabilitar "Nuevo ejercicio", y el alta deja de
  hablar de un límite de propios. Una migración borra la colección `entitlement_locks`. Es una sola
  tarea en las tres capas porque el contrato (`usage`) lo leen todas.
- **acceptance-criteria:**
  - Dado un usuario Free con 12 ejercicios, cuando agrega otro, entonces lo agrega; y con 4 propios,
    agrega un quinto, incluso un precargado editado.
  - Dadas dos altas simultáneas del mismo ejercicio, entonces una gana y la otra recibe
    `WC-EXO-409-003`, sin marcas huérfanas.
  - Dado Home con 40 ejercicios, cuando se abre, entonces "Nuevo ejercicio" está habilitado y el
    título dice cuántos hay.
  - Dado un precargado editado en el alta, cuando se ve el aviso, entonces dice que se guarda como
    propio y no menciona límites.
  - Dada la base con `entitlement_locks`, cuando corre la migración, entonces la colección no está;
    al revertir, vuelve vacía.
- **example:** Una atleta Free que lleva once ejercicios agrega el doceavo sin ver ningún aviso.
- **story-points:** 5
- **depends_on:** F8-00
- **risk:** medium
- **test_plan:** test de integración de la carrera de altas contra un replica set; tests de las
  pantallas con la API en memoria; test de la migración ida y vuelta; el E2E que probaba el cupo
  pasa a probar que ya no hay (`sin-tope-de-ejercicios.spec.ts`).
- **error-codes:** `WC-SUBS-403-001` (retirado)
- **data-model-impact:** se borra la colección `entitlement_locks`; `exercises` y
  `managed_exercises` no cambian.

## [ ] F8-02 · El plan Max pasa a llamarse Pro

- **module:** subscriptions
- **description:** `planSchema` pasa de `free | max` a `free | pro`. La migración convierte
  `plan: "max"` en `"pro"` en los usuarios existentes; `seed:admin` y `dev:ephemeral` siembran Pro.
  Sin lógica nueva: es el nombre.
- **acceptance-criteria:**
  - Dado un usuario con `plan: "max"`, cuando corre la migración, entonces queda en `"pro"`; y al
    revertir vuelve a `"max"`. Los `free` no cambian.
  - Dado `planSchema`, cuando se parsea `"max"`, entonces falla.
  - Dado el seed del admin, entonces el usuario queda con plan Pro, incluso si ya existía como
    Free.
- **example:** El admin de desarrollo, que era Max, sigue teniendo todo después de migrar.
- **story-points:** 2
- **depends_on:** F8-01
- **risk:** medium
- **test_plan:** tests de schemas; test de la migración con `mongodb-memory-server`, ida y vuelta;
  test del seed.
- **error-codes:** ninguno
- **data-model-impact:** `users.plan` (colección `user` de Better Auth): `max` → `pro`.

## [ ] F8-03 · API: las estadísticas son de Pro

- **module:** subscriptions
- **description:** Un hook `onRequest` que corre después de `requireSession` y responde
  `WC-SUBS-403-002` a quien no tiene el plan, inyectado a las cuatro rutas de `stats` desde la raíz
  de composición. La regla compartida es `canViewStats(plan)` en `@wasabi-cross/schemas`, y el
  catálogo de errores suma el código nuevo.
- **acceptance-criteria:**
  - Dado un usuario Free, cuando pide cualquiera de los cuatro endpoints de `stats`, entonces
    responde 403 `WC-SUBS-403-002`, también para un ejercicio ajeno o inexistente.
  - Dado un usuario sin sesión, cuando los pide, entonces responde 401, no 403.
  - Dado un usuario Pro, cuando los pide, entonces todo sigue igual, incluido el 404 de un
    ejercicio ajeno.
- **example:** Una usuaria Free pide `/stats/summary` con un token válido: recibe 403 con el
  mensaje "Las estadísticas son parte del plan Pro."
- **story-points:** 3
- **depends_on:** F8-02
- **risk:** high
- **test_plan:** tests de integración de las rutas con ambos planes y sin sesión; el IDOR de
  estadísticas sigue en pie para Pro. Un permiso mal puesto acá regala la función de pago:
  revisión humana de la PR.
- **error-codes:** `WC-SUBS-403-002` (nuevo)
- **data-model-impact:** ninguno

## [ ] F8-04 · Web: la suscripción, el plan en el perfil y la etiqueta Pro

- **module:** web
- **description:** Tres cosas (spec §5.5). El Perfil suma la sección "Tu plan" con la etiqueta Free
  o Pro y el link a la suscripción. La página `/suscripcion` muestra el plan actual, lo que se paga
  ($0 en Free, "A definir" en Pro) y las tarjetas de los dos planes con "Pasar a Pro" / "Pasar a
  Free"; el botón avisa que todavía no está disponible y no llama a la API. El header muestra una
  etiqueta "PRO" que lleva a la suscripción cuando el plan es Pro.
- **acceptance-criteria:**
  - Dado un usuario Free, cuando abre el Perfil, entonces ve "Free" y el link a la suscripción; el
    header no tiene etiqueta.
  - Dado un usuario Pro, cuando abre cualquier pantalla, entonces el header muestra "PRO".
  - Dado un usuario Free, cuando aprieta "Pasar a Pro", entonces ve el aviso de que todavía no está
    disponible y el plan no cambia.
  - Dado un usuario Pro, cuando aprieta "Pasar a Free", entonces lo mismo.
- **example:** —
- **story-points:** 5
- **depends_on:** F8-02
- **risk:** low
- **test_plan:** tests de las tres pantallas con ambos planes; Storybook de lo que se agregue a
  `@wasabi-cross/ui`.
- **error-codes:** ninguno
- **data-model-impact:** ninguno

## [ ] F8-05 · Web: las estadísticas, bloqueadas con Free

- **module:** web
- **description:** Con plan Free, la pantalla Estadísticas y el Progreso del detalle muestran el
  aviso de spec §5.5 ("Las estadísticas son parte del plan Pro", "Ver planes", que lleva a la
  suscripción de F8-04) y **no piden** los
  datos. Con Pro, igual que hoy. Si la API igual responde `WC-SUBS-403-002` (plan que cambió en
  otro dispositivo), el error se muestra como el mismo aviso.
- **acceptance-criteria:**
  - Dado un usuario Free, cuando abre Estadísticas, entonces ve el aviso y ningún pedido a `/stats`
    sale.
  - Dado un usuario Free, cuando abre el detalle, entonces ve el historial, la barra fija y los
    porcentajes, y en lugar del progreso el aviso.
  - Dado un usuario Pro, cuando abre cualquiera de las dos, entonces ve lo de siempre.
- **example:** —
- **story-points:** 3
- **depends_on:** F8-03, F8-04
- **risk:** medium
- **test_plan:** tests de pantalla con ambos planes; se comprueba que la API falsa no recibe
  pedidos de estadísticas con Free.
- **error-codes:** ninguno
- **data-model-impact:** ninguno

## [ ] F8-06 · E2E y axe del plan

- **module:** web
- **description:** Un usuario Free ve el aviso donde estaría Estadísticas y el Progreso del
  detalle, y la API le niega los datos; un usuario Pro ve las estadísticas y la etiqueta en el
  header; la suscripción avisa que cambiar de plan todavía no está disponible; un cambio de plan se
  nota sin volver a entrar. axe audita la suscripción y el aviso a 390px. Como no hay pago ni
  endpoint para cambiar de plan, `dev:ephemeral` levanta un control sólo para el E2E
  (`POST 127.0.0.1:3101/plan`) y los specs de estadísticas, que corrían con un atleta nuevo (Free),
  pasan a registrarlo como Pro. Los E2E que probaban el cupo pasan a probar que ya no hay.
- **acceptance-criteria:**
  - Dado un usuario Free, cuando entra a Estadísticas o al detalle, entonces ve el aviso, y un
    pedido directo a `/stats/summary` responde 403 `WC-SUBS-403-002`.
  - Dado un usuario Pro, cuando entra a Estadísticas, entonces ve las estadísticas, y el header
    muestra la etiqueta PRO.
  - Dado un plan que cambió en otro dispositivo, cuando la pantalla pide las estadísticas, entonces
    ve el aviso y no un error.
  - Dado axe a 390px en la suscripción, el Perfil y el aviso, entonces 0 violaciones.
- **example:** —
- **story-points:** 3
- **depends_on:** F8-04, F8-05
- **risk:** low
- **test_plan:** `pnpm e2e` y `pnpm e2e:prod` completos, en CI.
- **error-codes:** ninguno
- **data-model-impact:** ninguno

---

# Fase 9 — Ingreso con OAuth 2.0 (Google y Microsoft)

El usuario decidió (2026-10-04) que **todo el login y el registro pasa por OAuth 2.0**, con **Google y
Microsoft** (las cuentas Outlook, Hotmail y Live): se va el email y la contraseña (F0-03 y F1-10, y la
decisión del 2026-09-18 que los dejaba como único ingreso). No hay usuarios que conservar —no hay
producción ni Atlas— así que no hay migración de cuentas. Wasabi Cross es **cliente** OpenID Connect
de los proveedores, con _authorization code_ + PKCE; no es un servidor OAuth. Entrar por primera vez
crea la cuenta: no hay pantalla de registro. El Perfil muestra la foto del usuario.

**Qué se aprovecha** de los proveedores y del Better Auth que ya está:

- El proveedor autentica, guarda y protege la contraseña y puede pedir 2FA. Se van el hash, la
  política de largo, `haveIBeenPwned`, `forget-password` y sus límites de intentos. Con eso se
  cierra la decisión abierta "Proveedor de email": sin contraseñas no hay nada que recuperar.
- Better Auth ya trae `socialProviders` para los dos (`state`, PKCE, cookie de sesión), el plugin
  `testUtils` (`createUser`, `login`) para tener sesiones en tests sin pasar por ningún formulario, y
  `overrideUserInfoOnSignIn`, que refresca nombre y foto en cada ingreso.
- **El token no se guarda ni hace falta después del ingreso.** El _access token_ sólo tiene un uso
  para Wasabi: en Microsoft, el ID token no trae foto y Better Auth la pide a Microsoft Graph con él
  durante el ingreso (Google manda la URL de la foto, `picture`, en el ID token y no necesita nada).
  Hecho eso no sirve para nada más: refrescar la foto sin que la persona entre exigiría un
  _refresh token_ (un secreto de larga vida en la base), y llamar a otras APIs del proveedor
  (Calendar, Fit, Graph) está fuera de la spec §2. La foto se refresca en el ingreso siguiente.

**Supuestos, confirmados por el usuario el 2026-10-04** (F9-00 los vuelca en la spec):

1. **Google y Microsoft, sólo cuentas personales de Microsoft** (tenant `consumers`). Las cuentas de
   trabajo o escuela quedan afuera: ahí el email lo controla el administrador del tenant y no es
   confiable (ver el hallazgo de abajo). Si hay que aceptarlas, es otra decisión, con más riesgo.
2. **Cualquier cuenta con email verificado por el proveedor puede crear cuenta**, y nace Free. El
   modal para promocionar Pro es posterior y no entra en esta fase.
3. **El nombre visible** ("Hi, Braian!") **es el del proveedor**, sin pantalla para cambiarlo. Si no
   lo trae, la parte local del email.
4. **Se guardan email, nombre, foto y el id del proveedor.** Ningún token. La foto se muestra en el
   Perfil.
5. **Cada ingreso pide elegir la cuenta** (`prompt: select_account`, en los dos): cerrar sesión en
   Wasabi no cierra la del proveedor, y en un teléfono compartido entraría solo a la cuenta
   equivocada.
6. **Las cuentas no se vinculan solas** (`accountLinking` apagado). Un email que ya tiene cuenta con
   el otro proveedor recibe un aviso para entrar con ese. Quien usa Google y Microsoft con emails
   distintos tiene dos cuentas separadas: vincularlas es una función aparte, con sesión iniciada.

**Hallazgos del repo y de la documentación de los proveedores**, comprobados al armar el plan:

- **Sin contraseña no sirve nada de lo que hoy abre una sesión.** Once archivos de test de la API se
  registran por `/api/auth/sign-up/email`; el E2E lo hace por `/registro` en `registrarse()`
  (`apps/web/e2e/app.ts`, que usan todos los specs); `seed:admin` crea al admin con contraseña.
  Los tests pasan a `testUtils`; el E2E y el desarrollo, a un IdP falso; el admin se siembra ligado
  a él.
- **El IdP falso pasa a ser el ingreso de desarrollo.** Si llegara a producción sería un _bypass_ de
  autenticación. Por eso F9-03 lo deja fuera de `src/` y de `dist/`, y `parseEnv` se niega a
  arrancar con él en `production`.
- **El email de Microsoft no es confiable.** Su documentación dice que el claim `email` "no está
  garantizado como correcto y es mutable" y que no se use para identificar ni guardar datos del
  usuario (es la base del ataque _nOAuth_). Better Auth ya identifica la cuenta de Microsoft por
  `oid`, que es inmutable. Y sólo marca el email como verificado si el token trae `email_verified`
  o el email figura en `verified_primary_email` / `verified_secondary_email`, que son _claims_
  opcionales que hay que pedir en el registro de la app en Entra. La documentación no dice si las
  cuentas personales los reciben. **F9-10 captura un token real para comprobarlo; si no vienen, se
  frena y se decide: no se fuerza `emailVerified: true`**, porque con la vinculación apagada el
  email sólo importa para impedir que alguien se adelante con el de otro, y eso lo impide pedir que
  esté verificado.
- **Los scopes por defecto de Microsoft incluyen `offline_access`** (un _refresh token_). Se
  desactivan los scopes por defecto y se piden `openid profile email User.Read`; `User.Read` es el
  que permite la foto. Google se pide sin acceso offline.
- **La foto no se puede mostrar tal cual viene.** Better Auth la guarda en `user.image`: una URL de
  `googleusercontent.com` en Google y un _data URL_ en Microsoft (con un espacio después de la
  coma). La CSP de producción (`img-src 'self' data:`, el default de helmet) bloquearía la primera, y
  el segundo, de unos 6 KB, viajaría en cada `/me`. Por eso la API la sirve desde su propio origen
  (F9-08) y `/me` sólo dice si hay foto.
- **El service worker se comería el callback.** `dist/sw.js` registra
  `NavigationRoute(createHandlerBoundToURL("index.html"))` sin lista de exclusión: con la PWA activa,
  la navegación de vuelta del proveedor (`/api/auth/callback/google`) recibiría `index.html`. Hay que
  excluir `/api/` (F9-07).
- **Los errores del callback no son 4xx.** Better Auth responde con un redirect a `?error=<código>`,
  así que `translateAuthError` no los ve: el front traduce ese parámetro a un código `WC-OAUTH-*` y
  nunca refleja el texto crudo.
- **Tokens del proveedor.** Better Auth guarda `accessToken`, `refreshToken` e `idToken` en la
  colección `account`. Wasabi no los necesita (F9-05).
- **Logs.** La URL del callback trae `code` y `state`, y `auth.routes.ts` loguea `request.url`. El
  logger redacta `accessToken` y `refreshToken`, pero no `idToken` ni el _query_ (F9-06).
- **El callback depende del proveedor:** `/api/auth/callback/google`, `/api/auth/callback/microsoft`
  y, para el IdP falso, `/api/auth/oauth2/callback/<id>`. Todos caen bajo `/api/`.
- **Los secretos de Microsoft vencen** (hasta 24 meses); los de Google no. El runbook (F9-10) anota la
  fecha de vencimiento.
- **Cookies.** `sameSite: 'lax'` ya está puesto y es lo que deja que la cookie de `state` sobreviva
  el regreso desde el proveedor. La cookie es por _host_, no por puerto: en desarrollo la API y el
  front tienen que usar el mismo (`localhost` en todo, o `127.0.0.1` en todo).
- **La Fase 8 ya está en `main`** (PR #93): `seed:admin` siembra Pro y el E2E fija el plan con
  `fijarPlan`, y esta fase los reemplaza.

**Fuera de la Fase 9**, para que no se cuele:

- El modal para promocionar Pro (el usuario lo pidió para después; sin tareas todavía).
- Wasabi Cross como servidor OAuth / proveedor OIDC para terceros.
- Más proveedores, cuentas de trabajo o escuela de Microsoft, y vincular cuentas con una sección
  "Cuentas conectadas" en el Perfil.
- Cambiar el nombre visible o la foto desde Wasabi, borrar la cuenta y 2FA propio (lo da el
  proveedor).
- Migrar cuentas con contraseña: no hay ninguna que valga. Las bases de desarrollo con cuentas viejas
  se borran (`dev:ephemeral` nace limpia; en una base propia, `dropDatabase` y volver a migrar y
  sembrar): un `user` viejo con el mismo email que una cuenta nueva daría "no vinculada". Si antes de
  esta fase alguien crea staging con datos, también se borra.

**Camino:** F9-00 → F9-01 y F9-02 (en paralelo) → F9-03 → F9-04 → F9-05 → F9-06, F9-07 y F9-08 (en
paralelo) → F9-09. F9-10 (🔑, las cuentas de Google y Microsoft del usuario) se destraba con F9-05; su
parte de staging y prod espera a F3-07. Cada paso compila y pasa: F9-04 saca la contraseña de los
tests y del seed sin cambiar lo que hace la API, F9-05 la apaga, y F9-07 borra los formularios y los
schemas de contraseña, que son lo último que los usaba. F9-03, F9-05 y F9-07 tocan la entrada a la
app: revisión humana de los tests (spec §9), y cada una pasa por `/security-review` y `aikido:scan`.

## [ ] F9-00 · Spec: el ingreso es sólo con OAuth

- **module:** spec
- **description:** Los seis supuestos de arriba, cerrados con el usuario y volcados en la spec: §5
  (las filas Login y Registro pasan a una sola, "Ingreso"; la del Perfil suma la foto), §5.5 (el
  Perfil empieza por la persona), §5.6 nueva (el ingreso: proveedores, pantalla, primera vez y
  después, qué pasa cuando algo no sale, cuentas sin vincular, foto, sesión y qué se guarda), §6
  (Better Auth sólo con OAuth), §7 (`auth` queda con la sesión; `oauth` con el ingreso por
  proveedores), §12 (los secretos de cliente OAuth) y §13 (rate limit del ingreso, 5 por minuto por
  IP; se van el recupero de contraseña y el hash con listas de filtradas; entra OAuth: _code_ +
  PKCE, `state`, redirect URIs exactas por ambiente, tokens, la foto como dato personal, el IdP
  falso). ADR-0012: revierte el login con email y contraseña, con las opciones (1) sólo OAuth, (2)
  OAuth y contraseña, (3) sólo contraseña; el costo de depender de dos proveedores; por qué
  `consumers` y no `common`; por qué la vinculación está apagada y qué haría falta para encenderla.
  STATE.md: se cierra "Proveedor de email" y la decisión del 2026-09-18 queda como reemplazada.
  `docs/error-codes.md` suma `OAUTH` a la lista de módulos.
- **acceptance-criteria:**
  - Dada la spec, cuando se lee §5, entonces dice qué ve cada persona al entrar, y que no hay
    pantalla de registro ni campos de email o contraseña.
  - Dada la spec, cuando se lee §13, entonces no queda ninguna regla de contraseñas y cada regla de
    OAuth tiene su lugar.
  - Dado el ADR, cuando se lee, entonces dice qué se gana, qué se pierde y qué haría falta para sumar
    un tercer proveedor o vincular cuentas.
- **example:** —
- **story-points:** 2
- **depends_on:** —
- **risk:** low
- **test_plan:** revisión humana de la PR.
- **error-codes:** ninguno (el módulo se registra acá; los códigos llegan en F9-01)
- **data-model-impact:** ninguno
- **estado:** hecha, a la espera de revisión. Spec §5.6 nueva y [ADR-0012](./adr/0012-ingreso-solo-con-oauth.md);
  `OAUTH` en la lista de módulos de [error-codes.md](./error-codes.md). La spec cita ya los tres
  códigos `WC-OAUTH-*`, que entran al diccionario en F9-01 (acá no hay código que los lance).

## [ ] F9-01 · Schemas: contratos de OAuth

- **module:** schemas
- **description:** Lo compartido por front y back, en `@wasabi-cross/schemas` (ADR-0006), **sólo
  agregando**: lo de contraseñas se borra al final, cuando ya no lo use nadie (F9-07).
  `oauthProviderSchema` (`google` y `microsoft`) y la respuesta de proveedores habilitados
  (`{ id, label }`); `oauthErrorFor(valor)`, que traduce el `?error=` de Better Auth
  (`access_denied`, `account_not_linked`, `state_mismatch`, `unable_to_create_user`…) a un código del
  catálogo, y un valor desconocido cae siempre en el genérico. Los tres códigos entran al catálogo y a
  [error-codes.md](./error-codes.md) acá, en el mismo PR.
- **acceptance-criteria:**
  - Dado `access_denied`, cuando se traduce, entonces da `WC-OAUTH-400-001`; dado
    `account_not_linked`, `WC-OAUTH-409-003`; dado cualquier otro valor, conocido o no,
    `WC-OAUTH-400-002`, sin devolver nunca el texto recibido.
  - Dado un proveedor que no está en el enum, cuando se parsea, entonces se rechaza.
  - Dada la respuesta de proveedores, cuando se parsea un objeto con campos de más (`clientId`),
    entonces se rechaza.
- **example:** —
- **story-points:** 2
- **depends_on:** F9-00
- **risk:** low
- **test_plan:** tests de schema por regla; el test que ya falla si catálogo y diccionario divergen
  cubre los códigos nuevos. Coverage ≥90%.
- **error-codes:** nuevos `WC-OAUTH-400-001` (ingreso cancelado), `WC-OAUTH-400-002` (no se pudo
  completar el ingreso) y `WC-OAUTH-409-003` (ya hay una cuenta con ese email: entrá con el otro
  proveedor)
- **data-model-impact:** ninguno
- **estado:** código hecho, a la espera de revisión. `oauth.api.ts` en schemas: el enum de
  proveedores suma `fake-idp` (el IdP de desarrollo de F9-03), porque F9-02 lo lista con
  `OAUTH_DEV_IDP=on` y el front tiene que poder tipar esa respuesta; la API no lo lista nunca en
  producción. La respuesta es `{ providers: [{ id, label }] }`, estricta. `oauthErrorFor` recibe un
  `unknown` (el parámetro viene de la URL) y cualquier cosa que no sea `access_denied` o
  `account_not_linked` es el genérico, incluido `email_not_verified`, que Better Auth sí manda.
  Los tres códigos, en el catálogo y en el diccionario.

## [ ] F9-02 · API: módulo `oauth`, configuración y proveedores habilitados

- **module:** oauth
- **description:** Nace `apps/api/src/modules/oauth/{domain,application,infrastructure}`. Variables
  `GOOGLE_CLIENT_ID` y `GOOGLE_CLIENT_SECRET`, y `MICROSOFT_CLIENT_ID` y `MICROSOFT_CLIENT_SECRET`:
  opcionales pero **cada par, completo o ausente** (mismo patrón que el `refine` de
  `AUTH_RATE_LIMIT`). El tenant de Microsoft es `consumers` y está fijo en el código, no es una
  variable. `OAUTH_DEV_IDP` (`on` u `off`, `off` por defecto) y `MICROSOFT_AUTHORITY` (para apuntar
  el proveedor de Microsoft al IdP falso) los rechaza `parseEnv` con `NODE_ENV=production`, y la
  segunda además exige `OAUTH_DEV_IDP=on`. (Que la API no arranque sin ningún proveedor llega con
  F9-05: hasta que se apague la contraseña, `pnpm dev`, `dev:ephemeral` y el CI siguen entrando por
  el formulario.) Un registro de proveedores en el dominio (`{ id, label }`) y `GET /api/v1/oauth/providers`, **sin
  sesión** porque el ingreso lo necesita antes de entrar, que devuelve sólo los habilitados, sin
  `clientId` ni configuración. `apps/api/.env.example` documenta las variables. Las reglas de ESLint
  que hacen cumplir la arquitectura cubren el módulo nuevo.
- **acceptance-criteria:**
  - Dados los dos pares de variables, cuando se pide `/oauth/providers`, entonces responde
    `["google", "microsoft"]`; con sólo uno, ese; con sólo `OAUTH_DEV_IDP=on`, el IdP de desarrollo.
  - Dado un par con una sola de sus dos variables, cuando arranca, entonces no levanta y dice cuál
    falta; con una variable vacía (un `.env` copiado del ejemplo), cuenta como ausente.
  - Dados `OAUTH_DEV_IDP=on` o `MICROSOFT_AUTHORITY` con `NODE_ENV=production`, cuando arranca,
    entonces no levanta; dado `MICROSOFT_AUTHORITY` sin `OAUTH_DEV_IDP=on`, tampoco.
  - Dada la respuesta, cuando se inspecciona, entonces no contiene ids de cliente ni secretos.
  - Dado un import de otro módulo desde `oauth` (o al revés), cuando corre el lint, entonces falla.
- **example:** —
- **story-points:** 3
- **depends_on:** F9-00
- **risk:** medium
- **test_plan:** unitarios del registro y del `parseEnv` (cada combinación de variables);
  integración de la ruta; el lint como test de la frontera.
- **error-codes:** ninguno
- **data-model-impact:** ninguno
- **estado:** código hecho, a la espera de revisión. `oauth/{domain,application,infrastructure}`
  con `GET /api/v1/oauth/providers` (sin sesión, `{ providers: [{ id, label }] }`, siempre en el orden
  Google, Microsoft, IdP de desarrollo). `parseEnv` pasa a un `superRefine` con los pares de
  credenciales, `OAUTH_DEV_IDP` y `MICROSOFT_AUTHORITY`; una variable vacía vale como ausente. Dos
  cosas que cambiaron respecto de la descripción: (1) **"la API no arranca sin ningún proveedor" se
  movió a F9-05**: hoy el ingreso sigue siendo el formulario, y exigirlo ahora rompería `pnpm dev`,
  `dev:ephemeral` y el E2E del CI; además va en `server.ts` y no en `parseEnv`, porque `migrate` y
  `seed` leen el mismo entorno y no necesitan ningún proveedor. (2) La frontera entre módulos no
  tiene test propio: la regla de ESLint ya cubre `modules/*/domain` y `modules/*/application`, y se
  comprobó a mano con un import cruzado que `pnpm lint` falla.

## [ ] F9-03 · IdP falso para desarrollo y E2E

- **module:** infra
- **description:** Un proveedor OIDC mínimo en Fastify con **dos caras**. La genérica
  (`/.well-known/openid-configuration`, `/authorize`, `/token`, `/jwks`) se registra en Better Auth
  con `genericOAuth` bajo `providerId: "fake-idp"`. La que imita el layout de Microsoft
  (`/<tenant>/oauth2/v2.0/authorize`, `/token` y `/<tenant>/discovery/v2.0/keys`, con `iss` igual a
  `<authority>/<tid>/v2.0`) deja correr el **proveedor `microsoft` real** de Better Auth apuntando
  `MICROSOFT_AUTHORITY` acá, así que se prueban de verdad el chequeo de `tid`, la identidad por
  `oid` y los _claims_ de verificación. `/authorize` muestra una pantalla chica con email y nombre
  —el admin de desarrollo ya cargado— para elegir quién entra, y cada usuario puede llevar `tid`,
  `oid`, `verified_primary_email` y `picture` (un _data URL_ chico). Vive en
  `apps/api/dev-support/`, **fuera de `src/`**: un `scripts/dev.ts` lo arranca junto a la API cuando
  `OAUTH_DEV_IDP=on` (en `pnpm dev` y en `dev:ephemeral`, en `127.0.0.1:3102`) y `src/` nunca lo
  importa. La llamada a Graph para la foto está fija a `graph.microsoft.com` y no se puede desviar:
  esa parte se prueba a mano en F9-10.
- **acceptance-criteria:**
  - Dado el flujo _authorization code_ + PKCE completo por la cara genérica, cuando un cliente de
    prueba lo recorre, entonces recibe un `id_token` con el email y el nombre elegidos que se
    verifica contra el JWKS.
  - Dado el mismo flujo por la cara de Microsoft, cuando lo recorre el proveedor `microsoft` de
    Better Auth, entonces el ingreso se completa con `oid` como identidad.
  - Dado un `/token` sin el `code_verifier` correcto, entonces rechaza; dado un `code` ya usado,
    entonces rechaza.
  - Dado un usuario marcado con `tid` de una organización, cuando entra por la cara de Microsoft,
    entonces el proveedor lo rechaza.
  - Dado el build de producción, cuando se compila, entonces `dist/` no contiene el IdP falso (test
    en `pnpm verify`).
- **example:** —
- **story-points:** 5
- **depends_on:** F9-02
- **risk:** high. 🔴 **Un IdP que acepta a cualquiera, en producción, es un _bypass_ de la
  autenticación.** Las tres guardas (fuera de `src/`, fuera de `dist/`, `parseEnv`) tienen su test.
- **test_plan:** tests del propio IdP por criterio; el test de `dist/` y el de `parseEnv` (F9-02).
  Revisión humana (spec §9).
- **error-codes:** ninguno
- **data-model-impact:** ninguno

## [ ] F9-04 · Tests y seed sin contraseña

- **module:** auth
- **description:** El plugin `testUtils` de Better Auth (`createUser`, `login`) en la configuración de
  `NODE_ENV=test` y **nunca** en la que se despliega, y un helper `createTestSession` (recibe el
  _harness_ y el plan) que devuelve la cookie. Los once archivos de test de la API que hoy se registran
  por `/api/auth/sign-up/email` pasan al helper. `seed:admin` y `dev:ephemeral` siembran al admin con
  una cuenta del IdP falso (`providerId: "fake-idp"`, `accountId` fijo) y plan Pro, **sin
  contraseña**: el IdP falso lo ofrece por defecto, así que entrar en desarrollo es un clic. Se van
  `UserRegistrar` (el puerto y su implementación) y `SEED_ADMIN_PASSWORD`. Lo que hace la API no
  cambia: el email y la contraseña siguen andando hasta F9-05.
- **acceptance-criteria:**
  - Dado `createTestSession` con plan Pro, cuando la cookie llega a `/api/v1/me`, entonces la API
    responde con ese usuario y ese plan.
  - Dados los archivos de test de la API, cuando se busca `sign-up/email` fuera de `auth.test.ts`,
    entonces no aparece.
  - Dado `seed:admin` corrido dos veces, entonces hay un solo admin con plan Pro, ligado al IdP
    falso, sin cuenta `credential` ni hash de contraseña.
  - Dado `seed:admin` con `NODE_ENV=production`, entonces se niega, como hoy.
  - Dada la configuración de `createAuth` con `NODE_ENV=production`, cuando se listan sus
    endpoints, entonces no hay ninguno de `testUtils`.
- **example:** —
- **story-points:** 3
- **depends_on:** F9-03
- **risk:** medium
- **test_plan:** los tests migrados son el test; el de la configuración de producción es nuevo;
  `pnpm test:coverage` sigue ≥90% de ramas (el CI lo exige).
- **error-codes:** ninguno
- **data-model-impact:** el admin sembrado tiene una `account` de `fake-idp` y ninguna `credential`.

## [ ] F9-05 · Better Auth sólo con OAuth

- **module:** auth
- **description:** `createAuth` recibe de la raíz de composición la configuración que arma `oauth`
  (`auth` no importa a `oauth`; se inyecta, como `requireSession`). Se van `emailAndPassword`,
  `haveIBeenPwned`, las reglas de límite de `/sign-in/email`, `/sign-up/email` y `/forget-password`
  y la cuenta `credential`: esos endpoints dejan de existir. **Google:** sus scopes son
  `openid email profile`, sin acceso offline. **Microsoft:** tenant `consumers`, scopes por defecto
  desactivados y `openid profile email User.Read` (sin `offline_access`), foto de 96 px. En los
  dos, `prompt: select_account` y `overrideUserInfoOnSignIn` para refrescar nombre y foto.
  `accountLinking` apagado. Los tokens del proveedor no se guardan (un
  `databaseHooks.account.create.before` los descarta; si Better Auth no lo permite,
  `encryptOAuthTokens`). `mapProfileToUser` toma el nombre del proveedor o, sin él, la parte local
  del email, y **nunca** el plan. Un email que el proveedor no verificó no crea usuario, y no se
  fuerza a verificado (ver F9-10). `onAPIError.errorURL` y `errorCallbackURL` van al `/login` del
  front. Límite de 5 por minuto para `/sign-in/social` y los callbacks (spec §13). Migración con el
  índice único `(providerId, accountId)` en `account`: Better Auth no crea índices y sin él dos
  callbacks simultáneos pueden crear dos cuentas; revisar de paso que `user.email` ya sea único. En
  `translateAuthError`, un 401 ya no es "credenciales inválidas". `auth.test.ts` se reescribe contra
  el IdP falso. **Con el ingreso sólo por OAuth, una API sin ningún proveedor no deja entrar a
  nadie**: `server.ts` no arranca si `enabledProviders` (F9-02) viene vacío, salvo en `test`, donde
  se entra con `testUtils`. Va en `server.ts` y no en `parseEnv` porque `migrate` y `seed` leen el
  mismo entorno y no necesitan ningún proveedor.
- **acceptance-criteria:**
  - Dado un entorno sin ningún proveedor (fuera de `test`), cuando arranca el servidor, entonces no
    levanta y el mensaje dice cómo habilitar uno; `migrate` y `seed` corren igual.
  - Dado un proveedor con email verificado y sin cuenta, cuando entra, entonces se crea el usuario
    con plan Free y sesión por cookie, sin contraseña y sin tokens guardados.
  - Dado el mismo `accountId`, cuando vuelve a entrar, entonces es el mismo usuario, sin duplicar;
    y si cambió su nombre o su foto en el proveedor, entonces se actualizan.
  - Dado `POST /api/auth/sign-up/email`, `/sign-in/email` o `/forget-password`, cuando llega,
    entonces responde 404: no queda otro camino de entrada que los proveedores.
  - Dado un email que el proveedor no verificó (en Microsoft: sin `email_verified` ni
    `verified_primary_email`), cuando intenta entrar, entonces no hay usuario ni sesión.
  - Dado un usuario de Microsoft con `tid` de una organización, cuando intenta entrar, entonces no
    hay usuario ni sesión.
  - Dado un `state` alterado, repetido o sin su cookie, cuando vuelve el callback, entonces falla sin
    sesión; dado el consentimiento denegado, vuelve a `/login?error=access_denied`.
  - Dado un usuario creado con un proveedor, cuando entra otro proveedor con el mismo email, entonces
    no accede a esa cuenta (la vinculación está apagada) y vuelve a `/login?error=account_not_linked`,
    sin sesión, con la cuenta original intacta.
  - Dado el pedido de autorización de Microsoft, cuando se mira, entonces los scopes son
    `openid profile email User.Read` y no está `offline_access`; el de Google no pide acceso offline.
  - Dado un perfil que trae `plan: "pro"`, cuando se crea el usuario, entonces nace Free.
  - Dados seis pedidos a `/sign-in/social` en un minuto desde la misma IP, entonces el sexto
    responde 429 `WC-AUTH-429-003`.
  - Dados dos callbacks simultáneos del mismo `accountId` nuevo, entonces queda una sola cuenta.
  - Dada la migración, cuando se revierte, entonces el índice desaparece; al reaplicar, vuelve.
- **example:** Una atleta nueva toca "Continuar con Microsoft", elige su cuenta de Outlook y queda
  adentro con plan Free y sesión de 30 días. Nunca eligió una contraseña ni confirmó un email.
- **story-points:** 5
- **depends_on:** F9-01, F9-02, F9-03, F9-04
- **risk:** high. 🔴 **Es la puerta de entrada de toda la app: un error acá regala cuentas.**
  Revisión humana de los tests (spec §9).
- **test_plan:** integración contra el IdP falso, una por criterio, con la misma configuración que
  los proveedores reales (Microsoft, el proveedor real contra el layout falso); carrera de callbacks
  sobre `MongoMemoryReplSet`; pruebas inversas (quitar cada protección y ver que su test falla);
  migración ida y vuelta.
- **error-codes:** consume `WC-OAUTH-400-001`, `WC-OAUTH-400-002`, `WC-OAUTH-409-003`,
  `WC-AUTH-429-003`, `WC-AUTH-401-004`
- **data-model-impact:** índice único `(providerId, accountId)` en `account`; `user` y `account`
  sin contraseña ni tokens. No hay migración de datos: las bases de desarrollo con cuentas viejas se
  borran.

## [ ] F9-06 · Logs y headers: nada del flujo OAuth se filtra

- **module:** infra
- **description:** `REDACTED_PATHS` suma `idToken`, `*.idToken`, `clientSecret` y `*.clientSecret`. El
  log de requests y el `warn` de `auth.routes.ts` dejan de incluir el _query_ de los callbacks: se
  loguea el path, no `code` ni `state`. Un test comprueba que el flujo completo no necesita ampliar
  la CSP (es navegación de nivel superior, no `fetch`) ni cambiar `referrerPolicy`, y que la cookie
  de `state` viaja con `sameSite: lax`. `docs/architecture.md` suma la regla.
- **acceptance-criteria:**
  - Dado un callback fallido con `code=abc&state=xyz`, cuando se leen todos los logs de la
    petición, entonces ni `abc` ni `xyz` aparecen.
  - Dado un log con `idToken` anidado, cuando sale, entonces dice `[REDACTED]`.
  - Dadas las respuestas de `/sign-in/social` y del callback, cuando se miran los headers, entonces
    la CSP y el resto son los de siempre y la cookie de `state` es `lax`.
- **example:** —
- **story-points:** 2
- **depends_on:** F9-05
- **risk:** medium
- **test_plan:** test sobre el _stream_ de Pino con un callback real contra el IdP falso; el test
  de headers existente, extendido.
- **error-codes:** ninguno
- **data-model-impact:** ninguno

## [ ] F9-07 · Web: la pantalla de ingreso

- **module:** web
- **description:** Una sola pantalla, `/login`; se va `/registro`. Un `ProviderButton` por proveedor
  habilitado (en `@wasabi-cross/ui`: sólo presentación, con story y test; el ícono de cada proveedor
  respeta sus lineamientos de marca; el de Microsoft dice "Continuar con Microsoft"), con un texto
  que cubre las dos cosas ("Entrá o creá tu cuenta") y la marca del diseño (F4-06).
  `session.signInWithProvider(provider, { redirect })` hace un `POST` a `/api/auth/sign-in/social`
  con `callbackURL` (el `redirect` ya validado de F1-09, sólo rutas internas) y
  `errorCallbackURL: /login`, y después `window.location.assign(url)`. El `?error=` de `/login`
  pasa por `oauthErrorFor` (F9-01), se muestra con el mensaje del catálogo y sale de la URL. Se
  borran los formularios con contraseña, `session.signIn` y `signUp`, `signInSchema`,
  `signUpSchema`, `passwordSchema` y `auth.api.ts` de schemas, y sus tests; `WC-AUTH-401-001` se
  retira del catálogo y del diccionario. La configuración de la PWA se extrae a `pwa.config.ts` y
  suma `workbox.navigateFallbackDenylist: [/^\/api\//, /^\/docs/]`, para que el service worker no
  responda `index.html` al callback.
- **acceptance-criteria:**
  - Dado `/login`, cuando se abre, entonces hay un botón por proveedor habilitado y ningún campo de
    email ni de contraseña.
  - Dado el botón, cuando se aprieta, entonces se pide la URL y se navega a ella, y queda
    deshabilitado mientras tanto.
  - Dado `/registro`, cuando se abre, entonces responde como cualquier ruta inexistente.
  - Dado `/login?redirect=/ejercicios/x`, cuando termina el ingreso, entonces vuelve a esa ruta; dado
    un `redirect` externo, entonces se ignora.
  - Dado `/login?error=access_denied`, entonces se ve el mensaje de `WC-OAUTH-400-001`;
    `account_not_linked`, el de `WC-OAUTH-409-003`; cualquier otro valor, el de `WC-OAUTH-400-002`
    sin reflejarlo; y el parámetro sale de la URL.
  - Dado `/oauth/providers` vacío o caído, entonces se avisa que el ingreso no está disponible, con
    "Reintentar": no hay otra forma de entrar.
  - Dada la configuración de la PWA, cuando se evalúa la exclusión contra
    `/api/auth/callback/google`, `/api/auth/callback/microsoft` y
    `/api/auth/oauth2/callback/fake-idp`, entonces coincide; contra `/ejercicios`, no.
  - Dado el repo, cuando se busca `passwordSchema`, `signInSchema` y `signUpSchema`, entonces no
    aparecen.
- **example:** —
- **story-points:** 5
- **depends_on:** F9-01, F9-02, F9-05
- **risk:** medium
- **test_plan:** tests de componentes con el cliente de sesión simulado, uno por criterio; test de
  `pwa.config.ts`; Storybook del botón. axe va en F9-09.
- **error-codes:** consume `WC-OAUTH-400-001`, `WC-OAUTH-400-002`, `WC-OAUTH-409-003`; retira
  `WC-AUTH-401-001`
- **data-model-impact:** ninguno

## [ ] F9-08 · La foto del usuario en el Perfil

- **module:** users
- **description:** `GET /api/v1/me/photo`, con sesión, sirve la foto del usuario **desde el origen de
  la API**, así la CSP (`img-src 'self' data:`) no se toca y `/me` no carga con 6 KB de foto: `/me`
  suma sólo `hasPhoto`. `AuthenticatedUser` gana `image`, que sale del `user.image` que guarda Better
  Auth. Dos formas de origen: un _data URL_ (Microsoft; Better Auth lo arma con un espacio después
  de la coma, hay que tolerarlo) se decodifica y se sirve; una URL `https` de `*.googleusercontent.com`
  (Google) la baja la API, con tiempo y tamaño máximos y verificando que sea una imagen. Cualquier
  otro host no se baja nunca. Sólo `image/png`, `image/jpeg` y `image/webp`: un SVG serviría script
  en el origen de la app. `ETag` con el hash del valor de `user.image` y
  `Cache-Control: private, no-cache`: la revalidación no vuelve a pedirle nada al proveedor. Sin
  foto o con el proveedor caído, 404 `WC-USER-404-001`. Un componente Cross `Avatar` (foto o
  iniciales, cuadrado como el diseño) y, en el Perfil, un bloque con avatar, nombre y email. La URL
  no lleva id: cada uno sólo puede pedir la suya.
- **acceptance-criteria:**
  - Dado un usuario con foto de Microsoft (_data URL_), cuando pide `/me/photo`, entonces recibe la
    imagen con su `Content-Type` y un `ETag`; con `If-None-Match` igual, 304.
  - Dado un usuario con foto de Google, cuando la pide, entonces la API la baja del host de Google
    (simulado) y la sirve; dada una URL de otro host, entonces 404 y no sale ningún pedido.
  - Dado un tipo no permitido (SVG, HTML) o más grande que el máximo, entonces 404.
  - Dado un usuario sin foto, o con el proveedor caído, cuando la pide, entonces 404
    `WC-USER-404-001` y el Perfil muestra las iniciales.
  - Dado un usuario sin sesión, entonces 401.
  - Dado `/me`, cuando se inspecciona, entonces trae `hasPhoto` y nunca la URL ni el _data URL_.
  - Dado el Perfil con foto que falla al cargar, entonces cae a las iniciales sin dejar un ícono roto.
  - Dada la CSP de producción, cuando se abre el Perfil con foto, entonces es la de siempre.
  - Dado axe a 390px en el Perfil con foto y con iniciales, entonces 0 violaciones.
- **example:** Braian entra con su cuenta de Google y ve su foto arriba del Perfil; Ana, con una
  cuenta de Outlook sin foto, ve una "A".
- **story-points:** 5
- **depends_on:** F9-05
- **risk:** medium. 🔴 **La API baja una URL: sólo hosts de Google, nunca lo que diga el usuario.**
- **test_plan:** integración de cada criterio con el `fetch` del proveedor inyectado (nunca de
  verdad); unitarios del decodificador del _data URL_ y de la lista de hosts; tests de componente
  del `Avatar` y del Perfil; Storybook del `Avatar`.
- **error-codes:** nuevo `WC-USER-404-001` (el usuario no tiene foto)
- **data-model-impact:** ninguno: se lee `user.image`, que ya guarda Better Auth.

## [ ] F9-09 · E2E y axe del ingreso con OAuth

- **module:** web
- **description:** `registrarse()` de `apps/web/e2e/app.ts` pasa a entrar por el IdP falso de
  `dev:ephemeral` (`127.0.0.1:3102`): misma firma, devuelve al atleta, así que los demás specs casi
  no cambian; `atletaNuevo` pierde la contraseña. Un spec nuevo, `ingreso-oauth.spec.ts`, recorre el
  ingreso. `diseno.spec.ts`, que hoy usa el ingreso por formulario, se adapta. En `pnpm e2e:prod`,
  con el service worker activo, el callback no devuelve `index.html`.
- **acceptance-criteria:**
  - Dado un usuario nuevo, cuando entra con el IdP, entonces llega a Home con plan Free y un pedido
    directo a `/stats/summary` responde 403 `WC-SUBS-403-002`.
  - Dado el mismo usuario, cuando cierra sesión y vuelve a entrar, entonces es el mismo (mismo `id`
    en `/me`) y el IdP le vuelve a pedir elegir la cuenta.
  - Dado un usuario con foto, cuando abre el Perfil, entonces la ve; sin foto, ve las iniciales.
  - Dado el IdP, cuando se cancela, entonces `/login` muestra el aviso de `WC-OAUTH-400-001` y no hay
    sesión; dado un `state` alterado, entonces el de `WC-OAUTH-400-002` y no hay sesión.
  - Dado un email que ya tiene cuenta con el otro proveedor, cuando entra por el segundo, entonces
    ve el aviso de `WC-OAUTH-409-003` y no hay sesión.
  - Dado `POST /api/auth/sign-up/email`, cuando se llama directo, entonces responde 404; `/registro`
    no existe.
  - Dado el build de producción con el service worker activo, cuando vuelve el callback, entonces el
    usuario queda con sesión.
  - Dado axe a 390px en `/login`, en `/login` con el aviso de error y en el Perfil con foto, entonces
    0 violaciones.
- **example:** —
- **story-points:** 5
- **depends_on:** F9-06, F9-07, F9-08
- **risk:** medium
- **test_plan:** `pnpm e2e` y `pnpm e2e:prod` completos, en CI.
- **error-codes:** ninguno
- **data-model-impact:** ninguno

## [ ] F9-10 · Credenciales de Google y Microsoft, runbook y prueba real — 🔑 necesita al usuario

- **module:** infra
- **description:** Lo único que no se puede hacer sin las cuentas del usuario. **Google, usuario:**
  crea el proyecto en Google Cloud Console; configura la pantalla de consentimiento (nombre, email
  de soporte, dominio autorizado y política de privacidad, que Google pide para publicarla) con
  sólo los scopes `openid`, `email` y `profile`; la **publica** (en modo "Testing" sólo entran los
  usuarios de prueba que se carguen a mano); y crea un cliente OAuth "Aplicación web" **por
  ambiente**. **Microsoft, usuario:** crea el registro de la app en Microsoft Entra (_App
  registrations_) con tipo de cuenta "sólo cuentas personales de Microsoft", una plataforma "Web"
  con el redirect URI de cada ambiente, un secreto de cliente (anotar cuándo vence) y el _claim_
  opcional `verified_primary_email` en el ID token. **Los dos:** redirect URI exacto
  (`http://localhost:3000/api/auth/callback/google` y `…/callback/microsoft` en dev;
  `https://<dominio>/api/auth/callback/<proveedor>` en staging y en prod), un cliente por ambiente, y
  cargar los pares `*_CLIENT_ID` / `*_CLIENT_SECRET` en `apps/api/.env` y en Railway (spec §12:
  secrets en la plataforma, nunca en el repo). En dev, `BETTER_AUTH_URL` y `WEB_ORIGIN` van los dos
  con `localhost`. **IA:** el runbook `docs/runbooks/oauth.md` (pasos de cada proveedor, redirect
  URIs, rotación de secretos —el de Microsoft vence—, qué hacer si se filtra uno, spec §12) y la
  prueba guiada; confirma cada paso que toque una cuenta real antes de ejecutarlo. **Con una cuenta
  real de Outlook se decodifica el ID token** (en dev, nunca se loguea) para comprobar si trae
  `verified_primary_email` o `email_verified`: si no vienen, se frena y se decide con el usuario; no
  se fuerza a verificado. La prueba se hace en dev y en staging, nunca en prod.
- **acceptance-criteria:**
  - Dado dev con credenciales reales, cuando se entra con una cuenta de Google y con una de Outlook,
    entonces se crea un usuario Free con su nombre y su foto, y queda con sesión; al volver a entrar
    es el mismo.
  - Dado el ID token de una cuenta personal de Microsoft, cuando se decodifica, entonces queda
    anotado en el runbook qué _claims_ de verificación trae.
  - Dado staging con sus propios clientes, cuando se hace lo mismo, entonces anda con el redirect
    URI exacto, y uno distinto lo rechaza el proveedor.
  - Dada la pantalla de consentimiento de Google publicada, cuando entra una cuenta que no es del
    usuario, entonces puede.
  - Dada la PWA instalada en un teléfono, cuando se entra con cada proveedor, entonces la sesión queda
    en la app; si en algún navegador el modo _standalone_ abre el proveedor afuera y la sesión queda
    en el otro contexto, el runbook lo documenta con la decisión tomada.
  - Dado el runbook, cuando se rota un secreto, entonces alcanza para hacerlo sin adivinar pasos, y
    anota la fecha de vencimiento del de Microsoft.
- **example:** —
- **story-points:** 5
- **depends_on:** F9-05 (staging y prod: F3-07)
- **risk:** medium
- **test_plan:** prueba manual guiada, con el resultado en la bitácora.
- **error-codes:** ninguno
- **data-model-impact:** ninguno
