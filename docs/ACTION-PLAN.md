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

| Fase                 | Tareas | Story points | Hechas |
| -------------------- | -----: | -----------: | -----: |
| Fase 0 — Fundaciones |      8 |           27 |      0 |

Las siete tareas de código de la Fase 0 están en `[~]`: el código está hecho, revisado y con los
tests pasando, pero el Definition of Done (spec §16) pide además mover la tarjeta en Trello, y eso
lo hace quien terminó la tarea — no la IA. Pasan a `[x]` cuando se muevan las tarjetas.

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

## [~] F0-01 · Monorepo: `apps/web`, `apps/api`, `packages/schemas`, `packages/ui`

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
  [ADR-0003](./adr/0003-fastify-como-framework-http.md). Falta mover la tarjeta en Trello.

## [~] F0-02 · `@wasabi-cross/schemas` base

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
  IDs con prefijo, ver [ADR-0004](./adr/0004-ids-de-dominio-con-prefijo.md). Falta mover la tarjeta
  en Trello.

## [~] F0-03 · Better Auth + Mongo

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
  registro y recupero; contraseñas chequeadas contra listas filtradas. Falta mover la tarjeta en
  Trello.

## [~] F0-04 · Error envelope + logger Pino

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
  [el diccionario](./error-codes.md) divergen en cualquier dirección. Falta mover la tarjeta en
  Trello.

## [~] F0-05 · Health checks `/health` y `/ready`

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
  test de integración tira el Mongo en memoria y verifica las dos cosas. Falta mover la tarjeta en
  Trello.

## [~] F0-06 · `@wasabi-cross/ui` base + Storybook

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
  El script inline que evita el flash de tema se verifica ejecutándolo. Falta mover la tarjeta en
  Trello.

## [~] F0-07 · Catálogo pre-cargado de ejercicios (seed)

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
  para que el usuario nuevo efectivamente los vea. Falta mover la tarjeta en Trello.

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
