# CLAUDE.md — Wasabi Cross

Instrucciones para Claude (y cualquier LLM — ver `AGENT.md`, copia de este archivo) trabajando en este repo.

## Antes de arrancar
1. Leer [docs/state/STATE.md](docs/state/STATE.md) — foto del estado actual del proyecto.
2. Leer la spec: [docs/spec/wasabi-cross.spec.md](docs/spec/wasabi-cross.spec.md) — es la fuente de verdad del producto.
3. Si la tarea toca arquitectura, revisar [docs/architecture.md](docs/architecture.md) y los [ADRs](docs/adr).
4. Revisar [docs/ACTION-PLAN.md](docs/ACTION-PLAN.md) — el trabajo se hace por tareas chicas de ese backlog, no sueltas.

## Qué es este proyecto
Webapp (+ API) para que un atleta gestione sus ejercicios y RMs (repetición máxima), calcule porcentajes de carga y vea su evolución en el tiempo. Monetización por suscripción Free/Max. Ver spec para el detalle completo.

**No es** un producto multi-tenant para gimnasios — ver [spec §2 "Qué NO es Wasabi Cross"](docs/spec/wasabi-cross.spec.md#2-qué-no-es-wasabi-cross) antes de proponer conceptos como bookings, membresías, clubes o CRM. Si algo así aparece en una sugerencia, es señal de contaminación de otra spec.

## Stack
React · Node · TypeScript · MongoDB · Better Auth · Zod · Temporal · Tanstack (Table/Form/Charts/Query/Router) · Motion · Fontsource · Zustand · pragmatic-drag-and-drop · Nuqs · Swagger

Detalle completo: [spec §6](docs/spec/wasabi-cross.spec.md#6-stack).

## Estructura del repo

```
wasabi-cross/
├── apps/
│   ├── web/            # React PWA
│   └── api/              # Node API REST
├── packages/
│   ├── schemas/          # @wasabi-cross/schemas — Zod compartido
│   └── ui/                # @wasabi-cross/ui — Componentes Cross
├── docs/
│   ├── spec/              # Spec de producto (fuente de verdad)
│   ├── mockup/            # Mockups de diseño
│   ├── architecture.md    # Arquitectura técnica detallada
│   ├── error-codes.md     # Diccionario de códigos de error (vivo)
│   ├── ACTION-PLAN.md      # Backlog vivo, tareas chicas (espejo del tablero de Trello)
│   ├── adr/                # Architecture Decision Records
│   └── state/               # STATE.md + bitácora
└── CLAUDE.md
```

> El proyecto todavía no tiene código (`apps/` y `packages/` no existen aún). No asumir comandos de build/test/lint que no estén confirmados en un `package.json` real — si hace falta correr algo y no existe, proponerlo y avisar antes de asumirlo.

## Comandos
_A completar cuando se bootstrapee el monorepo. No inventar `npm run <algo>` sin verificar que existe en `package.json`._

## Reglas de arquitectura
- Modular monolith + hexagonal-lite: cada módulo de `apps/api` separa `domain / application / infrastructure`.
- Un módulo nunca importa el modelo de otro directamente — interfaces o eventos internos.
- Validaciones y tipos en `@wasabi-cross/schemas` (Zod), nunca duplicadas entre front y back.
- OpenAPI se genera desde los schemas Zod, nunca se escribe a mano.
- Sin lógica de negocio en componentes React.

## Prohibido
- `any` en TypeScript (`strict: true`).
- Lógica de negocio en `@wasabi-cross/ui` o en componentes React en general.
- Importar el modelo/entidad de un módulo desde otro módulo.
- Escribir el OpenAPI a mano.
- Cambios manuales en Mongo Atlas (todo por migración versionada y reversible).
- Loguear passwords, tokens o datos de pago (ver [docs/architecture.md](docs/architecture.md)).
- Guardar datos de tarjeta en la base.
- Probar en `prod`.
- Saltar tests de flujos de billing o permisos sin revisión humana.

## Convenciones
- Conventional commits. PRs pequeñas. Changelog automático.
- ADR corto por cada decisión estructural — plantilla en [docs/adr/TEMPLATE.md](docs/adr/TEMPLATE.md).
- Códigos de error `WC-<MÓDULO>-<HTTP>-<NNN>` — agregar al [diccionario](docs/error-codes.md) en el mismo PR que los introduce.
- Tests: TDD, coverage > 90%, e2e para flujos críticos.
- Accesibilidad WCAG 2.2 AA — ver [spec §11](docs/spec/wasabi-cross.spec.md#11-uxui).

## Tareas chicas y Trello
- El trabajo se divide siempre en tareas de [docs/ACTION-PLAN.md](docs/ACTION-PLAN.md), story points Fibonacci, máximo 8 — una tarea de 13 se parte antes de empezar.
- Una tarea no arranca si sus `depends_on` no están cerradas.
- Tablero: https://trello.com/b/pK3RPkCT/wasabi-cross. `ACTION-PLAN.md` manda en contenido, Trello manda en estado. Comando `/trello-sync` para sincronizar.
- No se marca una tarea `[x]` ni se mueve su tarjeta a `Completadas` sin cumplir el Definition of Done (spec §16) — y esa movida la hace quien terminó la tarea, no la IA por su cuenta.

## Flujo con IA (4D)
Por tarea: *Delegation* (qué hace la IA, qué no) → *Description* (spec de la tarea + criterios de aceptación) → *Discernment* (revisar salida contra los criterios) → *Diligence* (tests, seguridad, atribución).

**La spec manda**: si una tarea requiere algo que no está en la spec, se actualiza la spec primero (con el usuario), después se codea.

## Al cerrar una sesión con cambios sustantivos
1. Actualizar [docs/state/STATE.md](docs/state/STATE.md) si algo relevante cambió.
2. Agregar una entrada en [docs/state/bitacora](docs/state/bitacora) — plantilla en [TEMPLATE.md](docs/state/bitacora/TEMPLATE.md).

No hace falta para sesiones triviales (una pregunta puntual, sin cambios).
