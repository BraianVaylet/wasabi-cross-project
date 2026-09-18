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

**Qué cuenta como "gestionado"**: todo ejercicio que el usuario tiene en su lista, venga del catálogo o lo haya creado él. Un usuario Free puede elegir cualquier ejercicio del catálogo, pero su lista completa no pasa de 10, y de esos, como máximo 3 son propios. El límite se controla al agregar; qué pasa con un usuario que baja de Max a Free con más de 10 se define en la fase de suscripción.

## 5. Páginas y componentes

Mockups en [`../mockup`](../mockup).

| Página                     | Mockup                                                | Descripción                                                                                                                                                                                                                                                                                     |
| -------------------------- | ----------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Presentación               | `wasabi (1).png`                                      | Splash con logo y nombre al abrir la app.                                                                                                                                                                                                                                                       |
| Login                      | `wasabi (2).png`                                      | Email y contraseña. El mockup muestra además login por username y con Google: **fuera de la Fase 1**.                                                                                                                                                                                           |
| Registro                   | `wasabi (3).png`                                      | Email, nombre, contraseña y confirmación. El campo "Username" del mockup es el **nombre visible** (el del "Hi, Braian!" de Home), no un identificador para entrar.                                                                                                                              |
| Header (componente global) | `wasabi (4a).png`                                     | Logo + nombre a la izquierda; toggle de tema y menú a la derecha. Menú: Tus ejercicios, Estadísticas, Perfil, Color, Cerrar sesión. Presente en todas las páginas.                                                                                                                              |
| Home                       | `wasabi (4).png`                                      | Lista de ejercicios gestionados: nombre, fecha del valor actual, valor actual con su unidad. Botón "New Exercise" si el plan lo permite.                                                                                                                                                        |
| Estadísticas               | `wasabi (10).png`                                     | Accesible desde la navegación. Por ejercicio: gráficos y números de evolución, máximos y mínimos. Sección de estadísticas generales: evolución por capacidad (fuerza, resistencia, velocidad) y por grupo muscular — ej. detectar si el tren inferior progresa más rápido que el tren superior. |
| Ejercicio                  | `wasabi (5).png`, `wasabi (6).png`, `wasabi (11).png` | Detalle de un ejercicio gestionado: valor actual, tags, tabla de porcentajes y porcentaje custom, historial. Acciones: editar, ver estadísticas, cargar una marca nueva (modal "New RM", o "New Record" si no se mide en RM). Reglas en §5.1.                                                   |
| Nuevo ejercicio            | `wasabi (9).png`                                      | Nombre (elige del catálogo o crea uno propio si no existe), categoría (sólo si es propio: la de un ejercicio del catálogo ya está definida), primera marca con su fecha, nivel, comentarios y "con dolor".                                                                                      |

Vista general de todas las pantallas y leyenda de tags: `wasabi (12).png`.

**PWA**: instalable en el dispositivo. Al haber una nueva versión, se notifica al usuario con un popup para actualizar.

**Landing page**: fuera de esta fase de desarrollo.

### 5.1 Ejercicios, marcas y porcentajes

**La categoría define qué se mide.** No se elige por separado:

| Categoría   | Se mide en   | Porcentajes                                   |
| ----------- | ------------ | --------------------------------------------- |
| Fuerza      | RM, en kg    | Sí: carga = RM × %                            |
| Hipertrofia | Repeticiones | Sí: repeticiones = máximo × %                 |
| Gimnástico  | Repeticiones | Sí                                            |
| Running     | Tiempo       | No: se muestran la mejor marca y el historial |

El peso se registra sólo en kg.

**Tres conceptos distintos:**

- **Ejercicio**: la definición — nombre y categoría, y en los del catálogo, además capacidades y grupos musculares para Estadísticas. Es del catálogo (sin dueño, lo ven todos) o propio (lo creó un usuario y sólo lo ve él).
- **Ejercicio gestionado**: la entrada de un ejercicio en la lista de un usuario. Lleva lo que es del usuario y no del ejercicio: nivel, "con dolor" y comentarios. Un ejercicio aparece una sola vez en la lista de cada usuario.
- **Marca**: un valor con su fecha de realización y un comentario opcional, sobre un ejercicio gestionado.

**Tags:**

- **Categoría**: Fuerza, Hipertrofia, Gimnástico, Running.
- **Nivel**: Principiante, Intermedio, Avanzado, Elite. Del usuario sobre ese ejercicio.
- **Con dolor**: sí o no. Del usuario. Etiqueta de UX, no registro clínico (§2).
- **Carga**: liviana, media o pesada. **Se calcula, no se guarda**: menos de 70% es liviana, de 70% a 84% media, desde 85% pesada.

**Valor actual y mejor marca:**

- **Valor actual**: la marca con la fecha de realización más reciente. Sobre ella se calculan los porcentajes, porque refleja la capacidad de hoy.
- **Mejor marca**: el máximo histórico (el mínimo, en tiempo). Es lo que dispara `pr.achieved`.

**Redondeo:**

- Carga: al 0,5 kg más cercano.
- Repeticiones: hacia abajo, con mínimo 1. Nunca por encima de la intensidad pedida.

**Porcentajes por defecto**: 65, 75, 80, 85, 90 y 95%, configurables por usuario en su perfil.

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

| Módulo          | Responsabilidad                                                                                                  |
| --------------- | ---------------------------------------------------------------------------------------------------------------- |
| `auth`          | Login, registro, sesión (Better Auth)                                                                            |
| `users`         | Perfil, configuración (tema, porcentajes de carga default)                                                       |
| `exercises`     | Catálogo pre-cargado, ejercicios propios y la lista de ejercicios gestionados de cada usuario (nivel, con dolor) |
| `records`       | Carga y evolución de RM / tiempos / repeticiones, cálculo de porcentajes                                         |
| `stats`         | Agregaciones y análisis (por ejercicio y generales)                                                              |
| `subscriptions` | Plan Free/Max, límites, entitlements                                                                             |
| `billing`       | Pago de la suscripción Max                                                                                       |
| `notifications` | Popup de nueva versión PWA, avisos                                                                               |

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
- **Autorización en cada endpoint** (recurso + acción + usuario dueño del recurso). El riesgo real acá es **IDOR** — un usuario cambiando un ID en la URL para ver/editar ejercicios de otro. Test obligatorio. Un recurso de otro usuario responde **404, no 403**: confirmar que existe ya es filtrar información.
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
