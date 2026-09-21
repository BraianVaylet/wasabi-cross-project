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
| Fase 1 — El loop del atleta |     18 |           71 |     10 |

Las siete tareas de código están cerradas: PR #1 mergeada el 2026-09-17 con CI verde, y sus tarjetas
movidas a `Completadas`. Queda abierta F0-08, que no depende de código — ver abajo.

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

## [~] F1-07 · Marcas: cargar e historial

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
  que no llegó: va de nuevo en una PR contra `main`. Falta mover la tarjeta.

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

## [ ] F1-12 · Nuevo ejercicio

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

## [ ] F1-13 · Detalle de ejercicio con porcentajes

- **module:** web
- **description:** Mockups 5 y 6. Valor actual con su fecha, tags (categoría, nivel, con dolor),
  tabla de porcentajes con los del perfil del usuario, porcentaje custom, número grande con la
  carga del porcentaje elegido, barra y banda de carga, e historial con el valor actual marcado. En
  tiempo, sólo mejor marca e historial (spec §5.1). El porcentaje elegido vive en la URL (Nuqs).
- **acceptance-criteria:**
  - Dado un RM de 100 kg, cuando se elige 65%, entonces se ve 65 kg y "Light load".
  - Dado un porcentaje custom, cuando se tipea, entonces el resultado se actualiza sin llamar a la
    API.
  - Dado un ejercicio de tiempo, cuando se abre, entonces no hay tabla de porcentajes.
  - Dado un link con `?pct=80`, cuando se abre, entonces arranca con 80% elegido.
- **example:** —
- **story-points:** 5
- **depends_on:** F1-04, F1-07, F1-08, F1-09
- **risk:** medium
- **test_plan:** tests de componentes por criterio y por categoría. axe sin violaciones.
- **error-codes:** consume `WC-EXO-404-002`.
- **data-model-impact:** ninguno

## [ ] F1-14 · Cargar una marca nueva

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
- **depends_on:** F1-07, F1-13
- **risk:** low
- **test_plan:** tests de componentes del camino feliz, del rollback y del manejo de foco.
- **error-codes:** consume `WC-RM-422-001`.
- **data-model-impact:** ninguno

## [ ] F1-15 · Editar y borrar ejercicio

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
- **depends_on:** F1-06, F1-13
- **risk:** medium
- **test_plan:** tests de componentes por criterio.
- **error-codes:** consume `WC-EXO-404-002`.
- **data-model-impact:** ninguno

## [ ] F1-16 · Perfil: porcentajes y tema

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

## [ ] F1-17 · Aviso de nueva versión de la PWA

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

## [ ] F1-18 · E2E del flujo principal y axe en CI

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
- **depends_on:** F1-10, F1-11, F1-12, F1-13, F1-14
- **risk:** medium
- **test_plan:** el propio E2E, corriendo en CI contra un Mongo efímero.
- **error-codes:** ninguno
- **data-model-impact:** ninguno
