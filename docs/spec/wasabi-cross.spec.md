# Wasabi Cross — Spec del Producto

> Spec fuente de verdad para desarrollo asistido por IA. Si el código o un LLM proponen algo fuera de esta spec, se actualiza la spec primero, después se codea (ver [§9 Buenas prácticas con IA](#9-buenas-prácticas-con-ia)).

## 1. Resumen

|                            |                                                                              |
| -------------------------- | ---------------------------------------------------------------------------- |
| Nombre                     | Wasabi Cross                                                                 |
| Qué es                     | Webapp para gestionar ejercicios y RMs (repetición máxima) de un atleta      |
| Alcance de este desarrollo | Webapp + API. La landing page queda fuera de esta fase.                      |
| Monetización               | Suscripción Free / Max                                                       |
| Origen                     | Evolución (v2) de bv-cross, para uso personal, amigos y algunos suscriptores |

## 2. Qué NO es Wasabi Cross

Esta spec parte de una anterior (un SaaS de gestión para gimnasios, tipo Laplace) y todavía puede arrastrar ideas de ahí. Explícitamente, Wasabi Cross:

- **No es multi-tenant.** No hay organizaciones, clubes ni gimnasios como entidad del sistema.
- **No gestiona clases, reservas ni asistencia** (nada de booking, attendance, lista de espera).
- **No gestiona membresías ni contratos** de un club sobre un socio.
- **No tiene CRM** ni funciones de venta o seguimiento de leads.
- **No es una app de salud regulada.** El tag "pain" es una etiqueta de UX sobre el ejercicio, no un registro clínico con consentimiento formal.
- La relación es **usuario ↔ sus propios ejercicios**. Nada de jerarquías tenant/venue/socio.

Si una tarea o un LLM proponen alguno de estos conceptos, es señal de que se está copiando de la spec equivocada — parar y revisar contra este documento.

## 3. Descripción del producto

Webapp donde el usuario carga sus ejercicios (o los elige de un listado pre-cargado en la base de datos) y registra su RM, tiempo o repeticiones según el tipo de ejercicio. La app calcula automáticamente los porcentajes de carga sobre el RM y guarda el histórico para ver la evolución del entrenamiento en el tiempo.

## 4. Monetización

| Plan                 | Ejercicios pre-cargados | Ejercicios nuevos (custom) | Ejercicios gestionados en total |
| -------------------- | ----------------------- | -------------------------- | ------------------------------- |
| **Free**             | Todos                   | Hasta 3                    | Hasta 10                        |
| **Max** (pago anual) | Todos                   | Ilimitados                 | Ilimitado                       |

Los límites de plan son un **entitlement por usuario**, se validan en el módulo `subscriptions` en el backend — nunca solo en el frontend.

## 5. Páginas y componentes

Mockups en [`../mockup`](../mockup).

| Página                     | Mockup                                                   | Descripción                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| -------------------------- | -------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Presentación               | `wasabi (1).jpeg`                                        | Splash con logo y nombre al abrir la app                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| Login                      | `wasabi (2).jpeg`                                        |                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| Registro                   | `wasabi (3).jpeg`                                        |                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| Header (componente global) | —                                                        | Logo + nombre a la izquierda; toggle de tema y menú de navegación a la derecha. Presente en todas las páginas.                                                                                                                                                                                                                                                                                                                                                                   |
| Home                       | `wasabi (4).jpeg`                                        | Lista de ejercicios cargados: nombre, fecha de última modificación, valor actual (RM / tiempo / reps). Botón "New Exercice" (si el plan lo permite).                                                                                                                                                                                                                                                                                                                             |
| Estadísticas               | `wasabi (10).jpeg`                                       | Accesible desde la navegación. Por ejercicio: gráficos y números de evolución, máximos y mínimos. Sección de estadísticas generales: evolución por capacidad (fuerza, resistencia, velocidad) y por grupo muscular — ej. detectar si el tren inferior progresa más rápido que el tren superior.                                                                                                                                                                                  |
| Ejercicio                  | `wasabi (5).jpeg`, `wasabi (6).jpeg`, `wasabi (11).jpeg` | Detalle de un ejercicio. Para Fuerza: RM actual + porcentajes de carga (default 65/75/80/85/90/95%, configurables) + cálculo de un porcentaje custom. Tags de contexto: carga liviana/media/pesada, tipo (fuerza, hipertrofia, gimnástico, running…), nivel del usuario, malestar/dolor. Acciones: editar ejercicio, ver estadísticas, cargar nuevo RM (modal), ver historial. Para tiempo/repeticiones: mismo patrón, el cálculo de "carga" se reemplaza por tiempo o cantidad. |
| Nuevo ejercicio            | `wasabi (9).jpeg`                                        | Formulario para elegir un ejercicio pre-cargado o crear uno nuevo si no existe.                                                                                                                                                                                                                                                                                                                                                                                                  |

**PWA**: instalable en el dispositivo. Al haber una nueva versión, se notifica al usuario con un popup para actualizar.

**Landing page**: fuera de esta fase de desarrollo.

## 6. Stack

- React
- Node
- TypeScript
- MongoDB
- Better Auth (autenticación)
- Zod (validaciones)
- Temporal (fechas)
- Tanstack (Table, Form, Charts, Query, Router…)
- Motion (animaciones)
- Fontsource (fuentes)
- Zustand (estado global)
- pragmatic-drag-and-drop (drag and drop)
- Nuqs (estado en URL)
- Swagger (documentación de API)

## 7. Arquitectura

- SDD (Spec-Driven Development) — **la spec manda**: si la IA propone algo fuera de spec, se actualiza la spec primero, después se codea.
- TDD
- Modular monolith + hexagonal-lite
- API REST
- Atomic Design, con criterio — lo que importa es que `@wasabi-cross/ui` no importe lógica de negocio, no la discusión de si un botón es molécula u organismo.
- Componentes Cross: librería de UI compartida, con Storybook.

### Módulos de dominio

Un solo deployable de backend, módulos aislados (`domain / application / infrastructure` cada uno). Se comunican por interfaces o eventos internos — nunca importando modelos de otro módulo directamente.

| Módulo          | Responsabilidad                                                          |
| --------------- | ------------------------------------------------------------------------ |
| `auth`          | Login, registro, sesión (Better Auth)                                    |
| `users`         | Perfil, configuración (tema, porcentajes de carga default)               |
| `exercises`     | Catálogo pre-cargado + ejercicios custom del usuario, tags               |
| `records`       | Carga y evolución de RM / tiempos / repeticiones, cálculo de porcentajes |
| `stats`         | Agregaciones y análisis (por ejercicio y generales)                      |
| `subscriptions` | Plan Free/Max, límites, entitlements                                     |
| `billing`       | Pago de la suscripción Max                                               |
| `notifications` | Popup de nueva versión PWA, avisos                                       |

### Eventos de dominio (in-process, cola si hace falta después)

`exercise.created`, `record.logged`, `pr.achieved` (nuevo RM/tiempo/reps supera el anterior), `subscription.upgraded`, `subscription.expiring`, `plan.limit_reached`, `payment.received`.

### Packages compartidos

- `@wasabi-cross/schemas`: Zod compartido front/back, fuente única de verdad de validaciones y tipos (`z.infer`).
- `@wasabi-cross/ui`: librería de componentes (Componentes Cross), con Storybook.
- API REST versionada + OpenAPI **generado** desde los schemas Zod (nunca escrito a mano).

Detalle de estructura de carpetas, logs y observabilidad: ver [docs/architecture.md](../architecture.md).

## 8. Buenas prácticas

- SOLID, YAGNI, patrones de diseño donde agreguen valor real.
- Logs estructurados (ver [docs/architecture.md](../architecture.md)).
- Conventional commits + PRs pequeñas + changelog automático.
- ADRs cortos para cada decisión estructural (contexto, opciones, decisión, consecuencias) — ver [docs/adr](../adr).
- Sin `any`. `strict: true` en TypeScript.
- Sin lógica de negocio en componentes React.

## 9. Buenas prácticas con IA

- **CLAUDE.md** en la raíz (y por app si el monorepo lo justifica): stack, convenciones, comandos, estructura, cosas prohibidas.
- Copia de CLAUDE.md como AGENT.md para otros LLM.
- **Flujo 4D** por tarea: _Delegation_ (qué hace la IA y qué no) → _Description_ (spec de la tarea con criterios de aceptación) → _Discernment_ (revisar salida contra los criterios) → _Diligence_ (tests, seguridad, atribución).
- **La spec manda**: ver §7.
- Tests de flujos de dinero (billing) y permisos, escritos o revisados por humano. Ahí no aplica autopiloto.
- Subagentes por rol cuando el flujo los use: `spec-reviewer`, `test-writer`, `security-reviewer`.
- Cómo una sesión de IA retoma contexto sin releer todo el historial: ver [§15 Bitácora y Estado del proyecto](#15-bitácora-y-estado-del-proyecto).

## 10. Testing

- TDD
- Estáticos (linters)
- Unitarios
- E2E
- Coverage > 90%

## 11. UX/UI

- Referencia: [uiguideline.com](https://www.uiguideline.com/)
- Imagen de marca propia (ver mockups: dark theme, acento verde lima)
- Mismos componentes y paleta en toda la app
- Mobile first
- Tema dark/light, **dark first**
- Accesibilidad **WCAG 2.2 AA**: contraste ≥ 4.5:1, foco visible, teclado completo, labels/`aria-*` correctos, `prefers-reduced-motion` respetado, targets táctiles ≥ 44×44px. Auditoría con axe en CI.
- DnD accesible
- Estados vacíos con acción ("Todavía no tenés ejercicios → Agregar el primero")
- Skeletons, no spinners, en listas
- Confirmación destructiva con nombre del recurso escrito, para borrados irreversibles
- Formato fecha/hora/moneda es-AR; semana empieza lunes
- Tipografía fluida, mínimo 16px en inputs (evita zoom automático de iOS)
- Optimistic UI

## 12. Infra

- Railway
- Mongo Atlas
- Backblaze

- **Ambientes**: `dev` (local) · `staging` (datos sintéticos) · `prod`. Prohibido probar en prod.
- **Mongo Atlas**: replica set, backups con PITR, alertas de conexión/storage. RPO ≤ 24h, RTO ≤ 4h, restauración probada al menos una vez.
- **Backblaze B2**: buckets privados + URLs firmadas de corta vida, límites de tamaño, CDN delante para media de ejercicios.
- **Secrets** en el gestor de la plataforma, nunca en el repo. Rotación documentada.
- **Migraciones de esquema** versionadas y reversibles (`migrate-mongo` o similar); nunca cambios manuales en Atlas.
- **Health checks** `/health` (liveness) y `/ready` (readiness con ping a Mongo).
- Uptime monitoring externo con alerta a WhatsApp/Telegram.
- Plan de escala: Railway alcanza para el volumen inicial (uso personal + amigos + early subscribers); el disparador para migrar a VPS/Coolify es costo o límite de recursos, no estética.

## 13. Seguridad, privacidad y cumplimiento

- OWASP Top 10 como checklist de revisión por módulo.
- **Autorización en cada endpoint** (recurso + acción + usuario dueño del recurso). El riesgo real acá es **IDOR** — un usuario cambiando un ID en la URL para ver/editar ejercicios de otro. Test obligatorio.
- Rate limiting: login (5/min/IP), registro, recupero de contraseña, webhooks de pago.
- Validación de entrada con Zod en el borde; sanitización de HTML en notas/descripciones de ejercicio.
- Prevención de NoSQL injection (nunca pasar objetos del usuario directo a `find`).
- Headers: CSP, HSTS, X-Content-Type-Options, Referrer-Policy. CORS restrictivo por origen.
- Subida de archivos (si aplica a media de ejercicios): mime real, tamaño máximo, nombre aleatorio, sin ejecución.
- Dependencias: `npm audit` + Dependabot en CI.
- **Nunca** datos de tarjeta en la base — el pago de la suscripción Max pasa por el proveedor de pago, nunca se guarda el número de tarjeta.
- Contraseñas: hashing gestionado por Better Auth; política mínima + verificación contra listas de filtradas.

## 14. Observabilidad, logs y códigos de error

Formato de log (JSON, Pino) y reglas de qué nunca loguear: ver [docs/architecture.md](../architecture.md).

Diccionario de códigos de error (`WC-<MÓDULO>-<HTTP>-<NNN>`), vivo y creciente: ver [docs/error-codes.md](../error-codes.md).

## 15. Bitácora y Estado del proyecto

Cómo retomar contexto entre sesiones de trabajo (humano o IA) sin releer todo el historial de git: ver [docs/state/STATE.md](../state/STATE.md) y [docs/state/bitacora](../state/bitacora).

- **STATE.md**: foto del presente, se sobreescribe. Toda sesión lo lee al empezar y lo actualiza al terminar si algo relevante cambió.
- **Bitácora**: historial append-only, un archivo por sesión de trabajo real, nunca se edita retroactivamente.

## 16. Gestión de tareas y Trello

El trabajo se divide siempre en tareas chicas, nunca en bloques grandes sin desglosar. Mismo patrón que en Laplace y bow-sight:

- **Backlog vivo** en [docs/ACTION-PLAN.md](../ACTION-PLAN.md): formato de tarea fijo (title, module, description, acceptance-criteria, example, story-points, depends_on, risk, test_plan, error-codes, data-model-impact).
- **Story points Fibonacci** 1/2/3/5/8/13. Ninguna tarea supera 8 — toda tarea de 13 se parte antes de empezar.
- **Una tarea no arranca** si sus `depends_on` no están cerradas.
- **Tablero de Trello**: https://trello.com/b/pK3RPkCT/wasabi-cross — listas `Sin iniciar` / `En proceso` / `Bloqueadas` / `Completadas` / `Canceladas`.
- **Dirección de la sincronización**: `docs/ACTION-PLAN.md` es la fuente de verdad del _contenido_; Trello es la fuente de verdad del _estado_. Si difieren en contenido, gana el plan; si difieren en estado, gana el tablero.
- **Definition of Done** de una tarea: tests pasando · error codes nuevos documentados en [docs/error-codes.md](../error-codes.md) · entrada en la [bitácora](../state/bitacora) · **tarjeta movida en Trello**. No se marca `[x]` en el plan sin las cuatro cosas.
- Nadie mueve una tarjeta a `Completadas` salvo quien terminó la tarea y cumplió el Definition of Done — no lo hace la IA por su cuenta.
